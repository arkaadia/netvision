"""
NetTopology Credential Security & Encryption Module
Provides symmetric authenticated encryption (Fernet / AES-128-CBC + HMAC-SHA256)
for network device credentials (SSH passwords, enable secrets, API keys).
"""
import os
import sys
import base64
import json
from typing import Optional, Any

# Ensure cryptography is available
try:
    from cryptography.fernet import Fernet, InvalidToken
    HAS_CRYPTOGRAPHY = True
except ImportError:
    HAS_CRYPTOGRAPHY = False
    Fernet = None
    InvalidToken = Exception

# File path to persist the secret encryption key
_SECURITY_DIR = os.path.dirname(os.path.abspath(__file__))
_KEY_FILE = os.path.join(_SECURITY_DIR, ".secret.key")
_PREFIX = "enc:fernet:"

_cached_fernet: Optional[Any] = None

def get_or_create_encryption_key() -> bytes:
    """Retrieves existing encryption key or generates and securely saves a new one."""
    env_key = os.environ.get("NETTOP_ENCRYPTION_KEY") or os.environ.get("ENCRYPTION_KEY")
    if env_key:
        try:
            k = env_key.strip().encode("utf-8")
            # Validate key format
            if len(k) == 44 and HAS_CRYPTOGRAPHY:
                Fernet(k)
                return k
        except Exception:
            pass

    if os.path.exists(_KEY_FILE):
        try:
            with open(_KEY_FILE, "rb") as f:
                k = f.read().strip()
                if len(k) == 44 and HAS_CRYPTOGRAPHY:
                    Fernet(k)
                    return k
        except Exception as e:
            print(f"[Crypto] Warning reading {_KEY_FILE}: {e}")

    # Generate new persistent key
    if HAS_CRYPTOGRAPHY:
        new_key = Fernet.generate_key()
    else:
        # Fallback 32-byte urlsafe base64 key if cryptography is missing
        new_key = base64.urlsafe_b64encode(os.urandom(32))

    try:
        os.makedirs(_SECURITY_DIR, exist_ok=True)
        # Write with secure permissions (0600)
        fd = os.open(_KEY_FILE, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "wb") as f:
            f.write(new_key)
        print(f"[Crypto] Generated new persistent encryption key in {_KEY_FILE}")
    except Exception as e:
        print(f"[Crypto] Warning saving encryption key to {_KEY_FILE}: {e}")

    return new_key

def get_fernet() -> Optional[Any]:
    global _cached_fernet
    if _cached_fernet is not None:
        return _cached_fernet

    if not HAS_CRYPTOGRAPHY:
        return None

    try:
        key = get_or_create_encryption_key()
        _cached_fernet = Fernet(key)
        return _cached_fernet
    except Exception as e:
        print(f"[Crypto] Error initializing Fernet engine: {e}")
        return None

def is_encrypted(val: Optional[str]) -> bool:
    """Checks if a credential string is already encrypted."""
    if not val or not isinstance(val, str):
        return False
    return val.startswith(_PREFIX) or val.startswith("gAAAAA")

def encrypt_credential(plain_text: Optional[str]) -> str:
    """
    Encrypts a cleartext password or secret.
    Returns format 'enc:fernet:<token>'.
    If already encrypted or empty, returns as is.
    """
    if not plain_text or not isinstance(plain_text, str):
        return ""
    if is_encrypted(plain_text):
        return plain_text

    f = get_fernet()
    if not f:
        # If cryptography is not yet initialized, return cleartext
        return plain_text

    try:
        token = f.encrypt(plain_text.encode("utf-8")).decode("utf-8")
        return f"{_PREFIX}{token}"
    except Exception as e:
        print(f"[Crypto] Encryption failed: {e}")
        return plain_text

def decrypt_credential(cipher_text: Optional[str]) -> str:
    """
    Decrypts an encrypted credential back to cleartext.
    Supports 'enc:fernet:<token>' and raw tokens.
    If cleartext or decryption fails, safely returns the input value.
    """
    if not cipher_text or not isinstance(cipher_text, str):
        return ""
    if not is_encrypted(cipher_text):
        return cipher_text

    f = get_fernet()
    if not f:
        return cipher_text

    token_str = cipher_text
    if cipher_text.startswith(_PREFIX):
        token_str = cipher_text[len(_PREFIX):]

    try:
        decrypted = f.decrypt(token_str.encode("utf-8")).decode("utf-8")
        return decrypted
    except InvalidToken:
        print("[Crypto] Warning: Invalid token or mismatched encryption key.")
        return cipher_text
    except Exception as e:
        print(f"[Crypto] Decryption error: {e}")
        return cipher_text

def mask_credential(val: Optional[str]) -> str:
    """Returns masked stars for safe presentation in UI."""
    if not val:
        return ""
    return "********"

def migrate_database_credentials(db_file_path: str) -> int:
    """
    Scans a JSON database file and encrypts any unencrypted device credentials
    in-place while preserving all other attributes.
    Returns the number of migrated fields.
    """
    if not os.path.exists(db_file_path):
        return 0

    try:
        with open(db_file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        devices = data.get("devices", [])
        if not isinstance(devices, list):
            return 0

        migrated_count = 0
        for dev in devices:
            # 1. ssh_password
            if "ssh_password" in dev and dev["ssh_password"] and not is_encrypted(dev["ssh_password"]):
                dev["ssh_password"] = encrypt_credential(dev["ssh_password"])
                migrated_count += 1

            # 2. enable_password
            if "enable_password" in dev and dev["enable_password"] and not is_encrypted(dev["enable_password"]):
                dev["enable_password"] = encrypt_credential(dev["enable_password"])
                migrated_count += 1

            # 3. connection.password
            conn = dev.get("connection")
            if isinstance(conn, dict):
                if "password" in conn and conn["password"] and not is_encrypted(conn["password"]):
                    conn["password"] = encrypt_credential(conn["password"])
                    migrated_count += 1

        if migrated_count > 0:
            with open(db_file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"[Crypto] Encrypted {migrated_count} cleartext credential fields in {db_file_path}")

        return migrated_count
    except Exception as e:
        print(f"[Crypto] Error during database credential migration in {db_file_path}: {e}")
        return 0
