"""
Cisco IOS / IOS-XE Platform Driver
Implements commands, prompt handling, output normalization and action generation for Cisco devices.
"""
from typing import Dict, Any, List, Optional
import re
from backend.drivers.base import NetworkDeviceDriver

class CiscoDriver(NetworkDeviceDriver):
    def __init__(self, platform: str = "cisco_ios_xe"):
        self.platform = platform
        self.platform_name = "Cisco IOS-XE" if platform == "cisco_ios_xe" else "Cisco IOS"
        self.capabilities = {
            "vlan": True,
            "interface_enable_disable": True,
            "port_security": True,
            "switchport_mode": True,
            "trunk": True,
            "save_config": True,
            "interface_description": True,
            "speed_duplex": True,
            "poe": True,
            "lldp_cdp": True,
        }

    def get_prompt(self, hostname: str, mode: str = "exec", context: str = "") -> str:
        clean_host = hostname or "Switch"
        if mode == "USER_EXEC":
            return f"{clean_host}>"
        elif mode == "PRIVILEGED_EXEC":
            return f"{clean_host}#"
        elif mode == "GLOBAL_CONFIG":
            return f"{clean_host}(config)#"
        elif mode == "INTERFACE_CONFIG":
            return f"{clean_host}(config-if)#"
        elif mode == "VLAN_CONFIG":
            return f"{clean_host}(config-vlan)#"
        return f"{clean_host}#"

    def get_command_help(self) -> List[Dict[str, Any]]:
        return [
            # Monitoring
            {"cmd": "show interfaces status", "desc": "نمایش وضعیت خلاصه تمام پورت‌ها", "descEn": "Display port status summary", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "show ip interface brief", "desc": "نمایش خلاصه IP و وضعیت پورت‌ها", "descEn": "Brief IP & line status of interfaces", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "show vlan brief", "desc": "نمایش لیست VLANها و پورت‌های منتسب", "descEn": "Display VLANs and assigned ports", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "show running-config", "desc": "نمایش پیکربندی جاری در حافظه RAM", "descEn": "Display active running configuration", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "show cdp neighbors detail", "desc": "نمایش مشخصات همسایگان متصل با پروتکل CDP", "descEn": "Detailed CDP neighbor discovery", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "show lldp neighbors", "desc": "نمایش جدول همسایگان پروتکل LLDP", "descEn": "Display LLDP neighbor topology table", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "show port-security", "desc": "بررسی جدول امنیت آدرس MAC پورت‌ها", "descEn": "Port-Security status & violation counts", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "show environment power", "desc": "بررسی توان مصرفی و منابع تغذیه PoE", "descEn": "Hardware environment & PoE power status", "category": "show", "mode": "PRIVILEGED_EXEC"},
            # Configuration
            {"cmd": "configure terminal", "desc": "ورود به محیط پیکربندی سراسری", "descEn": "Enter Global Configuration mode", "category": "config", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "interface GigabitEthernet1/0/1", "desc": "ورود به محیط کانفیگ اینترفیس", "descEn": "Enter Interface Configuration mode", "category": "config", "mode": "GLOBAL_CONFIG"},
            {"cmd": "shutdown", "desc": "غیرفعال‌سازی و خاموش کردن پورت (Admin Down)", "descEn": "Administratively disable the interface", "category": "action", "mode": "INTERFACE_CONFIG"},
            {"cmd": "no shutdown", "desc": "فعال‌سازی مجدد پورت (Admin Up)", "descEn": "Enable interface operational link", "category": "action", "mode": "INTERFACE_CONFIG"},
            {"cmd": "switchport mode access", "desc": "تنظیم مد پورت به دسترسی (Access)", "descEn": "Set interface switchport mode to access", "category": "config", "mode": "INTERFACE_CONFIG"},
            {"cmd": "switchport access vlan 10", "desc": "تخصیص شماره VLAN به پورت", "descEn": "Assign access VLAN membership", "category": "config", "mode": "INTERFACE_CONFIG"},
            {"cmd": "switchport mode trunk", "desc": "تنظیم پورت به عنوان ترانک 802.1Q", "descEn": "Set interface mode to IEEE 802.1Q Trunk", "category": "config", "mode": "INTERFACE_CONFIG"},
            {"cmd": "switchport port-security", "desc": "فعال‌سازی محدودیت امنیتی MAC پورت", "descEn": "Enable Port-Security feature on port", "category": "action", "mode": "INTERFACE_CONFIG"},
            {"cmd": "write memory", "desc": "ذخیره تغییرات در حافظه پایدار NVRAM", "descEn": "Save running-config to startup NVRAM", "category": "action", "mode": "PRIVILEGED_EXEC"},
        ]

    def generate_action_cli(self, action: str, interface: str, params: Optional[Dict[str, Any]] = None) -> str:
        params = params or {}
        if action == "shutdown":
            return f"configure terminal\ninterface {interface}\n shutdown\nexit\nexit"
        elif action == "no_shutdown":
            return f"configure terminal\ninterface {interface}\n no shutdown\nexit\nexit"
        elif action == "mode_trunk":
            return f"configure terminal\ninterface {interface}\n switchport trunk encapsulation dot1q\n switchport mode trunk\nexit\nexit"
        elif action in ("mode_access", "set_vlan", "change_vlan", "assign_vlan"):
            vlan = params.get("vlan", 1)
            is_router = params.get("is_router") or params.get("device_type") == "router"
            if is_router:
                return f"configure terminal\ninterface {interface}.{vlan}\n encapsulation dot1q {vlan}\nexit\nexit"
            return f"configure terminal\ninterface {interface}\n switchport mode access\n switchport access vlan {vlan}\nexit\nexit"
        elif action == "port_sec_enable":
            max_mac = params.get("max_mac", 1)
            violation = params.get("violation", "restrict")
            return f"configure terminal\ninterface {interface}\n switchport mode access\n switchport port-security\n switchport port-security maximum {max_mac}\n switchport port-security violation {violation}\n switchport port-security mac-address sticky\nexit\nexit"
        elif action == "port_sec_disable":
            return f"configure terminal\ninterface {interface}\n no switchport port-security\nexit\nexit"
        elif action == "set_description":
            desc = (params.get("description") or "").strip()
            if desc:
                return f"configure terminal\ninterface {interface}\n description {desc}\nexit\nexit"
            else:
                return f"configure terminal\ninterface {interface}\n no description\nexit\nexit"
        elif action == "save_config":
            return "copy running-config startup-config"
        return f"# Cisco command for {action} on {interface}"

    def get_interface_query_commands(self) -> List[str]:
        return [
            "terminal length 0",
            "show interfaces status",
            "show ip interface brief"
        ]

    def parse_interfaces(self, raw_output: str) -> List[Dict[str, Any]]:
        """
        Parses standard Cisco 'show interfaces status' output table or 'show ip interface brief'.
        """
        ports = []
        seen_ports = set()
        lines = raw_output.splitlines()
        header_found = False

        for line in lines:
            line_str = line.strip()
            if not line_str or line_str.startswith("--"):
                continue
            if re.search(r'\bPort\b', line_str, re.I) and (re.search(r'\bStatus\b', line_str, re.I) or re.search(r'\bVlan\b', line_str, re.I)):
                header_found = True
                continue
            if not header_found:
                continue

            # Match standard Cisco switch interface status row
            m = re.match(
                r'^([A-Za-z0-9/._-]+)\s+(?:(.*?)\s+)?(connected|notconnect|disabled|err-disabled|inactive|monitoring|suspended|up|down|administratively\s+down)\s+(\S+)\s+(\S+)\s+(\S+)(?:\s+(.*))?$',
                line_str,
                re.IGNORECASE
            )
            if m:
                port_id = m.group(1)
                desc = (m.group(2) or "").strip()
                status_raw = m.group(3).lower()
                vlan_raw = m.group(4)
                duplex_raw = m.group(5)
                speed_raw = m.group(6)
                port_type = (m.group(7) or "10/100/1000BaseTX").strip()

                canon_id = port_id.lower().replace("gigabitethernet", "gi").replace("fastethernet", "fa").replace("tengigabitethernet", "te")
                if canon_id in seen_ports:
                    continue
                seen_ports.add(canon_id)

                is_connected = status_raw in ("connected", "up")
                is_disabled = "disabled" in status_raw or "administratively" in status_raw

                mode = "trunk" if "trunk" in vlan_raw.lower() else "access"
                vlan_num = 1
                try:
                    vlan_num = int(vlan_raw) if mode == "access" and vlan_raw.isdigit() else 1
                except ValueError:
                    vlan_num = 1

                speed_clean = speed_raw.replace("a-", "").strip()
                if speed_clean == "1000":
                    speed_display = "1 Gbps"
                elif speed_clean in ("10000", "10G"):
                    speed_display = "10 Gbps"
                elif speed_clean == "100":
                    speed_display = "100 Mbps"
                elif speed_clean == "10":
                    speed_display = "10 Mbps"
                elif speed_clean.lower() == "auto":
                    speed_display = "Auto (1 Gbps)"
                else:
                    speed_display = speed_clean

                duplex_clean = duplex_raw.replace("a-", "").capitalize()

                ports.append({
                    "port_id": port_id,
                    "name": port_id,
                    "description": desc,
                    "status": "up" if is_connected else "down",
                    "admin_status": "disabled" if is_disabled else "enabled",
                    "mode": mode,
                    "vlan": vlan_num,
                    "allowed_vlans": "1-4094" if mode == "trunk" else str(vlan_num),
                    "speed": speed_display,
                    "duplex": duplex_clean,
                    "connected_device": desc or ("Active Link" if is_connected else "Disconnected"),
                    "connected_type": "Host" if is_connected else "None",
                    "type": port_type,
                    "port_security_enabled": False,
                })

        if ports:
            return ports

        # Fallback: Parse 'show ip interface brief' table
        for line in lines:
            line_str = line.strip()
            if not line_str or line_str.startswith("--") or "Interface" in line_str:
                continue
            m_ip = re.match(
                r'^([A-Za-z0-9/._-]+)\s+(\S+)\s+(?:YES|NO)\s+\S+\s+(up|down|administratively down)\s+(up|down)$',
                line_str,
                re.IGNORECASE
            )
            if m_ip:
                port_id = m_ip.group(1)
                ip_addr = m_ip.group(2)
                status_raw = m_ip.group(3).lower()
                proto_raw = m_ip.group(4).lower()

                canon_id = port_id.lower().replace("gigabitethernet", "gi").replace("fastethernet", "fa").replace("tengigabitethernet", "te")
                if canon_id in seen_ports:
                    continue
                seen_ports.add(canon_id)

                is_up = status_raw == "up" and proto_raw == "up"
                is_admin_down = "down" in status_raw and "admin" in status_raw

                ports.append({
                    "port_id": port_id,
                    "name": port_id,
                    "description": f"IP: {ip_addr}" if ip_addr != "unassigned" else "",
                    "status": "up" if is_up else "down",
                    "admin_status": "disabled" if is_admin_down else "enabled",
                    "mode": "routed" if ip_addr != "unassigned" else "access",
                    "vlan": 1,
                    "allowed_vlans": "1",
                    "speed": "1 Gbps",
                    "duplex": "Full",
                    "connected_device": f"Link ({ip_addr})" if is_up else "Disconnected",
                    "connected_type": "Router/L3" if is_up else "None",
                    "type": "10/100/1000BaseTX",
                    "port_security_enabled": False,
                })

        return ports

    def parse_vlans(self, output: str) -> List[Dict[str, Any]]:
        vlans = []
        seen = set()
        for line in output.splitlines():
            line_str = line.strip()
            # Matching: 10   Servers_NOC   active   Gi1/0/1, Gi1/0/2
            m = re.match(r'^(\d+)\s+([A-Za-z0-9_.-]+)\s+(active|act/unsup|suspended)\s*(.*)$', line_str, re.IGNORECASE)
            if m:
                vid = int(m.group(1))
                if vid in seen or vid > 4094:
                    continue
                seen.add(vid)
                name = m.group(2)
                status = m.group(3).lower()
                ports_part = m.group(4)
                ports_list = [p.strip() for p in ports_part.split(",") if p.strip()] if ports_part else []
                vlans.append({
                    "id": vid,
                    "name": name,
                    "status": "active" if "act" in status else "inactive",
                    "ports_count": len(ports_list)
                })
        return vlans

    def get_default_ports(self, count: int = 24) -> List[Dict[str, Any]]:
        generated = []
        for i in range(1, count + 1):
            p_status = "up" if i <= 4 else ("down" if i % 3 == 0 else "up")
            is_trunk = (i <= 2)
            vlan_num = 1 if is_trunk else ((i % 4 + 1) * 10)
            generated.append({
                "port_id": f"Gi1/0/{i}",
                "name": f"GigabitEthernet1/0/{i}",
                "status": p_status,
                "admin_status": "enabled",
                "mode": "trunk" if is_trunk else "access",
                "vlan": vlan_num,
                "allowed_vlans": "1,10,20,30,50" if is_trunk else str(vlan_num),
                "speed": "1 Gbps",
                "duplex": "Full",
                "connected_device": f"Client-PC-{i}" if p_status == "up" else "Disconnected",
                "connected_type": "Host" if p_status == "up" else "None",
                "poe_status": "delivering" if (i % 2 == 1 and p_status == "up") else "off",
                "poe_power": 12.5 if (i % 2 == 1 and p_status == "up") else 0,
                "description": f"Port {i} Access",
                "port_security_enabled": True if (i > 2 and i % 2 == 1) else False,
                "port_security_max_mac": 1 if i % 4 != 3 else 2,
                "port_security_mode": "sticky" if i % 2 == 1 else "configured",
                "port_security_configured_mac": f"0050.56a1.{i:02x}01" if (i > 2 and i % 2 == 0) else "",
                "port_security_violation": "shutdown",
                "port_security_status": ("secure-up" if p_status == "up" else "secure-down") if (i > 2 and i % 2 == 1) else "disabled",
                "port_security_learned_macs": [f"0050.56a1.{i:02x}fe"] if (i > 2 and i % 2 == 1 and p_status == "up") else []
            })
        return generated

    def get_system_resources_commands(self) -> List[Dict[str, str]]:
        return [
            {"key": "cpu", "cmd": "show processes cpu sorted"},
            {"key": "memory", "cmd": "show memory statistics"},
            {"key": "env", "cmd": "show env all"},
            {"key": "power", "cmd": "show power inline"},
            {"key": "version", "cmd": "show version"},
            {"key": "flash", "cmd": "dir flash:"},
        ]

    def parse_system_resources(self, outputs: Dict[str, str], device: Dict[str, Any], ports: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        ports = ports or []
        cpu_text = outputs.get("cpu", "")
        mem_text = outputs.get("memory", "")
        env_text = outputs.get("env", "")
        power_text = outputs.get("power", "")
        ver_text = outputs.get("version", "")
        flash_text = outputs.get("flash", "")

        model = device.get("model") or "WS-C2960X-48FPS-L"
        total_ports_count = len(ports) if ports else int(device.get("total_ports") or 24)
        up_ports_count = sum(1 for p in ports if p.get("status") == "up") if ports else max(1, round(total_ports_count * 0.4))

        # 1. Parse CPU
        cpu_5s = 12
        cpu_1m = 14
        cpu_5m = 11
        interrupts = 0
        top_processes = []

        m_cpu = re.search(r'five seconds:\s*(\d+)%(?:/(\d+)%)?;\s*one minute:\s*(\d+)%;\s*five minutes:\s*(\d+)%', cpu_text, re.IGNORECASE)
        if m_cpu:
            cpu_5s = int(m_cpu.group(1))
            interrupts = int(m_cpu.group(2)) if m_cpu.group(2) else 0
            cpu_1m = int(m_cpu.group(3))
            cpu_5m = int(m_cpu.group(4))

        # Parse top processes
        for line in cpu_text.splitlines():
            m_proc = re.match(r'^\s*(\d+)\s+\d+\s+\d+\s+\d+\s+([\d\.]+)%\s+([\d\.]+)%\s+([\d\.]+)%\s+\d+\s+(.+)$', line)
            if m_proc:
                top_processes.append({
                    "pid": int(m_proc.group(1)),
                    "name": m_proc.group(5).strip(),
                    "cpu5s": float(m_proc.group(2)),
                    "cpu1m": float(m_proc.group(3)),
                    "cpu5m": float(m_proc.group(4))
                })
                if len(top_processes) >= 8:
                    break

        # Architecture
        cpu_arch = "APM86392 600MHz (PowerPC)"
        m_arch = re.search(r'cisco\s+([A-Za-z0-9\-]+)\s+\(([^)]+)\)\s+processor', ver_text, re.IGNORECASE)
        if m_arch:
            cpu_arch = f"{m_arch.group(2)} Processor ({m_arch.group(1)})"
        elif "c9" in model.lower() or "9300" in model.lower():
            cpu_arch = "x86_64 Dual-Core (Cisco UADP 2.0)"
        elif "3850" in model.lower():
            cpu_arch = "Multi-Core MIPS (UADP ASIC)"

        # 2. Parse RAM
        total_ram_mb = 512
        used_ram_mb = 180
        free_ram_mb = 332
        ram_percent = 35
        io_buffers_mb = 18

        m_mem = re.search(r'Processor\s+[0-9a-fA-F]+\s+(\d+)\s+(\d+)\s+(\d+)', mem_text)
        if m_mem:
            total_b = int(m_mem.group(1))
            used_b = int(m_mem.group(2))
            free_b = int(m_mem.group(3))
            total_ram_mb = max(64, round(total_b / (1024 * 1024)))
            used_ram_mb = round(used_b / (1024 * 1024))
            free_ram_mb = round(free_b / (1024 * 1024))
            ram_percent = min(100, max(1, round((used_ram_mb / total_ram_mb) * 100)))

        m_io = re.search(r'I/O\s+[0-9a-fA-F]+\s+(\d+)\s+(\d+)\s+(\d+)', mem_text)
        if m_io:
            io_buffers_mb = round(int(m_io.group(2)) / (1024 * 1024))

        # 3. Parse Flash & NVRAM
        total_flash_mb = 128
        free_flash_mb = 46
        used_flash_mb = 82
        flash_percent = 64
        nvram_kb = 2048
        used_nvram_kb = 184

        m_flash = re.search(r'(\d+)\s*bytes total\s*\(\s*(\d+)\s*bytes free\)', flash_text)
        if m_flash:
            total_b = int(m_flash.group(1))
            free_b = int(m_flash.group(2))
            total_flash_mb = max(16, round(total_b / (1024 * 1024)))
            free_flash_mb = round(free_b / (1024 * 1024))
            used_flash_mb = max(0, total_flash_mb - free_flash_mb)
            flash_percent = min(100, max(1, round((used_flash_mb / total_flash_mb) * 100)))

        m_nvram = re.search(r'(\d+)K\s*bytes of non-volatile configuration memory', ver_text, re.IGNORECASE)
        if m_nvram:
            nvram_kb = int(m_nvram.group(1))
            used_nvram_kb = min(nvram_kb, max(32, round(nvram_kb * 0.12)))

        # 4. Parse Thermal & Environmental
        current_temp = 34
        temp_threshold = 65
        temp_state = "GREEN"
        inlet_temp = 27
        exhaust_temp = 36

        m_temp = re.search(r'(?:System Temperature Value|Temperature:?)\s*(\d+)\s*(?:Degree Celsius|C)?', env_text, re.IGNORECASE)
        if m_temp:
            current_temp = int(m_temp.group(1))
        m_thresh = re.search(r'Threshold:\s*(\d+)', env_text, re.IGNORECASE)
        if m_thresh:
            temp_threshold = int(m_thresh.group(1))
        m_state = re.search(r'System Temperature State:\s*(\w+)', env_text, re.IGNORECASE)
        if m_state:
            temp_state = m_state.group(1).upper()
        m_inlet = re.search(r'Inlet Temperature Value:\s*(\d+)', env_text, re.IGNORECASE)
        if m_inlet:
            inlet_temp = int(m_inlet.group(1))
        m_exhaust = re.search(r'Exhaust Temperature Value:\s*(\d+)', env_text, re.IGNORECASE)
        if m_exhaust:
            exhaust_temp = int(m_exhaust.group(1))

        # 5. Parse Cooling & Fans
        fans_count = 2
        fan_speeds = "Fan 1: 4,820 RPM • Fan 2: 4,790 RPM"
        fan_status = "2x Fans OK"
        airflow = "Front-to-Back"
        psu_status = "PSU 1: Operational"

        m_fans = re.findall(r'FAN\s*(\d+)\s*is\s*(\w+)', env_text, re.IGNORECASE)
        if m_fans:
            fans_count = len(m_fans)
            fan_status = f"{fans_count}x Fans " + ("OK" if all("ok" in s.lower() for _, s in m_fans) else "Warning")
        m_speeds = re.findall(r'FAN\s*(\d+)\s*speed is\s*(\d+)\s*RPM', env_text, re.IGNORECASE)
        if m_speeds:
            fan_speeds = " • ".join([f"Fan {f}: {int(s):,} RPM" for f, s in m_speeds])

        # 6. Parse PoE
        max_poe_watts = 370.0
        total_poe_watts = 78.4
        remaining_poe_watts = 291.6
        poe_percent = 21
        poe_delivering_count = sum(1 for p in ports if p.get("poe_status") == "delivering") or 4

        m_poe = re.search(r'Available:\s*([\d\.]+)\(w\)\s*Used:\s*([\d\.]+)\(w\)\s*Remaining:\s*([\d\.]+)\(w\)', power_text, re.IGNORECASE)
        if m_poe:
            max_poe_watts = float(m_poe.group(1))
            total_poe_watts = float(m_poe.group(2))
            remaining_poe_watts = float(m_poe.group(3))
            poe_percent = min(100, max(0, round((total_poe_watts / max_poe_watts) * 100))) if max_poe_watts > 0 else 0
            poe_delivering_count = len(re.findall(r'\s+auto\s+on\s+', power_text, re.IGNORECASE)) or poe_delivering_count

        # 7. Hardware & Version details
        uptime = "48 days, 14 hours, 32 minutes"
        ios_version = "15.2(7)E7"
        board_id = "FOC2149V001"
        reload_reason = "Power-on"
        system_image = "flash:c2960x-universalk9-mz.152-7.E7.bin"
        hostname = device.get("name") or "Switch"

        m_uptime = re.search(r'(?:uptime is|up)\s*([^\r\n]+)', ver_text, re.IGNORECASE)
        if m_uptime:
            uptime = m_uptime.group(1).strip()
        m_ver = re.search(r'Version\s*([0-9\.\(\)A-Za-z\-]+)', ver_text, re.IGNORECASE)
        if m_ver:
            ios_version = m_ver.group(1).strip()
        m_board = re.search(r'Processor board ID\s*([A-Za-z0-9]+)', ver_text, re.IGNORECASE)
        if m_board:
            board_id = m_board.group(1).strip()
        m_reload = re.search(r'Last reload reason:\s*([^\r\n]+)', ver_text, re.IGNORECASE)
        if m_reload:
            reload_reason = m_reload.group(1).strip()
        m_img = re.search(r'System image file is\s*"([^"]+)"', ver_text, re.IGNORECASE)
        if m_img:
            system_image = m_img.group(1).strip()

        # Fabric specs
        asic_mpps = 101.2
        bandwidth_gbps = 128
        if total_ports_count >= 48:
            asic_mpps = 130.9
            bandwidth_gbps = 216
        elif total_ports_count <= 8:
            asic_mpps = 15.4
            bandwidth_gbps = 20

        return {
            "device_id": device.get("id"),
            "cpu": {
                "cpuLoad5s": cpu_5s,
                "cpuLoad1m": cpu_1m,
                "cpuLoad5m": cpu_5m,
                "interrupts": interrupts,
                "cpuArch": cpu_arch,
                "topProcesses": top_processes,
            },
            "ram": {
                "totalRamMB": total_ram_mb,
                "usedRamMB": used_ram_mb,
                "freeRamMB": free_ram_mb,
                "ramPercent": ram_percent,
                "ioBuffersMB": io_buffers_mb,
            },
            "storage": {
                "totalFlashMB": total_flash_mb,
                "usedFlashMB": used_flash_mb,
                "freeFlashMB": free_flash_mb,
                "flashPercent": flash_percent,
                "nvramKB": nvram_kb,
                "usedNvramKB": used_nvram_kb,
            },
            "thermal": {
                "currentTemp": current_temp,
                "tempThreshold": temp_threshold,
                "tempState": temp_state,
                "inletTemp": inlet_temp,
                "exhaustTemp": exhaust_temp,
            },
            "poe": {
                "maxPoeWatts": max_poe_watts,
                "totalPoeWatts": total_poe_watts,
                "remainingPoeWatts": remaining_poe_watts,
                "poePercent": poe_percent,
                "poeDeliveringPortsCount": poe_delivering_count,
            },
            "cooling": {
                "fansCount": fans_count,
                "fanSpeeds": fan_speeds,
                "fanStatus": fan_status,
                "airflow": airflow,
                "psuStatus": psu_status,
            },
            "hardware": {
                "hostname": hostname,
                "model": model,
                "iosVersion": ios_version,
                "uptime": uptime,
                "processorBoardId": board_id,
                "lastReloadReason": reload_reason,
                "systemImageFile": system_image,
                "totalPortsCount": total_ports_count,
                "upPortsCount": up_ports_count,
                "macTableCount": 16384,
                "vlanCapacity": 4094,
                "asicForwardingMpps": asic_mpps,
                "bandwidthGbps": bandwidth_gbps,
            },
            "cliOutputs": {
                "cpu": {"cmd": "show processes cpu sorted", "output": cpu_text or f"{hostname}# show processes cpu sorted\n(No CLI output recorded)"},
                "memory": {"cmd": "show memory statistics", "output": mem_text or f"{hostname}# show memory statistics\n(No CLI output recorded)"},
                "env": {"cmd": "show env all", "output": env_text or f"{hostname}# show env all\n(No CLI output recorded)"},
                "power": {"cmd": "show power inline", "output": power_text or f"{hostname}# show power inline\n(No CLI output recorded)"},
                "version": {"cmd": "show version", "output": ver_text or f"{hostname}# show version\n(No CLI output recorded)"},
            }
        }
