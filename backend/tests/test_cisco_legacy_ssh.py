#!/usr/bin/env python3
"""
Dedicated direct Paramiko SSH verification script for legacy Cisco devices.
Target Device:
  IP: 172.22.100.10
  Model: WS-C2960G-48TC-L
  IOS: 12.2(44)SE6

Required Legacy Crypto Suite:
  - KEX: diffie-hellman-group1-sha1
  - Host key: ssh-rsa
  - Cipher: aes128-cbc
  - MAC: hmac-sha1

Features:
  1. Direct socket reachability test (with clear network diagnostic if unreachable)
  2. Paramiko Transport cryptographic handshake verification
  3. Interactive shell channel (PTY) creation with terminal length 0
  4. Real command execution of 'show version' and 'show running-config'
  5. Real-time stdout streaming (NO simulation or fake output)
"""

import sys
import os
import time
import socket
import argparse
from typing import Optional

# Ensure project root is in sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from connections.ssh_compat import (
    ensure_paramiko_compatibility,
    apply_security_options_safely,
    supports_server_sig_algs,
    authenticate_transport,
    extract_negotiation_info,
    TIER2_LEGACY_KEX,
    TIER2_LEGACY_KEYS,
    TIER2_LEGACY_CIPHERS,
    TIER2_LEGACY_MACS,
)


def read_channel_until(channel, stop_chars=("#", ">"), max_wait=8.0) -> str:
    """Reads characters from an interactive Paramiko channel until a prompt appears or timeout."""
    buf = ""
    deadline = time.time() + max_wait
    while time.time() < deadline:
        try:
            chunk = channel.recv(4096).decode("utf-8", errors="ignore")
            if chunk:
                buf += chunk
                sys.stdout.write(chunk)
                sys.stdout.flush()
                stripped = buf.rstrip()
                if any(stripped.endswith(ch) for ch in stop_chars):
                    break
            else:
                time.sleep(0.05)
        except socket.timeout:
            time.sleep(0.05)
        except Exception:
            break
    return buf


def run_direct_cisco_test(
    host: str = "172.22.100.10",
    port: int = 22,
    username: str = "admin",
    password: str = "",
    enable_password: Optional[str] = None,
    timeout: float = 12.0
) -> bool:
    print(f"\n=======================================================")
    print(f" CISCO LEGACY SSH VERIFICATION ENGINE")
    print(f" Target: {host}:{port}")
    print(f" Target Profile: Cisco WS-C2960G-48TC-L (IOS 12.2)")
    print(f" Required KEX:    diffie-hellman-group1-sha1")
    print(f" Required HostKey: ssh-rsa")
    print(f" Required Cipher:  aes128-cbc")
    print(f" Required MAC:     hmac-sha1")
    print(f"=======================================================\n")

    ensure_paramiko_compatibility()
    import paramiko

    # 1. Network Layer Check (Raw TCP)
    print(f"[*] Step 1: Testing TCP socket reachability to {host}:{port}...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        sock.connect((host, port))
        print(f"[+] TCP socket connected successfully to {host}:{port}!\n")
    except socket.timeout:
        print(f"[-] TCP Connection TIMEOUT to {host}:{port}.")
        print(f"    Note: If this container cannot reach {host}, ensure routing / VPN is active.\n")
        return False
    except Exception as e:
        print(f"[-] TCP Connection FAILED to {host}:{port}: {e}\n")
        return False

    transport = None
    channel = None

    try:
        # 2. Paramiko Transport Setup with Specific Legacy Security Options
        print(f"[*] Step 2: Initializing Paramiko Transport with legacy cryptographic options...")
        transport_kwargs = {}
        if supports_server_sig_algs():
            transport_kwargs["server_sig_algs"] = False

        transport = paramiko.Transport(sock, **transport_kwargs)
        apply_security_options_safely(
            transport,
            kex_candidates=TIER2_LEGACY_KEX,
            key_candidates=TIER2_LEGACY_KEYS,
            cipher_candidates=TIER2_LEGACY_CIPHERS,
            mac_candidates=TIER2_LEGACY_MACS
        )

        print(f"[*] Step 3: Starting SSH client negotiation (diffie-hellman-group1-sha1, aes128-cbc)...")
        transport.start_client(timeout=timeout)

        info = extract_negotiation_info(transport, "direct_legacy_test")
        print(f"[+] SSH Negotiation SUCCESSFUL!")
        print(f"    KEX Algorithm:     {info.get('kex')}")
        print(f"    Host Key Type:     {info.get('key_type')}")
        print(f"    Outbound Cipher:   {info.get('local_cipher')}")
        print(f"    Inbound Cipher:    {info.get('cipher')}")
        print(f"    MAC Algorithm:     {info.get('mac')}\n")

        # 3. Authentication
        print(f"[*] Step 4: Authenticating as user '{username}'...")
        auth_ok, auth_err = authenticate_transport(transport, username=username, password=password)
        if not auth_ok:
            print(f"[-] Authentication FAILED: {auth_err or 'Access denied'}\n")
            return False
        print(f"[+] Authentication SUCCESSFUL for '{username}'!\n")

        # 4. Open Interactive Shell (PTY)
        print(f"[*] Step 5: Opening interactive PTY shell channel...")
        channel = transport.open_session(timeout=timeout)
        channel.get_pty(term="vt100", width=160, height=50)
        channel.invoke_shell()
        channel.settimeout(1.0)
        print(f"[+] Interactive shell channel opened!\n")

        # Wait for initial prompt
        print(f"--- [Device Output Stream Started] ---")
        prompt_buf = read_channel_until(channel, stop_chars=("#", ">"), max_wait=5.0)

        # Enable mode if needed
        if prompt_buf.rstrip().endswith(">"):
            print(f"\n[*] Elevating to privileged EXEC mode (enable)...")
            channel.send("enable\r\n")
            time.sleep(0.3)
            en_buf = read_channel_until(channel, stop_chars=(":", "#", ">"), max_wait=4.0)
            if "Password:" in en_buf or "password:" in en_buf:
                secret = enable_password or password
                channel.send(f"{secret}\r\n")
                time.sleep(0.4)
                read_channel_until(channel, stop_chars=("#", ">"), max_wait=4.0)

        # 5. Disable pagination
        channel.send("terminal length 0\r\n")
        time.sleep(0.4)
        read_channel_until(channel, stop_chars=("#", ">"), max_wait=3.0)

        # 6. Execute 'show version'
        print(f"\n[*] Step 6: Executing 'show version' on real switch...")
        channel.send("show version\r\n")
        time.sleep(0.5)
        v_output = read_channel_until(channel, stop_chars=("#", ">"), max_wait=12.0)

        # 7. Execute 'show running-config'
        print(f"\n[*] Step 7: Executing 'show running-config' on real switch...")
        channel.send("show running-config\r\n")
        time.sleep(0.8)
        rc_output = read_channel_until(channel, stop_chars=("#", ">"), max_wait=20.0)

        print(f"\n--- [Device Output Stream Completed] ---\n")
        print(f"[+] Verification completed successfully on real Cisco switch {host}!")
        return True

    except Exception as e:
        print(f"[-] Execution error during test: {e}")
        return False
    finally:
        if channel:
            try:
                channel.close()
            except Exception:
                pass
        if transport:
            try:
                transport.close()
            except Exception:
                pass
        if sock:
            try:
                sock.close()
            except Exception:
                pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Direct Paramiko SSH verification for legacy Cisco switch.")
    parser.add_argument("--host", default="172.22.100.10", help="Target switch IP (default: 172.22.100.10)")
    parser.add_argument("--port", type=int, default=22, help="SSH port (default: 22)")
    parser.add_argument("-u", "--username", default=os.getenv("CISCO_USER", "admin"), help="SSH username")
    parser.add_argument("-p", "--password", default=os.getenv("CISCO_PASSWORD", ""), help="SSH password")
    parser.add_argument("-e", "--enable", default=os.getenv("CISCO_ENABLE", ""), help="Enable secret")
    parser.add_argument("-t", "--timeout", type=float, default=12.0, help="Connection timeout in seconds")

    args = parser.parse_args()
    success = run_direct_cisco_test(
        host=args.host,
        port=args.port,
        username=args.username,
        password=args.password,
        enable_password=args.enable or None,
        timeout=args.timeout
    )
    sys.exit(0 if success else 1)
