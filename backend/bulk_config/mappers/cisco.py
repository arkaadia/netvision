"""
Cisco IOS & IOS-XE Command Mapper
Translates logical templates into robust Cisco IOS global configuration commands.
Includes pre-checks, idempotency evaluation, and error classification.
"""
import re
from typing import Dict, Any, List, Optional, Tuple
from .base import BaseOSCommandMapper
from ..models import CommandStep, IdempotencyResult, ErrorType

class CiscoIOSCommandMapper(BaseOSCommandMapper):
    platform_id: str = "cisco_ios"
    platform_name: str = "Cisco IOS / IOS-XE"

    def matches_device(self, device: Dict[str, Any]) -> bool:
        platform = (device.get("platform") or "").lower()
        model = (device.get("model") or "").lower()
        firmware = (device.get("firmware") or "").lower()
        name = (device.get("name") or "").lower()

        if "cisco" in platform or "ios" in platform:
            return True
        if "catalyst" in model or "cisco" in model or "ws-c" in model or "isr" in model or "c29" in model or "c37" in model or "c38" in model or "c92" in model or "c93" in model:
            return True
        if "ios" in firmware or "cisco" in name:
            return True
        return False

    def get_backup_command(self) -> str:
        return "show running-config"

    def get_save_command(self) -> Optional[str]:
        return "write memory"

    def get_idempotency_check_command(self, template_id: str, params: Dict[str, Any]) -> Optional[str]:
        if template_id == "create_local_user":
            username = params.get("username", "").strip()
            return f"show running-config | include username {username}"
        elif template_id == "delete_local_user":
            username = params.get("username", "").strip()
            return f"show running-config | include username {username}"
        elif template_id == "set_ntp_servers":
            return "show running-config | include ntp server"
        elif template_id == "set_dns_servers":
            return "show running-config | include ip name-server"
        elif template_id == "configure_snmp":
            community = params.get("community", "").strip()
            return f"show running-config | include snmp-server community {community}"
        return None

    def evaluate_idempotency(self, template_id: str, params: Dict[str, Any], raw_output: str) -> IdempotencyResult:
        output = (raw_output or "").strip()
        if template_id == "create_local_user":
            username = params.get("username", "").strip()
            # If username already appears in running-config
            if re.search(rf"\busername\s+{re.escape(username)}\b", output, re.IGNORECASE):
                return IdempotencyResult(
                    already_configured=True,
                    reason_fa=f"کاربر محلی «{username}» از قبل روی سوئیچ سیسکو تعریف شده است (جهت جلوگیری از خطا، به‌روزرسانی جایگزین می‌گردد).",
                    reason_en=f"Local user '{username}' already exists in Cisco running-config; continuing with in-place update.",
                    should_skip=False  # Cisco accepts updating password/privilege in-place safely
                )
        elif template_id == "delete_local_user":
            username = params.get("username", "").strip()
            if not re.search(rf"\busername\s+{re.escape(username)}\b", output, re.IGNORECASE):
                return IdempotencyResult(
                    already_configured=True,
                    reason_fa=f"کاربر محلی «{username}» روی دستگاه وجود ندارد، دستور حذف لغو شد.",
                    reason_en=f"User '{username}' does not exist on target device; deletion safely skipped.",
                    should_skip=True
                )
        elif template_id == "set_ntp_servers":
            p_ntp = params.get("primary_ntp", "").strip()
            if p_ntp and p_ntp in output:
                return IdempotencyResult(
                    already_configured=True,
                    reason_fa=f"آدرس سرور NTP ({p_ntp}) از قبل در پیکربندی سوئیچ موجود است.",
                    reason_en=f"NTP server {p_ntp} is already configured in Cisco running-config.",
                    should_skip=False
                )
        elif template_id == "set_dns_servers":
            p_dns = params.get("primary_dns", "").strip()
            if p_dns and p_dns in output:
                return IdempotencyResult(
                    already_configured=True,
                    reason_fa=f"آدرس DNS سرور ({p_dns}) از قبل در تنظیمات سوئیچ وجود دارد.",
                    reason_en=f"DNS name-server {p_dns} is already active on this switch.",
                    should_skip=False
                )
        return IdempotencyResult(already_configured=False)

    def map_command(self, template_id: str, params: Dict[str, Any], device: Dict[str, Any]) -> List[CommandStep]:
        steps: List[CommandStep] = []

        if template_id == "create_local_user":
            username = params.get("username", "").strip()
            password = params.get("password", "").strip()
            priv = int(params.get("privilege_level", 15))
            steps.append(CommandStep(
                name="create_cisco_user",
                command=f"username {username} privilege {priv} secret {password}",
                description_fa=f"ایجاد/به‌روزرسانی کاربر {username} با سطح دسترسی {priv}",
                description_en=f"Create/update user {username} with privilege level {priv}",
                mode="config"
            ))

        elif template_id == "delete_local_user":
            username = params.get("username", "").strip()
            steps.append(CommandStep(
                name="delete_cisco_user",
                command=f"no username {username}",
                description_fa=f"حذف کاربر محلی {username} از پایگاه داده دستگاه",
                description_en=f"Remove local user {username} from switch configuration",
                mode="config"
            ))

        elif template_id == "change_user_password":
            username = params.get("username", "").strip()
            new_password = params.get("new_password", "").strip()
            steps.append(CommandStep(
                name="change_cisco_password",
                command=f"username {username} secret {new_password}",
                description_fa=f"تغییر رمز عبور کاربر {username}",
                description_en=f"Update password for user {username}",
                mode="config"
            ))

        elif template_id == "set_ntp_servers":
            primary_ntp = params.get("primary_ntp", "").strip()
            secondary_ntp = params.get("secondary_ntp", "").strip()
            if primary_ntp:
                steps.append(CommandStep(
                    name="set_primary_ntp",
                    command=f"ntp server {primary_ntp}",
                    description_fa=f"تنظیم سرور زمان اصلی به {primary_ntp}",
                    description_en=f"Set primary NTP server to {primary_ntp}",
                    mode="config"
                ))
            if secondary_ntp:
                steps.append(CommandStep(
                    name="set_secondary_ntp",
                    command=f"ntp server {secondary_ntp}",
                    description_fa=f"تنظیم سرور زمان پشتیبان به {secondary_ntp}",
                    description_en=f"Set secondary NTP server to {secondary_ntp}",
                    mode="config"
                ))

        elif template_id == "set_dns_servers":
            primary_dns = params.get("primary_dns", "").strip()
            secondary_dns = params.get("secondary_dns", "").strip()
            steps.append(CommandStep(
                name="enable_domain_lookup",
                command="ip domain-lookup",
                description_fa="فعال‌سازی تفکیک‌کننده اسامی دامنه (Domain Lookup)",
                description_en="Enable IP domain lookup",
                mode="config"
            ))
            if primary_dns:
                steps.append(CommandStep(
                    name="set_primary_dns",
                    command=f"ip name-server {primary_dns}",
                    description_fa=f"تنظیم DNS سرور اصلی به {primary_dns}",
                    description_en=f"Configure primary name server {primary_dns}",
                    mode="config"
                ))
            if secondary_dns:
                steps.append(CommandStep(
                    name="set_secondary_dns",
                    command=f"ip name-server {secondary_dns}",
                    description_fa=f"تنظیم DNS سرور پشتیبان به {secondary_dns}",
                    description_en=f"Configure secondary name server {secondary_dns}",
                    mode="config"
                ))

        elif template_id == "set_syslog_server":
            syslog_ip = params.get("syslog_ip", "").strip()
            severity = params.get("severity", "informational").strip()
            steps.append(CommandStep(
                name="enable_logging",
                command="logging on",
                description_fa="فعال‌سازی سرویس لاگ‌برداری سراسری دستگاه",
                description_en="Enable global logging service",
                mode="config"
            ))
            steps.append(CommandStep(
                name="set_logging_trap",
                command=f"logging trap {severity}",
                description_fa=f"تنظیم سطح حساسیت لاگ‌ها به {severity}",
                description_en=f"Set syslog logging trap level to {severity}",
                mode="config"
            ))
            steps.append(CommandStep(
                name="set_logging_host",
                command=f"logging host {syslog_ip}",
                description_fa=f"ارسال لاگ‌ها به سرور Syslog در آدرس {syslog_ip}",
                description_en=f"Forward system logs to syslog host {syslog_ip}",
                mode="config"
            ))

        elif template_id == "set_banner_motd":
            banner_text = params.get("banner_text", "").strip() or "Authorized Access Only!"
            # Use delimiter character ^ that won't conflict with text
            clean_banner = banner_text.replace("^", "")
            steps.append(CommandStep(
                name="set_motd_banner",
                command=f"banner motd ^{clean_banner}^",
                description_fa="تنظیم پیام خوش‌آمدگویی و هشدار ورود (MOTD Banner)",
                description_en="Configure Message of the Day (MOTD) banner",
                mode="config"
            ))

        elif template_id == "configure_snmp":
            community = params.get("community", "public").strip()
            permission = params.get("permission", "RO").strip().upper()
            location = params.get("location", "").strip()
            contact = params.get("contact", "").strip()
            steps.append(CommandStep(
                name="set_snmp_community",
                command=f"snmp-server community {community} {permission}",
                description_fa=f"پیکربندی رشته SNMP Community به «{community}» با دسترسی {permission}",
                description_en=f"Configure SNMP community '{community}' with {permission} permission",
                mode="config"
            ))
            if location:
                steps.append(CommandStep(
                    name="set_snmp_location",
                    command=f"snmp-server location {location}",
                    description_fa=f"تنظیم موقعیت فیزیکی SNMP به {location}",
                    description_en=f"Set SNMP physical location to {location}",
                    mode="config"
                ))
            if contact:
                steps.append(CommandStep(
                    name="set_snmp_contact",
                    command=f"snmp-server contact {contact}",
                    description_fa=f"تنظیم اطلاعات تماس مدیر SNMP به {contact}",
                    description_en=f"Set SNMP administrator contact to {contact}",
                    mode="config"
                ))

        elif template_id == "backup_running_config":
            steps.append(CommandStep(
                name="backup_running_config",
                command="show running-config",
                description_fa="دریافت کامل پیکربندی فعال سوئیچ (Running-Config)",
                description_en="Retrieve full Cisco running configuration",
                mode="exec"
            ))

        elif template_id == "save_running_config":
            steps.append(CommandStep(
                name="write_memory",
                command="write memory",
                description_fa="ذخیره‌سازی دائم پیکربندی جاری در حافظه استارتاپ NVRAM",
                description_en="Save running-config to startup-config NVRAM",
                mode="exec"
            ))

        elif template_id == "reboot_device":
            steps.append(CommandStep(
                name="cisco_reload",
                command="reload\n",
                description_fa="راه‌اندازی مجدد سخت‌افزاری دستگاه سیسکو (Reload)",
                description_en="Reboot Cisco device hardware (Reload)",
                mode="exec"
            ))

        elif template_id == "configure_timezone":
            tz_name = params.get("timezone_name", "IRST").strip()
            offset = params.get("utc_offset_hours", "3 30").strip()
            steps.append(CommandStep(
                name="set_cisco_clock_timezone",
                command=f"clock timezone {tz_name} {offset}",
                description_fa=f"تنظیم منطقه زمانی ساعت داخلی به {tz_name} ({offset})",
                description_en=f"Set hardware clock timezone to {tz_name} ({offset})",
                mode="config"
            ))

        elif template_id == "enable_ssh_timeout":
            timeout_min = int(params.get("timeout_minutes", 15))
            steps.append(CommandStep(
                name="set_vty_timeout",
                command=f"line vty 0 15\nexec-timeout {timeout_min} 0\nexit",
                description_fa=f"تنظیم تایم‌اوت عدم فعالیت نشست‌های SSH/VTY به {timeout_min} دقیقه",
                description_en=f"Configure VTY line inactivity timeout to {timeout_min} minutes",
                mode="config"
            ))

        elif template_id == "custom_raw_commands":
            raw_cmds = params.get("commands", "").strip().splitlines()
            for idx, line in enumerate(raw_cmds):
                line_clean = line.strip()
                if line_clean and not line_clean.startswith("!"):
                    steps.append(CommandStep(
                        name=f"custom_step_{idx+1}",
                        command=line_clean,
                        description_fa=f"دستور سفارشی {idx+1}: {line_clean}",
                        description_en=f"Custom command step {idx+1}: {line_clean}",
                        mode="config" if params.get("require_config_mode", True) else "exec"
                    ))

        return steps
