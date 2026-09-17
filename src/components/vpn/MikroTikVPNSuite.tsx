import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Layers,
  Network,
  Users,
  Route,
  Activity,
  Zap,
  Terminal,
  Server,
  Share2,
  Info,
  Radio,
  X,
  Minus,
} from 'lucide-react';
import {
  Device,
  VPNType,
  MikroTikVPNItem,
  VPNValidationResult,
  VPNPreviewResult,
  VPNApplyResult,
  VPNVerificationDetails,
  MikroTikVPNCapabilities,
} from '../../types';
import {
  fetchMikroTikVPNList,
  fetchMikroTikVPNCapabilities,
  validateMikroTikVPN,
  previewMikroTikVPN,
  applyMikroTikVPN,
  verifyMikroTikVPN,
  deleteMikroTikVPN,
} from '../../services/api';
import { VPNProtocolForms } from './VPNProtocolForms';
import { VPNInspectModal } from './VPNInspectModal';
import { FieldInfoTooltip } from './FieldInfoTooltip';

interface MikroTikVPNSuiteProps {
  device: Device;
  isEn?: boolean;
  isLightMode?: boolean;
  userRole?: string;
  onMinimize?: () => void;
  onClose?: () => void;
}

type WizardStep = 'protocol' | 'config' | 'advanced' | 'preview' | 'apply' | 'verify';
type WizardScenario = 'remote_access' | 'site_to_site' | 'tunnel';

export const MikroTikVPNSuite: React.FC<MikroTikVPNSuiteProps> = ({
  device,
  isEn = false,
  isLightMode = false,
  userRole = 'admin',
  onMinimize,
  onClose,
}) => {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<'list' | 'wizard'>('list');
  const [scenario, setScenario] = useState<WizardScenario>('remote_access');
  const [currentStep, setCurrentStep] = useState<WizardStep>('config');

  // Device SSH Connection Info
  const sshHost = (device.connection as any)?.host || (device as any).ssh_host || device.ip || '—';
  const sshPort = (device.connection as any)?.port || (device as any).ssh_port || 22;
  const sshUser = (device.connection as any)?.username || (device as any).ssh_username || 'admin';

  // Live VPN items list & Device Capabilities
  const [vpnList, setVpnList] = useState<MikroTikVPNItem[]>([]);
  const [capabilities, setCapabilities] = useState<MikroTikVPNCapabilities | null>(null);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(false);
  const [listError, setListError] = useState<string | null>(null);

  // Selected VPN Protocol
  const [selectedVpnType, setSelectedVpnType] = useState<VPNType>('l2tp_ipsec');

  // L2TP / IPsec Remote Access State
  const [l2tpName, setL2tpName] = useState('l2tp-vpn');
  const [l2tpLocalAddr, setL2tpLocalAddr] = useState('192.168.89.1');
  const [l2tpPoolName, setL2tpPoolName] = useState('pool-l2tp-vpn');
  const [l2tpPoolRanges, setL2tpPoolRanges] = useState('192.168.89.10-192.168.89.50');
  const [l2tpUsers, setL2tpUsers] = useState<Array<{ username: string; password: string; enabled: boolean }>>([
    { username: 'vpnuser1', password: 'VpnUserPass123!', enabled: true },
  ]);
  const [newUsername, setNewUsername] = useState('');
  const [newUserPass, setNewUserPass] = useState('');

  // L2TP / IPsec Site-to-Site Client State
  const [s2sConnectTo, setS2sConnectTo] = useState('203.0.113.10');
  const [s2sUsername, setS2sUsername] = useState('branch-peer');
  const [s2sPassword, setS2sPassword] = useState('SecretBranchPass123!');
  const [s2sLocalTunnelIp, setS2sLocalTunnelIp] = useState('10.255.255.2');
  const [s2sRemoteTunnelIp, setS2sRemoteTunnelIp] = useState('10.255.255.1');

  // IPsec PSK & Advanced
  const [ipsecSecret, setIpsecSecret] = useState('SafeIpsecPSK2026!');
  const [showSecret, setShowSecret] = useState(false);
  const [dnsServers, setDnsServers] = useState('1.1.1.1,8.8.8.8');
  const [allowFastPath, setAllowFastPath] = useState(true);
  const [mtu, setMtu] = useState(1450);
  const [mru, setMru] = useState(1450);

  // GRE Tunnel State
  const [greName, setGreName] = useState('gre-tunnel1');
  const [greLocalAddr, setGreLocalAddr] = useState('0.0.0.0');
  const [greRemoteAddr, setGreRemoteAddr] = useState('203.0.113.20');
  const [greTunnelIp, setGreTunnelIp] = useState('10.255.0.1/30');
  const [greMtu, setGreMtu] = useState(1476);
  const [greKeepalive, setGreKeepalive] = useState('10s,3');
  const [greComment, setGreComment] = useState('Site-to-Site GRE Tunnel');
  const [greIpsecSecret, setGreIpsecSecret] = useState('');

  // WireGuard State
  const [wgName, setWgName] = useState('wg-vpn1');
  const [wgListenPort, setWgListenPort] = useState(13231);
  const [wgPrivateKey, setWgPrivateKey] = useState('');
  const [wgTunnelIp, setWgTunnelIp] = useState('10.200.0.1/24');
  const [wgMtu, setWgMtu] = useState(1420);
  const [wgPeerPublicKey, setWgPeerPublicKey] = useState('yN62k4dFjK9lZ1vW8sX3pQ==');
  const [wgPeerEndpoint, setWgPeerEndpoint] = useState('203.0.113.20');
  const [wgPeerPort, setWgPeerPort] = useState(13231);
  const [wgPeerAllowedIps, setWgPeerAllowedIps] = useState('10.200.0.2/32');
  const [wgKeepalive, setWgKeepalive] = useState(25);

  // IPsec Site-to-Site State
  const [ipsecName, setIpsecName] = useState('ipsec-s2s-branch');
  const [ipsecRemotePeer, setIpsecRemotePeer] = useState('203.0.113.20');
  const [ipsecLocalWan, setIpsecLocalWan] = useState('0.0.0.0');
  const [ipsecPsk, setIpsecPsk] = useState('SafeIpsecPSK2026!');
  const [ipsecLocalSubnet, setIpsecLocalSubnet] = useState('192.168.10.0/24');
  const [ipsecRemoteSubnet, setIpsecRemoteSubnet] = useState('192.168.20.0/24');
  const [ipsecIkeVersion, setIpsecIkeVersion] = useState('2');

  // EoIP State
  const [eoipName, setEoipName] = useState('eoip-tunnel1');
  const [eoipTunnelId, setEoipTunnelId] = useState(100);
  const [eoipLocalAddr, setEoipLocalAddr] = useState('0.0.0.0');
  const [eoipRemoteAddr, setEoipRemoteAddr] = useState('203.0.113.20');
  const [eoipBridge, setEoipBridge] = useState('bridge-lan');
  const [eoipIpsecSecret, setEoipIpsecSecret] = useState('');

  // SSTP State
  const [sstpName, setSstpName] = useState('sstp-vpn');
  const [sstpLocalAddr, setSstpLocalAddr] = useState('192.168.99.1');
  const [sstpPoolRanges, setSstpPoolRanges] = useState('192.168.99.10-192.168.99.50');
  const [sstpPort, setSstpPort] = useState(443);
  const [sstpCert, setSstpCert] = useState('default');
  const [sstpConnectTo, setSstpConnectTo] = useState('203.0.113.10');
  const [sstpUser, setSstpUser] = useState('sstp-user');
  const [sstpPassword, setSstpPassword] = useState('SstpPass123!');

  // OpenVPN State
  const [ovpnName, setOvpnName] = useState('ovpn-server');
  const [ovpnPort, setOvpnPort] = useState(1194);
  const [ovpnProto, setOvpnProto] = useState('tcp');
  const [ovpnPoolRanges, setOvpnPoolRanges] = useState('192.168.109.10-192.168.109.50');
  const [ovpnCert, setOvpnCert] = useState('server-cert');
  const [ovpnConnectTo, setOvpnConnectTo] = useState('203.0.113.10');
  const [ovpnUser, setOvpnUser] = useState('ovpn-client');
  const [ovpnPassword, setOvpnPassword] = useState('OvpnPass123!');

  // VXLAN State
  const [vxlanName, setVxlanName] = useState('vxlan1');
  const [vxlanVni, setVxlanVni] = useState(100);
  const [vxlanPort, setVxlanPort] = useState(4789);
  const [vxlanVteps, setVxlanVteps] = useState('203.0.113.20');
  const [vxlanBridge, setVxlanBridge] = useState('bridge-lan');

  // PPTP State
  const [pptpName, setPptpName] = useState('pptp-vpn');
  const [pptpLocalAddr, setPptpLocalAddr] = useState('192.168.79.1');
  const [pptpPoolRanges, setPptpPoolRanges] = useState('192.168.79.10-192.168.79.50');

  // Validation & Wizard Progress
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [previewResult, setPreviewResult] = useState<VPNPreviewResult | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<VPNApplyResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VPNVerificationDetails | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Sub-Modals
  const [inspectVpn, setInspectVpn] = useState<MikroTikVPNItem | null>(null);
  const [inspectVerifyData, setInspectVerifyData] = useState<VPNVerificationDetails | null>(null);
  const [isInspectLoading, setIsInspectLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MikroTikVPNItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteLog, setDeleteLog] = useState<string | null>(null);

  // Initial Load
  useEffect(() => {
    loadData();
  }, [device.id]);

  const loadData = async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const [listRes, capRes] = await Promise.all([
        fetchMikroTikVPNList(device.id),
        fetchMikroTikVPNCapabilities(device.id),
      ]);
      setVpnList(listRes.vpns || (listRes as any).items || []);
      setCapabilities(capRes);
    } catch (err: any) {
      setListError(err.message || 'Failed to communicate with router SSH service');
    } finally {
      setIsLoadingList(false);
    }
  };

  const getActiveMode = (): 'remote_access' | 'site_to_site' | 'tunnel' => {
    if (scenario === 'tunnel') return 'tunnel';
    if (scenario === 'site_to_site') return 'site_to_site';
    return 'remote_access';
  };

  const buildCurrentConfig = (): Record<string, any> => {
    if (selectedVpnType === 'wireguard') {
      const isS2S = scenario === 'site_to_site';
      const wgCfg = {
        name: wgName,
        listen_port: wgListenPort,
        private_key: wgPrivateKey || undefined,
        tunnel_ip: wgTunnelIp,
        mtu: wgMtu,
        peers: [
          {
            public_key: wgPeerPublicKey,
            endpoint_address: isS2S ? wgPeerEndpoint : undefined,
            endpoint_port: isS2S ? wgPeerPort : undefined,
            allowed_address: wgPeerAllowedIps,
            persistent_keepalive: wgKeepalive,
            comment: isS2S ? 'Branch Peer' : 'Teleworker Peer',
          },
        ],
      };
      return wgCfg;
    }

    if (selectedVpnType === 'ipsec_site_to_site') {
      const ipsecCfg = {
        name: ipsecName,
        remote_peer: ipsecRemotePeer,
        local_address: ipsecLocalWan || '0.0.0.0',
        pre_shared_key: ipsecPsk,
        local_subnet: ipsecLocalSubnet,
        remote_subnet: ipsecRemoteSubnet,
        ike_version: ipsecIkeVersion,
      };
      return ipsecCfg;
    }

    if (selectedVpnType === 'gre') {
      const greCfg = {
        name: greName,
        local_address: greLocalAddr || '0.0.0.0',
        remote_address: greRemoteAddr,
        tunnel_ip: greTunnelIp,
        mtu: greMtu,
        keepalive: greKeepalive,
        comment: greComment,
        ipsec_secret: greIpsecSecret || undefined,
        allow_fast_path: allowFastPath,
      };
      return greCfg;
    }

    if (selectedVpnType === 'eoip') {
      const eoipCfg = {
        name: eoipName,
        tunnel_id: eoipTunnelId,
        local_address: eoipLocalAddr || '0.0.0.0',
        remote_address: eoipRemoteAddr,
        bridge: eoipBridge,
        ipsec_secret: eoipIpsecSecret || undefined,
      };
      return eoipCfg;
    }

    if (selectedVpnType === 'sstp') {
      const sstpCfg = {
        name: sstpName,
        local_address: sstpLocalAddr,
        pool_ranges: sstpPoolRanges,
        port: sstpPort,
        certificate: sstpCert,
        connect_to: scenario === 'site_to_site' ? sstpConnectTo : undefined,
        user: scenario === 'site_to_site' ? sstpUser : undefined,
        password: scenario === 'site_to_site' ? sstpPassword : undefined,
      };
      return sstpCfg;
    }

    if (selectedVpnType === 'openvpn') {
      const ovpnCfg = {
        name: ovpnName,
        port: ovpnPort,
        protocol: ovpnProto,
        pool_ranges: ovpnPoolRanges,
        certificate: ovpnCert,
        connect_to: scenario === 'site_to_site' ? ovpnConnectTo : undefined,
        user: scenario === 'site_to_site' ? ovpnUser : undefined,
        password: scenario === 'site_to_site' ? ovpnPassword : undefined,
      };
      return ovpnCfg;
    }

    if (selectedVpnType === 'vxlan') {
      const vxlanCfg = {
        name: vxlanName,
        vni: vxlanVni,
        port: vxlanPort,
        vteps: vxlanVteps ? vxlanVteps.split(',').map((s) => s.trim()) : [],
        bridge: vxlanBridge,
      };
      return vxlanCfg;
    }

    if (selectedVpnType === 'pptp') {
      const pptpCfg = {
        name: pptpName,
        local_address: pptpLocalAddr,
        pool_ranges: pptpPoolRanges,
      };
      return pptpCfg;
    }

    // Default L2TP / IPsec
    const l2tpCfg = {
      name: l2tpName,
      local_address: scenario === 'remote_access' ? l2tpLocalAddr : s2sLocalTunnelIp,
      pool_name: l2tpPoolName,
      pool_ranges: l2tpPoolRanges,
      ipsec_secret: ipsecSecret,
      dns_servers: dnsServers ? dnsServers.split(',').map((s) => s.trim()) : [],
      users: l2tpUsers,
      allow_fast_path: allowFastPath,
      mtu,
      mru,
      connect_to: scenario === 'site_to_site' ? s2sConnectTo : undefined,
      user: scenario === 'site_to_site' ? s2sUsername : undefined,
      password: scenario === 'site_to_site' ? s2sPassword : undefined,
    };
    return l2tpCfg;
  };

  const startWizard = (targetScenario: WizardScenario, initialProto?: VPNType) => {
    setScenario(targetScenario);
    if (initialProto) {
      setSelectedVpnType(initialProto);
    } else if (targetScenario === 'tunnel') {
      setSelectedVpnType('gre');
    } else if (targetScenario === 'site_to_site') {
      setSelectedVpnType('wireguard');
    } else {
      setSelectedVpnType('wireguard');
    }
    setCurrentStep('config');
    setApplyResult(null);
    setVerifyResult(null);
    setValidationErrors([]);
    setValidationWarnings([]);
    setViewMode('wizard');
  };

  const handleProceedToPreview = async () => {
    setIsLoadingPreview(true);
    setValidationErrors([]);
    setValidationWarnings([]);
    const cfg = buildCurrentConfig();
    const mode = getActiveMode();

    try {
      const val = await validateMikroTikVPN(device.id, selectedVpnType, mode, cfg);
      setValidationErrors(val.errors || []);
      setValidationWarnings(val.warnings || []);

      if (!val.valid) {
        setIsLoadingPreview(false);
        return;
      }

      const prev = await previewMikroTikVPN(device.id, selectedVpnType, mode, cfg);
      setPreviewResult(prev);
      setCurrentStep('preview');
    } catch (err: any) {
      setValidationErrors([err.message || 'Validation request failed']);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleExecuteApply = async () => {
    setIsApplying(true);
    setApplyResult(null);
    const cfg = buildCurrentConfig();
    const mode = getActiveMode();

    try {
      const res = await applyMikroTikVPN(device.id, selectedVpnType, mode, cfg, userRole);
      setApplyResult(res);
      if (res.success) {
        setCurrentStep('verify');
        if (res.verification) {
          setVerifyResult(res.verification);
        } else {
          handleTriggerVerify(res.vpn_id || (cfg as any).name || 'vpn');
        }
        loadData();
      }
    } catch (err: any) {
      setApplyResult({
        success: false,
        error: err.message || 'Error occurred while applying VPN configuration',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleTriggerVerify = async (vpnId: string) => {
    setIsVerifying(true);
    try {
      const cfg = buildCurrentConfig();
      const res = await verifyMikroTikVPN(device.id, vpnId, selectedVpnType, cfg);
      setVerifyResult(res);
    } catch (err: any) {
      console.error('Verify failed:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOpenInspect = async (item: MikroTikVPNItem) => {
    setInspectVpn(item);
    setInspectVerifyData(null);
    setIsInspectLoading(true);
    try {
      const res = await verifyMikroTikVPN(device.id, item.id, item.type, item.details);
      setInspectVerifyData(res);
    } catch (err: any) {
      console.error('Inspect error:', err);
    } finally {
      setIsInspectLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteLog(null);
    try {
      const res = await deleteMikroTikVPN(device.id, deleteTarget.id, deleteTarget.type, userRole);
      setDeleteLog(res.message || 'VPN removed successfully.');
      setTimeout(() => {
        setDeleteTarget(null);
        setIsDeleting(false);
        loadData();
      }, 1200);
    } catch (err: any) {
      setDeleteLog(`Error: ${err.message || 'Deletion failed'}`);
      setIsDeleting(false);
    }
  };

  const copyScript = () => {
    if (!previewResult?.script) return;
    navigator.clipboard.writeText(previewResult.script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Real Device Connection Credentials */}
      <div
        className={`p-4 rounded-xl border transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/90 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isLightMode ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/50'
            }`}
          >
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <span className={isLightMode ? 'text-slate-900' : 'text-white'}>{device.name}</span>
                <span className="text-xs font-normal text-slate-400 font-mono">({device.ip})</span>
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                  capabilities?.routeros_major_version === 7
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }`}
              >
                RouterOS v{capabilities?.routeros_major_version || 7}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                <span>SSH: {sshUser}@{sshHost}:{sshPort}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Real Hardware Connection State Badge */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${
              listError
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                listError ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span>
              {listError
                ? isEn
                  ? 'SSH Connection Failed'
                  : 'خطا در برقراری ارتباط SSH با روتر'
                : isEn
                ? 'Direct Hardware SSH Active'
                : 'ارتباط مستقیم سخت‌افزاری روتر فعال است'}
            </span>
          </div>

          <button
            onClick={loadData}
            disabled={isLoadingList}
            title={isEn ? 'Refresh VPN Status' : 'بروزرسانی وضعیت روتر'}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              isLightMode
                ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                : 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingList ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Alert if Router is Unreachable */}
      {listError && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            isLightMode ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
          }`}
        >
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">{isEn ? 'Hardware Communication Error' : 'خطای ارتباط سخت‌افزاری با روتر'}</p>
            <p className="opacity-90">{listError}</p>
            <p className="opacity-75 text-[11px]">
              {isEn
                ? `Check IP (${sshHost}), SSH port (${sshPort}), username (${sshUser}), and ensure RouterOS SSH service is enabled.`
                : `آدرس IP، پورت SSH (${sshPort}) و نام کاربری (${sshUser}) دستگاه را در بخش تجهیزات شبکه بررسی نمایید.`}
            </p>
          </div>
          <button
            onClick={loadData}
            className="ms-auto text-xs px-2.5 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-500 cursor-pointer font-medium"
          >
            {isEn ? 'Retry' : 'تلاش مجدد'}
          </button>
        </div>
      )}

      {/* VIEW: Main Dashboard / List */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {/* Scenario Selection Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>{isEn ? 'Select VPN Deployment Architecture' : 'انتخاب معماری و توپولوژی VPN'}</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Remote Access Card */}
              <div
                onClick={() => startWizard('remote_access', 'wireguard')}
                className={`p-4 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between ${
                  isLightMode
                    ? 'bg-white border-slate-200 hover:border-cyan-500 hover:shadow-md'
                    : 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      WireGuard / L2TP / SSTP / OVPN
                    </span>
                  </div>
                  <h5 className="font-bold text-sm text-slate-100 group-hover:text-cyan-400 transition-colors">
                    {isEn ? 'Remote Access (Client-to-Site)' : 'دسترسی از راه دور (Client-to-Site)'}
                  </h5>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {isEn
                      ? 'Secure remote worker connectivity for Windows, macOS, Android and iOS with WireGuard or L2TP/IPsec.'
                      : 'اتصال امن پرسنل دورکار با کلاینت‌های بومی ویندوز، مک و موبایل با سرعت و امنیت حداکثری.'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-cyan-400 font-medium">
                  <span>{isEn ? 'Configure Remote Access' : 'راه‌اندازی دسترسی کاربران'}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Site-to-Site Card */}
              <div
                onClick={() => startWizard('site_to_site', 'wireguard')}
                className={`p-4 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between ${
                  isLightMode
                    ? 'bg-white border-slate-200 hover:border-cyan-500 hover:shadow-md'
                    : 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <Network className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      WireGuard / IPsec / L2TP
                    </span>
                  </div>
                  <h5 className="font-bold text-sm text-slate-100 group-hover:text-cyan-400 transition-colors">
                    {isEn ? 'Site-to-Site (Branch Interconnect)' : 'شعبه به شعبه (Site-to-Site)'}
                  </h5>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {isEn
                      ? 'High-speed inter-office connection connecting branch router subnets securely across the Internet.'
                      : 'ارتباط دائمی و پرسرعت بین دفاتر و شعب شرکت از طریق اینترنت با امنیت سخت‌افزاری.'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-indigo-400 font-medium">
                  <span>{isEn ? 'Configure Site-to-Site' : 'راه‌اندازی ارتباط شعب'}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Tunnel Card (GRE / EoIP / VXLAN) */}
              <div
                onClick={() => startWizard('tunnel', 'gre')}
                className={`p-4 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between ${
                  isLightMode
                    ? 'bg-white border-slate-200 hover:border-cyan-500 hover:shadow-md'
                    : 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                      <Route className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      GRE / EoIP / VXLAN
                    </span>
                  </div>
                  <h5 className="font-bold text-sm text-slate-100 group-hover:text-cyan-400 transition-colors">
                    {isEn ? 'Tunnel & Layer 2 Overlays' : 'تونل‌ها و شبکه‌های اورلی (L2/L3)'}
                  </h5>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {isEn
                      ? 'Layer 2 Ethernet bridging (EoIP), routed multicast (GRE), and datacenter overlays (VXLAN).'
                      : 'بریج شفاف لایه ۲، انتقال ترافیک برودکست/مالتی‌کست و پروتکل‌های مسیریابی دینامیک OSPF.'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-amber-400 font-medium">
                  <span>{isEn ? 'Configure Tunnel' : 'راه‌اندازی تونل'}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>

          {/* Existing VPNs Section */}
          <div
            className={`p-5 rounded-xl border ${
              isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>{isEn ? 'Configured VPN Tunnels & Services' : 'تونل‌ها و سرویس‌های VPN موجود روی روتر'}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {vpnList.length}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isEn
                    ? 'Queried directly from MikroTik RouterOS interfaces and PPP services via SSH.'
                    : 'استعلام مستقیم از جدول اینترفیس‌ها و سرویس‌های روتر میکروتیک از طریق SSH.'}
                </p>
              </div>

              <button
                onClick={() => startWizard('remote_access', 'wireguard')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium cursor-pointer transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isEn ? 'New VPN' : 'افزودن VPN'}</span>
              </button>
            </div>

            {/* List Table */}
            {vpnList.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Shield className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-50" />
                <p className="text-xs">{isEn ? 'No VPN tunnels or servers configured on this router.' : 'هیچ تونل یا سرور VPN روی این روتر پیکربندی نشده است.'}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {isEn ? 'Select an architecture above to configure your first VPN tunnel.' : 'برای ایجاد تونل جدید، یکی از سناریوهای بالا را انتخاب فرمایید.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className={`border-b ${isLightMode ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'}`}>
                      <th className="py-2.5 px-3 font-semibold">{isEn ? 'Status' : 'وضعیت'}</th>
                      <th className="py-2.5 px-3 font-semibold">{isEn ? 'Interface / Name' : 'نام اینترفیس'}</th>
                      <th className="py-2.5 px-3 font-semibold">{isEn ? 'Protocol' : 'پروتکل'}</th>
                      <th className="py-2.5 px-3 font-semibold">{isEn ? 'Architecture' : 'معماری'}</th>
                      <th className="py-2.5 px-3 font-semibold">{isEn ? 'Security' : 'امنیت'}</th>
                      <th className="py-2.5 px-3 font-semibold">{isEn ? 'Details / Peer' : 'مشخصات / مقصد'}</th>
                      <th className="py-2.5 px-3 font-semibold text-end">{isEn ? 'Actions' : 'عملیات'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {vpnList.map((item) => {
                      const isUp = item.status === 'up';
                      const isStandby = item.status === 'standby';
                      return (
                        <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                isUp
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : isStandby
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-emerald-400' : isStandby ? 'bg-amber-400' : 'bg-rose-400'}`} />
                              {(item.status || 'unknown').toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-100 font-mono">
                            {item.name}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-cyan-400 text-[11px] uppercase">
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {item.mode === 'remote_access' ? (
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                {isEn ? 'Remote Access' : 'کلاینت دورکار'}
                              </span>
                            ) : item.mode === 'site_to_site' ? (
                              <span className="flex items-center gap-1">
                                <Network className="w-3.5 h-3.5 text-slate-400" />
                                {isEn ? 'Site-to-Site' : 'دفتر به دفتر'}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Route className="w-3.5 h-3.5 text-slate-400" />
                                {isEn ? 'Tunnel' : 'تونل'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                              <Lock className="w-3 h-3" />
                              {item.type === 'wireguard'
                                ? 'Curve25519'
                                : item.type === 'gre' && !item.details?.ipsec_secret
                                ? 'Cleartext'
                                : 'Hardware AES'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-300 text-[11px]">
                            {item.active_sessions !== undefined ? (
                              <span>{item.active_sessions} {isEn ? 'active' : 'کاربر فعال'}</span>
                            ) : item.details?.remote_address ? (
                              <span>{item.details.remote_address}</span>
                            ) : item.details?.peers ? (
                              <span>{item.details.peers.length} {isEn ? 'peers' : 'پیر'}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3 px-3 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenInspect(item)}
                                title={isEn ? 'Live Verify / Inspect' : 'بررسی زنده وضعیت'}
                                className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition-colors"
                              >
                                {isEn ? 'Inspect' : 'بررسی'}
                              </button>
                              <button
                                onClick={() => setDeleteTarget(item)}
                                title={isEn ? 'Delete VPN' : 'حذف VPN'}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: Wizard Flow */}
      {viewMode === 'wizard' && (
        <div
          className={`p-6 rounded-xl border space-y-6 ${
            isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          {/* Wizard Header & Stepper */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{isEn ? 'Back to Overview' : 'بازگشت به فهرست'}</span>
                </button>
                <span className="text-slate-600">/</span>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  {isEn ? 'VPN Setup Wizard' : 'ویزارد راه‌اندازی VPN'}
                </span>
              </div>
              <h3 className="font-bold text-base text-slate-100 mt-1">
                {scenario === 'remote_access'
                  ? isEn ? 'Configure Remote Access (Client-to-Site)' : 'پیکربندی سرور دسترسی از راه دور کاربران'
                  : scenario === 'site_to_site'
                  ? isEn ? 'Configure Site-to-Site Branch Interconnect' : 'پیکربندی ارتباط بین شعب Site-to-Site'
                  : isEn ? 'Configure Overlay Tunnel' : 'پیکربندی تونل اورلی'}
              </h3>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              {(['config', 'advanced', 'preview', 'apply', 'verify'] as WizardStep[]).map((stepName, idx) => {
                const stepNum = idx + 1;
                const isActive = currentStep === stepName;
                return (
                  <span
                    key={stepName}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 font-bold'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/50'
                    }`}
                  >
                    {stepNum}. {stepName}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Protocol Selection Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>{isEn ? 'Select VPN Protocol' : 'انتخاب پروتکل ارتباطی'}</span>
              <FieldInfoTooltip
                title={isEn ? 'VPN Protocol Selection' : 'انتخاب پروتکل VPN'}
                whatIsIt={isEn
                  ? 'Determines the cryptographic and encapsulation standard deployed on RouterOS.'
                  : 'استاندارد رمزنگاری، کپسوله‌سازی و لایه شبکه را در روتر میکروتیک تعیین می‌کند.'}
                whyNeeded={isEn
                  ? 'WireGuard provides highest throughput; L2TP/IPsec offers native OS client compatibility; GRE/EoIP provides Layer 2 broadcast transparency.'
                  : 'وایرگارد بالاترین پهنای باند را ارائه می‌دهد؛ L2TP سازگاری با سیستم‌عامل‌ها دارد و GRE/EoIP برای تبادل ترافیک شبکه‌های شعب مناسب است.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {scenario === 'remote_access' && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedVpnType('wireguard')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                      selectedVpnType === 'wireguard'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-bold'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-white'
                    }`}
                  >
                    WireGuard (Fastest, Kernel-level)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedVpnType('l2tp_ipsec')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                      selectedVpnType === 'l2tp_ipsec'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-bold'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-white'
                    }`}
                  >
                    L2TP / IPsec (Native OS Support)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedVpnType('sstp')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                      selectedVpnType === 'sstp'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-bold'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-white'
                    }`}
                  >
                    SSTP (HTTPS TCP/443, Anti-Filter)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedVpnType('openvpn')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                      selectedVpnType === 'openvpn'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-bold'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-white'
                    }`}
                  >
                    OpenVPN (SSL/TLS Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedVpnType('pptp')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                      selectedVpnType === 'pptp'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-bold'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-white'
                    }`}
                  >
                    PPTP (Legacy)
                  </button>
                </>
              )}

              {scenario === 'site_to_site' && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedVpnType('wireguard')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                      selectedVpnType === 'wireguard'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-bold'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-white'
                    }`}
                  >
                    WireGuard Site-to-Site (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedVpnType('ipsec_site_to_site')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                      selectedVpnType === 'ipsec_site_to_site'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-bold'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-white'
                    }`}
                  >
                    IPsec IKEv2 (Hardware Accelerated)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedVpnType('l2tp_ipsec')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                      selectedVpnType === 'l2tp_ipsec'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-bold'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-white'
                    }`}
                  >
                    L2TP / IPsec Client
                  </button>
                </>
              )}

              {scenario === 'tunnel' && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedVpnType('gre')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                      selectedVpnType === 'gre'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-bold'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-white'
                    }`}
                  >
                    GRE Tunnel (Layer 3 & Dynamic Routing)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedVpnType('eoip')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                      selectedVpnType === 'eoip'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-bold'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-white'
                    }`}
                  >
                    EoIP Tunnel (Layer 2 Transparent Bridge)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedVpnType('vxlan')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                      selectedVpnType === 'vxlan'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-bold'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-white'
                    }`}
                  >
                    VXLAN Overlay (Datacenter Multi-Tenant)
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Validation Errors Box */}
          {validationErrors.length > 0 && (
            <div className="p-4 rounded-xl border bg-rose-500/10 border-rose-500/30 text-rose-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>{isEn ? 'Configuration Validation Errors' : 'خطاهای اعتبارسنجی کانفیگ'}</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 opacity-90 ps-1">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* STEP 1: Main Configuration Forms */}
          {currentStep === 'config' && (
            <div className="space-y-6">
              <VPNProtocolForms
                selectedVpnType={selectedVpnType}
                scenario={scenario}
                isEn={isEn}
                isLightMode={isLightMode}
                l2tpName={l2tpName}
                setL2tpName={setL2tpName}
                l2tpLocalAddr={l2tpLocalAddr}
                setL2tpLocalAddr={setL2tpLocalAddr}
                l2tpPoolName={l2tpPoolName}
                setL2tpPoolName={setL2tpPoolName}
                l2tpPoolRanges={l2tpPoolRanges}
                setL2tpPoolRanges={setL2tpPoolRanges}
                l2tpUsers={l2tpUsers}
                setL2tpUsers={setL2tpUsers}
                newUsername={newUsername}
                setNewUsername={setNewUsername}
                newUserPass={newUserPass}
                setNewUserPass={setNewUserPass}
                s2sConnectTo={s2sConnectTo}
                setS2sConnectTo={setS2sConnectTo}
                s2sUsername={s2sUsername}
                setS2sUsername={setS2sUsername}
                s2sPassword={s2sPassword}
                setS2sPassword={setS2sPassword}
                s2sLocalTunnelIp={s2sLocalTunnelIp}
                setS2sLocalTunnelIp={setS2sLocalTunnelIp}
                s2sRemoteTunnelIp={s2sRemoteTunnelIp}
                setS2sRemoteTunnelIp={setS2sRemoteTunnelIp}
                ipsecSecret={ipsecSecret}
                setIpsecSecret={setIpsecSecret}
                showSecret={showSecret}
                setShowSecret={setShowSecret}
                greName={greName}
                setGreName={setGreName}
                greLocalAddr={greLocalAddr}
                setGreLocalAddr={setGreLocalAddr}
                greRemoteAddr={greRemoteAddr}
                setGreRemoteAddr={setGreRemoteAddr}
                greTunnelIp={greTunnelIp}
                setGreTunnelIp={setGreTunnelIp}
                greMtu={greMtu}
                setGreMtu={setGreMtu}
                greKeepalive={greKeepalive}
                setGreKeepalive={setGreKeepalive}
                greComment={greComment}
                setGreComment={setGreComment}
                greIpsecSecret={greIpsecSecret}
                setGreIpsecSecret={setGreIpsecSecret}
                wgName={wgName}
                setWgName={setWgName}
                wgListenPort={wgListenPort}
                setWgListenPort={setWgListenPort}
                wgPrivateKey={wgPrivateKey}
                setWgPrivateKey={setWgPrivateKey}
                wgTunnelIp={wgTunnelIp}
                setWgTunnelIp={setWgTunnelIp}
                wgMtu={wgMtu}
                setWgMtu={setWgMtu}
                wgPeerPublicKey={wgPeerPublicKey}
                setWgPeerPublicKey={setWgPeerPublicKey}
                wgPeerEndpoint={wgPeerEndpoint}
                setWgPeerEndpoint={setWgPeerEndpoint}
                wgPeerPort={wgPeerPort}
                setWgPeerPort={setWgPeerPort}
                wgPeerAllowedIps={wgPeerAllowedIps}
                setWgPeerAllowedIps={setWgPeerAllowedIps}
                wgKeepalive={wgKeepalive}
                setWgKeepalive={setWgKeepalive}
                ipsecName={ipsecName}
                setIpsecName={setIpsecName}
                ipsecRemotePeer={ipsecRemotePeer}
                setIpsecRemotePeer={setIpsecRemotePeer}
                ipsecLocalWan={ipsecLocalWan}
                setIpsecLocalWan={setIpsecLocalWan}
                ipsecPsk={ipsecPsk}
                setIpsecPsk={setIpsecPsk}
                ipsecLocalSubnet={ipsecLocalSubnet}
                setIpsecLocalSubnet={setIpsecLocalSubnet}
                ipsecRemoteSubnet={ipsecRemoteSubnet}
                setIpsecRemoteSubnet={setIpsecRemoteSubnet}
                ipsecIkeVersion={ipsecIkeVersion}
                setIpsecIkeVersion={setIpsecIkeVersion}
                eoipName={eoipName}
                setEoipName={setEoipName}
                eoipTunnelId={eoipTunnelId}
                setEoipTunnelId={setEoipTunnelId}
                eoipLocalAddr={eoipLocalAddr}
                setEoipLocalAddr={setEoipLocalAddr}
                eoipRemoteAddr={eoipRemoteAddr}
                setEoipRemoteAddr={setEoipRemoteAddr}
                eoipBridge={eoipBridge}
                setEoipBridge={setEoipBridge}
                eoipIpsecSecret={eoipIpsecSecret}
                setEoipIpsecSecret={setEoipIpsecSecret}
                sstpName={sstpName}
                setSstpName={setSstpName}
                sstpLocalAddr={sstpLocalAddr}
                setSstpLocalAddr={setSstpLocalAddr}
                sstpPoolRanges={sstpPoolRanges}
                setSstpPoolRanges={setSstpPoolRanges}
                sstpPort={sstpPort}
                setSstpPort={setSstpPort}
                sstpCert={sstpCert}
                setSstpCert={setSstpCert}
                sstpConnectTo={sstpConnectTo}
                setSstpConnectTo={setSstpConnectTo}
                sstpUser={sstpUser}
                setSstpUser={setSstpUser}
                sstpPassword={sstpPassword}
                setSstpPassword={setSstpPassword}
                ovpnName={ovpnName}
                setOvpnName={setOvpnName}
                ovpnPort={ovpnPort}
                setOvpnPort={setOvpnPort}
                ovpnProto={ovpnProto}
                setOvpnProto={setOvpnProto}
                ovpnPoolRanges={ovpnPoolRanges}
                setOvpnPoolRanges={setOvpnPoolRanges}
                ovpnCert={ovpnCert}
                setOvpnCert={setOvpnCert}
                ovpnConnectTo={ovpnConnectTo}
                setOvpnConnectTo={setOvpnConnectTo}
                ovpnUser={ovpnUser}
                setOvpnUser={setOvpnUser}
                ovpnPassword={ovpnPassword}
                setOvpnPassword={setOvpnPassword}
                vxlanName={vxlanName}
                setVxlanName={setVxlanName}
                vxlanVni={vxlanVni}
                setVxlanVni={setVxlanVni}
                vxlanPort={vxlanPort}
                setVxlanPort={setVxlanPort}
                vxlanVteps={vxlanVteps}
                setVxlanVteps={setVxlanVteps}
                vxlanBridge={vxlanBridge}
                setVxlanBridge={setVxlanBridge}
                pptpName={pptpName}
                setPptpName={setPptpName}
                pptpLocalAddr={pptpLocalAddr}
                setPptpLocalAddr={setPptpLocalAddr}
                pptpPoolRanges={pptpPoolRanges}
                setPptpPoolRanges={setPptpPoolRanges}
              />

              {/* Wizard Navigation */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="flex items-center gap-1 px-4 py-2 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{isEn ? 'Cancel' : 'انصراف'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep('advanced')}
                  className="flex items-center gap-1 px-4 py-2 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer transition-colors shadow-sm"
                >
                  <span>{isEn ? 'Next: Advanced Optimization' : 'مرحله بعد: تنظیمات تکمیلی'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Advanced Settings */}
          {currentStep === 'advanced' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center text-xs font-semibold mb-1.5 text-slate-300">
                    <span>{isEn ? 'DNS Server IPv4 Addresses' : 'آدرس‌های سرور DNS'}</span>
                    <FieldInfoTooltip
                      title={isEn ? 'DNS Push Servers' : 'سرورهای DNS کلاینت'}
                      whatIsIt={isEn
                        ? 'Comma-separated DNS server IPs pushed to connected road-warrior clients.'
                        : 'لیست آدرس‌های IP سرورهای DNS که هنگام اتصال به کلاینت تزریق می‌شود.'}
                      whyNeeded={isEn
                        ? 'Guarantees internal domain name resolution (.corp/.local) and secure web access.'
                        : 'ترجمه نام‌های دامنه شبکه داخلی سازمان و اینترنت را برای کلاینت‌ها تضمین می‌کند.'}
                      isEn={isEn}
                      isLightMode={isLightMode}
                    />
                  </label>
                  <input
                    type="text"
                    value={dnsServers}
                    onChange={(e) => setDnsServers(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:border-cyan-400 outline-none"
                    placeholder="1.1.1.1,8.8.8.8"
                  />
                </div>

                <div>
                  <label className="flex items-center text-xs font-semibold mb-1.5 text-slate-300">
                    <span>{isEn ? 'Tunnel MTU Size' : 'تنظیم اندازه MTU'}</span>
                    <FieldInfoTooltip
                      title={isEn ? 'MTU Clamping' : 'تنظیم MTU'}
                      whatIsIt={isEn ? 'Maximum Transmission Unit in bytes.' : 'حداکثر اندازه بسته انتقالی به بایت.'}
                      whyNeeded={isEn ? 'Prevents packet drops over WAN due to encryption header overhead.' : 'مانع شکسته‌شدن بسته‌ها به علت اضافه شدن هدرهای رمزگذاری می‌شود.'}
                      isEn={isEn}
                      isLightMode={isLightMode}
                    />
                  </label>
                  <input
                    type="number"
                    value={mtu}
                    onChange={(e) => setMtu(parseInt(e.target.value) || 1450)}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:border-cyan-400 outline-none"
                    placeholder="1450"
                  />
                </div>

                <div className="md:col-span-2 p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-xs text-slate-200 block">
                      {isEn ? 'Hardware FastPath Acceleration' : 'شتاب‌دهنده سخت‌افزاری FastPath'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isEn
                        ? 'Bypasses Linux kernel conntrack chains for maximum packet forwarding throughput.'
                        : 'بسته‌های مجاز را بدون پردازش اضافی مستقیماً از روی پورت شبکه عبور می‌دهد.'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowFastPath}
                    onChange={(e) => setAllowFastPath(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Wizard Navigation */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep('config')}
                  className="flex items-center gap-1 px-4 py-2 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{isEn ? 'Previous' : 'مرحله قبل'}</span>
                </button>
                <button
                  type="button"
                  disabled={isLoadingPreview}
                  onClick={handleProceedToPreview}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                >
                  {isLoadingPreview && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isEn ? 'Review CLI Commands' : 'بررسی دستورات CLI میکروتیک'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview Generated Commands */}
          {currentStep === 'preview' && previewResult && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      <span>{isEn ? 'Generated RouterOS CLI Commands' : 'دستورات اجرایی تولیدشده توسط درایور میکروتیک'}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isEn
                        ? 'Generated dynamically by backend driver. Secrets are masked with ******** for security compliance.'
                        : 'دستورات به صورت دینامیک توسط درایور سخت‌افزار تولید شده و گذرواژه‌ها ماسک شده‌اند.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copyScript}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition-colors font-mono"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? (isEn ? 'Copied' : 'کپی شد') : isEn ? 'Copy' : 'کپی دستورات'}</span>
                  </button>
                </div>

                <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-xs text-cyan-300 overflow-x-auto leading-relaxed max-h-72">
                  {previewResult.script}
                </pre>
              </div>

              {/* Safety notice */}
              <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 text-slate-300 text-xs flex items-start gap-3">
                <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-cyan-300">
                    {isEn ? 'Safe Apply & Rollback Protection' : 'محافظت خودکار و بازگشت در صورت بروز خطا (Rollback)'}
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    {isEn
                      ? 'Commands will be executed sequentially on the router over real SSH. If any command fails, preceding steps are automatically rolled back to leave router configuration clean.'
                      : 'دستورات گام به گام روی روتر از طریق SSH مستقیم اجرا خواهند شد. در صورت بروز هرگونه خطای نحوی یا شبکه‌ای، کانفیگ به صورت خودکار بازگردانی می‌گردد.'}
                  </p>
                </div>
              </div>

              {/* Wizard Navigation */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep('advanced')}
                  className="flex items-center gap-1 px-4 py-2 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{isEn ? 'Previous' : 'مرحله قبل'}</span>
                </button>
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={handleExecuteApply}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors shadow-md disabled:opacity-50"
                >
                  {isApplying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>{isEn ? 'Apply Configuration to Router' : 'اعمال کانفیگ روی روتر میکروتیک'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Live Verification */}
          {currentStep === 'verify' && (
            <div className="space-y-6">
              {applyResult && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    applyResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {applyResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs space-y-1">
                    <p className="font-bold">
                      {applyResult.success
                        ? isEn ? 'VPN Successfully Deployed' : 'پیکربندی با موفقیت روی روتر اعمال شد'
                        : isEn ? 'Deployment Failed with Rollback' : 'خطا در اعمال کانفیگ - بازگردانی انجام شد'}
                    </p>
                    <p className="opacity-90">{applyResult.message || applyResult.error}</p>
                  </div>
                </div>
              )}

              {/* Live Router Verification Box */}
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <h4 className="font-bold text-xs text-slate-100">
                      {isEn ? 'Live Router Operational Verification' : 'بررسی زنده وضعیت عملیاتی روتر'}
                    </h4>
                  </div>
                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={() => handleTriggerVerify(applyResult?.vpn_id || l2tpName)}
                    className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer font-medium"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                    <span>{isEn ? 'Re-verify' : 'بررسی مجدد'}</span>
                  </button>
                </div>

                {verifyResult ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">{isEn ? 'Operational Status' : 'وضعیت عملیاتی'}</span>
                      <p className="text-sm font-bold font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        {(verifyResult.operational_status || 'UNKNOWN').toUpperCase()}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">{isEn ? 'IPsec Security Association' : 'ارتباط امنیتی IPsec'}</span>
                      <p className="text-sm font-bold font-mono text-cyan-300 mt-1">
                        {verifyResult.ipsec_phase2_up ? (isEn ? 'Ready & Protected' : 'فعال و محافظت‌شده') : (isEn ? 'Standby' : 'آماده به کار')}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">{isEn ? 'Active Connections' : 'اتصالات فعال'}</span>
                      <p className="text-sm font-bold font-mono text-slate-200 mt-1">
                        {verifyResult.active_users_count || 0} {isEn ? 'users' : 'کاربر'}
                      </p>
                    </div>

                    {verifyResult.raw_server_output && (
                      <div className="sm:col-span-3">
                        <span className="text-[10px] text-slate-400 font-mono block mb-1">
                          {isEn ? 'Raw RouterOS Diagnostic Query' : 'خروجی متنی مستقیم روتر او اس'}
                        </span>
                        <pre className="p-3 rounded bg-slate-950 text-[11px] font-mono text-slate-400 overflow-x-auto border border-slate-800/80">
                          {verifyResult.raw_server_output}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-cyan-400" />
                    <span>{isEn ? 'Querying RouterOS operational status...' : 'در حال استعلام وضعیت سخت‌افزاری روتر...'}</span>
                  </div>
                )}
              </div>

              {/* Finish Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer transition-colors shadow-md"
                >
                  {isEn ? 'Finish & Return to VPN Overview' : 'تکمیل و بازگشت به فهرست'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-MODAL 1: Inspect / Live Verification Modal */}
      <VPNInspectModal
        isOpen={!!inspectVpn}
        vpn={inspectVpn}
        inspectVerifyData={inspectVerifyData}
        isInspectLoading={isInspectLoading}
        onClose={() => setInspectVpn(null)}
        onMinimize={onMinimize}
        isEn={isEn}
        isLightMode={isLightMode}
      />

      {/* SUB-MODAL 2: Confirm Deletion Modal */}
      {deleteTarget && (
        <div className="fixed top-0 left-0 right-0 bottom-8 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-sm">
                  {isEn ? 'Confirm VPN Removal' : 'تایید حذف پیکربندی VPN'}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {onMinimize && (
                  <button
                    type="button"
                    onClick={onMinimize}
                    title={isEn ? 'Minimize' : 'کوچک‌سازی'}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  title={isEn ? 'Close' : 'بستن'}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isEn
                ? `Are you sure you want to permanently remove VPN "${deleteTarget.name}" (${deleteTarget.type}) from router "${device.name}"?`
                : `آیا از حذف دائم پیکربندی VPN با شناسه «${deleteTarget.name}» از روی این روتر اطمینان دارید؟`}
            </p>

            {deleteLog && (
              <div className="p-3 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300">
                {deleteLog}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                {isEn ? 'Cancel' : 'انصراف'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-colors disabled:opacity-50"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isEn ? 'Delete Permanently' : 'حذف قطعی'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
