"""
MikroTik RouterOS Platform Driver
Implements commands, prompt handling, output normalization and action generation for MikroTik RouterOS devices.
"""
from typing import Dict, Any, List, Optional
import re
from backend.drivers.base import NetworkDeviceDriver

class MikroTikDriver(NetworkDeviceDriver):
    def __init__(self, platform: str = "mikrotik_routeros"):
        self.platform = platform
        self.platform_name = "MikroTik RouterOS"
        self.capabilities = {
            "vlan": True,
            "interface_enable_disable": True,
            "port_security": False,
            "switchport_mode": False,
            "trunk": False,
            "save_config": False,  # RouterOS auto-commits commands immediately to persistent storage
            "interface_description": True,
            "speed_duplex": True,
            "poe": True,
            "lldp_cdp": True,
        }

    def get_prompt(self, hostname: str, mode: str = "exec", context: str = "") -> str:
        clean_host = hostname or "MikroTik"
        if context:
            clean_ctx = context.strip("/")
            return f"[admin@{clean_host}] /{clean_ctx}> "
        return f"[admin@{clean_host}] > "

    def get_command_help(self) -> List[Dict[str, Any]]:
        return [
            # System & Resource
            {"cmd": "/system resource print", "desc": "نمایش منابع سیستم، CPU، حافظه RAM و آپ‌تایم", "descEn": "Display CPU, Memory, Uptime and OS build", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/system identity print", "desc": "نمایش هاست‌نیم و شناسه دستگاه میکروتیک", "descEn": "Print system hostname identity", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/system health print", "desc": "بررسی ولتاژ، دما و سلامت سخت‌افزاری روتربورد", "descEn": "Display system voltage, temperature and fan sensors", "category": "show", "mode": "PRIVILEGED_EXEC"},
            # Interfaces & Ethernet
            {"cmd": "/interface print", "desc": "نمایش تمام اینترفیس‌ها و وضعیت پیوند (R = Running)", "descEn": "List all interfaces with running/disabled status", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/interface ethernet print", "desc": "نمایش اینترفیس‌های اترنت فیزیکی و سرعت لینک", "descEn": "Print physical ethernet interfaces & negotiation", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/interface ethernet monitor ether1 once", "desc": "مانیتورینگ بلادرنگ پورت ether1 (نرخ ارسال/دریافت)", "descEn": "Monitor live status and traffic on ether1", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/interface disable [find name=\"ether1\"]", "desc": "غیرفعال‌سازی و خاموش کردن اینترفیس ether1", "descEn": "Administratively disable interface ether1", "category": "action", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/interface enable [find name=\"ether1\"]", "desc": "فعال‌سازی و روشن کردن مجدد اینترفیس ether1", "descEn": "Administratively enable interface ether1", "category": "action", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/interface set [find name=\"ether1\"] comment=\"Uplink-Core\"", "desc": "ثبت کامنت و توضیحات شناسایی روی پورت", "descEn": "Set descriptive comment label on interface", "category": "config", "mode": "PRIVILEGED_EXEC"},
            # IP & Routing
            {"cmd": "/ip address print", "desc": "نمایش آدرس‌های IP و ماسک شبکه تخصیص‌یافته به پورت‌ها", "descEn": "Print IP address bindings and subnets", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/ip route print", "desc": "نمایش جدول مسیریابی و گیت‌وی‌های فعال (Active Routes)", "descEn": "Display IP routing table and active gateways", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/ip neighbor print", "desc": "کشف تجهیزات مجاور با پروتکل‌های MNDP، CDP و LLDP", "descEn": "List discovered neighbors via MNDP/CDP/LLDP", "category": "show", "mode": "PRIVILEGED_EXEC"},
            # VLAN & Bridge
            {"cmd": "/interface bridge port print", "desc": "نمایش پورت‌های عضو بریج و شناسه PVID", "descEn": "List bridge member ports and default PVIDs", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/interface vlan print", "desc": "نمایش اینترفیس‌های مجازی VLAN فعال روی روتر", "descEn": "Print virtual 802.1Q VLAN sub-interfaces", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/interface vlan add name=vlan10 vlan-id=10 interface=ether1", "desc": "ایجاد یک زیرپورت VLAN با تگ 10 روی اینترفیس", "descEn": "Create 802.1Q tagged VLAN interface", "category": "config", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/export compact", "desc": "استخراج کامل کانفیگ متنی روتر او اس (خروجی متنی)", "descEn": "Export concise active configuration script", "category": "show", "mode": "PRIVILEGED_EXEC"},
        ]

    def generate_action_cli(self, action: str, interface: str, params: Optional[Dict[str, Any]] = None) -> str:
        params = params or {}
        clean_iface = interface.strip()

        if action == "shutdown" or action == "disable_interface":
            return f"/interface set [find name=\"{clean_iface}\"] disabled=yes"
        elif action == "no_shutdown" or action == "enable_interface":
            return f"/interface set [find name=\"{clean_iface}\"] disabled=no"
        elif action == "set_description":
            desc = params.get("description", "")
            return f"/interface set [find name=\"{clean_iface}\"] comment=\"{desc}\""
        elif action in ("set_vlan", "change_vlan", "assign_vlan", "mode_access"):
            vlan = params.get("vlan", 1)
            # Standard RouterOS VLAN assignment on bridge or sub-interface
            return f"/interface bridge port set [find interface=\"{clean_iface}\"] pvid={vlan}\n/interface vlan add name=\"vlan{vlan}-{clean_iface}\" vlan-id={vlan} interface=\"{clean_iface}\" disabled=no"
        elif action == "mode_trunk":
            # Set port to admit-only-vlan-tagged and configure 802.1Q tagged bridge VLAN
            return f"/interface bridge port set [find interface=\"{clean_iface}\"] frame-types=admit-only-vlan-tagged\n/interface bridge vlan add bridge=bridge tagged=\"{clean_iface}\" vlan-ids=1-4094 comment=\"Trunk mode on {clean_iface}\""
        elif action == "save_config":
            return "# [RouterOS Info] Configurations in MikroTik RouterOS are committed automatically to persistent storage."
        elif action in ("port_sec_enable", "port_sec_disable"):
            return "# [Unsupported] Cisco Port-Security is not applicable to MikroTik RouterOS. Use Bridge Filter / MAC Filter instead."
        return f"# MikroTik command for {action} on {clean_iface}"

    def get_interface_query_commands(self) -> List[str]:
        return [
            "/interface print detail without-paging",
            "/interface ethernet print detail without-paging",
            "/ip address print without-paging"
        ]

    def parse_interfaces(self, raw_output: str) -> List[Dict[str, Any]]:
        """
        Parses MikroTik RouterOS '/interface print detail' or '/interface ethernet print':
        Flags: D - dynamic, X - disabled, R - running, S - slave
         0  R  name="ether1" default-name="ether1" type="ether" mtu=1500 actual-mtu=1500
               mac-address=48:8F:5A:12:34:56
         1     name="ether2" default-name="ether2" type="ether" mtu=1500 actual-mtu=1500
        """
        ports = []
        entries = re.split(r'\n\s*(?=\d+\s+)', raw_output)

        for entry in entries:
            entry_str = entry.strip()
            if not entry_str:
                continue

            name_match = re.search(r'name="([^"]+)"', entry_str)
            if not name_match:
                # Try unquoted name=ether1
                name_match = re.search(r'name=([^\s]+)', entry_str)

            if name_match:
                port_id = name_match.group(1)
                flags_match = re.match(r'^\d+\s+([A-Z\s]+)', entry_str)
                flags = flags_match.group(1) if flags_match else ""

                is_disabled = "X" in flags or "disabled=yes" in entry_str
                is_running = "R" in flags or "running=yes" in entry_str

                ports.append({
                    "port_id": port_id,
                    "name": port_id,
                    "status": "up" if is_running else "down",
                    "admin_status": "disabled" if is_disabled else "enabled",
                    "mode": "access",
                    "vlan": 1,
                    "allowed_vlans": "1",
                    "speed": "1 Gbps" if "sfp" not in port_id.lower() else "10 Gbps",
                    "duplex": "Full",
                    "connected_device": "Link Connected" if is_running else "Disconnected",
                    "connected_type": "Host" if is_running else "None",
                    "port_security_enabled": False,
                })

        return ports

    def parse_vlans(self, output: str) -> List[Dict[str, Any]]:
        vlans = []
        seen = set()
        for line in output.splitlines():
            line_str = line.strip()
            # Match e.g.: 0  R  name="vlan10" mtu=1500 l2mtu=1580 vlan-id=10 interface=ether1
            m = re.search(r'vlan-id=(\d+)', line_str, re.IGNORECASE)
            name_m = re.search(r'name=["\']?([A-Za-z0-9_.-]+)["\']?', line_str, re.IGNORECASE)
            if m:
                vid = int(m.group(1))
                if vid in seen or vid > 4094:
                    continue
                seen.add(vid)
                name = name_m.group(1) if name_m else f"VLAN {vid}"
                vlans.append({
                    "id": vid,
                    "name": name,
                    "status": "active",
                    "ports_count": 1
                })
        return vlans

    def get_default_ports(self, count: int = 16) -> List[Dict[str, Any]]:
        generated = []
        # Standard MikroTik CCR / CRS layout: ether1 to ether(count-2), plus 2 SFP+ ports
        sfp_count = 2 if count >= 10 else 0
        eth_count = count - sfp_count

        for i in range(1, eth_count + 1):
            p_status = "up" if i <= 3 else ("down" if i % 2 == 0 else "up")
            generated.append({
                "port_id": f"ether{i}",
                "name": f"ether{i}",
                "status": p_status,
                "admin_status": "enabled",
                "mode": "access",
                "vlan": 1 if i == 1 else ((i % 3 + 1) * 10),
                "allowed_vlans": "1",
                "speed": "1 Gbps",
                "duplex": "Full",
                "connected_device": f"LAN-Host-{i}" if p_status == "up" else "Disconnected",
                "connected_type": "Host" if p_status == "up" else "None",
                "poe_status": "delivering" if (i == 1 and p_status == "up") else "off",
                "poe_power": 15.4 if (i == 1 and p_status == "up") else 0,
                "description": f"MikroTik LAN Port {i}",
                "port_security_enabled": False,
            })

        for s in range(1, sfp_count + 1):
            sfp_id = f"sfp-sfpplus{s}"
            generated.append({
                "port_id": sfp_id,
                "name": sfp_id,
                "status": "up" if s == 1 else "down",
                "admin_status": "enabled",
                "mode": "access",
                "vlan": 1,
                "allowed_vlans": "1-4094",
                "speed": "10 Gbps",
                "duplex": "Full",
                "connected_device": "Fiber Uplink" if s == 1 else "Disconnected",
                "connected_type": "Switch" if s == 1 else "None",
                "poe_status": "off",
                "poe_power": 0,
                "description": f"SFP+ 10G Optical Uplink {s}",
                "port_security_enabled": False,
            })

        return generated

    def get_system_resources_commands(self) -> List[Dict[str, str]]:
        return [
            {"key": "resource", "cmd": "/system resource print without-paging"},
            {"key": "health", "cmd": "/system health print without-paging"},
            {"key": "routerboard", "cmd": "/system routerboard print without-paging"},
            {"key": "identity", "cmd": "/system identity print without-paging"},
            {"key": "license", "cmd": "/system license print without-paging"},
            {"key": "package", "cmd": "/system package print without-paging"},
            {"key": "interface", "cmd": "/interface print without-paging"},
        ]

    def parse_system_resources(
        self,
        raw_outputs: Dict[str, str],
        device: Dict[str, Any],
        existing_ports: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Parses live MikroTik RouterOS command outputs into a rich, structured telemetry payload.
        """
        def parse_kv(text: str) -> Dict[str, str]:
            res = {}
            for line in text.splitlines():
                line = line.strip()
                if ":" in line:
                    parts = line.split(":", 1)
                    k = parts[0].strip().lower().replace(" ", "-")
                    v = parts[1].strip()
                    res[k] = v
            return res

        def parse_bytes_to_mb(val_str: str) -> float:
            if not val_str:
                return 0.0
            val_clean = val_str.strip().lower()
            m = re.match(r'^([\d\.]+)\s*([a-z]+)?$', val_clean)
            if not m:
                return 0.0
            num = float(m.group(1))
            unit = m.group(2) or "b"
            if "gib" in unit or "gb" in unit:
                return round(num * 1024, 1)
            elif "mib" in unit or "mb" in unit:
                return round(num, 1)
            elif "kib" in unit or "kb" in unit:
                return round(num / 1024, 1)
            else:
                # Raw bytes
                return round(num / (1024 * 1024), 1)

        res_text = raw_outputs.get("resource", "")
        health_text = raw_outputs.get("health", "")
        rb_text = raw_outputs.get("routerboard", "")
        ident_text = raw_outputs.get("identity", "")
        lic_text = raw_outputs.get("license", "")
        pkg_text = raw_outputs.get("package", "")
        iface_text = raw_outputs.get("interface", "")

        res_kv = parse_kv(res_text)
        health_kv = parse_kv(health_text)
        rb_kv = parse_kv(rb_text)
        ident_kv = parse_kv(ident_text)
        lic_kv = parse_kv(lic_text)

        # Baseline fallbacks derived from model name if live values are missing
        model = rb_kv.get("model") or device.get("model") or "CCR2004-16G-2S+"
        model_upper = model.upper()
        is_ccr = "CCR" in model_upper
        is_rb4011 = "4011" in model_upper or "5009" in model_upper
        is_crs = "CRS" in model_upper or "CSS" in model_upper

        default_arch = "arm64" if (is_ccr or is_rb4011) else ("arm" if is_crs else "mipsbe")
        default_cores = 4 if is_ccr else (4 if is_rb4011 else 2)
        default_freq = "2000 MHz" if is_ccr else ("1400 MHz" if is_rb4011 else "800 MHz")
        default_ram_mb = 4096.0 if is_ccr else (1024.0 if is_rb4011 else 512.0)
        default_hdd_mb = 128.0 if is_ccr else 512.0

        # CPU parsing
        cpu_arch_raw = res_kv.get("architecture-name") or res_kv.get("cpu") or default_arch
        cpu_arch_formatted = f"ARM 64-bit ({cpu_arch_raw})" if "arm64" in cpu_arch_raw.lower() else (
            f"ARM 32-bit ({cpu_arch_raw})" if "arm" in cpu_arch_raw.lower() else (
                f"Tilera TILE-Gx ({cpu_arch_raw})" if "tile" in cpu_arch_raw.lower() else (
                    f"MIPS Architecture ({cpu_arch_raw})" if "mips" in cpu_arch_raw.lower() else cpu_arch_raw
                )
            )
        )
        try:
            cpu_cores = int(res_kv.get("cpu-count", default_cores))
        except (ValueError, TypeError):
            cpu_cores = default_cores

        cpu_freq_str = res_kv.get("cpu-frequency") or default_freq
        if not cpu_freq_str.endswith("MHz") and not cpu_freq_str.endswith("GHz"):
            cpu_freq_str = f"{cpu_freq_str} MHz"

        try:
            cpu_load_str = res_kv.get("cpu-load", "14").replace("%", "").strip()
            cpu_load = int(float(cpu_load_str))
        except (ValueError, TypeError):
            cpu_load = 14

        # RAM parsing
        total_ram_raw = res_kv.get("total-memory")
        free_ram_raw = res_kv.get("free-memory")
        total_ram_mb = parse_bytes_to_mb(total_ram_raw) if total_ram_raw else default_ram_mb
        free_ram_mb = parse_bytes_to_mb(free_ram_raw) if free_ram_raw else round(total_ram_mb * 0.83, 1)
        used_ram_mb = max(0.0, round(total_ram_mb - free_ram_mb, 1))
        ram_percent = int(round((used_ram_mb / total_ram_mb) * 100)) if total_ram_mb > 0 else 17

        # Storage (HDD / NAND)
        total_hdd_raw = res_kv.get("total-hdd-space")
        free_hdd_raw = res_kv.get("free-hdd-space")
        total_hdd_mb = parse_bytes_to_mb(total_hdd_raw) if total_hdd_raw else default_hdd_mb
        free_hdd_mb = parse_bytes_to_mb(free_hdd_raw) if free_hdd_raw else round(total_hdd_mb * 0.74, 1)
        used_hdd_mb = max(0.0, round(total_hdd_mb - free_hdd_mb, 1))
        hdd_percent = int(round((used_hdd_mb / total_hdd_mb) * 100)) if total_hdd_mb > 0 else 26
        bad_blocks = res_kv.get("bad-blocks", "0.0%")
        if not bad_blocks.endswith("%"):
            bad_blocks = f"{bad_blocks}%"

        try:
            write_sect_reboot = int(res_kv.get("write-sect-since-reboot", 14210))
            write_sect_total = int(res_kv.get("write-sect-total", 312540))
        except (ValueError, TypeError):
            write_sect_reboot = 14210
            write_sect_total = 312540

        # Health & Sensors
        voltage_str = health_kv.get("voltage", "24.2V")
        if not voltage_str.endswith("V"):
            voltage_str = f"{voltage_str}V"
        current_str = health_kv.get("current", "1250mA")
        if not current_str.endswith("mA"):
            current_str = f"{current_str}mA"

        def parse_temp(val: str, default: int) -> int:
            if not val:
                return default
            clean = val.replace("C", "").replace("c", "").strip()
            try:
                return int(float(clean))
            except (ValueError, TypeError):
                return default

        board_temp = parse_temp(health_kv.get("temperature") or health_kv.get("board-temperature"), 38)
        cpu_temp = parse_temp(health_kv.get("cpu-temperature"), 42)
        sfp_temp = parse_temp(health_kv.get("sfp-temperature"), 32)

        fan1 = health_kv.get("fan1-speed", "4200RPM")
        fan2 = health_kv.get("fan2-speed", "4150RPM")
        fan_status = "2x Fans OK" if (fan1 or fan2) else "Passive Heat Sink (0 RPM)"
        fan_speeds = f"Fan 1: {fan1} • Fan 2: {fan2}" if fan1 and fan2 else (f"Fan: {fan1}" if fan1 else "Fan: Silent Passive")

        psu1 = health_kv.get("psu1-state", "ok").upper()
        psu2 = health_kv.get("psu2-state", "ok").upper()
        psu_status = f"PSU 1: {psu1} • PSU 2: {psu2}" if psu2 else f"PSU 1: {psu1}"

        # RouterBOARD & Firmware
        is_rb = rb_kv.get("routerboard", "yes").lower() == "yes"
        serial_num = rb_kv.get("serial-number") or device.get("serial_number") or "HDE0837V921"
        current_firmware = rb_kv.get("current-firmware") or res_kv.get("version", "7.15.2 (stable)").split()[0]
        upgrade_firmware = rb_kv.get("upgrade-firmware") or current_firmware
        firmware_type = rb_kv.get("firmware-type", "al64")
        factory_soft = res_kv.get("factory-software") or rb_kv.get("factory-firmware") or "6.48.6"

        # Identity & System
        identity = ident_kv.get("name") or device.get("name") or "MikroTik"
        uptime = res_kv.get("uptime", "2w 4d 12h 34m")
        version = res_kv.get("version", "7.15.2 (stable)")
        software_id = lic_kv.get("software-id") or "4KL9-WQ21"
        nlevel = lic_kv.get("nlevel") or "6"
        license_level = f"Level {nlevel} (Unlimited)" if nlevel == "6" else f"Level {nlevel}"

        # Interface counts
        total_ifaces = len(existing_ports) or 16
        running_ifaces = len([p for p in existing_ports if p.get("status") == "up"]) or 6
        if iface_text:
            lines = [l for l in iface_text.splitlines() if re.match(r'^\s*\d+', l)]
            if lines:
                total_ifaces = len(lines)
                running_ifaces = len([l for l in lines if "R" in l.split()[1:3]])

        return {
            "device_id": device.get("id"),
            "cpu": {
                "cpuArch": cpu_arch_formatted,
                "cpuCores": cpu_cores,
                "cpuFrequency": cpu_freq_str,
                "cpuLoad": cpu_load,
                "cpuTemp": cpu_temp,
            },
            "ram": {
                "totalRamMB": total_ram_mb,
                "usedRamMB": used_ram_mb,
                "freeRamMB": free_ram_mb,
                "ramPercent": ram_percent,
            },
            "storage": {
                "totalHddMB": total_hdd_mb,
                "usedHddMB": used_hdd_mb,
                "freeHddMB": free_hdd_mb,
                "hddPercent": hdd_percent,
                "badBlocks": bad_blocks,
                "writeSectSinceReboot": write_sect_reboot,
                "writeSectTotal": write_sect_total,
            },
            "health": {
                "voltage": voltage_str,
                "current": current_str,
                "boardTemp": board_temp,
                "cpuTemp": cpu_temp,
                "sfpTemp": sfp_temp,
                "fanStatus": fan_status,
                "fanSpeeds": fan_speeds,
                "psuStatus": psu_status,
            },
            "routerboard": {
                "isRouterboard": is_rb,
                "model": model,
                "serialNumber": serial_num,
                "currentFirmware": current_firmware,
                "upgradeFirmware": upgrade_firmware,
                "firmwareType": firmware_type,
                "factorySoftware": factory_soft,
            },
            "system": {
                "identity": identity,
                "uptime": uptime,
                "version": version,
                "architecture": cpu_arch_raw,
                "boardName": res_kv.get("board-name", model),
                "softwareId": software_id,
                "licenseLevel": license_level,
                "totalInterfaces": total_ifaces,
                "runningInterfaces": running_ifaces,
            },
            "cliOutputs": {
                "resource": {
                    "cmd": "/system resource print",
                    "output": res_text or f"[{identity}] > /system resource print\n(No telemetry received over SSH)"
                },
                "health": {
                    "cmd": "/system health print",
                    "output": health_text or f"[{identity}] > /system health print\n(No telemetry received over SSH)"
                },
                "routerboard": {
                    "cmd": "/system routerboard print",
                    "output": rb_text or f"[{identity}] > /system routerboard print\n(No telemetry received over SSH)"
                },
                "license": {
                    "cmd": "/system license print",
                    "output": lic_text or f"[{identity}] > /system license print\n(No telemetry received over SSH)"
                },
                "package": {
                    "cmd": "/system package print",
                    "output": pkg_text or f"[{identity}] > /system package print\n(No telemetry received over SSH)"
                },
                "interface": {
                    "cmd": "/interface print",
                    "output": iface_text or f"[{identity}] > /interface print\n(No telemetry received over SSH)"
                },
            }
        }

