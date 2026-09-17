"""
Cisco IOS & IOS-XE Command Mapper
Translates logical templates into robust Cisco IOS global configuration commands.
Includes pre-checks, idempotency evaluation, and error classification.
"""
import re
from typing import Dict, Any, List, Optional, Tuple
from .base import BaseOSCommandMapper, parse_ip_and_mask
from ..models import CommandStep, IdempotencyResult, ErrorType

class CiscoIOSCommandMapper(BaseOSCommandMapper):
    platform_id: str = "cisco_ios"
    platform_name: str = "Cisco IOS / IOS-XE"

    def matches_device(self, device: Dict[str, Any]) -> bool:
        platform = (device.get("platform") or "").lower()
        model = (device.get("model") or "").lower()
        firmware = (device.get("firmware") or "").lower()
        name = (device.get("name") or "").lower()
        vendor = (device.get("vendor") or "").lower()

        if "cisco" in platform or "ios" in platform or "cisco" in vendor:
            return True
        if any(kw in model for kw in ["catalyst", "cisco", "ws-c", "isr", "asr", "nexus", "c29", "c35", "c37", "c38", "c92", "c93", "c95"]):
            return True
        if "ios" in firmware or "cisco" in name:
            return True
        return False

    def is_switch_device(self, device: Dict[str, Any]) -> bool:
        """Dynamically identifies whether the target hardware is an L2/L3 switch or a router."""
        dev_type = (device.get("type") or "").lower()
        model = (device.get("model") or "").lower()
        role = (device.get("role") or "").lower()
        name = (device.get("name") or "").lower()

        if dev_type == "switch":
            return True
        if dev_type == "router":
            return False
        if any(kw in model for kw in ["catalyst", "ws-c", "c29", "c35", "c37", "c38", "c92", "c93", "c95", "nexus"]):
            return True
        if any(kw in model for kw in ["isr", "asr", "c19", "c28", "c2911", "c39", "c43", "c44"]):
            return False
        if "switch" in role or "sw-" in name or "sw_" in name or "-sw" in name:
            return True
        if "router" in role or "rtr-" in name or "rtr_" in name or "-rtr" in name:
            return False
        return True  # Standard enterprise default for Cisco

    def get_backup_command(self) -> str:
        return "show running-config"

    def get_save_command(self) -> Optional[str]:
        return "write memory"

    def get_idempotency_check_command(self, template_id: str, params: Dict[str, Any]) -> Optional[str]:
        if template_id == "create_vlan" or template_id == "delete_vlan":
            vlan_id = int(params.get("vlan_id", 10))
            return f"show vlan id {vlan_id}"
        elif template_id == "create_local_user":
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
        if template_id == "create_vlan":
            vlan_id = str(params.get("vlan_id", 10)).strip()
            vlan_name = params.get("vlan_name", "").strip()
            # If show vlan id displays the VLAN line or running-config includes vlan
            if re.search(rf"^\s*{re.escape(vlan_id)}\s+", output, re.MULTILINE) or f"vlan {vlan_id}" in output.lower():
                return IdempotencyResult(
                    already_configured=True,
                    reason_fa=f"شناسه وی‌لن {vlan_id} در حال حاضر روی تجهیز سیسکو تعریف شده است (پیکربندی پورت‌ها و اینترفیس لایه ۳ اعمال خواهد شد).",
                    reason_en=f"VLAN {vlan_id} already exists on Cisco device; proceeding with port assignments and SVI update.",
                    should_skip=False
                )
        elif template_id == "delete_vlan":
            vlan_id = str(params.get("vlan_id", 10)).strip()
            if "not found in current vlan database" in output.lower() or not (re.search(rf"^\s*{re.escape(vlan_id)}\s+", output, re.MULTILINE) or f"vlan {vlan_id}" in output.lower()):
                return IdempotencyResult(
                    already_configured=True,
                    reason_fa=f"وی‌لن {vlan_id} در پایگاه داده این دستگاه سیسکو یافت نشد؛ عملیات حذف صرف‌نظر شد.",
                    reason_en=f"VLAN {vlan_id} does not exist in Cisco database; deletion safely skipped.",
                    should_skip=True
                )
        elif template_id == "create_local_user":
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

        if template_id == "create_vlan":
            vlan_id = int(params.get("vlan_id", 10))
            vlan_name = (params.get("vlan_name") or f"VLAN_{vlan_id}").strip().replace(" ", "_")
            configure_ip = bool(params.get("configure_ip_gateway", False))
            gw_ip_raw = (params.get("gateway_ip") or "").strip()
            subnet_mask_raw = (params.get("subnet_mask") or "255.255.255.0").strip()
            access_ports_raw = (params.get("assign_access_ports") or "").strip()
            trunk_ports_raw = (params.get("add_to_trunk_ports") or "").strip()
            clean_ip, dotted_mask, cidr = parse_ip_and_mask(gw_ip_raw, subnet_mask_raw)

            is_switch = self.is_switch_device(device)
            dev_label = f"Cisco Switch ({device.get('model') or 'Catalyst'})" if is_switch else f"Cisco Router ({device.get('model') or 'ISR/IOS'})"

            if is_switch:
                # 1. Create VLAN in Switch Database
                steps.append(CommandStep(
                    name="create_cisco_vlan",
                    command=f"vlan {vlan_id}\n name {vlan_name}\n state active\n no shutdown",
                    description_fa=f"[{dev_label}] ایجاد شناسه عددی وی‌لن {vlan_id} با نام «{vlan_name}» در پایگاه داده سوئیچ",
                    description_en=f"[{dev_label}] Create VLAN {vlan_id} ('{vlan_name}') in switch VLAN database",
                    mode="config"
                ))

                # 2. Configure L3 SVI if requested
                if configure_ip and clean_ip:
                    steps.append(CommandStep(
                        name="configure_cisco_svi",
                        command=f"interface Vlan{vlan_id}\n description {vlan_name}_L3_Gateway\n ip address {clean_ip} {dotted_mask}\n no shutdown",
                        description_fa=f"[{dev_label}] پیکربندی اینترفیس مجازی لایه ۳ (interface Vlan{vlan_id}) با آدرس {clean_ip} {dotted_mask}",
                        description_en=f"[{dev_label}] Configure Layer 3 SVI (interface Vlan{vlan_id}) with IP {clean_ip} {dotted_mask}",
                        mode="config"
                    ))

                # 3. Assign Access Ports
                if access_ports_raw:
                    port_cmd_keyword = "interface range" if ("-" in access_ports_raw or "," in access_ports_raw) else "interface"
                    steps.append(CommandStep(
                        name="assign_cisco_access_ports",
                        command=f"{port_cmd_keyword} {access_ports_raw}\n switchport mode access\n switchport access vlan {vlan_id}\n no shutdown",
                        description_fa=f"[{dev_label}] تنظیم پورت‌های {access_ports_raw} در حالت Access و عضویت در VLAN {vlan_id}",
                        description_en=f"[{dev_label}] Set ports {access_ports_raw} to access mode in VLAN {vlan_id}",
                        mode="config"
                    ))

                # 4. Add to Trunk Ports
                if trunk_ports_raw:
                    trunk_cmd_keyword = "interface range" if ("-" in trunk_ports_raw or "," in trunk_ports_raw) else "interface"
                    steps.append(CommandStep(
                        name="add_cisco_trunk_vlan",
                        command=f"{trunk_cmd_keyword} {trunk_ports_raw}\n switchport trunk allowed vlan add {vlan_id}",
                        description_fa=f"[{dev_label}] افزودن VLAN {vlan_id} به لیست مجاز پورت‌های ترانک ({trunk_ports_raw})",
                        description_en=f"[{dev_label}] Add VLAN {vlan_id} to allowed trunk list on {trunk_ports_raw}",
                        mode="config"
                    ))

            else:
                # Router Architecture (Router-on-a-Stick dot1Q sub-interface)
                parent_iface = (params.get("cisco_router_parent_interface") or "GigabitEthernet0/0/0").strip()
                if configure_ip and clean_ip:
                    steps.append(CommandStep(
                        name="configure_cisco_router_subinterface",
                        command=f"interface {parent_iface}.{vlan_id}\n description {vlan_name}_Dot1Q_Gateway\n encapsulation dot1Q {vlan_id}\n ip address {clean_ip} {dotted_mask}\n no shutdown",
                        description_fa=f"[{dev_label}] ایجاد ساب‌اینترفیس {parent_iface}.{vlan_id} با کپسوله‌سازی 802.1Q و آی‌پی {clean_ip}/{cidr}",
                        description_en=f"[{dev_label}] Create Router-on-a-Stick sub-interface {parent_iface}.{vlan_id} with dot1Q {vlan_id} and IP {clean_ip}/{cidr}",
                        mode="config"
                    ))
                else:
                    steps.append(CommandStep(
                        name="create_cisco_router_vlan",
                        command=f"vlan {vlan_id}\n name {vlan_name}\n state active",
                        description_fa=f"[{dev_label}] تعریف شناسه VLAN {vlan_id} در دیتابیس ماژول سوئیچ روتر",
                        description_en=f"[{dev_label}] Define VLAN {vlan_id} in router database",
                        mode="config"
                    ))

        elif template_id == "delete_vlan":
            vlan_id = int(params.get("vlan_id", 10))
            remove_svi = bool(params.get("remove_svi", True))
            is_switch = self.is_switch_device(device)
            dev_label = f"Cisco Switch ({device.get('model') or 'Catalyst'})" if is_switch else f"Cisco Router ({device.get('model') or 'ISR/IOS'})"

            if is_switch:
                if remove_svi:
                    steps.append(CommandStep(
                        name="remove_cisco_svi",
                        command=f"no interface Vlan{vlan_id}",
                        description_fa=f"[{dev_label}] حذف اینترفیس مجازی لایه ۳ (no interface Vlan{vlan_id})",
                        description_en=f"[{dev_label}] Remove L3 SVI interface Vlan{vlan_id}",
                        mode="config"
                    ))
                steps.append(CommandStep(
                    name="delete_cisco_vlan",
                    command=f"no vlan {vlan_id}",
                    description_fa=f"[{dev_label}] حذف قطعی وی‌لن {vlan_id} از پایگاه داده سوئیچ",
                    description_en=f"[{dev_label}] Delete VLAN {vlan_id} from Cisco switch database",
                    mode="config"
                ))
            else:
                parent_iface = (params.get("cisco_router_parent_interface") or "GigabitEthernet0/0/0").strip()
                steps.append(CommandStep(
                    name="delete_cisco_router_subinterface",
                    command=f"no interface {parent_iface}.{vlan_id}\nno vlan {vlan_id}",
                    description_fa=f"[{dev_label}] حذف ساب‌اینترفیس {parent_iface}.{vlan_id} و رکورد VLAN",
                    description_en=f"[{dev_label}] Delete sub-interface {parent_iface}.{vlan_id} and VLAN record",
                    mode="config"
                ))

        elif template_id == "create_local_user":
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
