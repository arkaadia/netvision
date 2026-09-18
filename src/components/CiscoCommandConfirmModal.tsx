import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Terminal,
  PowerOff,
  Power,
  Layers,
  ShieldAlert,
  Loader2,
  Copy,
  Check,
  Save
} from 'lucide-react';
import { Device, SwitchPort } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { ModalHeaderControls } from './common/ModalHeaderControls';

export interface CiscoCommandConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  action: 'shutdown' | 'no_shutdown' | 'mode_trunk' | 'mode_access' | 'port_sec_disable';
  port: SwitchPort | null;
  device: Device;
  isLoading?: boolean;
  onMinimize?: () => void;
  isLightMode?: boolean;
}

export const CiscoCommandConfirmModal: React.FC<CiscoCommandConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  action,
  port,
  device,
  isLoading = false,
  onMinimize,
  isLightMode,
}) => {
  const { isEn } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dynamic light/dark theme evaluation
  const isLight = isLightMode ?? (typeof document !== 'undefined' && (
    document.documentElement.classList.contains('light') ||
    document.body.classList.contains('light') ||
    !document.documentElement.classList.contains('dark')
  ));

  // Handle ESC shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, onClose]);

  if (!isOpen || !port) return null;

  const isRouter = device.type === 'router';
  const isMikrotik = (device.platform || '').toLowerCase().includes('mikrotik');

  // Generate CLI commands based on platform (Cisco vs MikroTik) & device type
  const generateCommand = (): string => {
    const portId = port.port_id;
    const devName = device.name || 'Device';

    if (isMikrotik) {
      switch (action) {
        case 'shutdown':
          return [
            `[admin@${devName}] > /interface set [find name="${portId}"] disabled=yes`,
            `[admin@${devName}] > /interface print where name="${portId}"`,
            `Flags: X - disabled, R - running`,
            ` 0  X  name="${portId}" default-name="${portId}" type="ether"`
          ].join('\n');
        case 'no_shutdown':
          return [
            `[admin@${devName}] > /interface set [find name="${portId}"] disabled=no`,
            `[admin@${devName}] > /interface print where name="${portId}"`,
            `Flags: D - dynamic, X - disabled, R - running`,
            ` 0  R  name="${portId}" default-name="${portId}" type="ether"`
          ].join('\n');
        case 'mode_trunk':
          return [
            `[admin@${devName}] > /interface bridge port set [find interface="${portId}"] frame-types=admit-only-vlan-tagged`,
            `[admin@${devName}] > /interface bridge vlan add bridge=bridge tagged="${portId}" vlan-ids=1-4094 comment="Trunk on ${portId}"`,
            `# [RouterOS Notification] Port ${portId} converted to 802.1Q tagged Trunk member`
          ].join('\n');
        case 'mode_access':
          return [
            `[admin@${devName}] > /interface bridge port set [find interface="${portId}"] pvid=${port.vlan || 1} frame-types=admit-only-untagged-and-priority-tagged`,
            `# [RouterOS Notification] Port ${portId} assigned as Access member (PVID ${port.vlan || 1})`
          ].join('\n');
        case 'port_sec_disable':
          return [
            `[admin@${devName}] > /interface bridge filter remove [find in-interface="${portId}"]`,
            `# [RouterOS Notification] Cleared bridge MAC filtering restrictions on ${portId}`
          ].join('\n');
        default:
          return `[admin@${devName}] > /interface print`;
      }
    }

    // Cisco IOS / IOS-XE
    switch (action) {
      case 'shutdown':
        return [
          `${devName}# configure terminal`,
          `Enter configuration commands, one per line. End with CNTL/Z.`,
          `${devName}(config)# interface ${portId}`,
          `${devName}(config-if)# shutdown`,
          `${devName}(config-if)# exit`,
          `${devName}(config)# exit`,
          `%SYS-5-CONFIG_I: Configured from console by admin`,
          `%LINK-5-CHANGED: Interface ${portId}, changed state to administratively down`,
          `%LINEPROTO-5-UPDOWN: Line protocol on Interface ${portId}, changed state to down`
        ].join('\n');

      case 'no_shutdown':
        return [
          `${devName}# configure terminal`,
          `Enter configuration commands, one per line. End with CNTL/Z.`,
          `${devName}(config)# interface ${portId}`,
          `${devName}(config-if)# no shutdown`,
          `${devName}(config-if)# exit`,
          `${devName}(config)# exit`,
          `%SYS-5-CONFIG_I: Configured from console by admin`,
          `%LINK-3-UPDOWN: Interface ${portId}, changed state to up`,
          `%LINEPROTO-3-UPDOWN: Line protocol on Interface ${portId}, changed state to up`
        ].join('\n');

      case 'mode_trunk':
        if (isRouter) {
          return [
            `${devName}# configure terminal`,
            `${devName}(config)# interface ${portId}`,
            `${devName}(config-if)# no shutdown`,
            `${devName}(config-if)# exit`,
            `${devName}(config)# interface ${portId}.10`,
            `${devName}(config-subif)# encapsulation dot1Q 10`,
            `${devName}(config-subif)# ip address 192.168.10.1 255.255.255.0`,
            `${devName}(config-subif)# exit`,
            `${devName}(config)# exit`,
            `%SYS-5-CONFIG_I: Configured 802.1Q sub-interface trunking on Router ${devName}`
          ].join('\n');
        }
        return [
          `${devName}# configure terminal`,
          `${devName}(config)# interface ${portId}`,
          `${devName}(config-if)# switchport trunk encapsulation dot1q`,
          `${devName}(config-if)# switchport mode trunk`,
          `${devName}(config-if)# exit`,
          `${devName}(config)# exit`,
          `%SYS-5-CONFIG_I: Configured 802.1Q Trunk port on Switch ${devName}`,
          `%LINEPROTO-5-UPDOWN: Line protocol on Interface ${portId}, changed state to up`
        ].join('\n');

      case 'mode_access':
        if (isRouter) {
          return [
            `${devName}# configure terminal`,
            `${devName}(config)# interface ${portId}`,
            `${devName}(config-if)# no shutdown`,
            `${devName}(config-if)# ip address 192.168.1.1 255.255.255.0`,
            `${devName}(config-if)# exit`,
            `${devName}(config)# exit`,
            `%SYS-5-CONFIG_I: Configured routed L3 interface on Router ${devName}`
          ].join('\n');
        }
        return [
          `${devName}# configure terminal`,
          `${devName}(config)# interface ${portId}`,
          `${devName}(config-if)# switchport mode access`,
          `${devName}(config-if)# switchport access vlan ${port.vlan || 1}`,
          `${devName}(config-if)# exit`,
          `${devName}(config)# exit`,
          `%SYS-5-CONFIG_I: Configured Access port on VLAN ${port.vlan || 1} on Switch ${devName}`
        ].join('\n');

      case 'port_sec_disable':
        if (isRouter) {
          return [
            `${devName}# configure terminal`,
            `${devName}(config)# interface ${portId}`,
            `${devName}(config-if)# no ip verify unicast source reachable-via rx`,
            `${devName}(config-if)# exit`,
            `${devName}(config)# exit`,
            `%SYS-5-CONFIG_I: Disabled L3 uRPF security verification on Router ${devName}`
          ].join('\n');
        }
        return [
          `${devName}# configure terminal`,
          `${devName}(config)# interface ${portId}`,
          `${devName}(config-if)# no switchport port-security`,
          `${devName}(config-if)# exit`,
          `${devName}(config)# exit`,
          `%SYS-5-CONFIG_I: Disabled Port Security on Interface ${portId}`
        ].join('\n');

      default:
        return `${devName}# configure terminal\n${devName}(config)# exit`;
    }
  };

  const getActionMetadata = () => {
    switch (action) {
      case 'shutdown':
        return {
          title: isEn ? 'Shutdown Port Confirmation' : 'تأیید خاموش کردن پورت (Shutdown)',
          badge: isEn ? 'Port Shutdown' : 'خاموشی پورت',
          icon: <PowerOff className="w-5 h-5 text-rose-500" />,
          iconBoxClass: isLight
            ? 'bg-rose-50 border-rose-200 text-rose-600'
            : 'bg-rose-500/15 border-rose-500/30 text-rose-400',
          badgeClass: isLight
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-rose-900/40 text-rose-300 border-rose-700/50',
          accentBtnClass: 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30 text-white',
          danger: true,
          desc: isEn
            ? `Are you sure you want to administratively shut down interface ${port.port_id} on ${device.name}? Traffic will be completely halted on this interface.`
            : `آیا از خاموش کردن اینترفیس ${port.port_id} بر روی ${device.name} اطمینان دارید؟ تمام ترافیک عبوری از این پورت متوقف خواهد شد.`,
        };
      case 'no_shutdown':
        return {
          title: isEn ? 'Enable Port Confirmation' : 'تأیید روشن کردن پورت (No Shutdown)',
          badge: isEn ? 'Port Enable' : 'فعال‌سازی پورت',
          icon: <Power className="w-5 h-5 text-emerald-500" />,
          iconBoxClass: isLight
            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
          badgeClass: isLight
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
          accentBtnClass: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 text-white',
          danger: false,
          desc: isEn
            ? `Are you sure you want to administratively enable interface ${port.port_id} on ${device.name}? Interface status will transition to UP.`
            : `آیا از فعال‌سازی اینترفیس ${port.port_id} بر روی ${device.name} اطمینان دارید؟ وضعیت پورت به حالت فعال (Up) تغییر خواهد کرد.`,
        };
      case 'mode_trunk':
        return {
          title: isEn ? 'Change Port Mode to Trunk' : 'تأیید تغییر مود پورت به Trunk',
          badge: isEn ? 'Switchport Trunk' : 'مود ترانک (Trunk)',
          icon: <Layers className="w-5 h-5 text-purple-400" />,
          iconBoxClass: isLight
            ? 'bg-purple-50 border-purple-200 text-purple-600'
            : 'bg-purple-500/15 border-purple-500/30 text-purple-400',
          badgeClass: isLight
            ? 'bg-purple-50 text-purple-700 border-purple-200'
            : 'bg-purple-900/40 text-purple-300 border-purple-700/50',
          accentBtnClass: 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30 text-white',
          danger: false,
          desc: isEn
            ? `Switch interface ${port.port_id} to 802.1Q Trunk mode on ${device.name}. Multiple tagged VLAN frames will be forwarded across this link.`
            : `تغییر حالت اینترفیس ${port.port_id} به مود ترانک 802.1Q روی ${device.name}. این پورت برای انتقال فریم‌های تگ‌دار چندین ویلن تنظیم خواهد شد.`,
        };
      case 'mode_access':
        return {
          title: isEn ? 'Change Port Mode to Access' : 'تأیید تغییر مود پورت به Access',
          badge: isEn ? 'Switchport Access' : 'مود دسترسی (Access)',
          icon: <Layers className="w-5 h-5 text-indigo-400" />,
          iconBoxClass: isLight
            ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
            : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
          badgeClass: isLight
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
            : 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50',
          accentBtnClass: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30 text-white',
          danger: false,
          desc: isEn
            ? `Switch interface ${port.port_id} to Access mode on ${device.name}. Untagged traffic will be forwarded on VLAN ${port.vlan || 1}.`
            : `تغییر حالت اینترفیس ${port.port_id} به مود دسترسی (Access) روی ${device.name}. اینترفیس برای اتصال مستقیم روی ویلن ${port.vlan || 1} پیکربندی می‌شود.`,
        };
      case 'port_sec_disable':
        return {
          title: isEn ? 'Disable Port Security' : 'تأیید غیرفعال‌سازی Port Security',
          badge: isEn ? 'Disable Security' : 'حذف امنیت پورت',
          icon: <ShieldAlert className="w-5 h-5 text-amber-500" />,
          iconBoxClass: isLight
            ? 'bg-amber-50 border-amber-200 text-amber-600'
            : 'bg-amber-500/15 border-amber-500/30 text-amber-400',
          badgeClass: isLight
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-amber-900/40 text-amber-300 border-amber-700/50',
          accentBtnClass: 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30 text-white',
          danger: true,
          desc: isEn
            ? `Are you sure you want to disable Cisco Port Security on interface ${port.port_id}? MAC restriction policies will be cleared.`
            : `آیا از غیرفعال‌سازی امنیت پورت (Port Security) روی ${port.port_id} اطمینان دارید؟ محدودیت‌های مک‌آدرس از روی اینترفیس برداشته خواهد شد.`,
        };
      default:
        return {
          title: isEn ? 'Confirm Action' : 'تأیید عملیات',
          badge: isEn ? 'Cisco IOS' : 'سیسکو',
          icon: <Terminal className="w-5 h-5 text-cyan-500" />,
          iconBoxClass: isLight
            ? 'bg-cyan-50 border-cyan-200 text-cyan-600'
            : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
          badgeClass: isLight
            ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
            : 'bg-cyan-900/40 text-cyan-300 border-cyan-700/50',
          accentBtnClass: 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/30 text-white',
          danger: false,
          desc: isEn ? 'Confirm and apply changes to device.' : 'تأیید و اعمال تنظیمات روی دیوایس.',
        };
    }
  };

  const meta = getActionMetadata();
  const cliText = generateCommand();

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modalContent = (
    <div
      className={`fixed top-0 left-0 right-0 bottom-8 z-[10000] flex items-center justify-center transition-all duration-150 bg-slate-950/80 backdrop-blur-sm ${
        isFullscreen ? 'p-0 overflow-hidden' : 'p-3 sm:p-4 overflow-y-auto'
      }`}
      data-modal-backdrop="true"
      onClick={() => {
        if (!isFullscreen) onClose();
      }}
    >
      <div
        className={`border shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
          isFullscreen
            ? 'w-full h-full max-w-none rounded-none border-0'
            : 'w-full max-w-xl rounded-2xl max-h-[90vh] animate-in fade-in zoom-in-95'
        } ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
            : 'bg-slate-900 border-slate-700/80 text-slate-100 shadow-2xl shadow-black/80'
        }`}
        dir={isEn ? 'ltr' : 'rtl'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`px-4 sm:px-5 py-3 sm:py-3.5 border-b flex items-center justify-between gap-3 shrink-0 select-none sticky top-0 z-30 ${
            isLight
              ? 'bg-slate-50/95 border-slate-200'
              : 'bg-slate-950/90 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`p-2 rounded-xl border shrink-0 ${meta.iconBoxClass}`}>
              {meta.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`font-bold text-sm sm:text-base truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {meta.title}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border shrink-0 ${meta.badgeClass}`}>
                  {meta.badge}
                </span>
              </div>
              <p className={`text-xs flex items-center gap-2 mt-0.5 truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                <span className="font-semibold">{device.name}</span>
                <span>•</span>
                <span className={`font-mono font-bold ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>{port.port_id}</span>
                <span>•</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                  isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                }`}>
                  {isMikrotik
                    ? (isEn ? 'MikroTik RouterOS' : 'میکروتیک')
                    : isRouter
                    ? (isEn ? 'Cisco Router' : 'روتر سیسکو')
                    : (isEn ? 'Cisco Switch' : 'سوییچ سیسکو')}
                </span>
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center">
            <ModalHeaderControls
              onClose={onClose}
              onMinimize={onMinimize || onClose}
              onMaximizeToggle={() => setIsFullscreen((prev) => !prev)}
              isMaximized={isFullscreen}
              isLightMode={isLight}
              isEn={isEn}
              minimizeTooltip={isEn ? 'Minimize confirmation' : 'مینیمایز پنجره'}
              closeTooltip={isEn ? 'Cancel and close' : 'انصراف و بستن'}
            />
          </div>
        </div>

        {/* Modal Body */}
        <div className={`p-4 sm:p-5 space-y-4 overflow-y-auto ${isFullscreen ? 'flex-1 max-h-none' : ''}`}>
          {/* Action explanation banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              meta.danger
                ? isLight
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-rose-950/30 border-rose-800/50 text-rose-200'
                : action === 'mode_trunk'
                ? isLight
                  ? 'bg-purple-50 border-purple-200 text-purple-900'
                  : 'bg-purple-950/30 border-purple-800/50 text-purple-200'
                : isLight
                ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                : 'bg-indigo-950/30 border-indigo-800/50 text-indigo-200'
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                meta.danger ? 'text-rose-500' : action === 'mode_trunk' ? 'text-purple-400' : 'text-indigo-400'
              }`}
            />
            <div className="text-xs leading-relaxed font-medium">{meta.desc}</div>
          </div>

          {/* Device and Port Details Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div
              className={`p-2.5 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/60 border-slate-800 text-slate-200'
              }`}
            >
              <span className={`text-[10px] block mb-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn ? 'Device Name' : 'نام تجهیز'}
              </span>
              <span className="font-bold truncate block">{device.name}</span>
            </div>

            <div
              className={`p-2.5 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/60 border-slate-800 text-slate-200'
              }`}
            >
              <span className={`text-[10px] block mb-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn ? 'Device Type' : 'نوع دستگاه'}
              </span>
              <span className={`font-bold block ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                {isMikrotik ? 'RouterOS' : isRouter ? (isEn ? 'Router' : 'روتر') : (isEn ? 'Switch' : 'سوییچ')}
              </span>
            </div>

            <div
              className={`p-2.5 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/60 border-slate-800 text-slate-200'
              }`}
            >
              <span className={`text-[10px] block mb-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn ? 'Port' : 'اینترفیس'}
              </span>
              <span className="font-mono font-bold block">{port.port_id}</span>
            </div>

            <div
              className={`p-2.5 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/60 border-slate-800 text-slate-200'
              }`}
            >
              <span className={`text-[10px] block mb-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {action.includes('mode') ? (isEn ? 'Target Mode' : 'مود هدف') : (isEn ? 'Current VLAN' : 'ویلن فعلی')}
              </span>
              <span
                className={`font-mono font-bold block ${
                  action === 'mode_trunk'
                    ? 'text-purple-400'
                    : isLight
                    ? 'text-purple-600'
                    : 'text-purple-400'
                }`}
              >
                {action === 'mode_trunk'
                  ? (isEn ? 'Trunk (802.1Q)' : 'ترانک (802.1Q)')
                  : action === 'mode_access'
                  ? (isEn ? `Access (VLAN ${port.vlan || 1})` : `دسترسی (ویلن ${port.vlan || 1})`)
                  : `VLAN ${port.vlan || 1}`}
              </span>
            </div>
          </div>

          {/* CLI Command Sequence Window */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {isMikrotik
                    ? (isEn ? 'MikroTik RouterOS Command Sequence:' : 'دستورات اجرایی RouterOS در دستگاه:')
                    : (isEn ? 'Cisco IOS Command Sequence to Execute:' : 'دستورات اجرایی سیسکو در دستگاه:')
                  }
                </span>
              </span>
              <button
                type="button"
                onClick={handleCopyCli}
                className={`text-[11px] font-mono flex items-center gap-1 px-2.5 py-1 rounded-lg transition cursor-pointer border ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? (isEn ? 'Copied' : 'کپی شد') : (isEn ? 'Copy CLI' : 'کپی دستورات')}</span>
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#0a0f1d] shadow-2xl font-mono text-xs">
              <div className="px-3.5 py-2 bg-[#020617] border-b border-slate-800 flex items-center justify-between select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {device.name} • {isMikrotik ? 'MikroTik RouterOS' : isRouter ? 'Cisco IOS Router' : 'Cisco IOS-XE Switch'}
                </span>
              </div>
              <pre className="p-3.5 text-emerald-400 text-xs leading-relaxed overflow-x-auto whitespace-pre selection:bg-emerald-500/30">
                {cliText}
              </pre>
            </div>
          </div>
        </div>

        {/* Modal Footer / Action Buttons */}
        <div
          className={`flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-3.5 border-t shrink-0 select-none ${
            isLight
              ? 'bg-slate-50/95 border-slate-200'
              : 'bg-slate-950/90 border-slate-800'
          }`}
        >
          <div className={`text-[11px] flex items-center gap-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{isEn ? 'Target Device:' : 'تجهیز هدف:'}</span>
            <span className={`font-mono font-bold ${isLight ? 'text-indigo-600' : 'text-cyan-400'}`}>
              {device.ip || 'Local/Simulator'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                isLight
                  ? 'text-slate-700 hover:bg-slate-200 border-slate-300'
                  : 'text-slate-300 hover:bg-slate-800 border-slate-700'
              }`}
            >
              {isEn ? 'Cancel' : 'انصراف'}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold shadow-lg transition cursor-pointer ${
                meta.accentBtnClass
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isEn ? 'Applying to Device...' : 'در حال اعمال روی دیوایس...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>
                    {action === 'mode_trunk'
                      ? (isEn ? 'Save & Apply Trunk Mode' : 'ذخیره و اعمال مود ترانک')
                      : action === 'mode_access'
                      ? (isEn ? 'Save & Apply Access Mode' : 'ذخیره و اعمال مود دسترسی')
                      : action === 'shutdown'
                      ? (isEn ? 'Shutdown Port' : 'خاموش کردن پورت')
                      : action === 'no_shutdown'
                      ? (isEn ? 'Enable Port' : 'فعال‌سازی پورت')
                      : (isEn ? 'Save & Apply Changes' : 'ذخیره و اعمال تغییرات')}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
