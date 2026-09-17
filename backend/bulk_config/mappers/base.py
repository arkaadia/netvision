"""
Base OS Command Mapper Interface
Defines the standard abstraction contract for translating logical operations into OS-specific CLI steps.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple
from ..models import CommandStep, IdempotencyResult, ErrorType

def parse_ip_and_mask(ip_input: str, mask_input: str = "255.255.255.0") -> Tuple[str, str, int]:
    """
    Parses arbitrary IP and Subnet mask/CIDR inputs into standard components:
    Returns (clean_ip, dotted_netmask, cidr_prefix)
    e.g. ("192.168.10.1", "255.255.255.0", 24)
    """
    ip_raw = (ip_input or "").strip()
    mask_raw = (mask_input or "255.255.255.0").strip()

    # Check if IP has CIDR attached (e.g. 192.168.10.1/24)
    if "/" in ip_raw:
        parts = ip_raw.split("/", 1)
        ip_raw = parts[0].strip()
        mask_raw = parts[1].strip()

    # Parse prefix length
    clean_mask_str = mask_raw.lstrip("/")
    if clean_mask_str.isdigit():
        cidr = max(0, min(32, int(clean_mask_str)))
        mask_int = (0xFFFFFFFF << (32 - cidr)) & 0xFFFFFFFF
        dotted = f"{(mask_int >> 24) & 0xFF}.{(mask_int >> 16) & 0xFF}.{(mask_int >> 8) & 0xFF}.{mask_int & 0xFF}"
        return (ip_raw, dotted, cidr)

    # Parse dotted decimal mask
    parts = clean_mask_str.split(".")
    if len(parts) == 4:
        try:
            binary = "".join(f"{int(p):08b}" for p in parts)
            cidr = binary.count("1")
            return (ip_raw, clean_mask_str, cidr)
        except ValueError:
            pass

    # Default fallback /24
    return (ip_raw, "255.255.255.0", 24)

class BaseOSCommandMapper(ABC):
    platform_id: str = "generic"
    platform_name: str = "Generic OS"

    @abstractmethod
    def matches_device(self, device: Dict[str, Any]) -> bool:
        """Determines whether this mapper handles the target device based on its platform, model, or firmware."""
        pass

    @abstractmethod
    def map_command(self, template_id: str, params: Dict[str, Any], device: Dict[str, Any]) -> List[CommandStep]:
        """Translates a logical template operation into sequential OS-specific CommandSteps."""
        pass

    @abstractmethod
    def get_backup_command(self) -> str:
        """Returns the command to extract current running configuration for pre-change backup."""
        pass

    @abstractmethod
    def get_save_command(self) -> Optional[str]:
        """Returns the command to commit changes to persistent startup storage (e.g. write memory)."""
        pass

    def get_idempotency_check_command(self, template_id: str, params: Dict[str, Any]) -> Optional[str]:
        """Optional command to inspect current configuration before applying to ensure idempotency."""
        return None

    def evaluate_idempotency(self, template_id: str, params: Dict[str, Any], raw_output: str) -> IdempotencyResult:
        """Analyzes pre-check command output to decide whether to skip, update, or proceed."""
        return IdempotencyResult(already_configured=False)

    def classify_error(self, raw_output: str, exit_code: int = 0) -> Tuple[str, str, str]:
        """
        Analyzes CLI execution output to classify specific error types
        Returns: (error_type, message_fa, message_en)
        """
        txt = (raw_output or "").lower()
        if "% invalid input" in txt or "% unrecognized command" in txt or "bad command name" in txt or "syntax error" in txt:
            return (
                ErrorType.COMMAND_SYNTAX_ERROR,
                "دستور توسط سیستم‌عامل دستگاه شناسایی نشد یا سینتکس اشتباه است.",
                "Command syntax rejected or unsupported by this device OS version."
            )
        if "permission denied" in txt or "privilege" in txt or "not permitted" in txt or "authorization failed" in txt:
            return (
                ErrorType.PERMISSION_DENIED,
                "سطح دسترسی کاربر برای اجرای این دستور در دستگاه کافی نیست.",
                "Insufficient privilege level or authorization denied for this command."
            )
        if "timeout" in txt or "timed out" in txt:
            return (
                ErrorType.EXECUTION_TIMEOUT,
                "زمان پاسخ‌دهی دستگاه بیش از حد مجاز سپری شد.",
                "Device execution timed out while processing command sequence."
            )
        return (
            ErrorType.UNKNOWN_ERROR,
            f"خطای عملیاتی: {raw_output.strip()[:180]}",
            f"Operational error: {raw_output.strip()[:180]}"
        )
