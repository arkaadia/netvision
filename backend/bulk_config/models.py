"""
Bulk Device Configuration Data Models & Error Classifications
"""
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
import time

class ErrorType:
    CONNECTION_TIMEOUT = "CONNECTION_TIMEOUT"
    AUTH_FAILED = "AUTH_FAILED"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    DEVICE_BUSY_LOCKED = "DEVICE_BUSY_LOCKED"
    COMMAND_SYNTAX_ERROR = "COMMAND_SYNTAX_ERROR"
    EXECUTION_TIMEOUT = "EXECUTION_TIMEOUT"
    SOCKET_ERROR = "SOCKET_ERROR"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"

    @classmethod
    def get_label(cls, error_type: str, is_en: bool = False) -> str:
        labels = {
            cls.CONNECTION_TIMEOUT: ("تایم‌اوت اتصال یا در دسترس نبودن هاست", "Connection Timeout / Host Unreachable"),
            cls.AUTH_FAILED: ("خطای احراز هویت (نام کاربری یا رمز نادرست)", "Authentication Failed / Invalid Credentials"),
            cls.PERMISSION_DENIED: ("دسترسی رد شد / سطح دسترسی ناکافی (Privilege Level)", "Permission Denied / Insufficient Privilege"),
            cls.DEVICE_BUSY_LOCKED: ("دستگاه مشغول است (نشست ترمینال فعال یا عملیات همزمان)", "Device Busy / Active Terminal Session or Bulk Lock"),
            cls.COMMAND_SYNTAX_ERROR: ("خطای سینتکس یا عدم پشتیبانی دستور در سیستم‌عامل", "Command Syntax Error / Unsupported on OS"),
            cls.EXECUTION_TIMEOUT: ("تایم‌اوت در اجرای دستورات (بیش از حد مجاز)", "Execution Timeout Exceeded"),
            cls.SOCKET_ERROR: ("خطای سوکت شبکه یا رد اتصال (Connection Refused)", "Socket Error / Connection Refused"),
            cls.UNKNOWN_ERROR: ("خطای ناشناخته در پردازش", "Unknown Execution Error"),
        }
        entry = labels.get(error_type, (error_type, error_type))
        return entry[1] if is_en else entry[0]

@dataclass
class CommandStep:
    name: str
    command: str
    description_fa: str
    description_en: str
    mode: str = "config"  # "exec", "enable", "config"
    is_critical: bool = True

@dataclass
class IdempotencyResult:
    already_configured: bool = False
    reason_fa: str = ""
    reason_en: str = ""
    should_skip: bool = False

@dataclass
class CommandTemplate:
    id: str
    category: str  # user_management, network_services, monitoring_logging, system_security, maintenance_backup, system_lifecycle, advanced_automation
    title: str
    title_en: str
    description: str
    description_en: str
    icon: str
    parameters: List[Dict[str, Any]]
    is_dangerous: bool = False
    confirmation_keyword: str = "CONFIRM"
    supports_backup: bool = True
    supports_idempotency: bool = True
    default_timeout_sec: int = 25
    requires_save_step: bool = True
    info_what_fa: str = ""
    info_what_en: str = ""
    info_why_fa: str = ""
    info_why_en: str = ""
    info_example_fa: str = ""
    info_example_en: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "category": self.category,
            "title": self.title,
            "title_en": self.title_en,
            "description": self.description,
            "description_en": self.description_en,
            "icon": self.icon,
            "parameters": self.parameters,
            "is_dangerous": self.is_dangerous,
            "confirmation_keyword": self.confirmation_keyword,
            "supports_backup": self.supports_backup,
            "supports_idempotency": self.supports_idempotency,
            "default_timeout_sec": self.default_timeout_sec,
            "requires_save_step": self.requires_save_step,
            "info_what_fa": self.info_what_fa,
            "info_what_en": self.info_what_en,
            "info_why_fa": self.info_why_fa,
            "info_why_en": self.info_why_en,
            "info_example_fa": self.info_example_fa,
            "info_example_en": self.info_example_en,
        }

@dataclass
class DeviceExecutionResult:
    device_id: str
    device_name: str
    device_ip: str
    platform: str
    status: str  # "success", "failed", "partial", "skipped"
    error_type: Optional[str] = None
    error_message_fa: str = ""
    error_message_en: str = ""
    steps_total: int = 0
    steps_completed: int = 0
    steps_detail: List[Dict[str, Any]] = field(default_factory=list)
    raw_output: str = ""
    backup_id: Optional[str] = None
    backup_success: bool = False
    backup_preview: str = ""
    duration_ms: float = 0.0
    retry_count: int = 0
    executed_at: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "deviceId": self.device_id,
            "deviceName": self.device_name,
            "deviceIp": self.device_ip,
            "platform": self.platform,
            "status": self.status,
            "errorType": self.error_type,
            "errorMessageFa": self.error_message_fa,
            "errorMessageEn": self.error_message_en,
            "stepsTotal": self.steps_total,
            "stepsCompleted": self.steps_completed,
            "stepsDetail": self.steps_detail,
            "rawOutput": self.raw_output,
            "backupId": self.backup_id,
            "backupSuccess": self.backup_success,
            "backupPreview": self.backup_preview,
            "durationMs": self.duration_ms,
            "retryCount": self.retry_count,
            "executedAt": self.executed_at,
        }
