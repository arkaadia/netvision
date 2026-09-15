"""
Comprehensive Test Suite for MikroTik VPN Architecture Suite
Tests Drivers, Validations, SSH Manager Lifecycle, Provider Logic, API Handlers, and Security Constraints.
"""
import unittest
import json
from backend.vpn.mikrotik.provider import MikroTikVPNProvider
from backend.vpn.mikrotik.l2tp_ipsec import MikroTikL2TPIPsecProvider
from backend.vpn.mikrotik.gre import MikroTikGREProvider
from backend.connections.ssh_manager import SSHConnectionManager
from backend.server import check_rbac_permission, sanitize_device

class TestMikroTikVPNDriverAndCapabilities(unittest.TestCase):
    def setUp(self):
        self.provider = MikroTikVPNProvider()
        self.mikrotik_dev = {
            "id": "dev-mk-test-1",
            "name": "MikroTik Core Router",
            "platform": "mikrotik_routeros",
            "firmware": "RouterOS v7.14.3",
            "connection_mode": "simulator",
            "connection": {
                "host": "192.168.88.1",
                "port": 22,
                "username": "admin",
                "password": "SecretPassword123"
            }
        }
        self.cisco_dev = {
            "id": "dev-cisco-test-1",
            "name": "Cisco Catalyst 3850",
            "platform": "cisco_ios_xe",
            "connection_mode": "simulator"
        }

    def test_capabilities_full_suite_structure(self):
        caps = self.provider.get_capabilities(self.mikrotik_dev)
        self.assertEqual(caps["platform"], "mikrotik_routeros")
        self.assertTrue(caps["vpn"]["l2tp_ipsec"])
        self.assertTrue(caps["vpn"]["gre"])
        self.assertTrue(caps["vpn"]["wireguard"])
        self.assertTrue(caps["vpn"]["ipsec_site_to_site"])
        self.assertTrue(caps["vpn"]["eoip"])
        self.assertTrue(caps["vpn"]["sstp"])
        self.assertTrue(caps["vpn"]["openvpn"])
        self.assertTrue(caps["vpn"]["vxlan"])
        self.assertTrue(caps["vpn"]["pptp"])

    def test_unknown_protocol_rejected(self):
        with self.assertRaises(ValueError):
            self.provider._get_provider("unknown_dummy_protocol")

    def test_supported_protocols_resolution(self):
        for proto in ["wireguard", "l2tp_ipsec", "ipsec_site_to_site", "gre", "eoip", "sstp", "openvpn", "vxlan", "pptp"]:
            prov = self.provider._get_provider(proto)
            self.assertIsNotNone(prov)


class TestVPNValidation(unittest.TestCase):
    def setUp(self):
        self.l2tp = MikroTikL2TPIPsecProvider()
        self.gre = MikroTikGREProvider()
        self.dev = {"platform": "mikrotik_routeros", "firmware": "RouterOS v7.14.3"}

    def test_l2tp_missing_psk(self):
        res = self.l2tp.validate(self.dev, "remote_access", {
            "local_address": "192.168.89.1",
            "pool_ranges": "192.168.89.10-192.168.89.50",
            "ipsec_secret": ""
        })
        self.assertFalse(res["valid"])
        self.assertTrue(any("IPsec Pre-Shared Key" in err for err in res["errors"]))

    def test_l2tp_invalid_gateway_ip(self):
        res = self.l2tp.validate(self.dev, "remote_access", {
            "local_address": "999.888.777.666",
            "pool_ranges": "192.168.89.10-192.168.89.50",
            "ipsec_secret": "StrongPresharedKey2026"
        })
        self.assertFalse(res["valid"])
        self.assertTrue(any("Invalid local gateway IPv4" in err for err in res["errors"]))

    def test_l2tp_invalid_pool_ranges(self):
        # Start IP higher than end IP
        res = self.l2tp.validate(self.dev, "remote_access", {
            "local_address": "192.168.89.1",
            "pool_ranges": "192.168.89.50-192.168.89.10",
            "ipsec_secret": "StrongPresharedKey2026"
        })
        self.assertFalse(res["valid"])
        self.assertTrue(any("must be strictly lower" in err for err in res["errors"]))

    def test_l2tp_duplicate_usernames(self):
        res = self.l2tp.validate(self.dev, "remote_access", {
            "local_address": "192.168.89.1",
            "pool_ranges": "192.168.89.10-192.168.89.50",
            "ipsec_secret": "StrongPresharedKey2026",
            "users": [
                {"username": "alice", "password": "passAlice123"},
                {"username": "alice", "password": "passAlice456"}
            ]
        })
        self.assertFalse(res["valid"])
        self.assertTrue(any("Duplicate username 'alice'" in err for err in res["errors"]))

    def test_l2tp_missing_user_password(self):
        res = self.l2tp.validate(self.dev, "remote_access", {
            "local_address": "192.168.89.1",
            "pool_ranges": "192.168.89.10-192.168.89.50",
            "ipsec_secret": "StrongPresharedKey2026",
            "users": [{"username": "bob", "password": ""}]
        })
        self.assertFalse(res["valid"])
        self.assertTrue(any("Password for user 'bob' cannot be empty" in err for err in res["errors"]))

    def test_l2tp_invalid_route_cidr(self):
        res = self.l2tp.validate(self.dev, "site_to_site", {
            "role": "client",
            "connect_to": "203.0.113.1",
            "user": "peer1",
            "password": "peerPassword",
            "ipsec_secret": "StrongPresharedKey2026",
            "routes": [{"dst": "invalid_network_cidr"}]
        })
        self.assertFalse(res["valid"])
        self.assertTrue(any("Invalid route destination" in err for err in res["errors"]))

    def test_gre_invalid_remote_ip(self):
        res = self.gre.validate(self.dev, "tunnel", {
            "name": "gre-tun1",
            "remote_address": "not_an_ip",
            "tunnel_ip": "10.255.0.1/30"
        })
        self.assertFalse(res["valid"])
        self.assertTrue(any("Invalid remote peer IPv4" in err for err in res["errors"]))

    def test_gre_invalid_tunnel_cidr(self):
        res = self.gre.validate(self.dev, "tunnel", {
            "name": "gre-tun1",
            "remote_address": "203.0.113.5",
            "tunnel_ip": "10.255.0.1/99"
        })
        self.assertFalse(res["valid"])
        self.assertTrue(any("Invalid tunnel IP/CIDR" in err for err in res["errors"]))


class TestSSHManagerLifecycle(unittest.TestCase):
    def setUp(self):
        self.manager = SSHConnectionManager()
        self.manager.sessions.clear()
        self.dev = {
            "id": "dev-mk-sim-1",
            "name": "MK-Sim-Router",
            "platform": "mikrotik_routeros",
            "connection_mode": "simulator",
            "connection": {
                "host": "192.168.1.1",
                "port": 22,
                "username": "admin",
                "password": "MySSHPassword123"
            }
        }

    def test_lazy_connection(self):
        # Initially, no sessions exist in manager
        self.assertNotIn("dev-mk-sim-1", self.manager.sessions)
        self.assertFalse(self.manager.is_connected("dev-mk-sim-1"))

    def test_session_reuse(self):
        sess1 = self.manager.get_or_create_session(self.dev, require_real=False)
        self.assertTrue(self.manager.is_connected("dev-mk-sim-1"))
        sess2 = self.manager.get_or_create_session(self.dev, require_real=False)
        # Must return the same session object
        self.assertIs(sess1, sess2)

    def test_disconnect_and_reconnect(self):
        sess1 = self.manager.get_or_create_session(self.dev, require_real=False)
        self.assertEqual(sess1.status, "connected")

        # Disconnect
        res = self.manager.close_session("dev-mk-sim-1")
        self.assertTrue(res)
        self.assertFalse(self.manager.is_connected("dev-mk-sim-1"))

        # Reconnect creates fresh session
        sess2 = self.manager.get_or_create_session(self.dev, require_real=False)
        self.assertEqual(sess2.status, "connected")


class TestSecurityAndSecretsMasking(unittest.TestCase):
    def setUp(self):
        self.l2tp = MikroTikL2TPIPsecProvider()
        self.gre = MikroTikGREProvider()
        self.dev = {"platform": "mikrotik_routeros", "firmware": "RouterOS v7.14.3"}

    def test_l2tp_preview_masks_secrets(self):
        cfg = {
            "local_address": "192.168.89.1",
            "pool_ranges": "192.168.89.10-192.168.89.50",
            "ipsec_secret": "SuperSecretPsk999!",
            "users": [{"username": "vpnuser", "password": "UserTopSecret123"}]
        }
        cmds = self.l2tp.generate_configuration(self.dev, "remote_access", cfg, mask_secrets=True)
        script = "\n".join(cmds)
        # Must NOT contain raw secret
        self.assertNotIn("SuperSecretPsk999!", script)
        self.assertNotIn("UserTopSecret123", script)
        # Must contain masked placeholder
        self.assertIn("ipsec-secret=\"********\"", script)
        self.assertIn("password=\"********\"", script)

    def test_gre_preview_masks_ipsec_secret(self):
        cfg = {
            "name": "gre-tun1",
            "remote_address": "203.0.113.10",
            "tunnel_ip": "10.255.0.1/30",
            "ipsec_secret": "MyGrePskVaultPass"
        }
        cmds = self.gre.generate_configuration(self.dev, "tunnel", cfg, mask_secrets=True)
        script = "\n".join(cmds)
        self.assertNotIn("MyGrePskVaultPass", script)
        self.assertIn("ipsec-secret=\"********\"", script)

    def test_sanitize_device_strips_passwords(self):
        device = {
            "id": "dev-test",
            "name": "Test Router",
            "platform": "mikrotik_routeros",
            "connection": {
                "host": "10.0.0.1",
                "username": "admin",
                "password": "CleartextPassword123"
            },
            "ssh_password": "CleartextPassword123",
            "enable_password": "CleartextEnablePass"
        }
        sanitized = sanitize_device(device)
        self.assertNotIn("password", sanitized["connection"])
        self.assertNotIn("ssh_password", sanitized)
        self.assertNotIn("enable_password", sanitized)

    def test_rbac_permissions(self):
        # Super Admin & Network Engineer can configure VPN
        self.assertTrue(check_rbac_permission("Super Admin", "config"))
        self.assertTrue(check_rbac_permission("Network Engineer", "config"))
        # Operator cannot configure VPN
        self.assertFalse(check_rbac_permission("Operator", "config"))
        self.assertTrue(check_rbac_permission("Operator", "view"))
        # Read-Only Auditor cannot configure VPN
        self.assertFalse(check_rbac_permission("Auditor", "config"))


class TestVPNProviderEndToEndLifecycle(unittest.TestCase):
    def setUp(self):
        self.provider = MikroTikVPNProvider()
        self.dev = {
            "id": "dev-mk-sim-test",
            "name": "MikroTik Core GW",
            "platform": "mikrotik_routeros",
            "firmware": "RouterOS v7.14.3",
            "connection_mode": "simulator",
            "connection": {
                "host": "192.168.88.1",
                "port": 22,
                "username": "admin",
                "password": "Password123"
            }
        }
        from backend.connections.ssh_manager import connection_manager
        self.session = connection_manager.get_or_create_session(self.dev, require_real=False)

    def test_l2tp_apply_verify_and_delete(self):
        cfg = {
            "name": "l2tp-vpn-test",
            "profile_name": "profile-l2tp-test",
            "pool_name": "pool-l2tp-test",
            "local_address": "192.168.99.1",
            "pool_ranges": "192.168.99.10-192.168.99.50",
            "ipsec_secret": "VeryStrongPskKey2026!",
            "users": [{"username": "testuser1", "password": "pass123456"}]
        }
        # 1. Preview
        preview_cmds = self.provider.generate_configuration(self.dev, "l2tp_ipsec", "remote_access", cfg, mask_secrets=True)
        self.assertTrue(len(preview_cmds) > 0)

        # 2. Apply
        apply_res = self.provider.apply(self.dev, self.session, "l2tp_ipsec", "remote_access", cfg)
        self.assertTrue(apply_res.get("success"), f"Apply failed: {apply_res}")
        self.assertEqual(apply_res.get("vpn_type"), "l2tp_ipsec")

        # 3. Verify
        verify_res = self.provider.verify(self.dev, self.session, "profile-l2tp-test", "l2tp_ipsec", cfg)
        self.assertEqual(verify_res.get("vpn_type"), "l2tp_ipsec")
        self.assertTrue(verify_res.get("server_enabled"))

        # 4. Status
        statuses = self.provider.get_status(self.dev, self.session)
        self.assertTrue(any(s.get("type") == "l2tp_ipsec" for s in statuses))

        # 5. Delete
        del_res = self.provider.delete(self.dev, self.session, "l2tp-server-profile-l2tp-test", "l2tp_ipsec", cfg)
        self.assertTrue(del_res.get("success"))

    def test_gre_apply_verify_and_delete(self):
        cfg = {
            "name": "gre-dc-branch",
            "local_address": "198.51.100.1",
            "remote_address": "203.0.113.50",
            "tunnel_ip": "10.255.0.1/30",
            "mtu": 1476,
            "ipsec_secret": "GreIpsecSecret2026",
            "routes": [{"dst": "192.168.200.0/24", "distance": 1}]
        }
        # 1. Preview
        preview_cmds = self.provider.generate_configuration(self.dev, "gre", "tunnel", cfg, mask_secrets=True)
        self.assertTrue(len(preview_cmds) >= 2)

        # 2. Apply
        apply_res = self.provider.apply(self.dev, self.session, "gre", "tunnel", cfg)
        self.assertTrue(apply_res.get("success"), f"Apply failed: {apply_res}")
        self.assertEqual(apply_res.get("vpn_id"), "gre-dc-branch")

        # 3. Verify
        verify_res = self.provider.verify(self.dev, self.session, "gre-dc-branch", "gre", cfg)
        self.assertEqual(verify_res.get("vpn_type"), "gre")

        # 4. Status
        statuses = self.provider.get_status(self.dev, self.session)
        self.assertTrue(any(s.get("name") == "gre-dc-branch" for s in statuses))

        # 5. Delete
        del_res = self.provider.delete(self.dev, self.session, "gre-gre-dc-branch", "gre", cfg)
        self.assertTrue(del_res.get("success"))


if __name__ == "__main__":
    unittest.main()
