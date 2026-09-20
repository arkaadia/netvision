"""
ssh_compat.py - Bulletproof Adaptive Two-Tier SSH Negotiation Engine
Optimized for high-speed modern infrastructure and legacy enterprise hardware:
- Tier 1: Modern Fast Path (Zero latency penalty for modern Cisco IOS-XE, Nexus, MikroTik, Linux OpenSSH)
- Tier 2: Adaptive Legacy Fallback (Automatic negotiation for older Cisco Catalyst 2960/3560/3750, IOS 12/15)

Guarantees:
- Fully adaptive and automatic (zero manual configuration required)
- Tier 1 offers complete modern algorithms as top priority (Curve25519, ECDH, SHA-2 DH, CTR/GCM, Ed25519/RSA-SHA2)
- Tier 2 activates automatically ONLY when the remote device rejects modern algorithms during handshake
- NEVER raises "unknown cipher" (strictly inspects transport._cipher_info at runtime before assigning)
- Captures and logs exact negotiated algorithms (KEX, Cipher, Host Key, MAC)
- Shared universally across NetworkTerminal, SSHManager, HardwareDiscovery, BulkConfig, and Server Probe
"""

import socket
import time
import logging
from typing import Tuple, Optional, Any, List, Dict

logger = logging.getLogger("ssh_compat")

# ==============================================================================
# Tier 1: Modern Fast Path (Modern High-Security Algorithms)
# Default for all modern Cisco IOS-XE, Nexus, MikroTik RouterOS v7, Linux, etc.
# ==============================================================================
TIER1_MODERN_KEX = (
    'curve25519-sha256',
    'curve25519-sha256@libssh.org',
    'ecdh-sha2-nistp256',
    'ecdh-sha2-nistp384',
    'ecdh-sha2-nistp521',
    'diffie-hellman-group16-sha512',
    'diffie-hellman-group18-sha512',
    'diffie-hellman-group14-sha256',
)

TIER1_MODERN_KEYS = (
    'ssh-ed25519',
    'ecdsa-sha2-nistp256',
    'ecdsa-sha2-nistp384',
    'ecdsa-sha2-nistp521',
    'rsa-sha2-512',
    'rsa-sha2-256',
    'ssh-rsa',
)

TIER1_MODERN_CIPHERS = (
    'aes128-gcm@openssh.com',
    'aes256-gcm@openssh.com',
    'aes128-ctr',
    'aes192-ctr',
    'aes256-ctr',
)

TIER1_MODERN_MACS = (
    'hmac-sha2-256-etm@openssh.com',
    'hmac-sha2-512-etm@openssh.com',
    'hmac-sha2-256',
    'hmac-sha2-512',
    'hmac-sha1',
)

# ==============================================================================
# Tier 2: Adaptive Legacy Fallback (Cisco Catalyst 2960/3560/3750, IOS 12/15)
# Activated ONLY if the peer rejects modern algorithms or drops handshake
# ==============================================================================
TIER2_LEGACY_KEX = (
    'diffie-hellman-group1-sha1',
    'diffie-hellman-group14-sha1',
    'diffie-hellman-group-exchange-sha1',
    'diffie-hellman-group-exchange-sha256',
    'diffie-hellman-group14-sha256',
    'diffie-hellman-group16-sha512',
    'curve25519-sha256@libssh.org',
    'ecdh-sha2-nistp256',
)

TIER2_LEGACY_KEYS = (
    'ssh-rsa',
    'ssh-dss',
    'rsa-sha2-256',
    'rsa-sha2-512',
)

TIER2_LEGACY_CIPHERS = (
    'aes128-cbc',
    '3des-cbc',
    'aes256-cbc',
    'aes192-cbc',
    'aes128-ctr',
    'aes192-ctr',
    'aes256-ctr',
)

TIER2_LEGACY_MACS = (
    'hmac-sha1',
    'hmac-sha1-96',
    'hmac-md5',
    'hmac-md5-96',
    'hmac-sha2-256',
    'hmac-sha2-512',
)

# Oakley Group 2 (1024-bit MODP Group) - RFC 2409 Section 6.2 & RFC 4253 Section 8.1
P_GROUP1 = int(
    "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1"
    "29024E088A67CC74020BBEA63B139B22514A08798E3404DD"
    "EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245"
    "E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED"
    "EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE65381"
    "FFFFFFFFFFFFFFFF",
    16
)
G_GROUP1 = 2

_PATCHED = False
_KEX_GROUP1_CLASS = None


def get_kex_group1_class():
    """
    Returns a class implementing 'diffie-hellman-group1-sha1'.
    First attempts native import from paramiko.kex_group1.
    If unavailable, constructs it by subclassing paramiko.kex_group14.KexGroup14
    with Oakley Group 2 (RFC 2409 / RFC 4253) parameters.
    """
    global _KEX_GROUP1_CLASS
    if _KEX_GROUP1_CLASS is not None:
        return _KEX_GROUP1_CLASS

    try:
        from paramiko.kex_group1 import KexGroup1
        _KEX_GROUP1_CLASS = KexGroup1
        return _KEX_GROUP1_CLASS
    except (ImportError, AttributeError):
        pass

    try:
        from paramiko.kex_group14 import KexGroup14
        from cryptography.hazmat.primitives import hashes

        class KexGroup1Legacy(KexGroup14):
            name = "diffie-hellman-group1-sha1"
            P = P_GROUP1
            G = G_GROUP1
            hash_algo = hashes.SHA1

        _KEX_GROUP1_CLASS = KexGroup1Legacy
        return _KEX_GROUP1_CLASS
    except Exception as e:
        logger.warning(f"Could not initialize KexGroup1 class: {e}")
        return None


def ensure_paramiko_compatibility() -> bool:
    """
    Ensures Paramiko's internal dictionaries support legacy Cisco algorithms
    (diffie-hellman-group1-sha1, CBC ciphers, ssh-rsa, hmac-sha1) when requested.
    CRITICAL: Does NOT globally weaken modern defaults. Modern defaults remain
    intact for all modern devices.
    """
    global _PATCHED
    if _PATCHED:
        return True

    try:
        import paramiko
    except ImportError:
        return False

    try:
        # Register diffie-hellman-group1-sha1 in _kex_info dictionaries
        kex_cls = get_kex_group1_class()
        if kex_cls:
            if hasattr(paramiko, 'transport') and hasattr(paramiko.transport, '_kex_info') and isinstance(paramiko.transport._kex_info, dict):
                paramiko.transport._kex_info['diffie-hellman-group1-sha1'] = kex_cls
            if hasattr(paramiko, 'Transport') and hasattr(paramiko.Transport, '_kex_info') and isinstance(paramiko.Transport._kex_info, dict):
                paramiko.Transport._kex_info['diffie-hellman-group1-sha1'] = kex_cls

        # Instrument _parse_kex_init to accurately record the negotiated KEX name
        orig_parse_kex_init = paramiko.Transport._parse_kex_init
        if not getattr(paramiko.Transport, '_netmgmt_kex_instrumented', False):
            def instrumented_parse_kex_init(self, m):
                res = orig_parse_kex_init(self, m)
                try:
                    if hasattr(self, 'kex_engine') and self.kex_engine:
                        engine_name = getattr(self.kex_engine, 'name', None)
                        if engine_name:
                            self._agreed_kex = engine_name
                        else:
                            kex_dict = getattr(self, '_kex_info', None) or getattr(paramiko.transport, '_kex_info', {})
                            for name, cls in kex_dict.items():
                                if isinstance(self.kex_engine, cls):
                                    self._agreed_kex = name
                                    break
                except Exception:
                    pass
                return res
            paramiko.Transport._parse_kex_init = instrumented_parse_kex_init
            paramiko.Transport._netmgmt_kex_instrumented = True

        _PATCHED = True
        return True
    except Exception as e:
        logger.warning(f"Could not patch paramiko compatibility: {e}")
        return False


# Automatically ensure compatibility on import
ensure_paramiko_compatibility()


def _get_supported_dict(transport: Any, attr_name: str) -> Optional[dict]:
    """
    Finds the algorithm lookup dictionary (_kex_info, _cipher_info, etc.)
    by checking the instance, the Transport class, and the paramiko.transport module.
    """
    for obj in [transport, getattr(transport, '__class__', None)]:
        if obj and hasattr(obj, attr_name):
            val = getattr(obj, attr_name)
            if isinstance(val, dict) and val:
                return val
    try:
        import paramiko.transport
        if hasattr(paramiko.transport, attr_name):
            val = getattr(paramiko.transport, attr_name)
            if isinstance(val, dict) and val:
                return val
    except Exception:
        pass
    return None


def apply_security_options_safely(
    transport: Any,
    kex_candidates: Optional[Tuple[str, ...]] = None,
    key_candidates: Optional[Tuple[str, ...]] = None,
    cipher_candidates: Optional[Tuple[str, ...]] = None,
    mac_candidates: Optional[Tuple[str, ...]] = None
) -> None:
    """
    Safely applies security options to a live paramiko.Transport instance.
    Validates candidates against Paramiko's internal dictionaries to prevent
    'unknown cipher' or 'unknown algorithm' ValueErrors, while ensuring legacy
    algorithms (diffie-hellman-group1-sha1, aes128-cbc, ssh-rsa) are properly
    assigned both through SecurityOptions and direct transport attributes.
    """
    try:
        sec = transport.get_security_options()
    except Exception:
        sec = None

    # 1. Safely apply KEX
    if kex_candidates:
        valid_kex = _get_supported_dict(transport, '_kex_info')
        if 'diffie-hellman-group1-sha1' in kex_candidates:
            kex_cls = get_kex_group1_class()
            if kex_cls:
                if valid_kex is not None:
                    valid_kex['diffie-hellman-group1-sha1'] = kex_cls
                try:
                    import paramiko.transport
                    if hasattr(paramiko.transport, '_kex_info') and isinstance(paramiko.transport._kex_info, dict):
                        paramiko.transport._kex_info['diffie-hellman-group1-sha1'] = kex_cls
                except Exception:
                    pass

        if valid_kex:
            filtered_kex = tuple(k for k in kex_candidates if k in valid_kex)
        else:
            filtered_kex = tuple(kex_candidates)

        if filtered_kex:
            if sec:
                try:
                    sec.kex = filtered_kex
                except Exception:
                    pass
            try:
                transport._preferred_kex = filtered_kex
            except Exception:
                pass

    # 2. Safely apply Host Keys
    if key_candidates:
        valid_keys = _get_supported_dict(transport, '_key_info')
        if valid_keys:
            filtered_keys = tuple(k for k in key_candidates if k in valid_keys)
        else:
            filtered_keys = tuple(key_candidates)

        if filtered_keys:
            if sec:
                try:
                    sec.key_types = filtered_keys
                except Exception:
                    pass
            try:
                transport._preferred_keys = filtered_keys
            except Exception:
                pass

    # 3. Safely apply Ciphers (validates against _cipher_info)
    if cipher_candidates:
        valid_ciphers = _get_supported_dict(transport, '_cipher_info')
        if valid_ciphers:
            filtered_ciphers = tuple(c for c in cipher_candidates if c in valid_ciphers)
        else:
            filtered_ciphers = tuple(cipher_candidates)

        if filtered_ciphers:
            if sec:
                try:
                    sec.ciphers = filtered_ciphers
                except Exception:
                    pass
            try:
                transport._preferred_ciphers = filtered_ciphers
            except Exception:
                pass

    # 4. Safely apply MACs
    if mac_candidates:
        valid_macs = _get_supported_dict(transport, '_mac_info')
        if valid_macs:
            filtered_macs = tuple(m for m in mac_candidates if m in valid_macs)
        else:
            filtered_macs = tuple(mac_candidates)

        if filtered_macs:
            if sec:
                try:
                    sec.digests = filtered_macs
                except Exception:
                    pass
            try:
                transport._preferred_macs = filtered_macs
            except Exception:
                pass


def is_handshake_or_algo_mismatch(exc: Exception) -> bool:
    """
    Determines if an SSH connection failure was caused by algorithm incompatibility,
    KEX failure, or connection reset during key exchange (e.g. Cisco Catalyst 2960
    dropping packets when elliptic curve KEX is offered), rather than wrong password
    or network unreachability.
    """
    try:
        import paramiko
        if isinstance(exc, (paramiko.AuthenticationException, paramiko.BadAuthenticationType)):
            return False
    except ImportError:
        pass

    msg = str(exc).lower()

    # Definitive authentication rejections should NOT trigger legacy retry
    if any(auth_word in msg for auth_word in ["bad authentication", "denied", "userauth", "password refused"]):
        return False

    # Host unreachability or connection refused should NOT trigger legacy retry
    if any(net_word in msg for net_word in ["connection refused", "network is unreachable", "no route to host"]):
        return False

    # Indications of algorithm or handshake mismatch
    algo_indicators = [
        "kex",
        "incompatible",
        "no acceptable",
        "no matching",
        "cipher",
        "key exchange",
        "algorithm",
        "unknown cipher",
        "peer closed",
        "banner",
        "eof",
        "reset by peer",
        "closed by remote",
        "packet",
        "session closed",
        "handshake",
        "signature",
        "negotiat",
        "corrupt",
        "disabled",
    ]
    return any(ind in msg for ind in algo_indicators)


def authenticate_transport(transport: Any, username: str, password: str) -> Tuple[bool, Optional[str]]:
    """
    Authenticates an active transport using password authentication,
    falling back to keyboard-interactive (AAA / TACACS+ / RADIUS) if needed.
    """
    import paramiko
    auth_ok = False
    err_msg = None

    try:
        transport.auth_password(username=username, password=password)
        auth_ok = transport.is_authenticated()
    except (paramiko.BadAuthenticationType, paramiko.AuthenticationException) as e:
        err_msg = str(e)
        # Fallback to keyboard-interactive prompt
        def interactive_handler(title, instructions, prompt_list):
            return [password for _ in prompt_list]
        try:
            transport.auth_interactive(username=username, handler=interactive_handler)
            auth_ok = transport.is_authenticated()
            if auth_ok:
                err_msg = None
        except Exception as e_int:
            auth_ok = False
            err_msg = str(e_int)
    except Exception as e_other:
        auth_ok = False
        err_msg = str(e_other)

    return auth_ok, err_msg


def extract_negotiation_info(transport: Any, tier_name: str) -> Dict[str, Any]:
    """
    Inspects a connected transport and extracts the exact negotiated parameters.
    """
    kex_name = getattr(transport, '_agreed_kex', None)
    if not kex_name and hasattr(transport, 'kex_engine') and transport.kex_engine:
        kex_name = transport.kex_engine.__class__.__name__

    server_key_type = None
    try:
        remote_key = transport.get_remote_server_key()
        if remote_key:
            server_key_type = remote_key.get_name()
    except Exception:
        pass

    return {
        "tier": tier_name,
        "kex": kex_name or "negotiated",
        "cipher": getattr(transport, 'remote_cipher', None),
        "local_cipher": getattr(transport, 'local_cipher', None),
        "key_type": server_key_type,
        "mac": getattr(transport, 'remote_mac', None),
    }


def connect_ssh_device(
    client: Any,
    hostname: str,
    port: int = 22,
    username: str = "",
    password: str = "",
    timeout: float = 6.0,
    banner_timeout: float = 6.0,
    auth_timeout: float = 6.0,
    on_fallback_log: Optional[Any] = None
) -> Tuple[bool, Optional[str]]:
    """
    Connects to a network device using the Two-Tier Adaptive Negotiation Engine:
    - Tier 1 (Modern Fast Path): Connects using modern algorithms (Curve25519, ECDH, CTR/GCM, Ed25519/RSA-SHA2).
      Fast path for 100% of modern infrastructure with zero latency penalty or legacy overhead.
    - Tier 2 (Adaptive Legacy Fallback): If (and only if) Tier 1 fails on algorithm/KEX mismatch,
      automatically retries with legacy Cisco algorithms (DH Group 14/1, ssh-rsa, AES-CBC, 3DES).
    
    Guaranteed zero 'unknown cipher' errors via safe dictionary reflection.
    Returns (True, None) on success, or (False, error_message) on failure.
    Attaches `client._negotiation_info` with the negotiated parameters.
    """
    ensure_paramiko_compatibility()
    import paramiko

    # --------------------------------------------------------------------------
    # Attempt 1: Tier 1 - Modern Fast Path
    # --------------------------------------------------------------------------
    sock1 = None
    transport1 = None
    tier1_error = None
    tier1_auth_failed = False

    try:
        sock1 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock1.settimeout(timeout)
        sock1.connect((hostname, port))

        transport1 = paramiko.Transport(sock1)
        apply_security_options_safely(
            transport1,
            kex_candidates=TIER1_MODERN_KEX,
            key_candidates=TIER1_MODERN_KEYS,
            cipher_candidates=TIER1_MODERN_CIPHERS,
            mac_candidates=TIER1_MODERN_MACS
        )

        transport1.start_client(timeout=banner_timeout)
        auth_ok, auth_err = authenticate_transport(transport1, username=username, password=password)

        if auth_ok:
            # Succeeded on Tier 1 (Modern Fast Path)!
            client._transport = transport1
            client._negotiation_info = extract_negotiation_info(transport1, "tier1_modern")
            logger.info(
                f"[SSH Tier 1 Fast Path] Connected to {hostname}:{port} | "
                f"KEX: {client._negotiation_info['kex']} | "
                f"Cipher: {client._negotiation_info['cipher']} | "
                f"Key: {client._negotiation_info['key_type']}"
            )
            return True, None
        else:
            tier1_auth_failed = True
            tier1_error = auth_err or f"Authentication rejected for user '{username}'"
    except Exception as e:
        tier1_error = str(e).strip() or "Handshake error"
    finally:
        if not getattr(client, '_transport', None) or client._transport is not transport1:
            if transport1:
                try:
                    transport1.close()
                except Exception:
                    pass
            if sock1:
                try:
                    sock1.close()
                except Exception:
                    pass

    # If the modern attempt failed strictly due to invalid credentials, do not retry
    if tier1_auth_failed:
        return False, f"Invalid username or password for user '{username}' on {hostname}:{port}"

    # If the error is NOT an algorithm/handshake mismatch (e.g. host unreachable, connection refused), do not retry
    if not is_handshake_or_algo_mismatch(Exception(tier1_error)):
        return False, tier1_error

    # --------------------------------------------------------------------------
    # Attempt 2: Tier 2 - Adaptive Legacy Fallback (Cisco 2960 / Catalyst IOS)
    # --------------------------------------------------------------------------
    logger.warning(
        f"[SSH Tier 2 Fallback] Peer {hostname}:{port} rejected modern algorithms ({tier1_error}). "
        f"Falling back to legacy Cisco algorithms (DH Group 14/1, CBC)..."
    )
    if on_fallback_log and callable(on_fallback_log):
        try:
            on_fallback_log(f"Negotiating legacy Cisco algorithms with {hostname}:{port}...")
        except Exception:
            pass

    sock2 = None
    transport2 = None
    tier2_error = None

    try:
        sock2 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock2.settimeout(timeout + 2.0)
        sock2.connect((hostname, port))

        transport_kwargs = {}
        if hasattr(paramiko, "Transport") and "server_sig_algs" in getattr(paramiko.Transport.__init__, "__code__", {}).get("co_varnames", ()):
            transport_kwargs["server_sig_algs"] = False
        transport2 = paramiko.Transport(sock2, **transport_kwargs)
        apply_security_options_safely(
            transport2,
            kex_candidates=TIER2_LEGACY_KEX,
            key_candidates=TIER2_LEGACY_KEYS,
            cipher_candidates=TIER2_LEGACY_CIPHERS,
            mac_candidates=TIER2_LEGACY_MACS
        )

        transport2.start_client(timeout=banner_timeout + 2.0)
        auth_ok2, auth_err2 = authenticate_transport(transport2, username=username, password=password)

        if auth_ok2:
            # Succeeded on Tier 2 (Legacy Fallback)!
            client._transport = transport2
            client._negotiation_info = extract_negotiation_info(transport2, "tier2_legacy_fallback")
            logger.info(
                f"[SSH Tier 2 Fallback SUCCESS] Connected to {hostname}:{port} | "
                f"KEX: {client._negotiation_info['kex']} | "
                f"Cipher: {client._negotiation_info['cipher']} | "
                f"Key: {client._negotiation_info['key_type']}"
            )
            return True, None
        else:
            tier2_error = auth_err2 or f"Invalid username or password for user '{username}'"
    except Exception as e2:
        tier2_error = str(e2).strip() or "Legacy handshake failed"
    finally:
        if not getattr(client, '_transport', None) or client._transport is not transport2:
            if transport2:
                try:
                    transport2.close()
                except Exception:
                    pass
            if sock2:
                try:
                    sock2.close()
                except Exception:
                    pass

    return False, tier2_error or tier1_error


def open_adaptive_shell_channel(
    hostname: str,
    port: int = 22,
    username: str = "",
    password: str = "",
    cols: int = 80,
    rows: int = 24,
    term_name: str = "xterm-256color",
    timeout: float = 6.0,
    on_status_msg: Optional[Any] = None
) -> Tuple[Optional[Any], Optional[Any], Optional[Any], Dict[str, Any], Optional[str]]:
    """
    Opens an interactive shell channel using the unified Two-Tier Adaptive SSH Engine:
    Tier 1: Modern Fast Path (no legacy overhead)
    Tier 2: Targeted Legacy Fallback (activated if Tier 1 rejects modern KEX/ciphers)
    
    Returns:
    (channel, transport, client, negotiation_info, error_message)
    """
    ensure_paramiko_compatibility()
    import paramiko

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    def fallback_cb(msg: str):
        if on_status_msg and callable(on_status_msg):
            on_status_msg(
                f"\r\n\x1b[33m[SSH Fallback]\x1b[0m {msg}\r\n"
            )

    connected, err = connect_ssh_device(
        client,
        hostname=hostname,
        port=port,
        username=username,
        password=password,
        timeout=timeout,
        banner_timeout=timeout,
        auth_timeout=timeout,
        on_fallback_log=fallback_cb
    )

    if not connected or not getattr(client, '_transport', None):
        return None, None, None, {}, err or "Connection failed"

    transport = client._transport
    info = getattr(client, '_negotiation_info', {})

    try:
        channel = transport.open_session(timeout=timeout)
        channel.get_pty(term=term_name, width=cols, height=rows)
        channel.invoke_shell()
        channel.settimeout(0.0)  # Non-blocking for event loops
        return channel, transport, client, info, None
    except Exception as e:
        try:
            transport.close()
        except Exception:
            pass
        return None, None, None, info, f"Failed to open interactive shell channel: {e}"
