"""
OS Command Mapper Registry & Predefined Template Catalog
Provides extensible registration of OS mappers and metadata-rich template definitions.
"""
from typing import Dict, Any, List, Optional
from .models import CommandTemplate, CommandStep
from .mappers.base import BaseOSCommandMapper
from .mappers.cisco import CiscoIOSCommandMapper
from .mappers.mikrotik import MikroTikCommandMapper

class OSCommandMapperRegistry:
    def __init__(self):
        self._mappers: List[BaseOSCommandMapper] = []
        self._templates: Dict[str, CommandTemplate] = {}
        self._init_defaults()

    def register_mapper(self, mapper: BaseOSCommandMapper):
        """Register a new platform mapper (e.g. Juniper, HP, Arista)."""
        self._mappers.insert(0, mapper)

    def get_mapper_for_device(self, device: Dict[str, Any]) -> BaseOSCommandMapper:
        """Finds the most specific mapper that matches the target device."""
        for mapper in self._mappers:
            if mapper.matches_device(device):
                return mapper
        # Default fallback to Cisco IOS mapper
        return self._mappers[-1] if self._mappers else CiscoIOSCommandMapper()

    def get_template(self, template_id: str) -> Optional[CommandTemplate]:
        return self._templates.get(template_id)

    def get_all_templates(self) -> List[Dict[str, Any]]:
        return [t.to_dict() for t in self._templates.values()]

    def generate_preview(self, template_id: str, params: Dict[str, Any], devices: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Generates real CLI commands preview per device without executing or simulating fake output.
        Shows exact command text, OS mapper identified, and idempotency check query.
        """
        template = self.get_template(template_id)
        if not template:
            raise ValueError(f"Template '{template_id}' is not registered.")

        preview_list = []
        for dev in devices:
            mapper = self.get_mapper_for_device(dev)
            steps = mapper.map_command(template_id, params, dev)
            pre_check = mapper.get_idempotency_check_command(template_id, params)
            backup_cmd = mapper.get_backup_command()
            save_cmd = mapper.get_save_command() if template.requires_save_step else None

            preview_list.append({
                "deviceId": dev.get("id"),
                "deviceName": dev.get("name") or dev.get("hostname") or "Unknown Device",
                "deviceIp": dev.get("ip") or dev.get("ssh_host") or "0.0.0.0",
                "platform": dev.get("platform") or mapper.platform_id,
                "mapperName": mapper.platform_name,
                "preCheckCommand": pre_check,
                "backupCommand": backup_cmd if template.supports_backup else None,
                "steps": [
                    {
                        "name": s.name,
                        "command": s.command,
                        "descriptionFa": s.description_fa,
                        "descriptionEn": s.description_en,
                        "mode": s.mode,
                    }
                    for s in steps
                ],
                "saveCommand": save_cmd,
                "isDangerous": template.is_dangerous,
                "confirmationKeyword": template.confirmation_keyword,
                "estimatedTimeoutSec": template.default_timeout_sec,
            })

        return preview_list

    def _init_defaults(self):
        # Register default OS mappers
        self._mappers.append(CiscoIOSCommandMapper())
        self._mappers.append(MikroTikCommandMapper())

        # Register Predefined Templates catalog
        templates_defs = [
            CommandTemplate(
                id="create_vlan",
                category="vlan_management",
                title="ایجاد و پیکربندی اصولی وی‌لن (Create VLAN)",
                title_en="Create & Configure VLAN",
                description="ایجاد مهندسی و استاندارد VLAN با تفکیک دقیق سوئیچ و روتر سیسکو (L2 VLAN / SVI / Dot1Q Sub-interface) و میکروتیک (Bridge VLAN Filtering / Interface VLAN)",
                description_en="Engineering-grade VLAN creation with dynamic hardware detection for Cisco (Switch L2/SVI vs Router Dot1Q) and MikroTik (Bridge VLAN Filtering / Interface VLAN)",
                icon="GitFork",
                parameters=[
                    {
                        "name": "vlan_id",
                        "labelFa": "شناسه عددی وی‌لن (VLAN ID)",
                        "labelEn": "VLAN ID (1-4094)",
                        "type": "number",
                        "required": True,
                        "placeholder": "e.g. 10, 20, 100",
                        "default": 10
                    },
                    {
                        "name": "vlan_name",
                        "labelFa": "نام وی‌لن (VLAN Name)",
                        "labelEn": "VLAN Name",
                        "type": "string",
                        "required": True,
                        "placeholder": "e.g. DATA_USERS, VOICE, SERVERS_DMZ",
                        "default": "VLAN_10"
                    },
                    {
                        "name": "configure_ip_gateway",
                        "labelFa": "پیکربندی گیت‌وی لایه سه (L3 SVI / Gateway IP)",
                        "labelEn": "Configure L3 SVI / Gateway IP",
                        "type": "boolean",
                        "required": False,
                        "default": False
                    },
                    {
                        "name": "gateway_ip",
                        "labelFa": "آدرس IP گیت‌وی (در صورت فعال‌سازی لایه سه)",
                        "labelEn": "Gateway IP Address",
                        "type": "string",
                        "required": False,
                        "placeholder": "e.g. 192.168.10.1",
                        "default": ""
                    },
                    {
                        "name": "subnet_mask",
                        "labelFa": "ماسک شبکه یا طول پیشوند (Subnet Mask / CIDR)",
                        "labelEn": "Subnet Mask or CIDR Prefix",
                        "type": "string",
                        "required": False,
                        "placeholder": "255.255.255.0 or /24",
                        "default": "255.255.255.0"
                    },
                    {
                        "name": "assign_access_ports",
                        "labelFa": "انتساب پورت‌های Access (اختیاری)",
                        "labelEn": "Assign Access Ports (Optional)",
                        "type": "string",
                        "required": False,
                        "placeholder": "Cisco: Gi1/0/1-4 | MikroTik: ether2,ether3",
                        "default": ""
                    },
                    {
                        "name": "add_to_trunk_ports",
                        "labelFa": "افزودن به پورت‌های ترانک (Trunk / Tagged Ports - اختیاری)",
                        "labelEn": "Add to Trunk Ports (Optional)",
                        "type": "string",
                        "required": False,
                        "placeholder": "Cisco: Gi1/0/24 | MikroTik: ether1,sfp-sfpplus1",
                        "default": ""
                    },
                    {
                        "name": "mikrotik_parent_interface",
                        "labelFa": "اینترفیس والد در میکروتیک (Parent Bridge / Interface)",
                        "labelEn": "MikroTik Parent Interface (Bridge)",
                        "type": "string",
                        "required": False,
                        "placeholder": "bridge (recommended) or ether1",
                        "default": "bridge"
                    },
                    {
                        "name": "cisco_router_parent_interface",
                        "labelFa": "اینترفیس فیزیکی روتر سیسکو (Router-on-a-Stick Parent)",
                        "labelEn": "Cisco Router Parent Physical Interface",
                        "type": "string",
                        "required": False,
                        "placeholder": "e.g. GigabitEthernet0/0/0 or GigabitEthernet0/0",
                        "default": "GigabitEthernet0/0/0"
                    }
                ],
                is_dangerous=False,
                supports_backup=True,
                supports_idempotency=True,
                default_timeout_sec=30,
                requires_save_step=True
            ),
            CommandTemplate(
                id="delete_vlan",
                category="vlan_management",
                title="حذف وی‌لن از تجهیزات (Delete VLAN)",
                title_en="Delete VLAN from Devices",
                description="حذف امن و اصولی VLAN از پایگاه داده و اینترفیس‌های تجهیز با حذف خودکار تخصیص‌ها و اینترفیس‌های متناظر",
                description_en="Safely delete VLAN database definitions, SVI interfaces, and bridge bindings across selected devices",
                icon="Trash2",
                parameters=[
                    {
                        "name": "vlan_id",
                        "labelFa": "شناسه عددی وی‌لن جهت حذف (VLAN ID)",
                        "labelEn": "VLAN ID to Delete",
                        "type": "number",
                        "required": True,
                        "placeholder": "e.g. 10",
                        "default": 10
                    },
                    {
                        "name": "remove_svi",
                        "labelFa": "حذف اینترفیس L3 SVI متناظر (no interface Vlan)",
                        "labelEn": "Remove Associated L3 SVI Interface",
                        "type": "boolean",
                        "required": False,
                        "default": True
                    }
                ],
                is_dangerous=True,
                confirmation_keyword="DELETE",
                supports_backup=True,
                supports_idempotency=True,
                default_timeout_sec=25,
                requires_save_step=True
            ),
            CommandTemplate(
                id="create_local_user",
                category="user_management",
                title="ایجاد کاربر محلی جدید (Local User)",
                title_en="Create Local Device User",
                description="تعریف یک حساب کاربری محلی جدید روی دستگاه با رمز عبور و سطح دسترسی مشخص (پشتیبانی از سیسکو و میکروتیک)",
                description_en="Create a new local user account with credentials and privilege level across selected hardware",
                icon="UserPlus",
                parameters=[
                    {
                        "name": "username",
                        "labelFa": "نام کاربری",
                        "labelEn": "Username",
                        "type": "string",
                        "required": True,
                        "placeholder": "e.g. netadmin_sec",
                        "default": ""
                    },
                    {
                        "name": "password",
                        "labelFa": "رمز عبور",
                        "labelEn": "Password",
                        "type": "password",
                        "required": True,
                        "placeholder": "Strong secret (min 8 chars)",
                        "default": ""
                    },
                    {
                        "name": "privilege_level",
                        "labelFa": "سطح دسترسی (Privilege Level)",
                        "labelEn": "Privilege Level / Role",
                        "type": "select",
                        "required": True,
                        "default": "15",
                        "options": [
                            {"value": "15", "labelFa": "سطح ۱۵ (دسترسی کامل مدیریتی / Full Admin)", "labelEn": "Level 15 (Full Admin / Root)"},
                            {"value": "10", "labelFa": "سطح ۱۰ (اپراتور ارشد با دسترسی نوشتن)", "labelEn": "Level 10 (Senior Operator / Write)"},
                            {"value": "5", "labelFa": "سطح ۵ (دسترسی مانیتورینگ و کانفیگ جزئی)", "labelEn": "Level 5 (Monitoring & Partial Config)"},
                            {"value": "1", "labelFa": "سطح ۱ (فقط خواندنی / Read-Only)", "labelEn": "Level 1 (Read-Only User Exec)"}
                        ]
                    }
                ],
                is_dangerous=False,
                supports_backup=True,
                supports_idempotency=True,
                default_timeout_sec=25
            ),
            CommandTemplate(
                id="delete_local_user",
                category="user_management",
                title="حذف حساب کاربری محلی (Delete User)",
                title_en="Delete Local User Account",
                description="حذف دائم نام کاربری از پایگاه داده اعتبارسنجی داخلی تجهیز (نیازمند تاییدیه امنیتی صریح)",
                description_en="Permanently delete a local user account from device internal authentication database (Disruptive)",
                icon="UserMinus",
                parameters=[
                    {
                        "name": "username",
                        "labelFa": "نام کاربری هدف جهت حذف",
                        "labelEn": "Target Username to Delete",
                        "type": "string",
                        "required": True,
                        "placeholder": "e.g. old_admin",
                        "default": ""
                    }
                ],
                is_dangerous=True,
                confirmation_keyword="CONFIRM",
                supports_backup=True,
                supports_idempotency=True,
                default_timeout_sec=20
            ),
            CommandTemplate(
                id="change_user_password",
                category="user_management",
                title="تغییر رمز عبور کاربر (Change Password)",
                title_en="Change Local User Password",
                description="تغییر سریع رمز عبور یا Secret یک کاربر موجود در تمام تجهیزات انتخابی به منظور چرخش دوره‌ای کلیدها",
                description_en="Rotate or update credentials for an existing local account across all chosen hardware",
                icon="Key",
                parameters=[
                    {
                        "name": "username",
                        "labelFa": "نام کاربری موجود",
                        "labelEn": "Existing Username",
                        "type": "string",
                        "required": True,
                        "placeholder": "e.g. admin",
                        "default": "admin"
                    },
                    {
                        "name": "new_password",
                        "labelFa": "رمز عبور جدید",
                        "labelEn": "New Password / Secret",
                        "type": "password",
                        "required": True,
                        "placeholder": "New secure passphrase",
                        "default": ""
                    }
                ],
                is_dangerous=False,
                supports_backup=True,
                supports_idempotency=True,
                default_timeout_sec=20
            ),
            CommandTemplate(
                id="set_ntp_servers",
                category="network_services",
                title="تنظیم سرورهای زمان (NTP Servers)",
                title_en="Configure NTP Time Synchronization",
                description="پیکربندی سرور زمان اصلی و پشتیبان برای همگام‌سازی دقیق ساعت رویدادها و لاگ‌های امنیتی تجهیزات",
                description_en="Synchronize hardware system clocks with primary and secondary NTP time servers",
                icon="Clock",
                parameters=[
                    {
                        "name": "primary_ntp",
                        "labelFa": "آدرس NTP سرور اصلی",
                        "labelEn": "Primary NTP Server IP / FQDN",
                        "type": "string",
                        "required": True,
                        "placeholder": "e.g. 10.0.0.10 or pool.ntp.org",
                        "default": "time.google.com"
                    },
                    {
                        "name": "secondary_ntp",
                        "labelFa": "آدرس NTP سرور پشتیبان (اختیاری)",
                        "labelEn": "Secondary NTP Server IP (Optional)",
                        "type": "string",
                        "required": False,
                        "placeholder": "e.g. 10.0.0.11 or 1.1.1.1",
                        "default": ""
                    }
                ],
                is_dangerous=False,
                supports_backup=True,
                supports_idempotency=True,
                default_timeout_sec=20
            ),
            CommandTemplate(
                id="set_dns_servers",
                category="network_services",
                title="تنظیم سرورهای نام دامنه (DNS Servers)",
                title_en="Configure DNS Name Servers",
                description="تنظیم یا به‌روزرسانی سرورهای DNS جهت ترجمه آدرس‌های FQDN در تجهیزات شبکه",
                description_en="Configure primary and secondary DNS name servers for FQDN resolution",
                icon="Globe",
                parameters=[
                    {
                        "name": "primary_dns",
                        "labelFa": "آدرس DNS سرور اصلی",
                        "labelEn": "Primary DNS Server",
                        "type": "string",
                        "required": True,
                        "placeholder": "e.g. 1.1.1.1 or 8.8.8.8",
                        "default": "1.1.1.1"
                    },
                    {
                        "name": "secondary_dns",
                        "labelFa": "آدرس DNS سرور پشتیبان",
                        "labelEn": "Secondary DNS Server",
                        "type": "string",
                        "required": False,
                        "placeholder": "e.g. 1.0.0.1 or 8.8.4.4",
                        "default": "8.8.8.8"
                    }
                ],
                is_dangerous=False,
                supports_backup=True,
                supports_idempotency=True,
                default_timeout_sec=20
            ),
            CommandTemplate(
                id="set_syslog_server",
                category="monitoring_logging",
                title="پیکربندی سرور لاگ مرکزی (Syslog)",
                title_en="Configure Central Syslog Server",
                description="ارسال خودکار و بلادرنگ رویدادهای سیستمی و هشدارهای امنیتی به سرور لاگ‌برداری مرکزی (SIEM/Syslog)",
                description_en="Forward live system events, audit trails and alerts to a centralized remote Syslog host",
                icon="Activity",
                parameters=[
                    {
                        "name": "syslog_ip",
                        "labelFa": "آدرس IP سرور Syslog",
                        "labelEn": "Syslog Server IP",
                        "type": "string",
                        "required": True,
                        "placeholder": "e.g. 192.168.10.50",
                        "default": ""
                    },
                    {
                        "name": "syslog_port",
                        "labelFa": "پورت ارتباطی UDP (پیش‌فرض ۵۱۴)",
                        "labelEn": "Syslog UDP Port",
                        "type": "number",
                        "required": False,
                        "placeholder": "514",
                        "default": 514
                    },
                    {
                        "name": "severity",
                        "labelFa": "حداقل سطح هشدار (Severity Level)",
                        "labelEn": "Minimum Severity Trap",
                        "type": "select",
                        "required": True,
                        "default": "informational",
                        "options": [
                            {"value": "debugging", "labelFa": "دیباگ (Debugging - بیشترین حجم لاگ)", "labelEn": "Debugging (Level 7)"},
                            {"value": "informational", "labelFa": "اطلاعاتی و عمومی (Informational)", "labelEn": "Informational (Level 6)"},
                            {"value": "notifications", "labelFa": "اعلان‌ها (Notifications)", "labelEn": "Notifications (Level 5)"},
                            {"value": "warnings", "labelFa": "هشدارها (Warnings)", "labelEn": "Warnings (Level 4)"},
                            {"value": "errors", "labelFa": "خطاها (Errors)", "labelEn": "Errors (Level 3)"},
                            {"value": "critical", "labelFa": "بحرانی (Critical)", "labelEn": "Critical (Level 2)"}
                        ]
                    }
                ],
                is_dangerous=False,
                supports_backup=True,
                supports_idempotency=True,
                default_timeout_sec=25
            ),
            CommandTemplate(
                id="set_banner_motd",
                category="system_security",
                title="تنظیم بنر هشدار ورود (MOTD Banner)",
                title_en="Set Login / MOTD Banner",
                description="تنظیم متن هشدار حقوقی و شرایط استفاده هنگام اتصال از طریق کنسول یا SSH",
                description_en="Standardize legal warning and authorization disclaimer shown upon terminal connection",
                icon="ShieldAlert",
                parameters=[
                    {
                        "name": "banner_text",
                        "labelFa": "متن بنر ورود (Banner MOTD)",
                        "labelEn": "Banner MOTD Text",
                        "type": "textarea",
                        "required": True,
                        "placeholder": "Authorized access only. All activities are monitored and recorded.",
                        "default": "****************************************************************\n* WARNING: Authorized Personnel Only!                         *\n* All activities are actively monitored, logged and audited.  *\n****************************************************************"
                    }
                ],
                is_dangerous=False,
                supports_backup=True,
                supports_idempotency=False,
                default_timeout_sec=20
            ),
            CommandTemplate(
                id="configure_snmp",
                category="monitoring_logging",
                title="پیکربندی پروتکل مانیتورینگ (SNMP)",
                title_en="Configure SNMP Monitoring",
                description="تنظیم رشته‌های انجمن (Community Strings) و پارامترهای مانیتورینگ NMS (مانند Zabbix یا PRTG)",
                description_en="Set SNMP community strings, contact details and physical location for NMS integration",
                icon="Layers",
                parameters=[
                    {
                        "name": "community",
                        "labelFa": "رشته SNMP Community",
                        "labelEn": "Community String",
                        "type": "string",
                        "required": True,
                        "placeholder": "e.g. MyNet_ReadRO",
                        "default": "public_monitor"
                    },
                    {
                        "name": "permission",
                        "labelFa": "سطح دسترسی SNMP",
                        "labelEn": "Permission",
                        "type": "select",
                        "required": True,
                        "default": "RO",
                        "options": [
                            {"value": "RO", "labelFa": "فقط خواندنی (Read-Only - توصیه شده)", "labelEn": "Read-Only (Recommended)"},
                            {"value": "RW", "labelFa": "خواندن و نوشتن (Read-Write)", "labelEn": "Read-Write (Full Control)"}
                        ]
                    },
                    {
                        "name": "location",
                        "labelFa": "موقعیت فیزیکی (Location)",
                        "labelEn": "Physical Location",
                        "type": "string",
                        "required": False,
                        "placeholder": "e.g. Datacenter Rack 04",
                        "default": ""
                    },
                    {
                        "name": "contact",
                        "labelFa": "اطلاعات تماس مدیر شبکه (Contact)",
                        "labelEn": "Admin Contact Info",
                        "type": "string",
                        "required": False,
                        "placeholder": "e.g. noc@example.com",
                        "default": ""
                    }
                ],
                is_dangerous=False,
                supports_backup=True,
                supports_idempotency=True,
                default_timeout_sec=20
            ),
            CommandTemplate(
                id="backup_running_config",
                category="maintenance_backup",
                title="دریافت نسخه پشتیبان (Backup Config)",
                title_en="Backup Running Configuration",
                description="فراخوانی و دانلود کانفیگ فعال دستگاه و ثبت نسخه پشتیبان زمان‌دار در مخزن بایگانی پنل",
                description_en="Fetch active running configuration and register a timestamped backup snapshot in database",
                icon="DownloadCloud",
                parameters=[
                    {
                        "name": "label",
                        "labelFa": "عنوان یا برچسب یادداشت برای این نسخه پشتیبان",
                        "labelEn": "Backup Note / Description",
                        "type": "string",
                        "required": False,
                        "placeholder": "e.g. Pre-upgrade routine backup",
                        "default": "Bulk Routine Configuration Snapshot"
                    }
                ],
                is_dangerous=False,
                supports_backup=False,  # This IS the backup
                supports_idempotency=False,
                default_timeout_sec=35,
                requires_save_step=False
            ),
            CommandTemplate(
                id="save_running_config",
                category="maintenance_backup",
                title="ذخیره تغییرات در حافظه پایدار (Write Memory)",
                title_en="Save Running Config (Write Memory)",
                description="همگام‌سازی Running-Config با Startup-Config در سیسکو و ثبت بک‌آپ محلی در میکروتیک",
                description_en="Persist running configuration to NVRAM (copy run start / write memory) across devices",
                icon="Save",
                parameters=[],
                is_dangerous=False,
                supports_backup=True,
                supports_idempotency=False,
                default_timeout_sec=30,
                requires_save_step=False
            ),
            CommandTemplate(
                id="reboot_device",
                category="system_lifecycle",
                title="راه‌اندازی مجدد سخت‌افزاری (Reboot / Reload)",
                title_en="Reboot Hardware Devices",
                description="ری‌استارت کامل سیستم‌عامل دستگاه. این عملیات سرویس‌دهی پورت‌ها را موقتاً قطع می‌کند و نیازمند تاییدیه صریح است.",
                description_en="Gracefully reboot device operating system. Disruptive operation causing temporary downtime.",
                icon="RefreshCw",
                parameters=[
                    {
                        "name": "reason",
                        "labelFa": "دلیل راه‌اندازی مجدد (جهت ثبت در لاگ)",
                        "labelEn": "Reboot Reason / Change Record",
                        "type": "string",
                        "required": False,
                        "placeholder": "e.g. Scheduled firmware maintenance",
                        "default": "Administrative bulk reboot"
                    }
                ],
                is_dangerous=True,
                confirmation_keyword="REBOOT",
                supports_backup=True,
                supports_idempotency=False,
                default_timeout_sec=30,
                requires_save_step=True
            ),
            CommandTemplate(
                id="enable_ssh_timeout",
                category="system_security",
                title="تنظیم زمان انقضای نشست (SSH Inactivity Timeout)",
                title_en="Configure SSH Session Inactivity Timeout",
                description="تنظیم مهلت پایان خودکار نشست‌های ترمینال در صورت عدم فعالیت جهت افزایش ضریب ایمنی شبکه",
                description_en="Enforce strict idle session disconnection for VTY / SSH lines to adhere to security baselines",
                icon="Timer",
                parameters=[
                    {
                        "name": "timeout_minutes",
                        "labelFa": "تایم‌اوت عدم فعالیت (دقیقه)",
                        "labelEn": "Inactivity Timeout (Minutes)",
                        "type": "number",
                        "required": True,
                        "placeholder": "15",
                        "default": 15
                    }
                ],
                is_dangerous=False,
                supports_backup=True,
                supports_idempotency=True,
                default_timeout_sec=20
            ),
            CommandTemplate(
                id="configure_timezone",
                category="network_services",
                title="تنظیم منطقه زمانی (Timezone)",
                title_en="Configure Device Timezone",
                description="تنظیم نام زون جغرافیایی ساعت تجهیزات شبکه",
                description_en="Set standard geographical timezone name across target infrastructure",
                icon="Compass",
                parameters=[
                    {
                        "name": "timezone_name",
                        "labelFa": "نام منطقه زمانی",
                        "labelEn": "Timezone Name",
                        "type": "string",
                        "required": True,
                        "placeholder": "Asia/Tehran or IRST or UTC",
                        "default": "Asia/Tehran"
                    }
                ],
                is_dangerous=False,
                supports_backup=True,
                supports_idempotency=True,
                default_timeout_sec=20
            ),
            CommandTemplate(
                id="custom_raw_commands",
                category="advanced_automation",
                title="اجرای دستورات سفارشی (Custom Raw CLI)",
                title_en="Execute Custom Raw CLI Commands",
                description="اجرای یک یا چند خط دستور متنی دلخواه به صورت خط‌به‌خط روی تمام تجهیزات انتخاب‌شده با ثبت کامل لاگ",
                description_en="Execute batch arbitrary CLI commands line-by-line across selected devices with comprehensive audit logging",
                icon="Terminal",
                parameters=[
                    {
                        "name": "commands",
                        "labelFa": "دستورات متنی (در هر سطر یک دستور)",
                        "labelEn": "Raw CLI Commands (one per line)",
                        "type": "textarea",
                        "required": True,
                        "placeholder": "e.g. \ninterface GigabitEthernet1/0/24\ndescription Uplink_Core\nexit",
                        "default": ""
                    },
                    {
                        "name": "require_config_mode",
                        "labelFa": "اجرا در محیط کانفیگ سراسری (Configure Terminal)",
                        "labelEn": "Run in Global Config Mode",
                        "type": "boolean",
                        "required": False,
                        "default": True
                    }
                ],
                is_dangerous=False,
                supports_backup=True,
                supports_idempotency=False,
                default_timeout_sec=40
            )
        ]

        for t in templates_defs:
            self._templates[t.id] = t

# Global Singleton Registry
os_mapper_registry = OSCommandMapperRegistry()
