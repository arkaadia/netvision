import React, { useState, useEffect } from 'react';
import {
  Layers,
  Terminal,
  X,
  Minus,
  CheckCircle2,
  Loader2,
  Hash,
  Search,
  Check,
  Tag,
  Cpu,
} from 'lucide-react';
import { Device, SwitchPort, VlanInfo } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { fetchVlans, fetchDeviceVlans } from '../services/api';

export interface AssignVlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  onAssign: (vlanId: number) => Promise<void> | void;
  port: SwitchPort | null;
  device: Device;
  devicePorts?: SwitchPort[];
  availableVlans?: VlanInfo[];
  isLoading?: boolean;
}

export const AssignVlanModal: React.FC<AssignVlanModalProps> = ({
  isOpen,
  onClose,
  onMinimize,
  onAssign,
  port,
  device,
  devicePorts,
  availableVlans = [],
  isLoading = false,
}) => {
  const { isEn } = useLanguage();
  const [targetVlan, setTargetVlan] = useState<number>(port?.vlan || 1);
  const [vlansList, setVlansList] = useState<VlanInfo[]>(availableVlans);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingVlans, setLoadingVlans] = useState(false);

  useEffect(() => {
    if (port) {
      setTargetVlan(port.vlan || 1);
    }
  }, [port]);

  // Helper to extract device-specific VLANs from port configurations
  const extractFromPorts = (ports: SwitchPort[], globalCatalog: VlanInfo[] = []): VlanInfo[] => {
    const vlanMap = new Map<number, { id: number; name?: string; count: number }>();

    ports.forEach((p) => {
      // Access VLAN
      if (p.vlan !== undefined && p.vlan !== null) {
        const vid = Number(p.vlan);
        if (!isNaN(vid) && vid > 0) {
          const current = vlanMap.get(vid) || { id: vid, count: 0 };
          current.count += 1;
          vlanMap.set(vid, current);
        }
      }
      // Trunk Allowed VLANs
      if (p.allowed_vlans) {
        String(p.allowed_vlans)
          .split(',')
          .forEach((part) => {
            const vid = Number(part.trim());
            if (!isNaN(vid) && vid > 0) {
              if (!vlanMap.has(vid)) {
                vlanMap.set(vid, { id: vid, count: 0 });
              }
            }
          });
      }
    });

    if (!vlanMap.has(1)) {
      vlanMap.set(1, { id: 1, count: 0 });
    }

    return Array.from(vlanMap.keys())
      .sort((a, b) => a - b)
      .map((vid) => {
        const matchCatalog = globalCatalog.find((gv) => gv.id === vid);
        const name = matchCatalog?.name || (vid === 1 ? 'Default / Management' : `VLAN ${vid}`);
        return {
          id: vid,
          name,
          status: 'active',
          ports_count: vlanMap.get(vid)?.count || 0,
        };
      });
  };

  const loadDeviceVlans = async () => {
    if (!device?.id) return;
    try {
      setLoadingVlans(true);

      // 1. First try the device-specific VLAN endpoint (parses real device or device ports)
      let loaded = false;
      try {
        const res = await fetchDeviceVlans(device.id);
        if (res && res.vlans && res.vlans.length > 0) {
          setVlansList(res.vlans);
          loaded = true;
        }
      } catch (err) {
        // Continue to fallback
      }

      // 2. Fallback: extract from devicePorts if available
      if (!loaded) {
        let globalCatalog: VlanInfo[] = availableVlans;
        if (globalCatalog.length === 0) {
          try {
            const gRes = await fetchVlans();
            if (gRes?.vlans) globalCatalog = gRes.vlans;
          } catch {
            // ignore
          }
        }

        if (devicePorts && devicePorts.length > 0) {
          const fromPorts = extractFromPorts(devicePorts, globalCatalog);
          setVlansList(fromPorts);
        } else if (globalCatalog.length > 0) {
          setVlansList(globalCatalog);
        } else {
          setVlansList([
            { id: 1, name: 'Default / Management', status: 'active', ports_count: 1 },
            { id: 10, name: 'Servers & DMZ', status: 'active', ports_count: 0 },
            { id: 20, name: 'Staff & Office', status: 'active', ports_count: 0 },
            { id: 30, name: 'Dev & Engineering', status: 'active', ports_count: 0 },
          ]);
        }
      }
    } catch {
      // Safe fallback
    } finally {
      setLoadingVlans(false);
    }
  };

  useEffect(() => {
    if (isOpen && device?.id) {
      loadDeviceVlans();
    }
  }, [isOpen, device?.id]);

  if (!isOpen || !port) return null;

  const isRouter = device.type === 'router';
  const isMikroTik =
    device.platform?.toLowerCase().includes('mikrotik') ||
    device.model?.toLowerCase().includes('routerboard') ||
    device.model?.toLowerCase().includes('mikrotik');
  const portId = port.port_id;
  const devName = device.name || 'Device';

  // Generate Device-Aware CLI Command Preview
  const generateCommand = () => {
    if (isMikroTik) {
      return [
        `[admin@${devName}] > /interface bridge port set [find interface="${portId}"] pvid=${targetVlan}`,
        `[admin@${devName}] > /interface vlan add name="vlan${targetVlan}-${portId}" vlan-id=${targetVlan} interface="${portId}" disabled=no`,
        `[admin@${devName}] > /interface print detail where name="${portId}"`,
        `# [OK] RouterOS PVID ${targetVlan} configured on ${portId}.`
      ].join('\n');
    }

    if (isRouter) {
      return [
        `${devName}# configure terminal`,
        `${devName}(config)# interface ${portId}.${targetVlan}`,
        `${devName}(config-subif)# encapsulation dot1Q ${targetVlan}`,
        `${devName}(config-subif)# exit`,
        `${devName}(config)# exit`,
        `%SYS-5-CONFIG_I: Assigned 802.1Q VLAN ${targetVlan} on sub-interface ${portId}.${targetVlan}`
      ].join('\n');
    }

    return [
      `${devName}# configure terminal`,
      `${devName}(config)# interface ${portId}`,
      `${devName}(config-if)# switchport mode access`,
      `${devName}(config-if)# switchport access vlan ${targetVlan}`,
      `${devName}(config-if)# exit`,
      `${devName}(config)# exit`,
      `%SYS-5-CONFIG_I: Interface ${portId} assigned to Access VLAN ${targetVlan} on ${devName}`
    ].join('\n');
  };

  const filteredVlans = vlansList.filter(
    (v) =>
      v.id.toString().includes(searchTerm) ||
      v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetVlan >= 1 && targetVlan <= 4094) {
      onAssign(targetVlan);
    }
  };

  return (
    <div
      id="assign-vlan-modal-backdrop"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        id="assign-vlan-modal"
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[90vh] text-slate-100"
        dir={isEn ? 'ltr' : 'rtl'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-xs shadow-cyan-950/40">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                <span>{isEn ? 'Assign Access VLAN' : 'تخصیص ویلن دسترسی (Assign Access VLAN)'}</span>
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="text-slate-300 font-medium">{device.name}</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded text-[11px]">
                  {port.port_id}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">
                  {isEn ? 'Current: ' : 'ویلن کنونی: '}
                  <span className="font-mono font-bold text-amber-400">VLAN {port.vlan || 1}</span>
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onMinimize && (
              <button
                id="assign-vlan-modal-minimize-btn"
                onClick={onMinimize}
                type="button"
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition cursor-pointer"
                title={isEn ? 'Minimize' : 'کوچک‌سازی (مینیمایز)'}
                aria-label="Minimize"
              >
                <Minus className="w-4 h-4" />
              </button>
            )}
            <button
              id="assign-vlan-modal-close-btn"
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title={isEn ? 'Close' : 'بستن'}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Section 1: Defined VLANs on device */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isEn ? 'Device Configured VLANs (Click to select):' : 'ویلن‌های تعریف‌شده روی این دستگاه (برای انتخاب کلیک کنید):'}</span>
              </span>
              <div className="relative w-40">
                <Search className="w-3.5 h-3.5 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-2 text-slate-400" />
                <input
                  id="assign-vlan-search-input"
                  type="text"
                  placeholder={isEn ? 'Filter VLANs...' : 'جستجوی ویلن...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 rtl:pl-2 rtl:pr-8 py-1 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            {loadingVlans ? (
              <div className="p-5 flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-950/50 border border-slate-800 rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>{isEn ? 'Loading device VLAN table...' : 'در حال دریافت جدول ویلن‌ها...'}</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 rounded-xl border border-slate-800 bg-slate-950/60 custom-scrollbar">
                {filteredVlans.length === 0 ? (
                  <div className="col-span-full py-4 px-2 text-center text-xs text-slate-400">
                    {isEn ? 'No configured VLANs found on this device.' : 'هیچ ویلنی منطبق بر جستجو روی این دستگاه یافت نشد.'}
                  </div>
                ) : (
                  filteredVlans.map((v) => {
                    const isSelected = targetVlan === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        id={`vlan-pill-${v.id}`}
                        onClick={() => setTargetVlan(v.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-mono transition text-left rtl:text-right cursor-pointer border ${
                          isSelected
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-md shadow-cyan-950/60 ring-1 ring-cyan-400/50'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-850 hover:text-white'
                        }`}
                      >
                        <div className="truncate min-w-0 pr-1 rtl:pr-0 rtl:pl-1">
                          <div className="font-bold flex items-center gap-1.5">
                            <span>VLAN {v.id}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                          </div>
                          <div className={`text-[10px] truncate ${isSelected ? 'text-cyan-100' : 'text-slate-400'}`}>
                            {v.name}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-bold shrink-0 ${
                            isSelected
                              ? 'bg-cyan-700/70 text-white border border-cyan-400/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                          }`}
                        >
                          #{v.id}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Section 2: Custom VLAN Number Input */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/50 space-y-2">
            <label htmlFor="assign-vlan-number-input" className="block text-xs font-semibold text-slate-200">
              {isEn ? 'Target Access VLAN ID (Manual input or selection):' : 'شماره ویلن مورد نظر (وارد کردن دستی یا انتخاب از گزینه‌ها):'}
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Hash className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-2.5 text-cyan-400" />
                <input
                  id="assign-vlan-number-input"
                  type="number"
                  min="1"
                  max="4094"
                  value={targetVlan}
                  onChange={(e) => setTargetVlan(Math.max(1, Math.min(4094, parseInt(e.target.value) || 1)))}
                  className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 rounded-xl text-sm font-mono font-bold bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>
              <div className="flex gap-1.5">
                {[1, 10, 20, 30, 99].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    id={`quick-vlan-btn-${quick}`}
                    onClick={() => setTargetVlan(quick)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer border ${
                      targetVlan === quick
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-xs shadow-cyan-900/40'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300'
                    }`}
                  >
                    v{quick}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              {isEn
                ? 'Standard IEEE 802.1Q valid VLAN range is 1 to 4094.'
                : 'بازه مجاز شماره ویلن در استاندارد IEEE 802.1Q بین ۱ تا ۴۰۹۴ می‌باشد.'}
            </p>
          </div>

          {/* Section 3: CLI Command Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                {isMikroTik
                  ? (isEn ? 'MikroTik RouterOS Command Preview:' : 'پیش‌نمایش دستورات میکروتیک (RouterOS CLI):')
                  : (isEn ? 'Cisco IOS Command Preview:' : 'پیش‌نمایش دستورات سیسکو (Cisco IOS CLI):')}
              </span>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner font-mono text-xs">
              <div className="px-3 py-1.5 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  <span>
                    {device.name} • {isMikroTik ? 'RouterOS Bridge PVID' : isRouter ? 'Router Sub-interface dot1Q' : 'Catalyst Access Switchport'}
                  </span>
                </span>
                <span className="text-[11px] text-emerald-400 font-mono font-bold">VLAN {targetVlan}</span>
              </div>
              <pre className="p-3 text-emerald-400 text-xs leading-relaxed overflow-x-auto whitespace-pre bg-slate-950/80">
                {generateCommand()}
              </pre>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              id="assign-vlan-cancel-btn"
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              {isEn ? 'Cancel (No)' : 'انصراف (خیر)'}
            </button>
            <button
              id="assign-vlan-submit-btn"
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-950/50 border border-cyan-400/30 transition cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isEn ? 'Executing on Hardware...' : 'در حال اعمال روی سخت‌افزار...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEn ? 'Yes, Assign & Execute' : 'بله، تخصیص بده و اجرا کن'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

