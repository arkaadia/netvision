import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Minus,
  X,
  Copy,
  Check,
  Split,
  TableProperties,
  Binary,
  Globe,
  SlidersHorizontal,
  Info
} from 'lucide-react';

interface IpSubnetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  isEn: boolean;
  isLightMode: boolean;
}

// Helpers for IPv4 math
function ipToInt(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
}

function intToIp(int: number): string {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255
  ].join('.');
}

function intToBinary(int: number): string[] {
  return [
    ((int >>> 24) & 255).toString(2).padStart(8, '0'),
    ((int >>> 16) & 255).toString(2).padStart(8, '0'),
    ((int >>> 8) & 255).toString(2).padStart(8, '0'),
    (int & 255).toString(2).padStart(8, '0')
  ];
}

function cidrToMaskInt(cidr: number): number {
  if (cidr === 0) return 0;
  return ((0xffffffff << (32 - cidr)) & 0xffffffff) >>> 0;
}

function getIpScope(ip: string): { type: string; classType: string; isPrivate: boolean } {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
    return { type: 'Invalid', classType: 'Unknown', isPrivate: false };
  }
  const first = parts[0];
  let classType = 'A';
  if (first >= 128 && first <= 191) classType = 'B';
  else if (first >= 192 && first <= 223) classType = 'C';
  else if (first >= 224 && first <= 239) classType = 'D (Multicast)';
  else if (first >= 240) classType = 'E (Experimental)';

  let type = 'Public Internet';
  let isPrivate = false;

  if (first === 10) {
    type = 'Private RFC 1918 (10.0.0.0/8)';
    isPrivate = true;
  } else if (first === 172 && parts[1] >= 16 && parts[1] <= 31) {
    type = 'Private RFC 1918 (172.16.0.0/12)';
    isPrivate = true;
  } else if (first === 192 && parts[1] === 168) {
    type = 'Private RFC 1918 (192.168.0.0/16)';
    isPrivate = true;
  } else if (first === 127) {
    type = 'Loopback (127.0.0.0/8)';
    isPrivate = true;
  } else if (first === 169 && parts[1] === 254) {
    type = 'Link-Local APIPA (169.254.0.0/16)';
    isPrivate = true;
  } else if (first >= 224 && first <= 239) {
    type = 'Multicast (224.0.0.0/4)';
    isPrivate = false;
  }

  return { type, classType, isPrivate };
}

// CIDR Reference Table Data
const CIDR_TABLE = [
  { cidr: 32, mask: '255.255.255.255', wildcard: '0.0.0.0', total: 1, usable: 1, desc: 'Single Host / Loopback' },
  { cidr: 31, mask: '255.255.255.254', wildcard: '0.0.0.1', total: 2, usable: 2, desc: 'Point-to-Point (RFC 3021)' },
  { cidr: 30, mask: '255.255.255.252', wildcard: '0.0.0.3', total: 4, usable: 2, desc: 'Point-to-Point WAN / Cisco' },
  { cidr: 29, mask: '255.255.255.248', wildcard: '0.0.0.7', total: 8, usable: 6, desc: 'Small Subnet / DMZ' },
  { cidr: 28, mask: '255.255.255.240', wildcard: '0.0.0.15', total: 16, usable: 14, desc: 'Small Office / Branch' },
  { cidr: 27, mask: '255.255.255.224', wildcard: '0.0.0.31', total: 32, usable: 30, desc: 'Department VLAN' },
  { cidr: 26, mask: '255.255.255.192', wildcard: '0.0.0.63', total: 64, usable: 62, desc: 'Medium Office VLAN' },
  { cidr: 25, mask: '255.255.255.128', wildcard: '0.0.0.127', total: 128, usable: 126, desc: 'Half Class C' },
  { cidr: 24, mask: '255.255.255.0', wildcard: '0.0.0.255', total: 256, usable: 254, desc: 'Standard Class C LAN' },
  { cidr: 23, mask: '255.255.254.0', wildcard: '0.0.1.255', total: 512, usable: 510, desc: 'Large LAN / 2x Class C' },
  { cidr: 22, mask: '255.255.252.0', wildcard: '0.0.3.255', total: 1024, usable: 1022, desc: 'Enterprise Floor' },
  { cidr: 21, mask: '255.255.248.0', wildcard: '0.0.7.255', total: 2048, usable: 2046, desc: 'Campus Building' },
  { cidr: 20, mask: '255.255.240.0', wildcard: '0.0.15.255', total: 4096, usable: 4094, desc: 'Campus Network' },
  { cidr: 16, mask: '255.255.0.0', wildcard: '0.0.255.255', total: 65536, usable: 65534, desc: 'Standard Class B' },
  { cidr: 8, mask: '255.0.0.0', wildcard: '0.255.255.255', total: 16777216, usable: 16777214, desc: 'Standard Class A' }
];

export const IpSubnetModal: React.FC<IpSubnetModalProps> = ({
  isOpen,
  onClose,
  onMinimize,
  isEn,
  isLightMode
}) => {
  const [tab, setTab] = useState<'ipv4' | 'vlsm' | 'cheat'>('ipv4');
  const [ipInput, setIpInput] = useState<string>('192.168.1.100');
  const [cidr, setCidr] = useState<number>(24);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // VLSM divider state
  const [divideInto, setDivideInto] = useState<number>(4);

  // Quick Presets
  const handlePreset = (presetIp: string, presetCidr: number) => {
    setIpInput(presetIp);
    setCidr(presetCidr);
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Perform calculations
  const calculations = useMemo(() => {
    const rawIp = ipInput.trim().split('/')[0];
    const ipInt = ipToInt(rawIp);
    const maskInt = cidrToMaskInt(cidr);
    const wildcardInt = (~maskInt) >>> 0;
    const networkInt = (ipInt & maskInt) >>> 0;
    const broadcastInt = (networkInt | wildcardInt) >>> 0;

    let usableFirstInt = networkInt + 1;
    let usableLastInt = broadcastInt - 1;
    let usableHosts = 0;
    let totalHosts = Math.pow(2, 32 - cidr);

    if (cidr === 31) {
      usableFirstInt = networkInt;
      usableLastInt = broadcastInt;
      usableHosts = 2;
    } else if (cidr === 32) {
      usableFirstInt = networkInt;
      usableLastInt = networkInt;
      usableHosts = 1;
    } else {
      usableHosts = Math.max(0, totalHosts - 2);
    }

    const networkIp = intToIp(networkInt);
    const broadcastIp = intToIp(broadcastInt);
    const maskIp = intToIp(maskInt);
    const wildcardIp = intToIp(wildcardInt);
    const firstUsableIp = intToIp(usableFirstInt);
    const lastUsableIp = intToIp(usableLastInt);
    const scope = getIpScope(rawIp);

    const ipBinary = intToBinary(ipInt);
    const maskBinary = intToBinary(maskInt);

    // Hex and Cisco IP command
    const hexIp = '0x' + ipInt.toString(16).toUpperCase().padStart(8, '0');
    const ciscoCmd = `ip address ${firstUsableIp} ${maskIp}`;
    const routerOsCmd = `/ip address add address=${firstUsableIp}/${cidr} interface=ether1`;

    return {
      rawIp,
      networkIp,
      broadcastIp,
      maskIp,
      wildcardIp,
      firstUsableIp,
      lastUsableIp,
      usableRange: cidr >= 31 ? `${firstUsableIp} - ${lastUsableIp}` : `${firstUsableIp} - ${lastUsableIp}`,
      totalHosts: totalHosts.toLocaleString(),
      usableHosts: usableHosts.toLocaleString(),
      scope,
      ipBinary,
      maskBinary,
      hexIp,
      ciscoCmd,
      routerOsCmd,
      networkInt,
      totalHostsNum: totalHosts
    };
  }, [ipInput, cidr]);

  // VLSM Subnets calculation
  const subnetsList = useMemo(() => {
    if (divideInto < 2) return [];
    const bitsNeeded = Math.ceil(Math.log2(divideInto));
    const newCidr = cidr + bitsNeeded;
    if (newCidr > 32) return [];

    const newSubnetSize = Math.pow(2, 32 - newCidr);
    const baseNetInt = calculations.networkInt;
    const items = [];

    const count = Math.min(divideInto, 64);
    for (let i = 0; i < count; i++) {
      const subNetInt = (baseNetInt + i * newSubnetSize) >>> 0;
      const subMaskInt = cidrToMaskInt(newCidr);
      const subWildcardInt = (~subMaskInt) >>> 0;
      const subBcastInt = (subNetInt | subWildcardInt) >>> 0;

      const subUsableFirst = newCidr >= 31 ? subNetInt : subNetInt + 1;
      const subUsableLast = newCidr >= 31 ? subBcastInt : subBcastInt - 1;
      const subUsableHosts = newCidr === 32 ? 1 : (newCidr === 31 ? 2 : Math.max(0, newSubnetSize - 2));

      items.push({
        index: i + 1,
        cidr: newCidr,
        network: intToIp(subNetInt),
        mask: intToIp(subMaskInt),
        range: `${intToIp(subUsableFirst)} - ${intToIp(subUsableLast)}`,
        broadcast: intToIp(subBcastInt),
        usableHosts: subUsableHosts
      });
    }

    return items;
  }, [divideInto, cidr, calculations.networkInt]);

  if (!isOpen) return null;

  return (
    <div
      id="ip-subnet-modal-overlay"
      className="fixed top-0 left-0 right-0 bottom-8 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in"
    >
      <div
        id="ip-subnet-modal-window"
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border transition-all duration-200 ${
          isLightMode
            ? 'bg-white text-slate-900 border-slate-200 shadow-slate-400/40'
            : 'bg-slate-950 text-slate-100 border-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.8)]'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
            isLightMode ? 'border-slate-100 bg-slate-50/80' : 'border-slate-800/80 bg-slate-900/60'
          } rounded-t-2xl`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-wide">
                  {isEn ? 'IP Subnet Calculator & VLSM Planner' : 'محاسبه‌گر ساب‌نتینگ و برنامه‌ریز VLSM'}
                </h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    calculations.scope.isPrivate
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                  }`}
                >
                  {calculations.scope.type}
                </span>
              </div>
              <p className={`text-[11px] ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn
                  ? 'Real-time IPv4 CIDR breakdown, wildcard mask, binary matrix & subnet division'
                  : 'محاسبه آنلاین CIDR، ماسک شبکه، وایلدکارت، جدول باینری و تفکیک زیرشبکه‌ها'}
              </p>
            </div>
          </div>

          {/* Window Control Buttons: Minimize & Close */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onMinimize}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLightMode
                  ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-cyan-300'
              }`}
              title={isEn ? 'Minimize to bottom bar (keep data)' : 'مینیمایز به نوار پایین (حفظ اطلاعات)'}
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLightMode
                  ? 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-red-400'
              }`}
              title={isEn ? 'Close' : 'بستن'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex items-center gap-1 px-5 py-2 border-b shrink-0 ${
            isLightMode ? 'border-slate-100 bg-slate-50/40' : 'border-slate-850 bg-slate-900/30'
          }`}
        >
          <button
            onClick={() => setTab('ipv4')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              tab === 'ipv4'
                ? isLightMode
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : isLightMode
                ? 'text-slate-600 hover:bg-slate-100'
                : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isEn ? 'Subnet Calculator' : 'محاسبه‌گر ساب‌نت'}</span>
          </button>

          <button
            onClick={() => setTab('vlsm')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              tab === 'vlsm'
                ? isLightMode
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : isLightMode
                ? 'text-slate-600 hover:bg-slate-100'
                : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>{isEn ? 'Subnet Divider (VLSM)' : 'تقسیم زیرشبکه (VLSM)'}</span>
          </button>

          <button
            onClick={() => setTab('cheat')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              tab === 'cheat'
                ? isLightMode
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : isLightMode
                ? 'text-slate-600 hover:bg-slate-100'
                : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <TableProperties className="w-3.5 h-3.5" />
            <span>{isEn ? 'CIDR Reference Sheet' : 'جدول مرجع CIDR'}</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {tab === 'ipv4' && (
            <>
              {/* Input Bar & Quick Presets */}
              <div
                className={`p-4 rounded-xl border ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  {/* IP Address */}
                  <div className="sm:col-span-6">
                    <label className={`block text-xs font-semibold mb-1.5 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {isEn ? 'IP Address' : 'آدرس آی‌پی'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={ipInput}
                        onChange={(e) => setIpInput(e.target.value)}
                        placeholder="192.168.1.1"
                        className={`w-full px-3.5 py-2 text-sm font-mono rounded-lg border focus:outline-none transition ${
                          isLightMode
                            ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                            : 'bg-slate-950 text-cyan-300 border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400'
                        }`}
                      />
                      <Globe className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* CIDR Prefix */}
                  <div className="sm:col-span-3">
                    <label className={`block text-xs font-semibold mb-1.5 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {isEn ? 'Prefix (CIDR)' : 'پیشوند (CIDR)'}
                    </label>
                    <select
                      value={cidr}
                      onChange={(e) => setCidr(parseInt(e.target.value, 10))}
                      className={`w-full px-3 py-2 text-sm font-mono rounded-lg border focus:outline-none transition ${
                        isLightMode
                          ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500'
                          : 'bg-slate-950 text-cyan-300 border-slate-700 focus:border-cyan-400'
                      }`}
                    >
                      {Array.from({ length: 32 }, (_, i) => 32 - i).map((c) => (
                        <option key={c} value={c}>
                          /{c} &nbsp;({intToIp(cidrToMaskInt(c))})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* CIDR Slider */}
                  <div className="sm:col-span-3 flex flex-col justify-end">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>/1</span>
                      <span className="font-mono font-bold text-cyan-400">/{cidr}</span>
                      <span>/32</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="32"
                      value={cidr}
                      onChange={(e) => setCidr(parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="mt-3 pt-3 border-t border-dashed border-slate-700/40 flex flex-wrap items-center gap-1.5">
                  <span className={`text-[11px] ${isLightMode ? 'text-slate-500' : 'text-slate-400'} mr-1`}>
                    {isEn ? 'Common Presets:' : 'پیش‌فرض‌های متداول:'}
                  </span>
                  {[
                    { label: '/24 Standard LAN', ip: '192.168.1.1', c: 24 },
                    { label: '/28 Small Office (14)', ip: '192.168.10.1', c: 28 },
                    { label: '/29 Small DMZ (6)', ip: '172.16.5.1', c: 29 },
                    { label: '/30 P2P Link (2)', ip: '10.255.255.1', c: 30 },
                    { label: '/16 Large Campus', ip: '10.0.0.1', c: 16 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handlePreset(preset.ip, preset.c)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer border ${
                        cidr === preset.c
                          ? isLightMode
                            ? 'bg-indigo-100 text-indigo-700 border-indigo-300 font-bold'
                            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                          : isLightMode
                          ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subnet Results Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Network IP */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                    isLightMode ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>{isEn ? 'Network Address' : 'آدرس شبکه'}</span>
                    <button
                      onClick={() => copyToClipboard(calculations.networkIp, 'net')}
                      className="hover:text-cyan-400 transition"
                      title={isEn ? 'Copy' : 'کپی'}
                    >
                      {copiedField === 'net' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-base font-bold font-mono text-cyan-400 truncate">
                    {calculations.networkIp}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">
                    /{cidr}
                  </div>
                </div>

                {/* Broadcast IP */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                    isLightMode ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>{isEn ? 'Broadcast Address' : 'آدرس برودکست'}</span>
                    <button
                      onClick={() => copyToClipboard(calculations.broadcastIp, 'bcast')}
                      className="hover:text-cyan-400 transition"
                      title={isEn ? 'Copy' : 'کپی'}
                    >
                      {copiedField === 'bcast' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-base font-bold font-mono text-indigo-400 truncate">
                    {calculations.broadcastIp}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">
                    {isEn ? 'Last IP of Subnet' : 'آخرین آی‌پی زیرشبکه'}
                  </div>
                </div>

                {/* Subnet Mask */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                    isLightMode ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>{isEn ? 'Subnet Mask' : 'ماسک زیرشبکه'}</span>
                    <button
                      onClick={() => copyToClipboard(calculations.maskIp, 'mask')}
                      className="hover:text-cyan-400 transition"
                      title={isEn ? 'Copy' : 'کپی'}
                    >
                      {copiedField === 'mask' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-400 truncate">
                    {calculations.maskIp}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">
                    255.255...
                  </div>
                </div>

                {/* Wildcard Mask */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                    isLightMode ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>{isEn ? 'Wildcard Mask (Cisco/OSPF)' : 'ماسک وایلدکارت (سیسکو)'}</span>
                    <button
                      onClick={() => copyToClipboard(calculations.wildcardIp, 'wildcard')}
                      className="hover:text-cyan-400 transition"
                      title={isEn ? 'Copy' : 'کپی'}
                    >
                      {copiedField === 'wildcard' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-base font-bold font-mono text-amber-400 truncate">
                    {calculations.wildcardIp}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">
                    ACL / OSPF mask
                  </div>
                </div>
              </div>

              {/* Host Ranges & Statistics */}
              <div
                className={`p-4 rounded-xl border ${
                  isLightMode ? 'bg-slate-50/60 border-slate-200' : 'bg-slate-900/30 border-slate-800'
                }`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">
                      {isEn ? 'Usable Host Range' : 'محدوده آی‌پی‌های قابل استفاده میزبان'}
                    </span>
                    <div className="text-sm font-bold font-mono text-cyan-300 flex items-center gap-2">
                      <span>{calculations.usableRange}</span>
                      <button
                        onClick={() => copyToClipboard(calculations.usableRange, 'range')}
                        className="hover:text-cyan-400 transition"
                      >
                        {copiedField === 'range' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block mb-1">
                      {isEn ? 'Usable Hosts / Total' : 'تعداد آی‌پی‌های قابل استفاده / کل'}
                    </span>
                    <div className="text-sm font-bold font-mono text-emerald-400">
                      {calculations.usableHosts} <span className="text-slate-500 text-xs font-normal">/ {calculations.totalHosts}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block mb-1">
                      {isEn ? 'IP Class & Category' : 'کلاس آی‌پی و دسته'}
                    </span>
                    <div className="text-sm font-bold font-mono text-purple-400">
                      Class {calculations.scope.classType}
                    </div>
                  </div>
                </div>
              </div>

              {/* Binary Matrix Visualization */}
              <div
                className={`p-4 rounded-xl border ${
                  isLightMode ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold">
                  <Binary className="w-4 h-4 text-cyan-400" />
                  <span>{isEn ? 'Binary Bit Matrix (Network vs Host Bits)' : 'ماتریس باینری بیت‌ها (بیت‌های شبکه در برابر میزبان)'}</span>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  {/* IP Address Binary */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-24 text-slate-400 text-[11px]">{isEn ? 'IP Address:' : 'آدرس آی‌پی:'}</span>
                    <div className="flex items-center gap-1.5">
                      {calculations.ipBinary.map((octet, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 rounded border ${
                            isLightMode
                              ? 'bg-white text-slate-800 border-slate-300'
                              : 'bg-slate-900 text-cyan-300 border-slate-700'
                          }`}
                        >
                          {octet}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Subnet Mask Binary */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-24 text-slate-400 text-[11px]">{isEn ? 'Subnet Mask:' : 'ماسک زیرشبکه:'}</span>
                    <div className="flex items-center gap-1.5">
                      {calculations.maskBinary.map((octet, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 rounded border font-bold ${
                            isLightMode
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60'
                          }`}
                        >
                          {octet}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-700/30 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {isEn ? 'Network Bits:' : 'بیت‌های شبکه:'} <b className="text-cyan-400 font-mono">{cidr}</b>
                  </span>
                  <span>
                    {isEn ? 'Host Bits:' : 'بیت‌های میزبان:'} <b className="text-amber-400 font-mono">{32 - cidr}</b>
                  </span>
                  <span>
                    {isEn ? 'Hex Address:' : 'آدرس هگز:'} <b className="text-slate-300 font-mono">{calculations.hexIp}</b>
                  </span>
                </div>
              </div>

              {/* Ready CLI Syntax for Cisco & MikroTik */}
              <div
                className={`p-4 rounded-xl border ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                }`}
              >
                <div className="text-xs font-semibold mb-2 flex items-center justify-between">
                  <span>{isEn ? 'Ready Device Interface CLI Configuration' : 'دستورات آماده کانفیگ اینترفیس سیسکو و میکروتیک'}</span>
                </div>

                <div className="space-y-2">
                  <div
                    className={`flex items-center justify-between p-2 rounded-lg font-mono text-xs border ${
                      isLightMode ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-950 text-slate-300 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-indigo-400 font-bold">Cisco IOS:</span>
                      <span className="text-cyan-300 truncate">{calculations.ciscoCmd}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(calculations.ciscoCmd, 'cisco')}
                      className="p-1 hover:text-cyan-400 transition"
                      title={isEn ? 'Copy' : 'کپی'}
                    >
                      {copiedField === 'cisco' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div
                    className={`flex items-center justify-between p-2 rounded-lg font-mono text-xs border ${
                      isLightMode ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-950 text-slate-300 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-rose-400 font-bold">MikroTik RouterOS:</span>
                      <span className="text-cyan-300 truncate">{calculations.routerOsCmd}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(calculations.routerOsCmd, 'mt')}
                      className="p-1 hover:text-cyan-400 transition"
                      title={isEn ? 'Copy' : 'کپی'}
                    >
                      {copiedField === 'mt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'vlsm' && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div>
                  <h4 className="text-xs font-bold text-cyan-400">
                    {isEn ? `Divide ${calculations.networkIp}/${cidr} into subnets:` : `تقسیم ${calculations.networkIp}/${cidr} به زیرشبکه‌ها:`}
                  </h4>
                  <p className={`text-[11px] ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {isEn ? 'Select partition count to calculate subnets' : 'تعداد زیرشبکه‌های مورد نیاز را انتخاب کنید'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {[2, 4, 8, 16, 32].map((num) => (
                    <button
                      key={num}
                      onClick={() => setDivideInto(num)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer border ${
                        divideInto === num
                          ? isLightMode
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                          : isLightMode
                          ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {num} {isEn ? 'Subnets' : 'زیرشبکه'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subnets List Table */}
              <div
                className={`rounded-xl border overflow-hidden ${
                  isLightMode ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-left rtl:text-right">
                    <thead
                      className={`text-[11px] uppercase tracking-wider border-b ${
                        isLightMode ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      <tr>
                        <th className="px-4 py-2.5">#</th>
                        <th className="px-4 py-2.5">{isEn ? 'Subnet (CIDR)' : 'زیرشبکه (CIDR)'}</th>
                        <th className="px-4 py-2.5">{isEn ? 'Usable Range' : 'محدوده معتبر'}</th>
                        <th className="px-4 py-2.5">{isEn ? 'Broadcast' : 'برودکست'}</th>
                        <th className="px-4 py-2.5">{isEn ? 'Hosts' : 'میزبان'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {subnetsList.map((sub) => (
                        <tr
                          key={sub.index}
                          className={`transition-colors ${
                            isLightMode ? 'hover:bg-indigo-50/40' : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <td className="px-4 py-2.5 font-bold text-slate-400">{sub.index}</td>
                          <td className="px-4 py-2.5 font-bold text-cyan-400">
                            {sub.network}/{sub.cidr}
                          </td>
                          <td className="px-4 py-2.5 text-slate-300">{sub.range}</td>
                          <td className="px-4 py-2.5 text-indigo-400">{sub.broadcast}</td>
                          <td className="px-4 py-2.5 text-emerald-400 font-bold">{sub.usableHosts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'cheat' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>{isEn ? 'Click any row to instantly load it into the Subnet Calculator' : 'برای بارگذاری سریع در محاسبه‌گر روی هر ردیف کلیک کنید'}</span>
              </div>

              <div
                className={`rounded-xl border overflow-hidden ${
                  isLightMode ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-left rtl:text-right">
                    <thead
                      className={`text-[11px] uppercase tracking-wider border-b ${
                        isLightMode ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      <tr>
                        <th className="px-4 py-2.5">CIDR</th>
                        <th className="px-4 py-2.5">{isEn ? 'Subnet Mask' : 'ماسک زیرشبکه'}</th>
                        <th className="px-4 py-2.5">{isEn ? 'Wildcard Mask' : 'وایلدکارت'}</th>
                        <th className="px-4 py-2.5">{isEn ? 'Usable Hosts' : 'میزبان‌های معتبر'}</th>
                        <th className="px-4 py-2.5">{isEn ? 'Typical Use Case' : 'کاربرد متداول'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {CIDR_TABLE.map((item) => (
                        <tr
                          key={item.cidr}
                          onClick={() => {
                            setCidr(item.cidr);
                            setTab('ipv4');
                          }}
                          className={`cursor-pointer transition-colors ${
                            cidr === item.cidr
                              ? isLightMode
                                ? 'bg-indigo-50 font-bold text-indigo-700'
                                : 'bg-cyan-500/20 font-bold text-cyan-300'
                              : isLightMode
                              ? 'hover:bg-slate-50'
                              : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <td className="px-4 py-2 font-bold text-cyan-400">/{item.cidr}</td>
                          <td className="px-4 py-2 text-slate-300">{item.mask}</td>
                          <td className="px-4 py-2 text-amber-400">{item.wildcard}</td>
                          <td className="px-4 py-2 text-emerald-400 font-bold">{item.usable.toLocaleString()}</td>
                          <td className="px-4 py-2 text-slate-400 text-[11px]">{item.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t shrink-0 ${
            isLightMode ? 'border-slate-100 bg-slate-50/80' : 'border-slate-800/80 bg-slate-900/60'
          } rounded-b-2xl`}
        >
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>{calculations.networkIp}/{cidr}</span>
            <span>•</span>
            <span className="text-emerald-400">{calculations.usableHosts} {isEn ? 'Usable IPs' : 'آی‌پی معتبر'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const summary = `Subnet Summary:
Network: ${calculations.networkIp}/${cidr}
Subnet Mask: ${calculations.maskIp}
Wildcard: ${calculations.wildcardIp}
Broadcast: ${calculations.broadcastIp}
Usable Host Range: ${calculations.usableRange}
Usable Hosts: ${calculations.usableHosts} (Total: ${calculations.totalHosts})
Scope: ${calculations.scope.type}
Cisco Syntax: ${calculations.ciscoCmd}
MikroTik Syntax: ${calculations.routerOsCmd}`;
                copyToClipboard(summary, 'all');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                copiedField === 'all'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : isLightMode
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
            >
              {copiedField === 'all' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedField === 'all' ? (isEn ? 'Copied!' : 'کپی شد!') : (isEn ? 'Copy Full Summary' : 'کپی خلاصه محاسبات')}</span>
            </button>

            <button
              onClick={onMinimize}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                isLightMode
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20'
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
              <span>{isEn ? 'Minimize' : 'مینیمایز به پایین'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
