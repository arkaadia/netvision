"""
ssh_compat.py - Bulletproof Adaptive Multi-Profile SSH Engine for Enterprise & Legacy Hardware
Supports diverse network hardware without halting on algorithm mismatches:
- Cisco Catalyst (2960, 3560, 3750, 4500, 6500)
- Cisco IOS-XE, Nexus NX-OS, ASA, ISR 4000
- MikroTik RouterOS (v6 & v7)
- Huawei VRP, HP ProCurve / Aruba, Juniper Junos, Fortinet, Linux

Guarantees:
- NEVER raises "unknown cipher" (strictly inspects transport._cipher_info before assigning)
- Automatically negotiates legacy Cisco KEX (diffie-hellman-group1-sha1, diffie-hellman-group14-sha1, etc.)
- Supports modern Elliptic Curve algorithms (curve25519, ecdh-sha2-nistp256)
- Automatically cascades through multiple profiles until connection succeeds
- Supports password and keyboard-interactive (AAA / TACACS+ / RADIUS) auth
"""

import socket
import time
import logging
from typing import Tuple, Optional, Any, List, Dict

logger = logging.getLogger("ssh_compat")

# Preferred Key Exchange (KEX) algorithms in order of versatility
CANDIDATE_KEX = (
    'diffie-hellman-group14-sha1',
    'diffie-hellman-group1-sha1',
    'diffie-hellman-group-exchange-sha1',
    'diffie-hellman-group-exchange-sha256',
    'diffie-hellman-group14-sha256',
    'diffie-hellman-group16-sha512',
    'diffie-hellman-group18-sha512',
    'curve25519-sha256',
    'curve25519-sha256@libssh.org',
    'ecdh-sha2-nistp256',
    'ecdh-sha2-nistp384',
    'ecdh-sha2-nistp521',
)

# Preferred Host Key types
CANDIDATE_KEYS = (
    'ssh-rsa',
    'rsa-sha2-256',
    'rsa-sha2-512',
    'ssh-dss',
    'ssh-ed25519',
    'ecdsa-sha2-nistp256',
    'ecdsa-sha2-nistp384',
    'ecdsa-sha2-nistp521',
)

# Preferred Ciphers in order of enterprise network compatibility
CANDIDATE_CIPHERS_CBC_FIRST = (
    'aes128-cbc',
    'aes256-cbc',
    'aes192-cbc',
    '3des-cbc',
    'aes128-ctr',
    'aes192-ctr',
    'aes256-ctr',
    'aes128-gcm@openssh.com',
    'aes256-gcm@openssh.com',
)

CANDIDATE_CIPHERS_CTR_FIRST = (
    'aes128-gcm@openssh.com',
    'aes256-gcm@openssh.com',
    'aes128-ctr',
    'aes192-ctr',
    'aes256-ctr',
    'aes128-cbc',
    'aes256-cbc',
    'aes192-cbc',
    '3des-cbc',
)

# Preferred MAC Digests
CANDIDATE_MACS = (
    'hmac-sha1',
    'hmac-sha1-96',
    'hmac-sha2-256',
    'hmac-sha2-512',
    'hmac-sha2-256-etm@openssh.com',
    'hmac-sha2-512-etm@openssh.com',
    'hmac-sha1-etm@openssh.com',
    'hmac-md5',
    'hmac-md5-96',
)

_PATCHED = False


def ensure_paramiko_compatibility() -> bool:
    """
    Safely registers legacy KEX (DH group1, group14, group-exchange) and legacy
    Host Keys (ssh-rsa, ssh-dss) on paramiko.Transport class defaults.
    Critically: DOES NOT alter _preferred_ciphers to prevent 'unknown cipher' errors.
    """
    global _PATCHED
    if _PATCHED:
        return True

    try:
        import paramiko
    except ImportError:
        return False

    try:
        # 1. Register legacy KEX if supported
        if hasattr(paramiko.Transport, '_preferred_kex'):
            existing_kex = list(paramiko.Transport._preferred_kex)
            for k in [
                'diffie-hellman-group14-sha1',
                'diffie-hellman-group-exchange-sha1',
                'diffie-hellman-group-exchange-sha256',
                'diffie-hellman-group1-sha1'
            ]:
                if k not in existing_kex:
                    existing_kex.append(k)
            paramiko.Transport._preferred_kex = tuple(existing_kex)

        # 2. Register legacy Host Keys (ssh-rsa, ssh-dss)
        if hasattr(paramiko.Transport, '_preferred_keys'):
            existing_keys = list(paramiko.Transport._preferred_keys)
            for k in ['ssh-rsa', 'ssh-dss', 'rsa-sha2-256', 'rsa-sha2-512']:
                if k not in existing_keys:
                    existing_keys.append(k)
            paramiko.Transport._preferred_keys = tuple(existing_keys)

        _PATCHED = True
        return True
    except Exception as e:
        logger.warning(f"Could not patch paramiko defaults: {e}")
        return False


# Auto-run safe patch on import
ensure_paramiko_compatibility()


def apply_security_options_safely(
    transport: Any,
    kex_candidates: Optional[Tuple[str, ...]] = None,
    key_candidates: Optional[Tuple[str, ...]] = None,
    cipher_candidates: Optional[Tuple[str, ...]] = None,
    mac_candidates: Optional[Tuple[str, ...]] = None
) -> None:
    """
    Safely applies security options to a live paramiko.Transport instance.
    Every candidate is strictly filtered against the transport's actual internal
    dictionaries (_cipher_info, _kex_info, _key_info, _mac_info).
    This completely eliminates 'unknown cipher' or 'unknown algorithm' ValueErrors.
    """
    try:
        sec = transport.get_security_options()
    except Exception:
        return

    # 1. Safely apply KEX
    if kex_candidates:
        valid_kex_dict = getattr(transport, '_kex_info', None)
        if valid_kex_dict and isinstance(valid_kex_dict, dict):
            filtered = tuple(k for k in kex_candidates if k in valid_kex_dict)
        else:
            filtered = tuple(k for k in kex_candidates if k in (sec.kex or ()))
        if filtered:
            try:
                sec.kex = filtered
            except Exception:
                pass

    # 2. Safely apply Host Keys
    if key_candidates:
        valid_key_dict = getattr(transport, '_key_info', None)
        if valid_key_dict and isinstance(valid_key_dict, dict):
            filtered = tuple(k for k in key_candidates if k in valid_key_dict)
        else:
            filtered = tuple(k for k in key_candidates if k in (sec.key_types or ()))
        if filtered:
            try:
                sec.key_types = filtered
            except Exception:
                pass

    # 3. Safely apply Ciphers (CRITICAL: only assign what strictly exists in transport._cipher_info)
    if cipher_candidates:
        valid_cipher_dict = getattr(transport, '_cipher_info', None)
        if valid_cipher_dict and isinstance(valid_cipher_dict, dict):
            filtered = tuple(c for c in cipher_candidates if c in valid_cipher_dict)
        else:
            filtered = tuple(c for c in cipher_candidates if c in (sec.ciphers or ()))
        if filtered:
            try:
                sec.ciphers = filtered
            except Exception:
                pass

    # 4. Safely apply MACs
    if mac_candidates:
        valid_mac_dict = getattr(transport, '_mac_info', None)
        if valid_mac_dict and isinstance(valid_mac_dict, dict):
            filtered = tuple(m for m in mac_candidates if m in valid_mac_dict)
        else:
            filtered = tuple(m for m in mac_candidates if m in (sec.digests or ()))
        if filtered:
            try:
                sec.digests = filtered
            except Exception:
                pass


def _get_profiles() -> List[Dict[str, Any]]:
    """
    Returns prioritized algorithm profiles to try sequentially:
    1. Cisco Catalyst Legacy Priority (DH Group 14/1, ssh-rsa, CBC/CTR)
    2. Universal Broad Hybrid (All supported KEX + Keys + Ciphers)
    3. Modern High-Security (EC, Ed25519, CTR/GCM)
    4. Strict Ancient Cisco Minimal (DH Group 1 + 3DES/AES-CBC)
    5. Native Default (Untouched transport defaults)
    """
    return [
        # Profile 1: Cisco Catalyst Legacy Priority (Most common switch requirement)
        {
            "name": "Cisco Catalyst Legacy Priority",
            "kex": (
                'diffie-hellman-group14-sha1',
                'diffie-hellman-group1-sha1',
                'diffie-hellman-group-exchange-sha1',
                'diffie-hellman-group-exchange-sha256',
                'diffie-hellman-group14-sha256',
                'diffie-hellman-group16-sha512',
                'curve25519-sha256',
                'ecdh-sha2-nistp256',
            ),
            "keys": ('ssh-rsa', 'rsa-sha2-256', 'rsa-sha2-512', 'ssh-dss', 'ssh-ed25519', 'ecdsa-sha2-nistp256'),
            "ciphers": CANDIDATE_CIPHERS_CBC_FIRST,
            "macs": CANDIDATE_MACS,
        },
        # Profile 2: Universal Broad Hybrid
        {
            "name": "Universal Broad Hybrid",
            "kex": CANDIDATE_KEX,
            "keys": CANDIDATE_KEYS,
            "ciphers": CANDIDATE_CIPHERS_CTR_FIRST,
            "macs": CANDIDATE_MACS,
        },
        # Profile 3: Modern High-Security (Cisco IOS-XE, Nexus, Fortinet, Linux)
        {
            "name": "Modern Elliptic & CTR",
            "kex": (
                'curve25519-sha256',
                'curve25519-sha256@libssh.org',
                'ecdh-sha2-nistp256',
                'ecdh-sha2-nistp384',
                'diffie-hellman-group14-sha256',
                'diffie-hellman-group16-sha512',
            ),
            "keys": ('ssh-ed25519', 'ecdsa-sha2-nistp256', 'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa'),
            "ciphers": CANDIDATE_CIPHERS_CTR_FIRST,
            "macs": CANDIDATE_MACS,
        },
        # Profile 4: Strict Ancient Cisco (IOS 12.x DH Group 1 Minimal)
        {
            "name": "Strict Cisco DH-Group1 Minimal",
            "kex": ('diffie-hellman-group1-sha1', 'diffie-hellman-group14-sha1'),
            "keys": ('ssh-rsa', 'ssh-dss'),
            "ciphers": CANDIDATE_CIPHERS_CBC_FIRST,
            "macs": ('hmac-sha1', 'hmac-sha1-96', 'hmac-md5'),
        },
        # Profile 5: Native Defaults (Fallback with zero modifications)
        {
            "name": "Native Paramiko Defaults",
            "kex": None,
            "keys": None,
            "ciphers": None,
            "macs": None,
        },
    ]


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
    Connects to a network device using an adaptive multi-profile loop:
    - Iterates across algorithm profiles until connection succeeds.
    - Does NOT halt on algorithm or cipher mismatches.
    - Guaranteed zero 'unknown cipher' errors via safe dictionary reflection.
    - Automatic password and keyboard-interactive (AAA/TACACS+) fallback.
    
    Returns (True, None) on success, or (False, error_message) on failure.
    """
    ensure_paramiko_compatibility()

    import paramiko

    profiles = _get_profiles()
    last_error_msg: str = "Connection failed"
    auth_failed_detected = False

    for profile in profiles:
        sock = None
        transport = None
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            sock.connect((hostname, port))

            transport = paramiko.Transport(sock)

            # Apply candidate algorithms safely (zero risk of unknown cipher ValueError)
            apply_security_options_safely(
                transport,
                kex_candidates=profile.get("kex"),
                key_candidates=profile.get("keys"),
                cipher_candidates=profile.get("ciphers"),
                mac_candidates=profile.get("macs")
            )

            # Start SSH handshake
            transport.start_client(timeout=timeout)

            # Attempt Password Authentication
            auth_ok = False
            try:
                transport.auth_password(username=username, password=password)
                auth_ok = transport.is_authenticated()
            except (paramiko.BadAuthenticationType, paramiko.AuthenticationException):
                # Fallback to Keyboard-Interactive (e.g. Cisco AAA, TACACS+, RADIUS, password prompts)
                def interactive_handler(title, instructions, prompt_list):
                    return [password for _ in prompt_list]
                try:
                    transport.auth_interactive(username=username, handler=interactive_handler)
                    auth_ok = transport.is_authenticated()
                except Exception:
                    auth_ok = False

            if auth_ok:
                # Successfully connected and authenticated!
                client._transport = transport
                return True, None
            else:
                auth_failed_detected = True
                last_error_msg = f"Invalid username or password for user '{username}'"
                try:
                    transport.close()
                except Exception:
                    pass
                if sock:
                    try:
                        sock.close()
                    except Exception:
                        pass
                # Try next profile in case another profile authenticates differently
                continue

        except Exception as e_prof:
            err_str = str(e_prof).strip()
            if err_str:
                last_error_msg = err_str
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
            # Seamlessly proceed to the next profile!
            continue

    if auth_failed_detected and "password" not in last_error_msg.lower():
        last_error_msg = f"Authentication rejected for user '{username}'"

    return False, last_error_msg
