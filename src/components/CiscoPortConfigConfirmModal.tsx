import React, { useState } from 'react';
import {
  Terminal,
  Server,
  X,
  Minus,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  Layers,
  PowerOff,
  Power,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Save,
  Sliders,
  CheckSquare
} from 'lucide-react';
import { Device, SwitchPort } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { FieldInfoTooltip } from './common/FieldInfoTooltip';

export interface PortConfigUpdates {
  admin_status?: 'enabled' | 'disabled' | 'no_change';
  status?: 'up' | 'down';
  mode?: 'access' | 'trunk' | 'no_change';
  vlan?: number | string;
  allowed_vlans?: string;
  port_security_enabled?: boolean | 'no_change' | 'enabled' | 'disabled';
  port_security_mode?: 'sticky' | 'dynamic' | 'configured';
  port_security_max_mac?: number;
  port_security_configured_mac?: string;
  port_security_violation?: 'shutdown' | 'restrict' | 'protect';
  description?: string;
  connected_device?: string;
}

export interface CiscoPortConfigConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  onConfirm: () => Promise<void> | void;
  device: Device;
  targetPortIds: string[];
  targetPorts?: SwitchPort[];
  updates: PortConfigUpdates;
  isLoading?: boolean;
  isLightMode?: boolean;
}

export const generateCiscoPortConfigCli = (
  device: Device,
  portIds: string[],
  updates: PortConfigUpdates
): string => {
  const devName = device.name || 'Switch';
  const isRouter = device.type === 'router';
  const lines: string[] = [
    `${devName}# configure terminal`,
    `Enter configuration commands, one per line. End with CNTL/Z.`
  ];

  if (portIds.length === 1) {
    const p = portIds[0];
    lines.push(`${devName}(config)# interface ${p}`);
    const prompt = `${devName}(config-if)#`;

    if (updates.description) {
      lines.push(`${prompt} description ${updates.description}`);
    }

    if (updates.mode === 'trunk') {
      if (!isRouter) {
        lines.push(`${prompt} switchport trunk encapsulation dot1q`);
        lines.push(`${prompt} switchport mode trunk`);
        if (updates.allowed_vlans) {
          lines.push(`${prompt} switchport trunk allowed vlan ${updates.allowed_vlans}`);
        }
      }
    } else if (updates.mode === 'access') {
      if (!isRouter) {
        lines.push(`${prompt} switchport mode access`);
        if (updates.vlan) {
          lines.push(`${prompt} switchport access vlan ${updates.vlan}`);
        }
      }
    }

    if (updates.port_security_enabled === true || updates.port_security_enabled === 'enabled') {
      if (!isRouter) {
        if (updates.mode !== 'access') {
          lines.push(`${prompt} switchport mode access`);
        }
        lines.push(`${prompt} switchport port-security`);
        if (updates.port_security_max_mac) {
          lines.push(`${prompt} switchport port-security maximum ${updates.port_security_max_mac}`);
        }
        if (updates.port_security_mode === 'sticky') {
          lines.push(`${prompt} switchport port-security mac-address sticky`);
        } else if (updates.port_security_mode === 'configured' && updates.port_security_configured_mac) {
          lines.push(`${prompt} switchport port-security mac-address ${updates.port_security_configured_mac}`);
        }
        if (updates.port_security_violation) {
          lines.push(`${prompt} switchport port-security violation ${updates.port_security_violation}`);
        }
      }
    } else if (updates.port_security_enabled === false || updates.port_security_enabled === 'disabled') {
      if (!isRouter) {
        lines.push(`${prompt} no switchport port-security`);
      }
    }

    if (updates.admin_status === 'disabled') {
      lines.push(`${prompt} shutdown`);
    } else if (updates.admin_status === 'enabled') {
      lines.push(`${prompt} no shutdown`);
    }

    lines.push(`${prompt} exit`);
  } else {
    // Multi-port / Batch configuration
    lines.push(`${devName}(config)# interface range ${portIds.join(', ')}`);
    const prompt = `${devName}(config-if-range)#`;

    if (updates.mode === 'trunk') {
      if (!isRouter) {
        lines.push(`${prompt} switchport trunk encapsulation dot1q`);
        lines.push(`${prompt} switchport mode trunk`);
        if (updates.allowed_vlans) {
          lines.push(`${prompt} switchport trunk allowed vlan ${updates.allowed_vlans}`);
        }
      }
    } else if (updates.mode === 'access') {
      if (!isRouter) {
        lines.push(`${prompt} switchport mode access`);
        if (updates.vlan) {
          lines.push(`${prompt} switchport access vlan ${updates.vlan}`);
        }
      }
    }

    if (updates.port_security_enabled === true || updates.port_security_enabled === 'enabled') {
      if (!isRouter) {
        lines.push(`${prompt} switchport mode access`);
        lines.push(`${prompt} switchport port-security`);
        if (updates.port_security_max_mac) {
          lines.push(`${prompt} switchport port-security maximum ${updates.port_security_max_mac}`);
        }
        if (updates.port_security_mode === 'sticky') {
          lines.push(`${prompt} switchport port-security mac-address sticky`);
        }
      }
    } else if (updates.port_security_enabled === false || updates.port_security_enabled === 'disabled') {
      if (!isRouter) {
        lines.push(`${prompt} no switchport port-security`);
      }
    }

    if (updates.admin_status === 'disabled') {
      lines.push(`${prompt} shutdown`);
    } else if (updates.admin_status === 'enabled') {
      lines.push(`${prompt} no shutdown`);
    }

    lines.push(`${prompt} exit`);
  }

  lines.push(`${devName}(config)# exit`);
  lines.push(`%SYS-5-CONFIG_I: Configured from console by admin`);
  if (portIds.length === 1) {
    if (updates.admin_status === 'disabled') {
      lines.push(`%LINK-5-CHANGED: Interface ${portIds[0]}, changed state to administratively down`);
      lines.push(`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${portIds[0]}, changed state to down`);
    } else if (updates.admin_status === 'enabled') {
      lines.push(`%LINK-3-UPDOWN: Interface ${portIds[0]}, changed state to up`);
      lines.push(`%LINEPROTO-3-UPDOWN: Line protocol on Interface ${portIds[0]}, changed state to up`);
    }
  } else {
    lines.push(`%SYS-5-CONFIG_I: Batch port configuration successfully applied to ${portIds.length} interfaces`);
  }

  return lines.join('\n');
};

export const CiscoPortConfigConfirmModal: React.FC<CiscoPortConfigConfirmModalProps> = ({
  isOpen,
  onClose,
  onMinimize,
  onConfirm,
  device,
  targetPortIds,
  targetPorts = [],
  updates,
  isLoading = false,
  isLightMode,
}) => {
  const { isEn } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showAllPorts, setShowAllPorts] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Auto-detect theme if isLightMode prop is not explicitly passed
  const isLight = isLightMode !== undefined
    ? isLightMode
    : (typeof document !== 'undefined'
        ? (document.documentElement.classList.contains('light') || !!document.querySelector('.theme-light'))
        : false);

  if (!isOpen || targetPortIds.length === 0) return null;

  const isBatch = targetPortIds.length > 1;
  const isRouter = device.type === 'router';
  const cliText = generateCiscoPortConfigCli(device, targetPortIds, updates);

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMinimize = () => {
    if (onMinimize) {
      onMinimize();
    } else {
      onClose();
    }
  };

  // Summarize changes list
  const changesSummary: { label: string; value: string; icon: React.ReactNode; isDanger?: boolean; isHighlight?: boolean }[] = [];

  if (updates.admin_status && updates.admin_status !== 'no_change') {
    const isDown = updates.admin_status === 'disabled';
    changesSummary.push({
      label: isEn ? 'Port Administrative Status' : 'وضعیت ارتباطی پورت (Admin Status)',
      value: isDown
        ? (isEn ? 'Shutdown (Administratively DOWN)' : 'خاموش کردن پورت (Shutdown - Down)')
        : (isEn ? 'No Shutdown (Administratively UP)' : 'روشن کردن پورت (No Shutdown - Up)'),
      icon: isDown ? <PowerOff className="w-4 h-4 text-rose-500" /> : <Power className="w-4 h-4 text-emerald-500" />,
      isDanger: isDown,
      isHighlight: !isDown
    });
  }

  if (updates.mode && updates.mode !== 'no_change') {
    changesSummary.push({
      label: isEn ? 'Switchport Mode' : 'حالت کاری پورت (Switchport Mode)',
      value: updates.mode === 'trunk' ? (isEn ? '802.1Q Trunk Mode' : 'مود ترانک (802.1Q Trunk)') : (isEn ? 'Access Mode' : 'مود دسترسی (Access)'),
      icon: <Layers className="w-4 h-4 text-indigo-500" />,
      isHighlight: true
    });
  }

  if (updates.vlan !== undefined && updates.vlan !== '') {
    changesSummary.push({
      label: isEn ? 'VLAN Assignment' : 'تخصیص شماره ویلن (VLAN)',
      value: `VLAN ${updates.vlan}`,
      icon: <Layers className="w-4 h-4 text-purple-500" />,
      isHighlight: true
    });
  }

  if (updates.allowed_vlans) {
    changesSummary.push({
      label: isEn ? 'Trunk Allowed VLANs' : 'ویلن‌های مجاز ترانک (Allowed VLANs)',
      value: updates.allowed_vlans,
      icon: <Layers className="w-4 h-4 text-cyan-500" />
    });
  }

  if (updates.port_security_enabled !== undefined && updates.port_security_enabled !== 'no_change') {
    const isSecEnabled = updates.port_security_enabled === true || updates.port_security_enabled === 'enabled';
    changesSummary.push({
      label: isEn ? 'Port Security (Layer 2)' : 'امنیت پورت (Port Security L2)',
      value: isSecEnabled
        ? (isEn ? `Enabled (Mode: ${updates.port_security_mode || 'sticky'}, Max MAC: ${updates.port_security_max_mac || 1})` : `فعال (حالت: ${updates.port_security_mode || 'sticky'}، سقف مک: ${updates.port_security_max_mac || 1})`)
        : (isEn ? 'Disabled' : 'غیرفعال (حذف امنیت پورت)'),
      icon: isSecEnabled ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <ShieldAlert className="w-4 h-4 text-amber-500" />,
      isHighlight: isSecEnabled
    });
  }

  if (updates.description) {
    changesSummary.push({
      label: isEn ? 'Port Description' : 'توضیحات اینترفیس (Description)',
      value: updates.description,
      icon: <Sliders className="w-4 h-4 text-slate-500" />
    });
  }

  const displayedPortIds = showAllPorts ? targetPortIds : targetPortIds.slice(0, 16);
  const remainingCount = targetPortIds.length - displayedPortIds.length;

  return (
    <div
      className={`fixed top-0 left-0 right-0 bottom-8 z-[10000] flex items-center justify-center modal-backdrop-blur transition-all duration-200 overflow-y-auto ${
        isMaximized ? 'p-0' : 'p-3 sm:p-4'
      }`}
      data-modal-backdrop="true"
      onClick={onClose}
    >
      <div
        className={`relative overflow-hidden flex flex-col transition-all duration-200 ${
          isMaximized
            ? 'w-full h-full max-w-none max-h-full rounded-none border-none my-0'
            : 'w-full max-w-2xl rounded-2xl border shadow-2xl max-h-[90vh] my-auto'
        } ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-slate-400/30'
            : 'bg-slate-950 border-cyan-500/40 text-slate-100 shadow-cyan-950/50'
        }`}
        dir={isEn ? 'ltr' : 'rtl'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isLight
                  ? 'bg-cyan-50 border-cyan-300 text-cyan-700'
                  : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-400'
              }`}
            >
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-bold text-base flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <span>
                  {isBatch
                    ? (isEn ? 'Confirm & Execute Batch Port Configuration' : 'تأیید و اجرای تنظیمات گروهی پورت‌ها')
                    : (isEn ? `Confirm & Execute Port Configuration (${targetPortIds[0]})` : `تأیید و اجرای تنظیمات پورت ${targetPortIds[0]}`)}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                    isLight
                      ? 'bg-cyan-50 border-cyan-300 text-cyan-700'
                      : 'bg-cyan-900/60 border-cyan-700/60 text-cyan-300'
                  }`}
                >
                  {isBatch
                    ? (isEn ? `${targetPortIds.length} Ports Selected` : `${targetPortIds.length} پورت انتخاب‌شده`)
                    : (isEn ? 'Single Port' : 'تک پورت')}
                </span>
              </h3>
              <p className={`text-xs flex items-center gap-2 mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>{device.name}</span>
                <span>•</span>
                <span className="font-mono">{device.ip}</span>
                <span>•</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    isLight
                      ? 'bg-slate-100 border-slate-200 text-slate-700'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  {isRouter ? (isEn ? 'Cisco Router' : 'روتر سیسکو') : (isEn ? 'Cisco Switch' : 'سوییچ سیسکو')}
                </span>
              </p>
            </div>
          </div>

          {/* Header Controls: Minimize, Fullscreen, Close */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleMinimize}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isEn ? 'Minimize' : 'کوچک‌کردن (مینیمایز)'}
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isMaximized ? (isEn ? 'Restore' : 'خروج از تمام‌صفحه') : (isEn ? 'Fullscreen' : 'تمام‌صفحه')}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isEn ? 'Close' : 'بستن'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={`p-5 space-y-4 overflow-y-auto flex-1 text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
          {/* Action explanation */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isLight
                ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950'
                : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
            }`}
          >
            <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isLight ? 'text-indigo-600' : 'text-cyan-400'}`} />
            <div className="text-xs leading-relaxed font-medium">
              {isBatch ? (
                isEn ? (
                  <>
                    The following configuration changes will be sent and executed across{' '}
                    <b className={`font-bold ${isLight ? 'text-indigo-700' : 'text-cyan-300'}`}>{targetPortIds.length} selected ports</b> on{' '}
                    <b className="font-mono">{device.name}</b>. Please review the ports and the Cisco CLI commands below before confirming.
                  </>
                ) : (
                  <>
                    دستورات پیکربندی زیر روی{' '}
                    <b className={`font-bold ${isLight ? 'text-indigo-700' : 'text-cyan-300'}`}>{targetPortIds.length} پورت انتخابی</b> در دستگاه{' '}
                    <b className="font-mono">{device.name}</b> ارسال و اجرا خواهند شد. لطفاً لیست پورت‌ها و توالی دستورات Cisco CLI را پیش از تأیید نهایی بررسی نمایید:
                  </>
                )
              ) : (
                isEn ? (
                  <>
                    The following configuration will be executed on interface{' '}
                    <b className={`font-mono ${isLight ? 'text-indigo-700' : 'text-cyan-300'}`}>{targetPortIds[0]}</b> of{' '}
                    <b className="font-mono">{device.name}</b>. Please confirm execution.
                  </>
                ) : (
                  <>
                    تغییرات پیکربندی زیر بر روی اینترفیس{' '}
                    <b className={`font-mono ${isLight ? 'text-indigo-700' : 'text-cyan-300'}`}>{targetPortIds[0]}</b> در سوئیچ{' '}
                    <b className="font-mono">{device.name}</b> اجرا خواهد شد. لطفاً صحت دستورات را تأیید فرمایید:
                  </>
                )
              )}
            </div>
          </div>

          {/* Target Ports Chips Container */}
          <div
            className={`p-3.5 rounded-xl border ${
              isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-slate-900/70 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`font-bold text-[11px] flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                <CheckSquare className={`w-3.5 h-3.5 ${isLight ? 'text-indigo-600' : 'text-cyan-400'}`} />
                <span>{isEn ? 'Target Interfaces:' : 'اینترفیس‌های هدف عملیات:'}</span>
                <span className={`font-mono font-bold ${isLight ? 'text-indigo-600' : 'text-cyan-300'}`}>({targetPortIds.length})</span>
              </span>
              {targetPortIds.length > 16 && (
                <button
                  type="button"
                  onClick={() => setShowAllPorts(!showAllPorts)}
                  className={`text-[10px] hover:underline cursor-pointer font-medium ${
                    isLight ? 'text-indigo-600' : 'text-cyan-400'
                  }`}
                >
                  {showAllPorts ? (isEn ? 'Show Less' : 'نمایش کمتر') : (isEn ? `Show All (${targetPortIds.length})` : `نمایش همه (${targetPortIds.length})`)}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {displayedPortIds.map((pid) => (
                <span
                  key={pid}
                  className={`px-2 py-0.5 rounded-lg border font-mono text-[11px] font-bold ${
                    isLight
                      ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
                  }`}
                >
                  {pid}
                </span>
              ))}
              {!showAllPorts && remainingCount > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-lg border font-mono text-[11px] font-medium ${
                    isLight
                      ? 'bg-slate-200 border-slate-300 text-slate-700'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  +{remainingCount} {isEn ? 'more' : 'دیگر'}
                </span>
              )}
            </div>
          </div>

          {/* Changes Applied Summary Cards */}
          {changesSummary.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`font-bold text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  {isEn ? 'Configuration Parameters to Apply:' : 'پارامترهای تنظیمی جهت اعمال:'}
                </span>
                <FieldInfoTooltip
                  title={isEn ? 'Cisco Port Parameters' : 'پارامترهای پورت سیسکو'}
                  whatIsIt={isEn ? 'Key switchport properties being changed on selected interfaces.' : 'مشخصات کلیدی سوییچ‌پورت که روی اینترفیس‌های هدف تغییر خواهند کرد.'}
                  whyNeeded={isEn ? 'Ensures network segmentation, security policies, and VLAN assignments are correctly provisioned.' : 'اطمینان از تفکیک ترافیک شبکه، پالیسی‌های امنیتی پورت و تخصیص صحیح VLAN.'}
                  example={isEn ? 'Mode: Trunk, Allowed VLANs: 10,20,30' : 'Mode: Access, VLAN: 10'}
                  isLightMode={isLight}
                  isEn={isEn}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {changesSummary.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                      item.isDanger
                        ? isLight
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                        : isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-800'
                          : 'bg-slate-900/70 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg border shadow-xs shrink-0 ${
                        isLight
                          ? 'bg-white border-slate-200 text-slate-700'
                          : 'bg-slate-800 border-slate-700 text-cyan-400'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`text-[10px] block truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        {item.label}
                      </span>
                      <span className={`font-bold text-xs block truncate font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {item.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cisco CLI Command Window */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <Terminal className={`w-3.5 h-3.5 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
                  <span>{isEn ? 'Cisco IOS Commands (Running-Config):' : 'دستورات اجرایی سیسکو IOS در دستگاه:'}</span>
                </span>
                <FieldInfoTooltip
                  title={isEn ? 'Cisco CLI Sequence' : 'توالی فرامین CLI سیسکو'}
                  whatIsIt={isEn ? 'The exact Cisco IOS command lines that will be pushed to the device.' : 'متن دقیق خطوط دستوری Cisco IOS که به خط فرمان دستگاه ارسال می‌شود.'}
                  whyNeeded={isEn ? 'Provides full auditability and transparency before applying changes.' : 'امکان بررسی دقیق، بازبینی و شفافیت فنی کامل پیش از اعمال تغییرات به دستگاه.'}
                  example={isEn ? 'interface Gi0/1 -> switchport mode trunk' : 'interface Gi0/1 -> switchport access vlan 10'}
                  isLightMode={isLight}
                  isEn={isEn}
                />
              </div>
              <button
                type="button"
                onClick={handleCopyCli}
                className={`text-[11px] font-mono flex items-center gap-1 px-2.5 py-1 rounded border transition cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-cyan-300'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (isEn ? 'Copied' : 'کپی شد') : (isEn ? 'Copy CLI' : 'کپی دستورات')}</span>
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#090d16] shadow-inner font-mono text-xs">
              <div className="px-3 py-1.5 bg-[#030712] border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  <span>{device.name}# configure terminal</span>
                </span>
                <span>{cliText.split('\n').length} {isEn ? 'lines' : 'خط'}</span>
              </div>
              <pre className="p-3 text-emerald-400 text-xs leading-relaxed overflow-x-auto whitespace-pre selection:bg-cyan-500/30 max-h-52 font-mono" dir="ltr">
                {cliText}
              </pre>
            </div>
          </div>

          {/* Running vs Startup Notice */}
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              isLight
                ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
            }`}
          >
            <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
            <div className="leading-relaxed flex-1">
              <b>{isEn ? 'Notice:' : 'توجه:'}</b>{' '}
              {isEn ? (
                <>
                  These commands will immediately apply to active Running-Config on{' '}
                  <b className="font-mono">{device.name}</b>. Remember to run{' '}
                  <code
                    className={`px-1.5 py-0.5 rounded font-mono font-bold border ${
                      isLight
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    write memory
                  </code>{' '}
                  to persist changes into NVRAM startup-config.
                </>
              ) : (
                <>
                  این تغییرات بلافاصله بر روی Running-Config دستگاه <b className="font-mono">{device.name}</b> اعمال می‌شوند. جهت ذخیره دائمی در حافظه NVRAM، دستور{' '}
                  <code
                    className={`px-1.5 py-0.5 rounded font-mono font-bold border ${
                      isLight
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    write memory
                  </code>{' '}
                  را اجرا نمایید.
                </>
              )}
            </div>
            <FieldInfoTooltip
              title={isEn ? 'Running-Config vs Startup-Config' : 'تفاوت Running-Config و Startup-Config'}
              whatIsIt={isEn ? 'Running-config resides in volatile RAM, while startup-config is saved in persistent NVRAM.' : 'تنظیمات Running در رم موقت است در حالی که Startup در حافظه دائمی NVRAM ذخیره می‌گردد.'}
              whyNeeded={isEn ? 'If the device reboots before write memory, non-persisted configuration changes will be lost.' : 'در صورت ری‌استارت دیوایس پیش از ذخیره‌سازی، تغییرات رایت‌نشده از بین خواهند رفت.'}
              example="copy running-config startup-config (or write memory)"
              isLightMode={isLight}
              isEn={isEn}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end gap-2.5 px-5 py-3.5 border-t shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            {isEn ? 'Cancel & Return' : 'انصراف و ویرایش'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isEn ? 'Executing Commands...' : 'در حال اجرای دستورات...'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isBatch
                    ? (isEn ? `Yes, Execute on ${targetPortIds.length} Ports` : `بله، دستورات را روی ${targetPortIds.length} پورت اجرا کن`)
                    : (isEn ? 'Yes, Execute Commands' : 'بله، دستورات را اجرا کن')}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
