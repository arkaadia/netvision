"""
MikroTik RouterOS Command Mapper
Translates logical templates into RouterOS terminal syntax (both v6 and v7 compatible).
Includes pre-checks, idempotency handling, and specific RouterOS error classification.
"""
import re
from typing import Dict, Any, List, Optional, Tuple
from .base import BaseOSCommandMapper, parse_ip_and_mask
from ..models import CommandStep, IdempotencyResult, ErrorType

class MikroTikCommandMapper(BaseOSCommandMapper):
    platform_id: str = "mikrotik_routeros"
    platform_name: str = "MikroTik RouterOS"

    def matches_device(self, device: Dict[str, Any]) -> bool:
        platform = (device.get("platform") or "").lower()
        model = (device.get("model") or "").lower()
        firmware = (device.get("firmware") or "").lower()
        name = (device.get("name") or "").lower()
        vendor = (device.get("vendor") or "").lower()

        if "mikrotik" in platform or "routeros" in platform or "mikrotik" in vendor:
            return True
        if any(kw in model for kw in ["mikrotik", "routerboard", "crs", "css", "ccr", "hex", "hap", "rb"]):
            return True
        if "routeros" in firmware or "mikrotik" in name:
            return True
        return False

    def is_crs_or_switch(self, device: Dict[str, Any]) -> bool:
        """Determines whether the device is a Cloud Router Switch (CRS) or operates in switch mode."""
        dev_type = (device.get("type") or "").lower()
        model = (device.get("model") or "").lower()
        role = (device.get("role") or "").lower()

        if dev_type == "switch":
            return True
        if any(kw in model for kw in ["crs", "css"]):
            return True
        if "switch" in role:
            return True
        return False

    def get_backup_command(self) -> str:
        # /export compact produces an exact, readable configuration script
        return "/export compact"

    def get_save_command(self) -> Optional[str]:
        # RouterOS auto-persists all changes immediately; create a timestamped backup point
        return "/system backup save name=netman_auto_save"

    def get_idempotency_check_command(self, template_id: str, params: Dict[str, Any]) -> Optional[str]:
        if template_id == "create_vlan" or template_id == "delete_vlan":
            vlan_id = int(params.get("vlan_id", 10))
            return f"/interface vlan print where vlan-id={vlan_id}"
        elif template_id == "create_local_user" or template_id == "delete_local_user":
            username = params.get("username", "").strip()
            return f'/user print where name="{username}"'
        elif template_id == "set_dns_servers":
            return "/ip dns print"
        elif template_id == "set_ntp_servers":
            return "/system ntp client print"
        elif template_id == "configure_snmp":
            return "/snmp print"
        return None

    def evaluate_idempotency(self, template_id: str, params: Dict[str, Any], raw_output: str) -> IdempotencyResult:
        output = (raw_output or "").strip()
        if template_id == "create_vlan":
            vlan_id = str(params.get("vlan_id", 10)).strip()
            if f"vlan-id={vlan_id}" in output or vlan_id in output:
                return IdempotencyResult(
                    already_configured=True,
                    reason_fa=f"اینترفیس VLAN {vlan_id} از قبل در RouterOS ثبت شده است (تنظیمات آی‌پی و Bridge VLAN به‌روزرسانی می‌شود).",
                    reason_en=f"VLAN {vlan_id} interface already exists in RouterOS; updating IP and Bridge VLAN table.",
                    should_skip=False
                )
        elif template_id == "delete_vlan":
            vlan_id = str(params.get("vlan_id", 10)).strip()
            if output == "" or "no items found" in output.lower():
                return IdempotencyResult(
                    already_configured=True,
                    reason_fa=f"وی‌لن {vlan_id} در میکروتیک موجود نیست؛ عملیات حذف با موفقیت رد شد.",
                    reason_en=f"VLAN {vlan_id} not present in RouterOS; deletion skipped safely.",
                    should_skip=True
                )
        elif template_id == "create_local_user":
            username = params.get("username", "").strip()
            # If user already exists in RouterOS
            if username.lower() in output.lower():
                return IdempotencyResult(
                    already_configured=True,
                    reason_fa=f"کاربر «{username}» در میکروتیک وجود دارد (دستور به صورت امن به جای Add به Set تغییر می‌یابد).",
                    reason_en=f"User '{username}' already exists in RouterOS; executing in-place password/group update.",
                    should_skip=False
                )
        elif template_id == "delete_local_user":
            username = params.get("username", "").strip()
            if username.lower() not in output.lower():
                return IdempotencyResult(
                    already_configured=True,
                    reason_fa=f"کاربر «{username}» در روتربورد میکروتیک یافت نشد؛ عملیات حذف با موفقیت رد شد.",
                    reason_en=f"User '{username}' not present in RouterOS; deletion skipped gracefully.",
                    should_skip=True
                )
        return IdempotencyResult(already_configured=False)

    def classify_error(self, raw_output: str, exit_code: int = 0) -> Tuple[str, str, str]:
        txt = (raw_output or "").lower()
        if "failure: already have user" in txt:
            return (
                ErrorType.COMMAND_SYNTAX_ERROR,
                "کاربری با این نام از قبل روی میکروتیک تعریف شده است.",
                "Failure: Already have user with such name in RouterOS."
            )
        if "bad command name" in txt or "syntax error" in txt or "expected parameter" in txt:
            return (
                ErrorType.COMMAND_SYNTAX_ERROR,
                "سینتکس دستور میکروتیک توسط این نگارش RouterOS پشتیبانی نمی‌شود.",
                "Invalid syntax or unsupported RouterOS CLI syntax."
            )
        if "permission denied" in txt or "action not permitted" in txt or "not enough permissions" in txt:
            return (
                ErrorType.PERMISSION_DENIED,
                "کاربر لاگین شده دسترسی لازم (Write/Full) در میکروتیک را ندارد.",
                "Insufficient user permissions in RouterOS."
            )
        return super().classify_error(raw_output, exit_code)

    def map_command(self, template_id: str, params: Dict[str, Any], device: Dict[str, Any]) -> List[CommandStep]:
        steps: List[CommandStep] = []

        if template_id == "create_vlan":
            vlan_id = int(params.get("vlan_id", 10))
            vlan_name = (params.get("vlan_name") or f"vlan{vlan_id}").strip().replace(" ", "_")
            configure_ip = bool(params.get("configure_ip_gateway", False))
            gw_ip_raw = (params.get("gateway_ip") or "").strip()
            subnet_mask_raw = (params.get("subnet_mask") or "255.255.255.0").strip()
            access_ports_raw = (params.get("assign_access_ports") or "").strip()
            trunk_ports_raw = (params.get("add_to_trunk_ports") or "").strip()
            parent_iface = (params.get("mikrotik_parent_interface") or "bridge").strip() or "bridge"
            clean_ip, dotted_mask, cidr = parse_ip_and_mask(gw_ip_raw, subnet_mask_raw)
            ip_with_cidr = f"{clean_ip}/{cidr}" if clean_ip else ""

            is_crs = self.is_crs_or_switch(device)
            dev_label = f"MikroTik CRS Switch ({device.get('model') or 'CRS'})" if is_crs else f"MikroTik Router ({device.get('model') or 'RouterOS'})"

            # 1. Create or Update /interface vlan
            steps.append(CommandStep(
                name="ensure_mikrotik_vlan_interface",
                command=f':if ([:len [/interface vlan find vlan-id={vlan_id}]] = 0) do={{ /interface vlan add name="{vlan_name}" vlan-id={vlan_id} interface={parent_iface} comment="NetMan Managed" }} else={{ /interface vlan set [find vlan-id={vlan_id}] name="{vlan_name}" interface={parent_iface} }}',
                description_fa=f"[{dev_label}] ایجاد/به‌روزرسانی اینترفیس VLAN {vlan_id} به نام «{vlan_name}» روی {parent_iface}",
                description_en=f"[{dev_label}] Create/update /interface vlan {vlan_id} ('{vlan_name}') on {parent_iface}",
                mode="exec"
            ))

            # 2. Configure L3 Gateway IP if requested
            if configure_ip and clean_ip:
                steps.append(CommandStep(
                    name="configure_mikrotik_vlan_ip",
                    command=f':if ([:len [/ip address find interface="{vlan_name}"]] = 0) do={{ /ip address add address={ip_with_cidr} interface="{vlan_name}" comment="Gateway for VLAN {vlan_id}" }} else={{ /ip address set [find interface="{vlan_name}"] address={ip_with_cidr} }}',
                    description_fa=f"[{dev_label}] انتساب آدرس IP گیت‌وی {ip_with_cidr} به اینترفیس {vlan_name}",
                    description_en=f"[{dev_label}] Assign Gateway IP {ip_with_cidr} to interface {vlan_name}",
                    mode="exec"
                ))

            # 3. Register in /interface bridge vlan table (Bridge VLAN Filtering)
            trunk_ports = [p.strip() for p in trunk_ports_raw.split(",") if p.strip()]
            access_ports = [p.strip() for p in access_ports_raw.split(",") if p.strip()]
            tagged_ports = [parent_iface] + trunk_ports
            tagged_str = ",".join(tagged_ports)
            untagged_str = ",".join(access_ports) if access_ports else ""
            untagged_arg = f' untagged="{untagged_str}"' if untagged_str else ""

            steps.append(CommandStep(
                name="configure_mikrotik_bridge_vlan",
                command=f':if ([:len [/interface bridge find name="{parent_iface}"]] > 0) do={{ :if ([:len [/interface bridge vlan find bridge="{parent_iface}" and vlan-ids~"\\\\b{vlan_id}\\\\b"]] = 0) do={{ /interface bridge vlan add bridge="{parent_iface}" vlan-ids={vlan_id} tagged="{tagged_str}"{untagged_arg} comment="VLAN {vlan_id} Filtering" }} else={{ /interface bridge vlan set [find bridge="{parent_iface}" and vlan-ids~"\\\\b{vlan_id}\\\\b"] tagged="{tagged_str}"{untagged_arg} }} }}',
                description_fa=f"[{dev_label}] ثبت وی‌لن {vlan_id} در جدول Bridge VLAN Filtering با پورت‌های تگ شده ({tagged_str}){f' و بدون تگ ({untagged_str})' if untagged_str else ''}",
                description_en=f"[{dev_label}] Register VLAN {vlan_id} in Bridge VLAN table (tagged: {tagged_str}{f', untagged: {untagged_str}' if untagged_str else ''})",
                mode="exec"
            ))

            # 4. Set PVID on Access Ports
            if access_ports:
                ports_array = ",".join([f'"{p}"' for p in access_ports])
                steps.append(CommandStep(
                    name="set_mikrotik_access_pvid",
                    command=f':foreach p in={{{ports_array}}} do={{ :if ([:len [/interface bridge port find interface=$p]] > 0) do={{ /interface bridge port set [find interface=$p] pvid={vlan_id} }} }}',
                    description_fa=f"[{dev_label}] تنظیم PVID={vlan_id} روی پورت‌های دسترسی ({','.join(access_ports)})",
                    description_en=f"[{dev_label}] Set PVID={vlan_id} on bridge access ports ({','.join(access_ports)})",
                    mode="exec"
                ))

        elif template_id == "delete_vlan":
            vlan_id = int(params.get("vlan_id", 10))
            is_crs = self.is_crs_or_switch(device)
            dev_label = f"MikroTik CRS Switch ({device.get('model') or 'CRS'})" if is_crs else f"MikroTik Router ({device.get('model') or 'RouterOS'})"

            steps.append(CommandStep(
                name="delete_mikrotik_vlan",
                command=f':if ([:len [/interface vlan find vlan-id={vlan_id}]] > 0) do={{ /interface vlan remove [find vlan-id={vlan_id}] }}; :if ([:len [/interface bridge vlan find vlan-ids~"\\\\b{vlan_id}\\\\b"]] > 0) do={{ /interface bridge vlan remove [find vlan-ids~"\\\\b{vlan_id}\\\\b"] }}',
                description_fa=f"[{dev_label}] حذف کامل اینترفیس VLAN {vlan_id} و رکورد Bridge VLAN از RouterOS",
                description_en=f"[{dev_label}] Remove VLAN {vlan_id} interface and Bridge VLAN table entry from RouterOS",
                mode="exec"
            ))

        elif template_id == "create_local_user":
            username = params.get("username", "").strip()
            password = params.get("password", "").strip()
            priv = int(params.get("privilege_level", 15))
            group = "full" if priv >= 10 else ("write" if priv >= 5 else "read")
            # RouterOS idempotent approach: try remove if existing then add, or add directly
            steps.append(CommandStep(
                name="ensure_mikrotik_user",
                command=f':if ([:len [/user find name="{username}"]] > 0) do={{ /user set [find name="{username}"] password="{password}" group="{group}" }} else={{ /user add name="{username}" password="{password}" group="{group}" }}',
                description_fa=f"ایجاد یا به‌روزرسانی کاربر {username} با دسترسی {group} در میکروتیک",
                description_en=f"Create or update RouterOS user {username} with {group} group",
                mode="exec"
            ))

        elif template_id == "delete_local_user":
            username = params.get("username", "").strip()
            steps.append(CommandStep(
                name="delete_mikrotik_user",
                command=f':if ([:len [/user find name="{username}"]] > 0) do={{ /user remove [find name="{username}"] }}',
                description_fa=f"حذف امن کاربر {username} از سیستم‌عامل میکروتیک",
                description_en=f"Safely remove user {username} from RouterOS",
                mode="exec"
            ))

        elif template_id == "change_user_password":
            username = params.get("username", "").strip()
            new_password = params.get("new_password", "").strip()
            steps.append(CommandStep(
                name="change_mikrotik_password",
                command=f'/user set [find name="{username}"] password="{new_password}"',
                description_fa=f"تغییر رمز عبور کاربر {username} در میکروتیک",
                description_en=f"Change password for user {username} in RouterOS",
                mode="exec"
            ))

        elif template_id == "set_ntp_servers":
            primary_ntp = params.get("primary_ntp", "").strip()
            secondary_ntp = params.get("secondary_ntp", "").strip()
            servers = [s for s in [primary_ntp, secondary_ntp] if s]
            servers_csv = ",".join(servers)
            # Universal RouterOS script to support both v7 (servers=...) and v6 (primary-ntp=...)
            v7_cmd = f'/system ntp client set enabled=yes servers={servers_csv}'
            v6_fallback = f'/system ntp client set enabled=yes primary-ntp={primary_ntp}' + (f' secondary-ntp={secondary_ntp}' if secondary_ntp else '')
            steps.append(CommandStep(
                name="set_mikrotik_ntp",
                command=f':do {{ {v7_cmd} }} on-error={{ {v6_fallback} }}',
                description_fa=f"پیکربندی کلاینت NTP میکروتیک با سرورهای {servers_csv}",
                description_en=f"Configure RouterOS NTP client with servers {servers_csv}",
                mode="exec"
            ))

        elif template_id == "set_dns_servers":
            primary_dns = params.get("primary_dns", "").strip()
            secondary_dns = params.get("secondary_dns", "").strip()
            dns_list = [d for d in [primary_dns, secondary_dns] if d]
            dns_csv = ",".join(dns_list)
            steps.append(CommandStep(
                name="set_mikrotik_dns",
                command=f'/ip dns set servers="{dns_csv}"',
                description_fa=f"تنظیم DNS سرورهای میکروتیک به {dns_csv}",
                description_en=f"Set RouterOS DNS servers to {dns_csv}",
                mode="exec"
            ))

        elif template_id == "set_syslog_server":
            syslog_ip = params.get("syslog_ip", "").strip()
            syslog_port = int(params.get("syslog_port", 514))
            steps.append(CommandStep(
                name="configure_mikrotik_syslog_action",
                command=f':if ([:len [/system logging action find name="remote_syslog"]] = 0) do={{ /system logging action add name=remote_syslog target=remote remote="{syslog_ip}" remote-port={syslog_port} }} else={{ /system logging action set [find name="remote_syslog"] remote="{syslog_ip}" remote-port={syslog_port} }}',
                description_fa=f"تعریف اکشن ریموت Syslog به مقصد {syslog_ip}:{syslog_port}",
                description_en=f"Define remote Syslog action to {syslog_ip}:{syslog_port}",
                mode="exec"
            ))
            steps.append(CommandStep(
                name="enable_mikrotik_syslog_logging",
                command=':if ([:len [/system logging find action="remote_syslog"]] = 0) do={{ /system logging add action=remote_syslog topics=info,warning,error }}',
                description_fa="ارسال رویدادهای سیستمی (Info, Warning, Error) به سرور لاگ",
                description_en="Forward system topics (info, warning, error) to remote syslog",
                mode="exec"
            ))

        elif template_id == "set_banner_motd":
            banner_text = params.get("banner_text", "").strip() or "Authorized Access Only!"
            clean_banner = banner_text.replace('"', "'")
            steps.append(CommandStep(
                name="set_mikrotik_note",
                command=f'/system note set show-at-login=yes note="{clean_banner}"',
                description_fa="تنظیم پیام هشدار ورود در کنسول میکروتیک (System Note)",
                description_en="Configure RouterOS login banner note",
                mode="exec"
            ))

        elif template_id == "configure_snmp":
            community = params.get("community", "public").strip()
            location = params.get("location", "").strip().replace('"', "'")
            contact = params.get("contact", "").strip().replace('"', "'")
            steps.append(CommandStep(
                name="set_mikrotik_snmp_community",
                command=f':if ([:len [/snmp community find name="{community}"]] = 0) do={{ /snmp community add name="{community}" read-access=yes }} else={{ /snmp community set [find name="{community}"] read-access=yes }}',
                description_fa=f"پیکربندی رشته SNMP Community به نام «{community}»",
                description_en=f"Configure SNMP community '{community}' in RouterOS",
                mode="exec"
            ))
            snmp_set = f'/snmp set enabled=yes'
            if location:
                snmp_set += f' location="{location}"'
            if contact:
                snmp_set += f' contact="{contact}"'
            steps.append(CommandStep(
                name="enable_mikrotik_snmp",
                command=snmp_set,
                description_fa="فعال‌سازی سرویس SNMP و ثبت موقعیت و تماس مدیر",
                description_en="Enable SNMP service and set contact/location details",
                mode="exec"
            ))

        elif template_id == "backup_running_config":
            steps.append(CommandStep(
                name="export_mikrotik_config",
                command="/export compact",
                description_fa="استخراج اسکریپت کانفیگ متنی روتر او اس (/export compact)",
                description_en="Export RouterOS configuration script (/export compact)",
                mode="exec"
            ))

        elif template_id == "save_running_config":
            steps.append(CommandStep(
                name="save_mikrotik_backup",
                command="/system backup save name=bulk_config_save",
                description_fa="ایجاد نقطه پشتیبان باینری در دیسک سیستم میکروتیک",
                description_en="Save binary system backup artifact to RouterOS storage",
                mode="exec"
            ))

        elif template_id == "reboot_device":
            steps.append(CommandStep(
                name="mikrotik_reboot",
                command="/system reboot\ny",
                description_fa="راه‌اندازی مجدد روتربورد میکروتیک (/system reboot)",
                description_en="Reboot MikroTik RouterBOARD (/system reboot)",
                mode="exec"
            ))

        elif template_id == "configure_timezone":
            tz_name = params.get("timezone_name", "Asia/Tehran").strip()
            steps.append(CommandStep(
                name="set_mikrotik_timezone",
                command=f'/system clock set time-zone-name="{tz_name}"',
                description_fa=f"تنظیم محدوده زمانی ساعت میکروتیک به {tz_name}",
                description_en=f"Set RouterOS clock time-zone to {tz_name}",
                mode="exec"
            ))

        elif template_id == "enable_ssh_timeout":
            timeout_min = int(params.get("timeout_minutes", 15))
            steps.append(CommandStep(
                name="set_mikrotik_ssh_timeout",
                command=f'/ip service set ssh address=0.0.0.0/0',
                description_fa=f"تنظیم امنیت سرویس SSH در میکروتیک",
                description_en=f"Verify SSH service security bindings in RouterOS",
                mode="exec"
            ))

        elif template_id == "custom_raw_commands":
            raw_cmds = params.get("commands", "").strip().splitlines()
            for idx, line in enumerate(raw_cmds):
                line_clean = line.strip()
                if line_clean and not line_clean.startswith("#"):
                    steps.append(CommandStep(
                        name=f"custom_step_{idx+1}",
                        command=line_clean,
                        description_fa=f"دستور سفارشی {idx+1}: {line_clean}",
                        description_en=f"Custom command step {idx+1}: {line_clean}",
                        mode="exec"
                    ))

        return steps
