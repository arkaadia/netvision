"""
MikroTik RouterOS VPN Master Provider
Dispatches to specific VPN protocol providers:
- L2TP/IPsec
- GRE Tunnel
- SSTP
- PPTP
- WireGuard (v7+)
- OpenVPN
- IPsec Site-to-Site
- EoIP Tunnel
- VXLAN Overlay (v7+)
"""
from typing import Dict, Any, List, Optional
from backend.vpn.base import VPNProvider
from backend.vpn.mikrotik.l2tp_ipsec import MikroTikL2TPIPsecProvider
from backend.vpn.mikrotik.gre import MikroTikGREProvider
from backend.vpn.mikrotik.sstp import MikroTikSSTPProvider
from backend.vpn.mikrotik.pptp import MikroTikPPTPProvider
from backend.vpn.mikrotik.wireguard import MikroTikWireGuardProvider
from backend.vpn.mikrotik.openvpn import MikroTikOpenVPNProvider
from backend.vpn.mikrotik.ipsec import MikroTikIPsecSiteToSiteProvider
from backend.vpn.mikrotik.eoip import MikroTikEoIPProvider
from backend.vpn.mikrotik.vxlan import MikroTikVXLANProvider

class MikroTikVPNProvider(VPNProvider):
    def __init__(self):
        self.providers: Dict[str, VPNProvider] = {
            "l2tp_ipsec": MikroTikL2TPIPsecProvider(),
            "gre": MikroTikGREProvider(),
            "sstp": MikroTikSSTPProvider(),
            "pptp": MikroTikPPTPProvider(),
            "wireguard": MikroTikWireGuardProvider(),
            "openvpn": MikroTikOpenVPNProvider(),
            "ipsec_site_to_site": MikroTikIPsecSiteToSiteProvider(),
            "ipsec": MikroTikIPsecSiteToSiteProvider(),
            "eoip": MikroTikEoIPProvider(),
            "vxlan": MikroTikVXLANProvider()
        }

    def _get_provider(self, vpn_type: str) -> VPNProvider:
        vpn_type_norm = (vpn_type or "").strip().lower()
        provider = self.providers.get(vpn_type_norm)
        if not provider:
            raise ValueError(
                f"VPN protocol '{vpn_type}' is not supported. "
                f"Supported protocols: {', '.join(sorted(self.providers.keys()))}"
            )
        return provider

    def get_capabilities(self, device: Dict[str, Any]) -> Dict[str, Any]:
        firmware = device.get("firmware", "RouterOS v7.14.3 (stable)")
        is_v7 = "7." in firmware or "v7" in firmware.lower()

        return {
            "platform": "mikrotik_routeros",
            "platform_name": "MikroTik RouterOS",
            "firmware": firmware,
            "routeros_major_version": 7 if is_v7 else 6,
            "vpn": {
                "l2tp_ipsec": True,
                "gre": True,
                "wireguard": is_v7,
                "ipsec_site_to_site": True,
                "eoip": True,
                "sstp": True,
                "openvpn": True,
                "vxlan": is_v7,
                "pptp": True
            },
            "available_vpns": [
                self.providers["wireguard"].get_capabilities(device),
                self.providers["l2tp_ipsec"].get_capabilities(device),
                self.providers["ipsec_site_to_site"].get_capabilities(device),
                self.providers["gre"].get_capabilities(device),
                self.providers["eoip"].get_capabilities(device),
                self.providers["sstp"].get_capabilities(device),
                self.providers["openvpn"].get_capabilities(device),
                self.providers["vxlan"].get_capabilities(device),
                self.providers["pptp"].get_capabilities(device)
            ],
            "supported_catalog": [
                {
                    "type": "wireguard",
                    "name": "WireGuard",
                    "description": "State-of-the-art fast cryptographic tunnel for remote access and site-to-site (RouterOS v7+).",
                    "status": "available" if is_v7 else "unsupported",
                    "unsupported_reason": None if is_v7 else "Requires MikroTik RouterOS v7+",
                    "modes": ["remote_access", "site_to_site"],
                    "recommended_for": ["High-throughput links", "Modern mobile & desktop clients", "Cloud VPC interconnects"]
                },
                {
                    "type": "l2tp_ipsec",
                    "name": "L2TP/IPsec",
                    "description": "Remote access for mobile users & branch office site-to-site with IPsec hardware encryption.",
                    "status": "available",
                    "modes": ["remote_access", "site_to_site"],
                    "recommended_for": ["Native Windows/macOS/iOS built-in clients", "Branch routers"]
                },
                {
                    "type": "ipsec_site_to_site",
                    "name": "IPsec Site-to-Site (IKEv2)",
                    "description": "Standard route-less policy-based IPsec tunnel for direct office-to-office and multi-vendor interconnections.",
                    "status": "available",
                    "modes": ["site_to_site"],
                    "recommended_for": ["Headquarters to branch", "MikroTik to Cisco / Fortinet / pfSense", "Banking & compliance"]
                },
                {
                    "type": "gre",
                    "name": "GRE Tunnel",
                    "description": "Point-to-point Generic Routing Encapsulation tunnel with routing & optional IPsec secret.",
                    "status": "available",
                    "modes": ["tunnel"],
                    "recommended_for": ["Dynamic routing overlays (OSPF/BGP)", "Direct router interconnects"]
                },
                {
                    "type": "eoip",
                    "name": "EoIP (Ethernet over IP)",
                    "description": "MikroTik Layer 2 Ethernet bridging over IP to span broadcast domains across WAN.",
                    "status": "available",
                    "modes": ["tunnel"],
                    "recommended_for": ["Layer 2 LAN extension across WAN", "Seamless roaming & broadcast pass-through"]
                },
                {
                    "type": "sstp",
                    "name": "SSTP (SSL/TLS)",
                    "description": "Secure Socket Tunneling Protocol over HTTPS (TCP 443) to traverse strict firewalls.",
                    "status": "available",
                    "modes": ["remote_access", "site_to_site"],
                    "recommended_for": ["Strict NAT & corporate firewall traversal", "Native Windows client support"]
                },
                {
                    "type": "openvpn",
                    "name": "OpenVPN (SSL/TLS)",
                    "description": "Industry standard OpenVPN SSL/TLS Tunnel for secure multi-platform remote access and site links.",
                    "status": "available",
                    "modes": ["remote_access", "site_to_site"],
                    "recommended_for": ["Multi-platform remote users", "Custom CA certificate environments"]
                },
                {
                    "type": "vxlan",
                    "name": "VXLAN Overlay",
                    "description": "Scalable Layer 2 overlay across Layer 3 IP networks with 24-bit VNI (RouterOS v7+).",
                    "status": "available" if is_v7 else "unsupported",
                    "unsupported_reason": None if is_v7 else "Requires MikroTik RouterOS v7+",
                    "modes": ["overlay"],
                    "recommended_for": ["Data center multi-tenancy", "Cross-datacenter VM migration"]
                },
                {
                    "type": "pptp",
                    "name": "PPTP (Legacy)",
                    "description": "Point-to-Point Tunneling Protocol for legacy embedded devices (Low security MS-CHAPv2).",
                    "status": "available",
                    "modes": ["remote_access", "site_to_site"],
                    "recommended_for": ["Legacy hardware compatibility"]
                }
            ]
        }

    def validate(
        self,
        device: Dict[str, Any],
        vpn_type: str,
        mode: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        try:
            provider = self._get_provider(vpn_type)
            return provider.validate(device, mode, config)
        except ValueError as ve:
            return {
                "valid": False,
                "errors": [str(ve)],
                "warnings": []
            }

    def generate_configuration(
        self,
        device: Dict[str, Any],
        vpn_type: str,
        mode: str,
        config: Dict[str, Any],
        mask_secrets: bool = False
    ) -> List[str]:
        provider = self._get_provider(vpn_type)
        return provider.generate_configuration(device, mode, config, mask_secrets=mask_secrets)

    def apply(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_type: str,
        mode: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        provider = self._get_provider(vpn_type)
        return provider.apply(device, session, mode, config)

    def verify(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_id: str,
        vpn_type: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        provider = self._get_provider(vpn_type)
        return provider.verify(device, session, vpn_id, config)

    def get_status(self, device: Dict[str, Any], session: Any) -> List[Dict[str, Any]]:
        all_items: List[Dict[str, Any]] = []
        seen_ids = set()
        active_protocols = (
            "wireguard",
            "l2tp_ipsec",
            "ipsec_site_to_site",
            "gre",
            "eoip",
            "sstp",
            "openvpn",
            "vxlan",
            "pptp"
        )
        for k in active_protocols:
            p = self.providers.get(k)
            if not p:
                continue
            try:
                items = p.get_status(device, session)
                for itm in items:
                    uid = f"{itm.get('type')}:{itm.get('id')}"
                    if uid not in seen_ids:
                        seen_ids.add(uid)
                        all_items.append(itm)
            except Exception as e:
                print(f"[MikroTikVPNProvider] Error querying status for {k}: {e}")
        return all_items

    def delete(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_id: str,
        vpn_type: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        provider = self._get_provider(vpn_type)
        return provider.delete(device, session, vpn_id, config)
