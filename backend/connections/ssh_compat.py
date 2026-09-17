"""
ssh_compat.py - Enterprise SSH Compatibility Layer for Cisco & Network Devices
Resolves algorithm negotiation and authentication errors across legacy and modern network hardware:
- "Incompatible ssh peer (no acceptable kex algorithm)" (e.g. diffie-hellman-group1-sha1, diffie-hellman-group14-sha1)
- "Incompatible ssh peer (no acceptable host key)" (e.g. ssh-rsa, ssh-dss)
- "Incompatible ssh peer (no acceptable cipher)" (e.g. aes128-cbc, 3des-cbc, aes256-cbc)
- "BadAuthenticationType" (keyboard-interactive fallback)
"""

import socket
import time
from typing import Tuple, Optional, Any

# 1. Comprehensive Key Exchange (KEX) algorithms (Modern Elliptic Curves + Legacy DH)
LEGACY_KEX = (
    'curve25519-sha256',
    'curve25519-sha256@libssh.org',
    'ecdh-sha2-nistp256',
    'ecdh-sha2-nistp384',
    'ecdh-sha2-nistp521',
    'diffie-hellman-group-exchange-sha256',
    'diffie-hellman-group16-sha512',
    'diffie-hellman-group18-sha512',
    'diffie-hellman-group14-sha256',
    'diffie-hellman-group14-sha1',
    'diffie-hellman-group-exchange-sha1',
    'diffie-hellman-group1-sha1',
)

# 2. Comprehensive Host Key types (Ed25519, ECDSA, RSA-SHA2, legacy ssh-rsa & ssh-dss)
LEGACY_KEYS = (
    'ssh-ed25519',
    'ecdsa-sha2-nistp256',
    'ecdsa-sha2-nistp384',
    'ecdsa-sha2-nistp521',
    'rsa-sha2-512',
    'rsa-sha2-256',
    'ssh-rsa',
    'ssh-dss',
)

# 3. Comprehensive Ciphers (GCM, ChaCha20, CTR, plus legacy CBC ciphers required by Cisco Catalyst)
LEGACY_CIPHERS = (
    'aes128-gcm@openssh.com',
    'aes256-gcm@openssh.com',
    'chacha20-poly1305@openssh.com',
    'aes128-ctr',
    'aes192-ctr',
    'aes256-ctr',
    'aes128-cbc',
    'aes192-cbc',
    'aes256-cbc',
    '3des-cbc',
    'blowfish-cbc',
    'cast128-cbc',
)

# 4. Comprehensive MAC Digests
LEGACY_MACS = (
    'hmac-sha2-256-etm@openssh.com',
    'hmac-sha2-512-etm@openssh.com',
    'hmac-sha2-256',
    'hmac-sha2-512',
    'hmac-sha1-etm@openssh.com',
    'hmac-sha1',
    'hmac-sha1-96',
    'hmac-md5',
    'hmac-md5-96',
)

_PATCHED = False


def ensure_paramiko_compatibility() -> bool:
    """
    Globally patches Paramiko Transport class attributes and SecurityOptions
    so that any subsequent paramiko.SSHClient or paramiko.Transport connection
    seamlessly negotiates with older Cisco, MikroTik, Huawei, and Linux hosts.
    """
    global _PATCHED
    if _PATCHED:
        return True

    try:
        import paramiko
    except ImportError:
        return False

    try:
        # Patch class-level preferred algorithms on paramiko.Transport
        for attr, legacy_tuple in [
            ('_preferred_kex', LEGACY_KEX),
            ('_preferred_keys', LEGACY_KEYS),
            ('_preferred_ciphers', LEGACY_CIPHERS),
            ('_preferred_macs', LEGACY_MACS),
        ]:
            existing = getattr(paramiko.Transport, attr, ())
            merged = tuple(legacy_tuple) + tuple(x for x in existing if x not in legacy_tuple)
            setattr(paramiko.Transport, attr, merged)

        # Hook Transport.__init__ so every instance's SecurityOptions includes all legacy algorithms
        orig_init = paramiko.Transport.__init__

        def hooked_init(self, *args, **kwargs):
            orig_init(self, *args, **kwargs)
            try:
                sec = self.get_security_options()
                if sec:
                    # Update kex
                    cur_kex = list(sec.kex or [])
                    for k in reversed(LEGACY_KEX):
                        if k not in cur_kex:
                            cur_kex.insert(0, k)
                    sec.kex = tuple(cur_kex)

                    # Update key_types
                    cur_keys = list(sec.key_types or [])
                    for k in reversed(LEGACY_KEYS):
                        if k not in cur_keys:
                            cur_keys.insert(0, k)
                    sec.key_types = tuple(cur_keys)

                    # Update ciphers
                    cur_ciphers = list(sec.ciphers or [])
                    for c in reversed(LEGACY_CIPHERS):
                        if c not in cur_ciphers:
                            cur_ciphers.insert(0, c)
                    sec.ciphers = tuple(cur_ciphers)

                    # Update digests
                    cur_digests = list(sec.digests or [])
                    for d in reversed(LEGACY_MACS):
                        if d not in cur_digests:
                            cur_digests.insert(0, d)
                    sec.digests = tuple(cur_digests)
            except Exception:
                pass

        paramiko.Transport.__init__ = hooked_init
        _PATCHED = True
        return True
    except Exception as e:
        print(f"[SSHCompat] Warning: Could not patch paramiko security options: {e}")
        return False


# Automatically execute on import if paramiko is present
ensure_paramiko_compatibility()


def connect_ssh_device(
    client: Any,
    hostname: str,
    port: int = 22,
    username: str = "",
    password: str = "",
    timeout: float = 6.0,
    banner_timeout: float = 6.0,
    auth_timeout: float = 6.0
) -> Tuple[bool, Optional[str]]:
    """
    Connects a paramiko.SSHClient instance to a network device with multi-tiered fallback:
    1. Standard SSHClient.connect() with globally patched legacy security options.
    2. Direct paramiko.Transport(sock) with explicit sec.kex / sec.key_types / sec.ciphers.
    3. Keyboard-interactive authentication fallback if password auth is rejected.
    
    Returns (True, None) on success, or (False, error_message) on failure.
    """
    ensure_paramiko_compatibility()

    import paramiko

    last_error: Optional[Exception] = None

    # Tier 1: Standard client connect with patched Transport options
    try:
        client.connect(
            hostname=hostname,
            port=port,
            username=username,
            password=password,
            timeout=timeout,
            banner_timeout=banner_timeout,
            auth_timeout=auth_timeout,
            allow_agent=False,
            look_for_keys=False
        )
        transport = client.get_transport()
        if transport and transport.is_authenticated():
            return True, None
    except Exception as e:
        last_error = e

    # Tier 2: Direct raw socket & Transport fallback with explicit legacy algorithm injection
    sock = None
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect((hostname, port))

        transport = paramiko.Transport(sock)
        sec = transport.get_security_options()

        # Explicitly assign full legacy + modern algorithm suites
        sec.kex = LEGACY_KEX
        sec.key_types = LEGACY_KEYS
        sec.ciphers = LEGACY_CIPHERS
        sec.digests = LEGACY_MACS

        transport.start_client(timeout=timeout)

        # Authenticate with password or keyboard-interactive fallback
        auth_success = False
        try:
            transport.auth_password(username=username, password=password)
            auth_success = transport.is_authenticated()
        except paramiko.BadAuthenticationType:
            def interactive_handler(title, instructions, prompt_list):
                return [password for _ in prompt_list]
            try:
                transport.auth_interactive(username=username, handler=interactive_handler)
                auth_success = transport.is_authenticated()
            except Exception as ia_err:
                raise paramiko.AuthenticationException(f"Interactive authentication failed: {ia_err}")

        if not auth_success:
            raise paramiko.AuthenticationException(f"Authentication failed for user '{username}' on {hostname}:{port}")

        # Attach authenticated transport to client so exec_command() and invoke_shell() work natively
        client._transport = transport
        return True, None

    except Exception as e_fallback:
        if sock:
            try:
                sock.close()
            except Exception:
                pass
        err_msg = str(e_fallback) if str(e_fallback).strip() else str(last_error or "SSH Connection Failed")
        return False, err_msg
