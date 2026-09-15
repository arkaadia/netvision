import React, { useState } from 'react';
import {
  Shield,
  Key,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Server,
  Zap,
  Layers,
  Network,
  Share2,
  Cpu,
  Radio,
} from 'lucide-react';
import { FieldInfoTooltip } from './FieldInfoTooltip';
import { VPNType } from '../../types';

export interface VPNProtocolFormsProps {
  selectedVpnType: VPNType;
  scenario: 'remote_access' | 'site_to_site' | 'tunnel';
  isEn: boolean;
  isLightMode: boolean;

  // L2TP / IPsec Remote Access
  l2tpName: string;
  setL2tpName: (v: string) => void;
  l2tpLocalAddr: string;
  setL2tpLocalAddr: (v: string) => void;
  l2tpPoolName: string;
  setL2tpPoolName: (v: string) => void;
  l2tpPoolRanges: string;
  setL2tpPoolRanges: (v: string) => void;
  l2tpUsers: Array<{ username: string; password: string; enabled: boolean }>;
  setL2tpUsers: React.Dispatch<React.SetStateAction<Array<{ username: string; password: string; enabled: boolean }>>>;
  newUsername: string;
  setNewUsername: (v: string) => void;
  newUserPass: string;
  setNewUserPass: (v: string) => void;

  // L2TP / IPsec Site-to-Site
  s2sConnectTo: string;
  setS2sConnectTo: (v: string) => void;
  s2sUsername: string;
  setS2sUsername: (v: string) => void;
  s2sPassword: string;
  setS2sPassword: (v: string) => void;
  s2sLocalTunnelIp: string;
  setS2sLocalTunnelIp: (v: string) => void;
  s2sRemoteTunnelIp: string;
  setS2sRemoteTunnelIp: (v: string) => void;

  // IPsec PSK
  ipsecSecret: string;
  setIpsecSecret: (v: string) => void;
  showSecret: boolean;
  setShowSecret: (v: boolean) => void;

  // GRE State
  greName: string;
  setGreName: (v: string) => void;
  greLocalAddr: string;
  setGreLocalAddr: (v: string) => void;
  greRemoteAddr: string;
  setGreRemoteAddr: (v: string) => void;
  greTunnelIp: string;
  setGreTunnelIp: (v: string) => void;
  greMtu: number;
  setGreMtu: (v: number) => void;
  greKeepalive: string;
  setGreKeepalive: (v: string) => void;
  greComment: string;
  setGreComment: (v: string) => void;
  greIpsecSecret: string;
  setGreIpsecSecret: (v: string) => void;

  // WireGuard State
  wgName: string;
  setWgName: (v: string) => void;
  wgListenPort: number;
  setWgListenPort: (v: number) => void;
  wgPrivateKey: string;
  setWgPrivateKey: (v: string) => void;
  wgTunnelIp: string;
  setWgTunnelIp: (v: string) => void;
  wgMtu: number;
  setWgMtu: (v: number) => void;
  wgPeerPublicKey: string;
  setWgPeerPublicKey: (v: string) => void;
  wgPeerEndpoint: string;
  setWgPeerEndpoint: (v: string) => void;
  wgPeerPort: number;
  setWgPeerPort: (v: number) => void;
  wgPeerAllowedIps: string;
  setWgPeerAllowedIps: (v: string) => void;
  wgKeepalive: number;
  setWgKeepalive: (v: number) => void;

  // IPsec Site-to-Site State
  ipsecName: string;
  setIpsecName: (v: string) => void;
  ipsecRemotePeer: string;
  setIpsecRemotePeer: (v: string) => void;
  ipsecLocalWan: string;
  setIpsecLocalWan: (v: string) => void;
  ipsecPsk: string;
  setIpsecPsk: (v: string) => void;
  ipsecLocalSubnet: string;
  setIpsecLocalSubnet: (v: string) => void;
  ipsecRemoteSubnet: string;
  setIpsecRemoteSubnet: (v: string) => void;
  ipsecIkeVersion: string;
  setIpsecIkeVersion: (v: string) => void;

  // EoIP State
  eoipName: string;
  setEoipName: (v: string) => void;
  eoipTunnelId: number;
  setEoipTunnelId: (v: number) => void;
  eoipLocalAddr: string;
  setEoipLocalAddr: (v: string) => void;
  eoipRemoteAddr: string;
  setEoipRemoteAddr: (v: string) => void;
  eoipBridge: string;
  setEoipBridge: (v: string) => void;
  eoipIpsecSecret: string;
  setEoipIpsecSecret: (v: string) => void;

  // SSTP State
  sstpName: string;
  setSstpName: (v: string) => void;
  sstpLocalAddr: string;
  setSstpLocalAddr: (v: string) => void;
  sstpPoolRanges: string;
  setSstpPoolRanges: (v: string) => void;
  sstpPort: number;
  setSstpPort: (v: number) => void;
  sstpCert: string;
  setSstpCert: (v: string) => void;
  sstpConnectTo: string;
  setSstpConnectTo: (v: string) => void;
  sstpUser: string;
  setSstpUser: (v: string) => void;
  sstpPassword: string;
  setSstpPassword: (v: string) => void;

  // OpenVPN State
  ovpnName: string;
  setOvpnName: (v: string) => void;
  ovpnPort: number;
  setOvpnPort: (v: number) => void;
  ovpnProto: string;
  setOvpnProto: (v: string) => void;
  ovpnPoolRanges: string;
  setOvpnPoolRanges: (v: string) => void;
  ovpnCert: string;
  setOvpnCert: (v: string) => void;
  ovpnConnectTo: string;
  setOvpnConnectTo: (v: string) => void;
  ovpnUser: string;
  setOvpnUser: (v: string) => void;
  ovpnPassword: string;
  setOvpnPassword: (v: string) => void;

  // VXLAN State
  vxlanName: string;
  setVxlanName: (v: string) => void;
  vxlanVni: number;
  setVxlanVni: (v: number) => void;
  vxlanPort: number;
  setVxlanPort: (v: number) => void;
  vxlanVteps: string;
  setVxlanVteps: (v: string) => void;
  vxlanBridge: string;
  setVxlanBridge: (v: string) => void;

  // PPTP State
  pptpName: string;
  setPptpName: (v: string) => void;
  pptpLocalAddr: string;
  setPptpLocalAddr: (v: string) => void;
  pptpPoolRanges: string;
  setPptpPoolRanges: (v: string) => void;
}

export const VPNProtocolForms: React.FC<VPNProtocolFormsProps> = (props) => {
  const {
    selectedVpnType,
    scenario,
    isEn,
    isLightMode,

    l2tpName,
    setL2tpName,
    l2tpLocalAddr,
    setL2tpLocalAddr,
    l2tpPoolName,
    setL2tpPoolName,
    l2tpPoolRanges,
    setL2tpPoolRanges,
    l2tpUsers,
    setL2tpUsers,
    newUsername,
    setNewUsername,
    newUserPass,
    setNewUserPass,

    s2sConnectTo,
    setS2sConnectTo,
    s2sUsername,
    setS2sUsername,
    s2sPassword,
    setS2sPassword,
    s2sLocalTunnelIp,
    setS2sLocalTunnelIp,
    s2sRemoteTunnelIp,
    setS2sRemoteTunnelIp,

    ipsecSecret,
    setIpsecSecret,
    showSecret,
    setShowSecret,

    greName,
    setGreName,
    greLocalAddr,
    setGreLocalAddr,
    greRemoteAddr,
    setGreRemoteAddr,
    greTunnelIp,
    setGreTunnelIp,
    greMtu,
    setGreMtu,
    greKeepalive,
    setGreKeepalive,
    greComment,
    setGreComment,
    greIpsecSecret,
    setGreIpsecSecret,

    wgName,
    setWgName,
    wgListenPort,
    setWgListenPort,
    wgPrivateKey,
    setWgPrivateKey,
    wgTunnelIp,
    setWgTunnelIp,
    wgMtu,
    setWgMtu,
    wgPeerPublicKey,
    setWgPeerPublicKey,
    wgPeerEndpoint,
    setWgPeerEndpoint,
    wgPeerPort,
    setWgPeerPort,
    wgPeerAllowedIps,
    setWgPeerAllowedIps,
    wgKeepalive,
    setWgKeepalive,

    ipsecName,
    setIpsecName,
    ipsecRemotePeer,
    setIpsecRemotePeer,
    ipsecLocalWan,
    setIpsecLocalWan,
    ipsecPsk,
    setIpsecPsk,
    ipsecLocalSubnet,
    setIpsecLocalSubnet,
    ipsecRemoteSubnet,
    setIpsecRemoteSubnet,
    ipsecIkeVersion,
    setIpsecIkeVersion,

    eoipName,
    setEoipName,
    eoipTunnelId,
    setEoipTunnelId,
    eoipLocalAddr,
    setEoipLocalAddr,
    eoipRemoteAddr,
    setEoipRemoteAddr,
    eoipBridge,
    setEoipBridge,
    eoipIpsecSecret,
    setEoipIpsecSecret,

    sstpName,
    setSstpName,
    sstpLocalAddr,
    setSstpLocalAddr,
    sstpPoolRanges,
    setSstpPoolRanges,
    sstpPort,
    setSstpPort,
    sstpCert,
    setSstpCert,
    sstpConnectTo,
    setSstpConnectTo,
    sstpUser,
    setSstpUser,
    sstpPassword,
    setSstpPassword,

    ovpnName,
    setOvpnName,
    ovpnPort,
    setOvpnPort,
    ovpnProto,
    setOvpnProto,
    ovpnPoolRanges,
    setOvpnPoolRanges,
    ovpnCert,
    setOvpnCert,
    ovpnConnectTo,
    setOvpnConnectTo,
    ovpnUser,
    setOvpnUser,
    ovpnPassword,
    setOvpnPassword,

    vxlanName,
    setVxlanName,
    vxlanVni,
    setVxlanVni,
    vxlanPort,
    setVxlanPort,
    vxlanVteps,
    setVxlanVteps,
    vxlanBridge,
    setVxlanBridge,

    pptpName,
    setPptpName,
    pptpLocalAddr,
    setPptpLocalAddr,
    pptpPoolRanges,
    setPptpPoolRanges,
  } = props;

  const [showPsk, setShowPsk] = useState(false);

  const handleAddUser = () => {
    if (!newUsername.trim() || !newUserPass.trim()) return;
    setL2tpUsers((prev) => [
      ...prev,
      { username: newUsername.trim(), password: newUserPass.trim(), enabled: true },
    ]);
    setNewUsername('');
    setNewUserPass('');
  };

  const handleRemoveUser = (index: number) => {
    setL2tpUsers((prev) => prev.filter((_, i) => i !== index));
  };

  const inputClass = `w-full px-3 py-2 text-xs rounded-lg font-mono outline-none border transition-colors ${
    isLightMode
      ? 'bg-slate-50 border-slate-300 text-slate-800 focus:border-cyan-500 focus:bg-white'
      : 'bg-slate-800 border-slate-700 text-white focus:border-cyan-400'
  }`;

  const labelClass = `flex items-center text-xs font-semibold mb-1.5 ${
    isLightMode ? 'text-slate-700' : 'text-slate-300'
  }`;

  // -------------------------------------------------------------
  // 1. WIREGUARD FORM
  // -------------------------------------------------------------
  if (selectedVpnType === 'wireguard') {
    return (
      <div className="space-y-6">
        <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-cyan-300 text-xs flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            {isEn
              ? 'WireGuard operates natively at the kernel layer with state-of-the-art cryptography (Noise protocol, Curve25519, ChaCha20-Poly1305). Requires RouterOS v7+.'
              : 'پروتکل وایرگارد به صورت بومی روی کرنل RouterOS v7 با جدیدترین متدهای رمزنگاری کار می‌کند و بالاترین پهنای باند و کمترین تاخیر را ارائه می‌دهد.'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Interface Name' : 'نام اینترفیس وایرگارد'}</span>
              <FieldInfoTooltip
                title={isEn ? 'WireGuard Interface Name' : 'نام اینترفیس وایرگارد'}
                whatIsIt={isEn
                  ? 'The identifier for this virtual tunnel interface under "/interface wireguard".'
                  : 'شناسه اینترفیس تونل مجازی در مسیر interface wireguard روتر میکروتیک.'}
                whyNeeded={isEn
                  ? 'RouterOS binds IP addressing, peers, and firewall chains directly to this interface.'
                  : 'روتر میکروتیک برای انتصاب آدرس IP، همسایگی Peerها و اعمال رول‌های فایروال به این نام نیاز دارد.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={wgName}
              onChange={(e) => setWgName(e.target.value)}
              className={inputClass}
              placeholder="wg-vpn1"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Listen Port (UDP)' : 'پورت شنود (UDP)'}</span>
              <FieldInfoTooltip
                title={isEn ? 'WireGuard Listen Port' : 'پورت شنود وایرگارد'}
                whatIsIt={isEn
                  ? 'UDP port number bound by the router to listen for incoming handshakes (default: 13231).'
                  : 'شماره پورت UDP که روتر برای دریافت بسته‌های اولیه هندشیک روی آن گوش می‌دهد (پیش‌فرض ۱۳۲۳۱).'}
                whyNeeded={isEn
                  ? 'Remote clients and peer routers send encrypted handshakes to this WAN UDP port.'
                  : 'کلاینت‌های راه دور بسته‌های خود را به این پورت از آدرس عمومی روتر ارسال می‌کنند تا تونل برقرار شود.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="number"
              value={wgListenPort}
              onChange={(e) => setWgListenPort(parseInt(e.target.value) || 13231)}
              className={inputClass}
              placeholder="13231"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Tunnel Gateway IP & CIDR' : 'آدرس IP تونل با ماسک CIDR'}</span>
              <FieldInfoTooltip
                title={isEn ? 'Tunnel Subnet IP' : 'آدرس ساب‌نت تونل'}
                whatIsIt={isEn
                  ? 'Point-to-point IP address assigned to the WireGuard interface (e.g. 10.200.0.1/24).'
                  : 'آدرس IP اینترفیس تونل وایرگارد به همراه طول پیشوند شبکه (مانند 10.200.0.1/24).'}
                whyNeeded={isEn
                  ? 'Acts as the default gateway inside the encrypted tunnel network for all peers.'
                  : 'به عنوان دروازه پیش‌فرض (Gateway) داخل شبکه رمزگذاری شده برای تمام کاربران و شعب عمل می‌کند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={wgTunnelIp}
              onChange={(e) => setWgTunnelIp(e.target.value)}
              className={inputClass}
              placeholder="10.200.0.1/24"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Interface MTU' : 'حداکثر اندازه بسته (MTU)'}</span>
              <FieldInfoTooltip
                title={isEn ? 'WireGuard MTU' : 'تنظیم MTU وایرگارد'}
                whatIsIt={isEn
                  ? 'Maximum Transmission Unit for packets traversing this tunnel (recommended: 1420).'
                  : 'حداکثر بایت‌های هر بسته داخل تونل (مقدار استاندارد ۱۴۲۰ بایت).'}
                whyNeeded={isEn
                  ? 'Prevents packet fragmentation over standard 1500-byte WAN links caused by WireGuard overhead.'
                  : 'از خرد شدن بسته‌ها (Fragmentation) به علت اضافه شدن هدرهای رمزگذاری و افت کارایی جلوگیری می‌کند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="number"
              value={wgMtu}
              onChange={(e) => setWgMtu(parseInt(e.target.value) || 1420)}
              className={inputClass}
              placeholder="1420"
            />
          </div>
        </div>

        {/* Peer Section */}
        <div className={`p-4 rounded-xl border ${isLightMode ? 'bg-slate-100/60 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
          <h5 className="font-bold text-xs text-cyan-400 mb-3 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" />
            <span>{scenario === 'site_to_site' ? (isEn ? 'Site-to-Site Peer Configuration' : 'تنظیمات پیر شعبه روبرو') : (isEn ? 'Teleworker Peer Configuration' : 'تنظیمات کلاینت دورکار')}</span>
          </h5>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>
                <span>{isEn ? 'Peer Public Key (Base64)' : 'کلید عمومی پیر (Public Key)'}</span>
                <FieldInfoTooltip
                  title={isEn ? 'Peer Cryptographic Public Key' : 'کلید عمومی رمزنگاری پیر'}
                  whatIsIt={isEn
                    ? '32-byte Base64-encoded Curve25519 public key of the remote peer.'
                    : 'کلید عمومی بر پایه منحنی بیضوی طرف مقابل با کدگذاری Base64.'}
                  whyNeeded={isEn
                    ? 'WireGuard authenticates each endpoint strictly via public keys without passwords.'
                    : 'احراز هویت در وایرگارد به طور صددرصد بر پایه بررسی کلیدهای عمومی رمزنگاری انجام می‌شود.'}
                  isEn={isEn}
                  isLightMode={isLightMode}
                />
              </label>
              <input
                type="text"
                value={wgPeerPublicKey}
                onChange={(e) => setWgPeerPublicKey(e.target.value)}
                className={inputClass}
                placeholder="yN62k4dFjK9lZ1vW8sX3pQ=="
              />
            </div>

            {scenario === 'site_to_site' && (
              <>
                <div>
                  <label className={labelClass}>
                    <span>{isEn ? 'Remote Endpoint WAN IP' : 'آدرس IP عمومی روتر مقابل'}</span>
                    <FieldInfoTooltip
                      title={isEn ? 'Remote Router Endpoint' : 'آدرس روتر مقابل'}
                      whatIsIt={isEn
                        ? 'Public IP address or dynamic DNS domain of the remote branch router.'
                        : 'آدرس IP اینترنتی استاتیک یا دامنه DDNS روتر شعبه مقابل.'}
                      whyNeeded={isEn
                        ? 'Tells this router where to send outgoing WireGuard UDP packets over the Internet.'
                        : 'مشخص می‌کند بسته‌های ارسالی روی اینترنت به چه آدرسی تحویل داده شوند.'}
                      isEn={isEn}
                      isLightMode={isLightMode}
                    />
                  </label>
                  <input
                    type="text"
                    value={wgPeerEndpoint}
                    onChange={(e) => setWgPeerEndpoint(e.target.value)}
                    className={inputClass}
                    placeholder="203.0.113.20"
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    <span>{isEn ? 'Remote Port' : 'پورت روتر مقابل'}</span>
                    <FieldInfoTooltip
                      title={isEn ? 'Remote Listen Port' : 'پورت شنود مقابل'}
                      whatIsIt={isEn ? 'Remote router WireGuard UDP listen port.' : 'شماره پورت شنود وایرگارد روی روتر مقابل.'}
                      whyNeeded={isEn ? 'Required for the UDP transport destination.' : 'برای ارسال ترافیک به روتر مقابل الزامی است.'}
                      isEn={isEn}
                      isLightMode={isLightMode}
                    />
                  </label>
                  <input
                    type="number"
                    value={wgPeerPort}
                    onChange={(e) => setWgPeerPort(parseInt(e.target.value) || 13231)}
                    className={inputClass}
                    placeholder="13231"
                  />
                </div>
              </>
            )}

            <div>
              <label className={labelClass}>
                <span>{isEn ? 'Allowed IPs (Routes & Filters)' : 'محدوده آدرس‌های مجاز (Allowed IPs)'}</span>
                <FieldInfoTooltip
                  title={isEn ? 'Cryptokey Allowed IPs' : 'شبکه‌های مجاز Allowed IPs'}
                  whatIsIt={isEn
                    ? 'Subnets allowed to traverse this peer (e.g. 10.200.0.2/32 or 192.168.20.0/24).'
                    : 'محدوده شبکه‌هایی که مجاز به عبور از این پیر هستند (مثلاً 10.200.0.2/32 یا ساب‌نت شعبه).'}
                  whyNeeded={isEn
                    ? 'WireGuard matches destination IPs against this list to decide which peer decrypts each packet.'
                    : 'وایرگارد از این لیست به عنوان جدول مسیریابی و فیلتر بسته‌ها استفاده می‌کند.'}
                  isEn={isEn}
                  isLightMode={isLightMode}
                />
              </label>
              <input
                type="text"
                value={wgPeerAllowedIps}
                onChange={(e) => setWgPeerAllowedIps(e.target.value)}
                className={inputClass}
                placeholder="10.200.0.2/32"
              />
            </div>

            <div>
              <label className={labelClass}>
                <span>{isEn ? 'Persistent Keepalive (Seconds)' : 'فاصله ارسال پکت زنده‌مانی (Keepalive)'}</span>
                <FieldInfoTooltip
                  title={isEn ? 'Persistent Keepalive' : 'زنده‌مانی ارتباط Keepalive'}
                  whatIsIt={isEn
                    ? 'Periodic heartbeat interval in seconds (recommended: 25).'
                    : 'فاصله زمانی ارسال بسته‌های کوتاه دوره‌ای به ثانیه (پیش‌فرض ۲۵ ثانیه).'}
                  whyNeeded={isEn
                    ? 'Keeps stateful NAT mappings alive across upstream ISP firewalls so the peer remains reachable.'
                    : 'مانع از بسته شدن پورت در فایروال‌های NAT شرکت‌های مخابراتی و ارائه‌دهنده اینترنت می‌شود.'}
                  isEn={isEn}
                  isLightMode={isLightMode}
                />
              </label>
              <input
                type="number"
                value={wgKeepalive}
                onChange={(e) => setWgKeepalive(parseInt(e.target.value) || 25)}
                className={inputClass}
                placeholder="25"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. IPSEC SITE-TO-SITE (IKEv2) FORM
  // -------------------------------------------------------------
  if (selectedVpnType === 'ipsec_site_to_site') {
    return (
      <div className="space-y-6">
        <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-indigo-300 text-xs flex items-center gap-2">
          <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            {isEn
              ? 'Pure Policy-Based IPsec (IKEv2) with AES-256 hardware acceleration. Interoperates with Cisco, Fortinet, pfSense and MikroTik.'
              : 'تونل خالص IPsec بر پایه IKEv2 با شتاب‌دهنده سخت‌افزاری رمزنگاری AES-256؛ کاملاً سازگار با تجهیزات سیسکو، فورتی‌نت و سایر روترها.'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              <span>{isEn ? 'IPsec Profile / Peer Name' : 'نام پیر و پروفایل IPsec'}</span>
              <FieldInfoTooltip
                title={isEn ? 'IPsec Configuration Name' : 'نام پیکربندی IPsec'}
                whatIsIt={isEn ? 'Descriptive identifier for this IPsec connection.' : 'شناسه متنی برای شناسایی این ارتباط در جدول پیرهای IPsec.'}
                whyNeeded={isEn ? 'Binds policies, identity, and cryptographic proposals together.' : 'پالیسی‌ها، کلیدها و پیشنهادهای رمزنگاری را به یکدیگر پیوند می‌دهد.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={ipsecName}
              onChange={(e) => setIpsecName(e.target.value)}
              className={inputClass}
              placeholder="ipsec-s2s-branch"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Remote Peer Public WAN IP' : 'آدرس IP عمومی روتر مقابل'}</span>
              <FieldInfoTooltip
                title={isEn ? 'Remote Gateway WAN IP' : 'آدرس گیت‌وی راه دور'}
                whatIsIt={isEn ? 'Public static IP of the remote router terminating the IPsec tunnel.' : 'آدرس IP عمومی و استاتیک روتر شعبه یا دیتاسنتر مقابل.'}
                whyNeeded={isEn ? 'Destination address for IKE (port 500/4500) and ESP traffic.' : 'مقصد تبادل بسته‌های مذاکره IKE و ترافیک رمزنگاری‌شده ESP است.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={ipsecRemotePeer}
              onChange={(e) => setIpsecRemotePeer(e.target.value)}
              className={inputClass}
              placeholder="203.0.113.20"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Local Protected Subnet (CIDR)' : 'ساب‌نت شبکه محلی (Local Subnet)'}</span>
              <FieldInfoTooltip
                title={isEn ? 'Local LAN Subnet' : 'ساب‌نت شبکه داخلی محلی'}
                whatIsIt={isEn ? 'The private subnet behind this local router (e.g. 192.168.10.0/24).' : 'محدوده آدرس‌های شبکه محلی پشت این روتر (مانند 192.168.10.0/24).'}
                whyNeeded={isEn ? 'Source selector in the IPsec policy that triggers tunnel encryption.' : 'به عنوان شرط مبدا در پالیسی IPsec برای شکار و رمزنگاری ترافیک عمل می‌کند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={ipsecLocalSubnet}
              onChange={(e) => setIpsecLocalSubnet(e.target.value)}
              className={inputClass}
              placeholder="192.168.10.0/24"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Remote Protected Subnet (CIDR)' : 'ساب‌نت شبکه روبرو (Remote Subnet)'}</span>
              <FieldInfoTooltip
                title={isEn ? 'Remote LAN Subnet' : 'ساب‌نت شبکه داخلی دفتر مقابل'}
                whatIsIt={isEn ? 'The private subnet behind the remote router (e.g. 192.168.20.0/24).' : 'محدوده آدرس‌های شبکه پشت روتر مقابل (مانند 192.168.20.0/24).'}
                whyNeeded={isEn ? 'Destination selector in the IPsec policy.' : 'به عنوان شرط مقصد پالیسی جهت ارسال مستقیم پکت‌ها به شعبه روبرو عمل می‌کند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={ipsecRemoteSubnet}
              onChange={(e) => setIpsecRemoteSubnet(e.target.value)}
              className={inputClass}
              placeholder="192.168.20.0/24"
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>
              <span>{isEn ? 'Pre-Shared Key (PSK Secret)' : 'کلید رمز مشترک (Pre-Shared Key)'}</span>
              <FieldInfoTooltip
                title={isEn ? 'IKEv2 Pre-Shared Key' : 'کلید رمز PSK'}
                whatIsIt={isEn ? 'Shared cryptographic secret string configured identically on both routers.' : 'رشته متنی محرمانه که باید روی هر دو روتر دقیقاً یکسان باشد.'}
                whyNeeded={isEn ? 'Authenticates the routers mutually during Phase 1 IKE handshake.' : 'روترها در ابتدای ارتباط با این کلید صحت هویت یکدیگر را تایید می‌کنند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <div className="relative">
              <input
                type={showPsk ? 'text' : 'password'}
                value={ipsecPsk}
                onChange={(e) => setIpsecPsk(e.target.value)}
                className={`${inputClass} pr-10`}
                placeholder="SafeIpsecPSK2026!"
              />
              <button
                type="button"
                onClick={() => setShowPsk(!showPsk)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                {showPsk ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. GRE TUNNEL FORM
  // -------------------------------------------------------------
  if (selectedVpnType === 'gre') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              <span>{isEn ? 'GRE Tunnel Name' : 'نام اینترفیس تونل GRE'}</span>
              <FieldInfoTooltip
                title={isEn ? 'GRE Interface Name' : 'نام اینترفیس GRE'}
                whatIsIt={isEn ? 'The identifier for this GRE tunnel interface under "/interface gre".' : 'شناسه اینترفیس در مسیر interface gre میکروتیک.'}
                whyNeeded={isEn ? 'Provides the network interface required for assigning IPs and static/OSPF routes.' : 'اینترفیس شبکه‌ای برای تخصیص IP و تعریف مسیرهای استاتیک یا OSPF را فراهم می‌آورد.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={greName}
              onChange={(e) => setGreName(e.target.value)}
              className={inputClass}
              placeholder="gre-tunnel1"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Remote Router Public IP' : 'آدرس IP عمومی روتر مقابل'}</span>
              <FieldInfoTooltip
                title={isEn ? 'Remote Tunnel Endpoint' : 'مقصد بیرونی تونل'}
                whatIsIt={isEn ? 'Public WAN IP address of the remote router terminating the tunnel.' : 'آدرس IP اینترنتی روتر طرف مقابل.'}
                whyNeeded={isEn ? 'The outer IP packet header uses this as the delivery destination.' : 'هدر بیرونی بسته GRE بسته‌ها را به این آدرس هدایت می‌کند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={greRemoteAddr}
              onChange={(e) => setGreRemoteAddr(e.target.value)}
              className={inputClass}
              placeholder="203.0.113.20"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Point-to-Point Tunnel IP (/30)' : 'آدرس نقطه به نقطه تونل (/30)'}</span>
              <FieldInfoTooltip
                title={isEn ? 'Tunnel Transit IP' : 'آدرس ساب‌نت ترانزیت تونل'}
                whatIsIt={isEn ? 'Transit /30 IP assigned to the tunnel interface (e.g. 10.255.0.1/30).' : 'آدرس ترانزیت نقطه به نقطه روی اینترفیس تونل (مانند 10.255.0.1/30).'}
                whyNeeded={isEn ? 'Enables Layer 3 routing and dynamic routing neighbor adjacency (OSPF/BGP).' : 'امکان تبادل بسته‌های لایه ۳ و همسایگی در پروتکل‌های OSPF و BGP را میسر می‌سازد.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={greTunnelIp}
              onChange={(e) => setGreTunnelIp(e.target.value)}
              className={inputClass}
              placeholder="10.255.0.1/30"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Tunnel MTU' : 'اندازه بسته (MTU)'}</span>
              <FieldInfoTooltip
                title={isEn ? 'GRE MTU' : 'تنظیم MTU تونل GRE'}
                whatIsIt={isEn ? 'Maximum Transmission Unit (standard GRE: 1476 bytes).' : 'حداکثر بایت‌های ارسالی بسته در هر فریم (استاندارد GRE مقدار ۱۴۷۶ بایت).'}
                whyNeeded={isEn ? 'Accounts for GRE encapsulation overhead and prevents packet fragmentation.' : 'هدرهای GRE را جبران کرده و مانع شکستگی بسته‌ها روی بستر WAN می‌شود.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="number"
              value={greMtu}
              onChange={(e) => setGreMtu(parseInt(e.target.value) || 1476)}
              className={inputClass}
              placeholder="1476"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Keepalive Probes' : 'بسته‌های پایش اتصال (Keepalive)'}</span>
              <FieldInfoTooltip
                title={isEn ? 'GRE Keepalive' : 'زنده‌مانی تونل Keepalive'}
                whatIsIt={isEn ? 'Interval and retry count formatted as "10s,3".' : 'فاصله زمانی و تعداد دفعات ارسال پکت تست سلامت مانند 10s,3.'}
                whyNeeded={isEn ? 'Detects physical or WAN routing failures to quickly take the tunnel interface down.' : 'در صورت قطع ارتباط روتر مقابل، سریعاً اینترفیس را غیرفعال کرده و مسیر جایگزین را فعال می‌کند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={greKeepalive}
              onChange={(e) => setGreKeepalive(e.target.value)}
              className={inputClass}
              placeholder="10s,3"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'IPsec Secret (Optional Encryption)' : 'رمز IPsec (رمزنگاری اختیاری)'}</span>
              <FieldInfoTooltip
                title={isEn ? 'GRE over IPsec Secret' : 'کلید رمزنگاری GRE'}
                whatIsIt={isEn ? 'Auto-provisions IPsec peers and proposals to encrypt GRE packets.' : 'کلید رمز برای رمزنگاری سخت‌افزاری خودکار بسته‌های GRE توسط IPsec.'}
                whyNeeded={isEn ? 'Standard GRE sends packets in plaintext. IPsec encrypts all inner packets.' : 'پروتکل GRE به طور پیش‌فرض رمزنگاری ندارد؛ با این کلید، ترافیک رمزنگاری می‌شود.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="password"
              value={greIpsecSecret}
              onChange={(e) => setGreIpsecSecret(e.target.value)}
              className={inputClass}
              placeholder="Leave empty for cleartext GRE"
            />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 4. EOIP TUNNEL FORM
  // -------------------------------------------------------------
  if (selectedVpnType === 'eoip') {
    return (
      <div className="space-y-6">
        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 text-xs flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {isEn
              ? 'MikroTik Ethernet over IP (EoIP) creates a transparent Layer 2 Ethernet bridge across the WAN. Passes VLANs, ARP, and DHCP transparently.'
              : 'پروتکل اختصاصی میکروتیک EoIP یک پل شفاف لایه ۲ اترنت بر بستر اینترنت ایجاد می‌کند؛ تمام VLANها، درخواست‌های ARP و سرورهای DHCP را مستقیماً عبور می‌دهد.'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              <span>{isEn ? 'EoIP Interface Name' : 'نام اینترفیس EoIP'}</span>
              <FieldInfoTooltip
                title={isEn ? 'EoIP Interface Name' : 'نام اینترفیس EoIP'}
                whatIsIt={isEn ? 'The identifier under "/interface eoip".' : 'شناسه اینترفیس تونل در مسیر interface eoip میکروتیک.'}
                whyNeeded={isEn ? 'This virtual Ethernet port is added as a port into your local Bridge.' : 'این پورت اترنت مجازی جهت اتصال شبکه لایه ۲، درون بریج محلی روتر قرار می‌گیرد.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={eoipName}
              onChange={(e) => setEoipName(e.target.value)}
              className={inputClass}
              placeholder="eoip-tunnel1"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Tunnel ID (0 - 65535)' : 'شناسه عددی تونل (Tunnel ID)'}</span>
              <FieldInfoTooltip
                title={isEn ? 'EoIP Tunnel ID' : 'شناسه عددی تونل EoIP'}
                whatIsIt={isEn ? 'Numeric identifier (0 to 65535) that MUST match on both routers.' : 'عدد شناسه بین ۰ تا ۶۵۵۳۵ که باید روی هر دو سر تونل دقیقاً یکسان باشد.'}
                whyNeeded={isEn ? 'Distinguishes between multiple Layer 2 tunnels between the same two public IPs.' : 'روترها از این عدد برای تفکیک چندین تونل لایه ۲ مختلف بین دو آدرس IP استفاده می‌کنند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="number"
              value={eoipTunnelId}
              onChange={(e) => setEoipTunnelId(parseInt(e.target.value) || 100)}
              className={inputClass}
              placeholder="100"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Remote Router Public IP' : 'آدرس IP عمومی روتر مقابل'}</span>
              <FieldInfoTooltip
                title={isEn ? 'Remote EoIP Endpoint' : 'آدرس انتهای دیگر تونل'}
                whatIsIt={isEn ? 'Public WAN IP of the remote router.' : 'آدرس IP اینترنتی روتر طرف مقابل.'}
                whyNeeded={isEn ? 'Destination address for encapsulated Ethernet frames.' : 'مقصد ارسال فریم‌های اترنت بسته‌بندی شده است.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={eoipRemoteAddr}
              onChange={(e) => setEoipRemoteAddr(e.target.value)}
              className={inputClass}
              placeholder="203.0.113.20"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Bridge Name to Join' : 'نام بریج محلی جهت اتصال'}</span>
              <FieldInfoTooltip
                title={isEn ? 'Target Bridge' : 'بریج مقصد'}
                whatIsIt={isEn ? 'The local Bridge interface (e.g. bridge-lan).' : 'نام بریج شبکه داخلی محلی (مانند bridge-lan).'}
                whyNeeded={isEn ? 'Enables seamless Layer 2 switching between local LAN switch ports and the remote office.' : 'باعث اتصال مستقیم پورت‌های سوییچ داخلی با پورت‌های شبکه شعبه دیگر می‌شود.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={eoipBridge}
              onChange={(e) => setEoipBridge(e.target.value)}
              className={inputClass}
              placeholder="bridge-lan"
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>
              <span>{isEn ? 'IPsec Encryption Secret (Optional)' : 'کلید رمزنگاری IPsec (اختیاری)'}</span>
              <FieldInfoTooltip
                title={isEn ? 'EoIP IPsec Secret' : 'کلید امنیتی EoIP'}
                whatIsIt={isEn ? 'Pre-shared secret to encrypt raw Ethernet frames traversing the Internet.' : 'کلید رمز برای کدگذاری فریم‌های اترنت هنگام عبور از بستر اینترنت.'}
                whyNeeded={isEn ? 'Raw EoIP is unencrypted. Adding an IPsec secret securely encrypts all Layer 2 traffic.' : 'ترافیک لایه ۲ به تنهایی رمزنگاری ندارد؛ این کلید امنیت کامل داده‌ها را تضمین می‌کند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="password"
              value={eoipIpsecSecret}
              onChange={(e) => setEoipIpsecSecret(e.target.value)}
              className={inputClass}
              placeholder="Leave empty for cleartext Layer 2"
            />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 5. SSTP (Secure Socket Tunneling Protocol) FORM
  // -------------------------------------------------------------
  if (selectedVpnType === 'sstp') {
    return (
      <div className="space-y-6">
        <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-500/5 text-sky-300 text-xs flex items-center gap-2">
          <Globe className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            {isEn
              ? 'SSTP transports PPP traffic over an HTTPS (TCP 443) TLS tunnel. Completely bypasses restrictive firewalls and NAT without blocking.'
              : 'پروتکل SSTP ترافیک را در بستر TLS استاندارد وب روی پورت TCP 443 منتقل می‌کند و به سادگی از سخت‌ترین فایروال‌ها و سامانه‌های فیلترینگ عبور می‌کند.'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              <span>{isEn ? 'SSTP Profile / Server Name' : 'نام سرور و پروفایل SSTP'}</span>
              <FieldInfoTooltip
                title={isEn ? 'SSTP Name' : 'نام سرویس SSTP'}
                whatIsIt={isEn ? 'Identifier for SSTP server profile.' : 'شناسه پروفایل و سرور SSTP در میکروتیک.'}
                whyNeeded={isEn ? 'Associates connecting users with encryption and IP pools.' : 'کاربران متصل را به استخر آدرس IP و پروفایل امنیتی متصل می‌کند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={sstpName}
              onChange={(e) => setSstpName(e.target.value)}
              className={inputClass}
              placeholder="sstp-vpn"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'HTTPS Port (Default: 443)' : 'پورت اتصال HTTPS (پیش‌فرض ۴۴۳)'}</span>
              <FieldInfoTooltip
                title={isEn ? 'SSTP TCP Port' : 'پورت TCP سرویس SSTP'}
                whatIsIt={isEn ? 'TCP port bound by RouterOS for SSTP listeners (default: 443).' : 'پورت TCP که روتر روی آن به اتصالات ورودی پاسخ می‌دهد (پیش‌فرض ۴۴۳).'}
                whyNeeded={isEn ? 'Port 443 mimics standard HTTPS web browsing, avoiding corporate port blocks.' : 'پورت ۴۴۳ شبیه ترافیک وب رفتار کرده و توسط فایروال‌های میانی مسدود نمی‌شود.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="number"
              value={sstpPort}
              onChange={(e) => setSstpPort(parseInt(e.target.value) || 443)}
              className={inputClass}
              placeholder="443"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Local Gateway IP' : 'آدرس گیت‌وی روتر برای کلاینت‌ها'}</span>
              <FieldInfoTooltip
                title={isEn ? 'SSTP Gateway IP' : 'آدرس گیت‌وی SSTP'}
                whatIsIt={isEn ? 'The internal tunnel IPv4 gateway address (e.g. 192.168.99.1).' : 'آدرس IP روتر داخل تونل که کلاینت‌ها به عنوان گیت‌وی از آن استفاده می‌کنند.'}
                whyNeeded={isEn ? 'Assigned as default gateway to connected clients.' : 'به عنوان دروازه عبور ترافیک به سمت شبکه داخلی سازمان تنظیم می‌شود.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={sstpLocalAddr}
              onChange={(e) => setSstpLocalAddr(e.target.value)}
              className={inputClass}
              placeholder="192.168.99.1"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Client IP Pool Range' : 'محدوده آدرس‌های استخر کلاینت'}</span>
              <FieldInfoTooltip
                title={isEn ? 'SSTP IP Pool' : 'استخر آدرس کلاینت‌ها'}
                whatIsIt={isEn ? 'IPv4 range allocated for remote SSTP clients.' : 'محدوده آدرس‌های IP تخصیص یافته به کاربران متصل.'}
                whyNeeded={isEn ? 'Dynamically distributes unique IPs to connecting users.' : 'به هر کاربر متصل یک آدرس اختصاصی بدون تداخل می‌دهد.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={sstpPoolRanges}
              onChange={(e) => setSstpPoolRanges(e.target.value)}
              className={inputClass}
              placeholder="192.168.99.10-192.168.99.50"
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>
              <span>{isEn ? 'SSL Server Certificate' : 'گواهی امنیتی SSL سرور'}</span>
              <FieldInfoTooltip
                title={isEn ? 'TLS Certificate' : 'گواهی SSL/TLS'}
                whatIsIt={isEn ? 'Certificate name in RouterOS "/certificate".' : 'نام سرتیفیکیت معتبر تعریف شده در بخش certificate روتر میکروتیک.'}
                whyNeeded={isEn ? 'Required for negotiating the TLS handshake with SSTP clients.' : 'برای مذاکره امن TLS و اعتبارسنجی سرور توسط کلاینت‌ها الزامی است.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={sstpCert}
              onChange={(e) => setSstpCert(e.target.value)}
              className={inputClass}
              placeholder="default"
            />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 6. OPENVPN (SSL/TLS) FORM
  // -------------------------------------------------------------
  if (selectedVpnType === 'openvpn') {
    return (
      <div className="space-y-6">
        <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-300 text-xs flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {isEn
              ? 'OpenVPN server and client implementation supporting TCP and UDP modes with AES-256-CBC cipher.'
              : 'سرور و کلاینت پروتکل استاندارد OpenVPN با پشتیبانی از پروتکل‌های TCP و UDP و الگوریتم‌های قوی رمزنگاری AES-256.'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              <span>{isEn ? 'OpenVPN Service Name' : 'نام سرور OpenVPN'}</span>
              <FieldInfoTooltip
                title={isEn ? 'OpenVPN Profile Name' : 'نام سرویس OpenVPN'}
                whatIsIt={isEn ? 'Identifier for OpenVPN server.' : 'نام پروفایل و سرور اوپن‌وی‌پی‌ان در میکروتیک.'}
                whyNeeded={isEn ? 'Binds certificate and user authentication pools.' : 'سرتیفیکیت و استخرهای آدرس‌دهی را به هم مرتبط می‌کند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={ovpnName}
              onChange={(e) => setOvpnName(e.target.value)}
              className={inputClass}
              placeholder="ovpn-server"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Listen Port (Default: 1194)' : 'پورت شنود (پیش‌فرض ۱۱۹۴)'}</span>
              <FieldInfoTooltip
                title={isEn ? 'OpenVPN Port' : 'پورت اتصال OpenVPN'}
                whatIsIt={isEn ? 'Port number for incoming client connections (default: 1194).' : 'شماره پورت اتصال کلاینت‌ها (پیش‌فرض ۱۱۹۴).'}
                whyNeeded={isEn ? 'Clients send TLS handshakes to this port on the router.' : 'کلاینت‌ها برای آغاز نشست بسته‌های خود را به این پورت ارسال می‌کنند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="number"
              value={ovpnPort}
              onChange={(e) => setOvpnPort(parseInt(e.target.value) || 1194)}
              className={inputClass}
              placeholder="1194"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Transport Protocol' : 'پروتکل لایه انتقال'}</span>
              <FieldInfoTooltip
                title={isEn ? 'TCP vs UDP' : 'پروتکل TCP یا UDP'}
                whatIsIt={isEn ? 'Transport layer protocol (TCP or UDP).' : 'نوع پروتکل لایه انتقال شبکه.'}
                whyNeeded={isEn ? 'UDP provides lowest latency; TCP provides reliable transport over lossy links.' : 'پروتکل UDP کمترین تاخیر و TCP بیشترین پایداری را در لینک‌های با افت پکت ارائه می‌دهد.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <select
              value={ovpnProto}
              onChange={(e) => setOvpnProto(e.target.value)}
              className={inputClass}
            >
              <option value="tcp">TCP (Reliable, Firewall friendly)</option>
              <option value="udp">UDP (Low Latency, High Speed)</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Client IP Pool Ranges' : 'محدوده استخر آدرس کلاینت'}</span>
              <FieldInfoTooltip
                title={isEn ? 'OpenVPN Pool' : 'استخر آدرس کلاینت‌ها'}
                whatIsIt={isEn ? 'IPv4 pool range for connecting clients.' : 'محدوده آدرس‌های IPv4 تخصیص‌یافته به کلاینت‌های متصل.'}
                whyNeeded={isEn ? 'Supplies an individual tunnel IP to each connecting user.' : 'به هر کاربر متصل یک آدرس اختصاصی بدون تداخل انتساب می‌دهد.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={ovpnPoolRanges}
              onChange={(e) => setOvpnPoolRanges(e.target.value)}
              className={inputClass}
              placeholder="192.168.109.10-192.168.109.50"
            />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 7. VXLAN OVERLAY FORM
  // -------------------------------------------------------------
  if (selectedVpnType === 'vxlan') {
    return (
      <div className="space-y-6">
        <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 text-purple-300 text-xs flex items-center gap-2">
          <Share2 className="w-4 h-4 text-purple-400 shrink-0" />
          <span>
            {isEn
              ? 'VXLAN (Virtual Extensible LAN) encapsulates Ethernet Layer 2 frames in UDP packets across Layer 3 networks. Supports 16 million network segments.'
              : 'پروتکل VXLAN فریم‌های لایه ۲ اترنت را درون بسته‌های UDP روی شبکه‌های لایه ۳ منتقل می‌کند و تا ۱۶ میلیون سگمنت شبکه مستقل در دیتاسنتر را پشتیبانی می‌کند.'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              <span>{isEn ? 'VXLAN Interface Name' : 'نام اینترفیس VXLAN'}</span>
              <FieldInfoTooltip
                title={isEn ? 'VXLAN Interface Name' : 'نام اینترفیس VXLAN'}
                whatIsIt={isEn ? 'Virtual overlay interface name under "/interface vxlan".' : 'شناسه اینترفیس در مسیر interface vxlan میکروتیک.'}
                whyNeeded={isEn ? 'Interface joined into the bridge to forward overlay packets.' : 'جهت هدایت بسته‌ها به عنوان پورت عضو در بریج قرار می‌گیرد.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={vxlanName}
              onChange={(e) => setVxlanName(e.target.value)}
              className={inputClass}
              placeholder="vxlan1"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'VNI (VXLAN Network Identifier)' : 'شناسه شبکه (VNI)'}</span>
              <FieldInfoTooltip
                title={isEn ? 'VNI Identifier' : 'شناسه ۲۴ بیتی VNI'}
                whatIsIt={isEn ? '24-bit numeric segment ID (1 to 16,777,215).' : 'شناسه عددی سگمنت شبکه (بین ۱ تا ۱۶۷۷۷۲۱۵).'}
                whyNeeded={isEn ? 'Replaces traditional 12-bit VLANs to allow massive multi-tenant network separation.' : 'جایگزین تگ‌های سنتی VLAN است و تفکیک گسترده شبکه‌ها را ممکن می‌سازد.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="number"
              value={vxlanVni}
              onChange={(e) => setVxlanVni(parseInt(e.target.value) || 100)}
              className={inputClass}
              placeholder="100"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'UDP Port (Standard: 4789)' : 'پورت انتقال UDP (پیش‌فرض ۴۷۸۹)'}</span>
              <FieldInfoTooltip
                title={isEn ? 'VXLAN UDP Port' : 'پورت انتقال VXLAN'}
                whatIsIt={isEn ? 'Standard destination UDP port for VXLAN frames (4789).' : 'پورت استاندارد UDP برای ارسال فریم‌های VXLAN (مقدار ۴۷۸۹).'}
                whyNeeded={isEn ? 'Network switches and routers parse VXLAN packets via this port.' : 'سوییچ‌ها و روترها فریم‌ها را از طریق این پورت شناسایی می‌کنند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="number"
              value={vxlanPort}
              onChange={(e) => setVxlanPort(parseInt(e.target.value) || 4789)}
              className={inputClass}
              placeholder="4789"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Local Bridge Name' : 'نام بریج محلی'}</span>
              <FieldInfoTooltip
                title={isEn ? 'Bridge Assignment' : 'بریج عضو'}
                whatIsIt={isEn ? 'Local bridge to which VXLAN interface is attached.' : 'نام بریج محلی که اینترفیس VXLAN در آن قرار می‌گیرد.'}
                whyNeeded={isEn ? 'Bridges local VM/container traffic into the VXLAN overlay.' : 'ترافیک ماشین‌های مجازی و کانتینرها را به بستر VXLAN متصل می‌کند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={vxlanBridge}
              onChange={(e) => setVxlanBridge(e.target.value)}
              className={inputClass}
              placeholder="bridge-lan"
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>
              <span>{isEn ? 'Remote VTEP IP Addresses' : 'آدرس‌های IP مقاصد راه دور (VTEP IP)'}</span>
              <FieldInfoTooltip
                title={isEn ? 'Remote VTEP Peers' : 'آدرس‌های VTEP مقابل'}
                whatIsIt={isEn ? 'Comma-separated remote endpoint IPs (e.g. 203.0.113.20, 203.0.113.30).' : 'لیست آدرس‌های IP روترها و سوییچ‌های مقصد مقابل با کاما.'}
                whyNeeded={isEn ? 'Specifies tunnel endpoints for unicast packet forwarding.' : 'مقاصد ارسال فریم‌های لایه ۲ را برای روتر مشخص می‌کند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={vxlanVteps}
              onChange={(e) => setVxlanVteps(e.target.value)}
              className={inputClass}
              placeholder="203.0.113.20"
            />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 8. PPTP FORM (Legacy)
  // -------------------------------------------------------------
  if (selectedVpnType === 'pptp') {
    return (
      <div className="space-y-6">
        <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-300 text-xs flex items-center gap-2">
          <Lock className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            {isEn
              ? 'PPTP is a legacy protocol (MS-CHAPv2). It is fast and widely supported on older systems, but modern deployments prefer WireGuard or L2TP/IPsec.'
              : 'پروتکل PPTP سبک و با دستگاه‌های قدیمی سازگار است؛ اما برای شبکه‌های امن مدرن، استفاده از WireGuard یا L2TP/IPsec پیشنهاد می‌شود.'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              <span>{isEn ? 'PPTP Server Name' : 'نام سرور PPTP'}</span>
              <FieldInfoTooltip
                title={isEn ? 'PPTP Profile' : 'نام سرور PPTP'}
                whatIsIt={isEn ? 'Identifier for PPTP server profile.' : 'شناسه پروفایل و سرور PPTP در میکروتیک.'}
                whyNeeded={isEn ? 'Manages client sessions and IP pool mappings.' : 'نشست‌های کاربران متصل را مدیریت می‌کند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={pptpName}
              onChange={(e) => setPptpName(e.target.value)}
              className={inputClass}
              placeholder="pptp-vpn"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Local Gateway IP' : 'آدرس گیت‌وی روتر'}</span>
              <FieldInfoTooltip
                title={isEn ? 'PPTP Gateway IP' : 'آدرس گیت‌وی PPTP'}
                whatIsIt={isEn ? 'Local tunnel IP assigned to the router interface.' : 'آدرس IP روتر داخل تونل.'}
                whyNeeded={isEn ? 'Serves as client default gateway.' : 'به عنوان دروازه پیش‌فرض کلاینت‌ها عمل می‌کند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={pptpLocalAddr}
              onChange={(e) => setPptpLocalAddr(e.target.value)}
              className={inputClass}
              placeholder="192.168.79.1"
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>
              <span>{isEn ? 'Client IP Pool Ranges' : 'محدوده آدرس‌های کلاینت'}</span>
              <FieldInfoTooltip
                title={isEn ? 'PPTP Pool Ranges' : 'محدوده استخر PPTP'}
                whatIsIt={isEn ? 'IPv4 address range allocated for PPTP clients.' : 'دامنه آدرس‌های IP اختصاص یافته به کاربران متصل.'}
                whyNeeded={isEn ? 'Allocates dynamic IPs to connecting users.' : 'به هر کاربر متصل یک آدرس اختصاصی بدون تداخل می‌دهد.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={pptpPoolRanges}
              onChange={(e) => setPptpPoolRanges(e.target.value)}
              className={inputClass}
              placeholder="192.168.79.10-192.168.79.50"
            />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 9. DEFAULT: L2TP / IPSEC FORM
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      {scenario === 'remote_access' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                <span>{isEn ? 'VPN / Profile Name' : 'نام پروفایل VPN'}</span>
                <FieldInfoTooltip
                  title={isEn ? 'VPN Profile Identifier' : 'شناسه پروفایل VPN'}
                  whatIsIt={isEn
                    ? 'A unique alphanumeric name for the PPP profile and IP pool in RouterOS.'
                    : 'یک نام یکتا شامل حروف انگلیسی و ارقام که در تنظیمات PPP Profile و IP Pool میکروتیک تعریف می‌شود.'}
                  whyNeeded={isEn
                    ? 'RouterOS binds client connection parameters, encryption, and IP allocation to this profile name.'
                    : 'روتر میکروتیک برای انتصاب آدرس IP، تعیین متدهای رمزنگاری و مدیریت نشست‌های همزمان کلاینت‌ها از این نام استفاده می‌کند.'}
                  isEn={isEn}
                  isLightMode={isLightMode}
                />
              </label>
              <input
                type="text"
                value={l2tpName}
                onChange={(e) => setL2tpName(e.target.value)}
                className={inputClass}
                placeholder="l2tp-vpn"
              />
            </div>

            <div>
              <label className={labelClass}>
                <span>{isEn ? 'Local Gateway IP (local-address)' : 'آدرس گیت‌وی روتر برای کلاینت‌ها'}</span>
                <FieldInfoTooltip
                  title={isEn ? 'Local Gateway IP' : 'آدرس گیت‌وی محلی'}
                  whatIsIt={isEn
                    ? 'Router IPv4 assigned as the default gateway on the PPP interface.'
                    : 'آدرس IP روتر سمت تونل که به عنوان دروازه پیش‌فرض برای کلاینت‌ها عمل می‌کند.'}
                  whyNeeded={isEn
                    ? 'Connected road-warrior clients route all protected traffic through this IP.'
                    : 'کلاینت‌های متصل تمام ترافیک خود را از طریق این آدرس به سمت شبکه هدایت می‌کنند.'}
                  isEn={isEn}
                  isLightMode={isLightMode}
                />
              </label>
              <input
                type="text"
                value={l2tpLocalAddr}
                onChange={(e) => setL2tpLocalAddr(e.target.value)}
                className={inputClass}
                placeholder="192.168.89.1"
              />
            </div>

            <div>
              <label className={labelClass}>
                <span>{isEn ? 'Client IP Pool Name' : 'نام استخر آدرس IP کلاینت‌ها'}</span>
                <FieldInfoTooltip
                  title={isEn ? 'IP Pool Name' : 'نام استخر IP'}
                  whatIsIt={isEn
                    ? 'Identifier for the IP pool created under "/ip pool".'
                    : 'نام استخر آدرس در مسیر ip pool میکروتیک.'}
                  whyNeeded={isEn
                    ? 'The PPP server profile references this pool to assign IPs.'
                    : 'سرور PPP این استخر را مرجع قرار می‌دهد تا به هر کلاینت متصل به صورت داینامیک IP اختصاص دهد.'}
                  isEn={isEn}
                  isLightMode={isLightMode}
                />
              </label>
              <input
                type="text"
                value={l2tpPoolName}
                onChange={(e) => setL2tpPoolName(e.target.value)}
                className={inputClass}
                placeholder="pool-l2tp-vpn"
              />
            </div>

            <div>
              <label className={labelClass}>
                <span>{isEn ? 'Client IP Range' : 'محدوده آدرس‌های IP کلاینت'}</span>
                <FieldInfoTooltip
                  title={isEn ? 'IP Address Range' : 'محدوده آدرس‌های کلاینت'}
                  whatIsIt={isEn
                    ? 'Range of IPv4 addresses allocated for clients (e.g. 192.168.89.10-192.168.89.50).'
                    : 'محدوده آدرس‌های IPv4 تخصیص یافته به کلاینت‌ها (مانند 192.168.89.10-192.168.89.50).'}
                  whyNeeded={isEn
                    ? 'Defines capacity limit and prevents overlapping with existing LAN subnets.'
                    : 'ظرفیت تعداد اتصال همزمان را تعیین می‌کند و از تداخل با شبکه داخلی جلوگیری می‌نماید.'}
                  isEn={isEn}
                  isLightMode={isLightMode}
                />
              </label>
              <input
                type="text"
                value={l2tpPoolRanges}
                onChange={(e) => setL2tpPoolRanges(e.target.value)}
                className={inputClass}
                placeholder="192.168.89.10-192.168.89.50"
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>
                <span>{isEn ? 'IPsec Pre-Shared Key (PSK)' : 'کلید رمز مشترک IPsec (PSK)'}</span>
                <FieldInfoTooltip
                  title={isEn ? 'IPsec PSK Secret' : 'کلید امنیتی PSK'}
                  whatIsIt={isEn
                    ? 'Secret passphrase shared between router and clients for Phase 1 IPsec authentication.'
                    : 'رمز عبور مشترک بین روتر و کلاینت‌ها برای احراز هویت اولیه فاز ۱ پروتکل IPsec.'}
                  whyNeeded={isEn
                    ? 'Guarantees hardware AES encryption and prevents man-in-the-middle interception.'
                    : 'تضمین می‌کند ارتباط توسط شتاب‌دهنده سخت‌افزاری AES رمزنگاری شود و از شنود داده‌ها جلوگیری می‌کند.'}
                  isEn={isEn}
                  isLightMode={isLightMode}
                />
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={ipsecSecret}
                  onChange={(e) => setIpsecSecret(e.target.value)}
                  className={`${inputClass} pr-10`}
                  placeholder="SafeIpsecPSK2026!"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* User Management */}
          <div className={`p-4 rounded-xl border ${isLightMode ? 'bg-slate-100/60 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
            <h5 className="font-bold text-xs text-slate-200 mb-3 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isEn ? 'VPN User Credentials (/ppp secret)' : 'کاربران مجاز VPN (مسیر ppp secret)'}</span>
            </h5>

            <div className="space-y-2 mb-3">
              {l2tpUsers.map((user, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs font-mono ${
                    isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <span className="font-semibold text-cyan-400">{user.username}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">••••••••</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveUser(idx)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={isEn ? 'New username' : 'نام کاربری جدید'}
                className={inputClass}
              />
              <input
                type="password"
                value={newUserPass}
                onChange={(e) => setNewUserPass(e.target.value)}
                placeholder={isEn ? 'Password' : 'رمز عبور'}
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleAddUser}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium cursor-pointer shrink-0 flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isEn ? 'Add User' : 'افزودن'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* L2TP Site-to-Site Client Form */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Central HQ Public IP' : 'آدرس IP عمومی روتر مرکزی'}</span>
              <FieldInfoTooltip
                title={isEn ? 'HQ Public IP' : 'آدرس IP عمومی HQ'}
                whatIsIt={isEn
                  ? 'Reachable public WAN IP address of the central office router.'
                  : 'آدرس IP عمومی اینترنتی روتر دفتر مرکزی.'}
                whyNeeded={isEn
                  ? 'Branch router initiates the outbound L2TP tunnel connection to this IP.'
                  : 'روتر شعبه برای آغاز اتصال تونل به این آدرس درخواست ارسال می‌کند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={s2sConnectTo}
              onChange={(e) => setS2sConnectTo(e.target.value)}
              className={inputClass}
              placeholder="203.0.113.10"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'PPP Client Username' : 'نام کاربری اتصال کلاینت'}</span>
              <FieldInfoTooltip
                title={isEn ? 'PPP Username' : 'نام کاربری PPP'}
                whatIsIt={isEn ? 'Username configured on HQ router secret table.' : 'نام کاربری تعریف شده روی روتر دفتر مرکزی.'}
                whyNeeded={isEn ? 'Authorizes this branch to connect to the headquarters.' : 'اجازه برقراری ارتباط این شعبه را صادر می‌کند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={s2sUsername}
              onChange={(e) => setS2sUsername(e.target.value)}
              className={inputClass}
              placeholder="branch-peer"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'PPP Client Password' : 'رمز عبور اتصال کلاینت'}</span>
              <FieldInfoTooltip
                title={isEn ? 'PPP Password' : 'رمز عبور PPP'}
                whatIsIt={isEn ? 'Password configured on HQ router secret table.' : 'رمز عبور تعریف شده روی روتر دفتر مرکزی.'}
                whyNeeded={isEn ? 'Authenticates this branch session.' : 'احراز هویت این نشست را تضمین می‌کند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="password"
              value={s2sPassword}
              onChange={(e) => setS2sPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'IPsec PSK Secret' : 'کلید مشترک IPsec'}</span>
              <FieldInfoTooltip
                title={isEn ? 'IPsec PSK' : 'کلید امنیتی IPsec'}
                whatIsIt={isEn ? 'Pre-Shared Key configured identically on both routers.' : 'کلید رمز که باید روی هر دو روتر دقیقاً یکسان باشد.'}
                whyNeeded={isEn ? 'Protects the inter-branch link with hardware AES encryption.' : 'ارتباط بین شعب را با شتاب‌دهنده رمزگذاری سخت‌افزاری محافظت می‌کند.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="password"
              value={ipsecSecret}
              onChange={(e) => setIpsecSecret(e.target.value)}
              className={inputClass}
              placeholder="SafeIpsecPSK2026!"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Local Tunnel IP (/30)' : 'آدرس محلی تونل (/30)'}</span>
              <FieldInfoTooltip
                title={isEn ? 'Local Tunnel IP' : 'آدرس محلی تونل'}
                whatIsIt={isEn ? 'Point-to-point IP address for this router side (e.g. 10.255.255.2).' : 'آدرس نقطه به نقطه سمت این روتر (مانند 10.255.255.2).'}
                whyNeeded={isEn ? 'Source IP for routed traffic through the tunnel.' : 'آدرس مبدا ترافیک عبوری از تونل است.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={s2sLocalTunnelIp}
              onChange={(e) => setS2sLocalTunnelIp(e.target.value)}
              className={inputClass}
              placeholder="10.255.255.2"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span>{isEn ? 'Remote HQ Tunnel IP (/30)' : 'آدرس سمت دفتر مرکزی (/30)'}</span>
              <FieldInfoTooltip
                title={isEn ? 'Remote Tunnel Gateway' : 'آدرس گیت‌وی تونل'}
                whatIsIt={isEn ? 'Point-to-point IP of the HQ router side (e.g. 10.255.255.1).' : 'آدرس نقطه به نقطه سمت دفتر مرکزی (مانند 10.255.255.1).'}
                whyNeeded={isEn ? 'Next-hop gateway for routing traffic towards corporate subnets.' : 'گیت‌وی گام بعدی برای مسیریابی به سمت شبکه‌های سازمان است.'}
                isEn={isEn}
                isLightMode={isLightMode}
              />
            </label>
            <input
              type="text"
              value={s2sRemoteTunnelIp}
              onChange={(e) => setS2sRemoteTunnelIp(e.target.value)}
              className={inputClass}
              placeholder="10.255.255.1"
            />
          </div>
        </div>
      )}
    </div>
  );
};
