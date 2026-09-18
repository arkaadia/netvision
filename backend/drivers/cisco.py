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
