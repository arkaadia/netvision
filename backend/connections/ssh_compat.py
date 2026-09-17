"""
ssh_compat.py - Enterprise SSH Compatibility & Adaptive Multi-Profile Engine
Supports seamless SSH connection across both modern and legacy network equipment:
- Cisco Catalyst (2960, 3560, 3750, 4500, 6500 with IOS 12.x / 15.x)
- Cisco IOS-XE, Nexus NX-OS, ASA, ISR 4000
- MikroTik RouterOS (v6 & v7)
- Huawei VRP, HP ProCurve / Aruba, Juniper Junos, Fortinet FortiOS, Linux/Unix

Resolves:
- "Incompatible ssh peer (no acceptable kex algorithm)"
- "Incompatible ssh peer (no acceptable cipher)" / "unknown cipher"
- "Incompatible ssh peer (no acceptable host key)"
- "BadAuthenticationType" (keyboard-interactive fallback)
"""

import socket
import time
import logging
from typing import Tuple, Optional, Any, List, Dict

logger = logging.getLogger("ssh_compat")

# 1. Comprehensive Key Exchange (KEX) algorithms (Modern Elliptic Curves + Legacy DH)
ALL_KEX = (
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
ALL_KEYS = (
    'ssh-ed25519',
    'ecdsa-sha2-nistp256',
    'ecdsa-sha2-nistp384',
    'ecdsa-sha2-nistp521',
    'rsa-sha2-512',
    'rsa-sha2-256',
    'ssh-rsa',
    'ssh-dss',
)

# 3. Known Safe Ciphers implemented in Paramiko (CTR, CBC, 3DES, GCM)
# Note: DO NOT include 'chacha20-poly1305@openssh.com', 'blowfish-cbc', or 'cast128-cbc'
# as Paramiko does not implement them and raises 'unknown cipher'.
BASE_CIPHERS = (
    'aes128-ctr',
    'aes192-ctr',
    'aes256-ctr',
    'aes128-cbc',
    'aes192-cbc',
    'aes256-cbc',
    '3des-cbc',
    'aes128-gcm@openssh.com',
    'aes256-gcm@openssh.com',
)

# 4. Comprehensive MAC Digests
ALL_MACS = (
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


def get_paramiko_supported_ciphers() -> Tuple[str, ...]:
    """
    Returns only ciphers strictly supported by the loaded paramiko installation
    to prevent 'unknown cipher' exceptions.
    """
    try:
        import paramiko
        info = getattr(paramiko.transport, '_cipher_info', {})
        if info and isinstance(info, dict):
            supported = tuple(c for c in BASE_CIPHERS if c in info)
            if supported:
                return supported
    except Exception:
        pass
    # Fallback to standard CTR and CBC that are universally present across all Paramiko versions
    return (
        'aes128-ctr',
        'aes192-ctr',
        'aes256-ctr',
        'aes128-cbc',
        'aes192-cbc',
        'aes256-cbc',
        '3des-cbc'
    )


_PATCHED = False


def ensure_paramiko_compatibility() -> bool:
    """
    Globally patches Paramiko Transport class attributes so that general
    SSHClient connections automatically include legacy and modern algorithms.
    Filters ciphers to only those Paramiko can actually decode.
    """
    global _PATCHED
    if _PATCHED:
        return True

    try:
        import paramiko
    except ImportError:
        return False

    try:
        safe_ciphers = get_paramiko_supported_ciphers()

        # Update class-level preferred algorithms on paramiko.Transport
        for attr, algorithms in [
            ('_preferred_kex', ALL_KEX),
            ('_preferred_keys', ALL_KEYS),
            ('_preferred_ciphers', safe_ciphers),
            ('_preferred_macs', ALL_MACS),
        ]:
            existing = getattr(paramiko.Transport, attr, ())
            merged = tuple(algorithms) + tuple(x for x in existing if x not in algorithms)
            setattr(paramiko.Transport, attr, merged)

        _PATCHED = True
        return True
    except Exception as e:
        logger.warning(f"Could not patch paramiko transport: {e}")
        return False


# Auto-run patch on import
ensure_paramiko_compatibility()


def _get_negotiation_profiles() -> List[Dict[str, Any]]:
    """
    Returns an ordered list of algorithm negotiation profiles.
    If a device rejects or fails a specific algorithm set (e.g. Cisco Catalyst
    with old DH vs modern Fortinet or Linux), the connector cascades to the next profile.
    """
    safe_ciphers = get_paramiko_supported_ciphers()
    cbc_ciphers = tuple(c for c in ('aes128-cbc', '3des-cbc', 'aes256-cbc', 'aes192-cbc') if c in safe_ciphers)
    ctr_ciphers = tuple(c for c in ('aes128-ctr', 'aes192-ctr', 'aes256-ctr') if c in safe_ciphers)

    return [
        # Profile 1: Universal Broad Multi-Vendor (Modern EC + Legacy DH + Safe Ciphers)
        {
            "name": "Universal Adaptive",
            "kex": ALL_KEX,
            "keys": ALL_KEYS,
            "ciphers": safe_ciphers,
            "digests": ALL_MACS,
        },
        # Profile 2: Cisco Catalyst & Legacy Hardware Priority (DH Group 14/1 + CBC/3DES + ssh-rsa)
        {
            "name": "Cisco Catalyst Legacy Priority",
            "kex": (
                'diffie-hellman-group14-sha1',
                'diffie-hellman-group1-sha1',
                'diffie-hellman-group-exchange-sha1',
                'diffie-hellman-group-exchange-sha256',
                'diffie-hellman-group14-sha256',
            ),
            "keys": ('ssh-rsa', 'ssh-dss', 'rsa-sha2-256', 'rsa-sha2-512'),
            "ciphers": cbc_ciphers + ctr_ciphers if cbc_ciphers else safe_ciphers,
            "digests": ('hmac-sha1', 'hmac-sha1-96', 'hmac-sha2-256', 'hmac-md5', 'hmac-md5-96'),
        },
        # Profile 3: Modern High-Security (Elliptic Curves, CTR, Ed25519, SHA-2)
        {
            "name": "Modern Elliptic & CTR",
            "kex": (
                'curve25519-sha256',
                'curve25519-sha256@libssh.org',
                'ecdh-sha2-nistp256',
                'ecdh-sha2-nistp384',
                'ecdh-sha2-nistp521',
                'diffie-hellman-group14-sha256',
                'diffie-hellman-group16-sha512',
            ),
            "keys": ('ssh-ed25519', 'ecdsa-sha2-nistp256', 'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa'),
            "ciphers": ctr_ciphers + (cbc_ciphers if cbc_ciphers else ()),
            "digests": ('hmac-sha2-256-etm@openssh.com', 'hmac-sha2-512-etm@openssh.com', 'hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1'),
        },
        # Profile 4: Ancient Cisco 12.x / IOS-12 Strict DH-Group1 Minimal
        {
            "name": "Strict Cisco DH-Group1 Minimal",
            "kex": ('diffie-hellman-group1-sha1', 'diffie-hellman-group14-sha1'),
            "keys": ('ssh-rsa', 'ssh-dss'),
            "ciphers": ('aes128-cbc', '3des-cbc', 'aes256-cbc') if any(c in safe_ciphers for c in ('aes128-cbc', '3des-cbc')) else safe_ciphers,
            "digests": ('hmac-sha1', 'hmac-sha1-96', 'hmac-md5'),
        },
    ]


def connect_ssh_device(
    client: Any,
    hostname: str,
    port: int = 22,
    username: str = "",
    password: str = "",
    timeout: float = 5.0,
    banner_timeout: float = 5.0,
    auth_timeout: float = 5.0
) -> Tuple[bool, Optional[str]]:
    """
    Connects a paramiko.SSHClient instance to a network device with an adaptive multi-profile loop:
    - Automatically iterates across multiple KEX, Cipher, and Key profiles without stopping.
    - If a profile fails due to algorithm negotiation, 'unknown cipher', or incompatibility,
      it cleanly closes the socket and tries the next profile.
    - Supports both standard password auth and keyboard-interactive (AAA / TACACS+) fallback.
    
    Returns (True, None) on success, or (False, error_message) on failure.
    """
    ensure_paramiko_compatibility()

    import paramiko

    # Step 1: Standard client connect with auto-negotiation
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
    except Exception as e_init:
        # If failure is clearly invalid credentials (and not cipher/kex mismatch), check if interactive auth works
        err_str = str(e_init).lower()
        if "authentication failed" in err_str and not any(k in err_str for k in ["algorithm", "cipher", "kex", "key", "negotiat"]):
            # Try keyboard-interactive before giving up
            pass

    # Step 2: Adaptive Multi-Profile Cascade
    # Iterates across each profile (Universal, Cisco Catalyst Legacy, Modern EC, Strict Group1)
    profiles = _get_negotiation_profiles()
    last_error_msg: str = "Connection failed"

    for profile in profiles:
        sock = None
        transport = None
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            sock.connect((hostname, port))

            transport = paramiko.Transport(sock)
            sec = transport.get_security_options()

            # Apply profile-specific options safely
            if profile.get("kex"):
                sec.kex = profile["kex"]
            if profile.get("keys"):
                sec.key_types = profile["keys"]
            if profile.get("ciphers"):
                # Always ensure only valid ciphers supported by this Paramiko runtime are passed
                safe_set = get_paramiko_supported_ciphers()
                valid_profile_ciphers = tuple(c for c in profile["ciphers"] if c in safe_set)
                if valid_profile_ciphers:
                    sec.ciphers = valid_profile_ciphers
            if profile.get("digests"):
                sec.digests = profile["digests"]

            transport.start_client(timeout=timeout)

            # Try Password authentication first
            auth_ok = False
            try:
                transport.auth_password(username=username, password=password)
                auth_ok = transport.is_authenticated()
            except (paramiko.BadAuthenticationType, paramiko.AuthenticationException):
                # Fallback to keyboard-interactive (e.g. Cisco AAA, TACACS+, RADIUS, password prompts)
                def interactive_handler(title, instructions, prompt_list):
                    return [password for _ in prompt_list]
                try:
                    transport.auth_interactive(username=username, handler=interactive_handler)
                    auth_ok = transport.is_authenticated()
                except Exception:
                    auth_ok = False

            if auth_ok:
                # Successfully authenticated with this profile!
                client._transport = transport
                return True, None
            else:
                last_error_msg = f"Authentication rejected for user '{username}' (checked profile: {profile['name']})"
                try:
                    transport.close()
                except Exception:
                    pass
                if sock:
                    try:
                        sock.close()
                    except Exception:
                        pass
                continue

        except Exception as e_prof:
            last_error_msg = str(e_prof)
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
            # Don't halt on cipher/kex mismatch - proceed to next profile!
            continue

    return False, last_error_msg
