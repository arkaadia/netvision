import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Save,
  AlertTriangle,
  Terminal,
  Copy,
  Check,
  Loader2,
  Server,
  Layers,
  FileCode,
  Clock,
  CheckCircle2,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { Device } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { ModalHeaderControls } from './common/ModalHeaderControls';
import { fetchDeviceUnsavedChanges, DeviceUnsavedChangesInfo } from '../services/api';

export interface WriteChangeItem {
  id?: string;
  target?: string;
  type?: string;
  change?: string;
  details?: string;
  command?: string;
  timestamp?: string;
}

export interface CiscoWriteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  device: Device | null;
  isWriting?: boolean;
  sessionChanges?: WriteChangeItem[];
  onMinimize?: () => void;
  isLightMode?: boolean;
}

export const CiscoWriteConfirmModal: React.FC<CiscoWriteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  device,
  isWriting = false,
  sessionChanges = [],
  onMinimize,
  isLightMode: propIsLightMode,
}) => {
  const { isEn } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'cli'>('summary');
  const [remoteData, setRemoteData] = useState<DeviceUnsavedChangesInfo | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Determine light mode from prop or document element
  const isLight =
    propIsLightMode !== undefined
      ? propIsLightMode
      : typeof document !== 'undefined' && document.documentElement.classList.contains('light');

  useEffect(() => {
    if (isOpen && device?.id) {
      setLoadingData(true);
      fetchDeviceUnsavedChanges(device.id)
        .then((data) => {
          setRemoteData(data);
        })
        .catch(() => {
          setRemoteData(null);
        })
        .finally(() => {
          setLoadingData(false);
        });
    }
  }, [isOpen, device?.id]);

  if (!isOpen || !device) return null;

  // Combine session changes and backend pending changes
  const combinedPending: WriteChangeItem[] = [];

  // Add session-specific changes first
  if (sessionChanges && sessionChanges.length > 0) {
    sessionChanges.forEach((c) => combinedPending.push(c));
  }

  // Add backend pending changes if not already included
  if (remoteData?.pending_changes && remoteData.pending_changes.length > 0) {
    remoteData.pending_changes.forEach((pc, idx) => {
      const alreadyHas = combinedPending.some(
        (item) => item.target === pc.port_id && item.change === pc.description
      );
      if (!alreadyHas) {
        combinedPending.push({
          id: `backend-${idx}`,
          target: pc.port_id || device.name,
          type: pc.type || 'operation',
          change: pc.description || pc.type,
          command: pc.command,
          timestamp: pc.timestamp || new Date().toLocaleTimeString(),
        });
      }
    });
  }

  // Add modified ports if any and no specific changes logged yet
  if (combinedPending.length === 0 && remoteData?.modified_ports && remoteData.modified_ports.length > 0) {
    remoteData.modified_ports.forEach((mp, idx) => {
      combinedPending.push({
        id: `port-${idx}`,
        target: mp.port_id,
        type: 'port_config',
        change: mp.change_summary || `${mp.mode.toUpperCase()} - VLAN ${mp.vlan}`,
        details: mp.description ? `Description: "${mp.description}"` : undefined,
        timestamp: remoteData.last_modified_time || new Date().toLocaleTimeString(),
      });
    });
  }

  // Generate fallback CLI script if backend didn't provide one
  const getCliScript = (): string => {
    if (remoteData?.cli_diff && remoteData.cli_diff.trim().length > 0) {
      return remoteData.cli_diff;
    }

    const devName = device.name || 'Cisco-Device';
    const lines: string[] = [
      `! ==============================================================================`,
      `! Cisco IOS Running-Config Pending Changes for NVRAM (Startup-Config)`,
      `! Target Device: ${devName} (${device.ip})`,
      `! Platform: ${device.firmware || device.platform || 'Cisco IOS-XE'}`,
      `! Source: Volatile DRAM (Running-Config) -> Destination: NVRAM (Startup-Config)`,
      `! Timestamp: ${new Date().toISOString()}`,
      `! ==============================================================================`,
      `configure terminal`,
    ];

    if (combinedPending.length > 0) {
      combinedPending.forEach((item) => {
        if (item.target && item.target.toLowerCase().includes('ethernet')) {
          lines.push(`interface ${item.target}`);
          if (item.change) {
            lines.push(` ! ${item.change}`);
          }
          if (item.command) {
            lines.push(` ${item.command}`);
          }
          lines.push(` exit`);
        } else if (item.command) {
          lines.push(item.command);
        } else {
          lines.push(`! ${item.target || 'System'}: ${item.change || 'Configuration modified'}`);
        }
      });
    } else {
      lines.push(`! Active running-config differs from startup-config`);
      lines.push(`! All pending interface and system adjustments will be committed.`);
    }

    lines.push(`end`);
    lines.push(`write memory`);
    lines.push(`! [Building configuration... OK]`);
    lines.push(`! [NVRAM update complete. Configuration saved to startup-config successfully]`);

    return lines.join('\n');
  };

  const cliScript = getCliScript();

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isFullscreen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed top-0 left-0 right-0 bottom-8 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-all duration-150 ${
        isFullscreen ? 'p-0 overflow-hidden' : 'p-3 sm:p-4 overflow-y-auto'
      }`}
      data-modal-backdrop="true"
    >
      <div
        dir={isEn ? 'ltr' : 'rtl'}
        className={`border shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
          isFullscreen
            ? 'w-full h-full max-w-none rounded-none border-0'
            : 'w-full max-w-2xl rounded-2xl my-auto max-h-[90vh] animate-in fade-in zoom-in-95'
        } ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
            : 'bg-slate-900 border-slate-800 text-slate-100 shadow-black/80'
        }`}
      >
        {/* Header (Pinned with high z-index) */}
        <div
          className={`px-4 sm:px-5 py-3.5 sm:py-4 border-b flex items-center justify-between gap-3 shrink-0 select-none sticky top-0 z-30 ${
            isLight
              ? 'bg-slate-50/95 border-slate-200'
              : 'bg-slate-900/95 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`text-sm font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {isEn
                    ? 'Confirm Save Configuration to NVRAM'
                    : 'تایید ذخیره پیکربندی در حافظه دائم (Write Memory)'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 shrink-0">
                  write memory
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                <Server className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{device.name}</span>
                <span>•</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-bold shrink-0">{device.ip}</span>
                <span>•</span>
                <span className="truncate">{device.model || device.role || 'Cisco Switch'}</span>
              </div>
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

        {/* Content Body */}
        <div
          className={`p-5 space-y-4 overflow-y-auto flex-1 ${
            isFullscreen ? 'max-h-none' : 'max-h-[70vh]'
          }`}
        >
          {/* Warning Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isLight
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-amber-950/30 border-amber-800/40 text-amber-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed space-y-1">
              <p className="font-bold">
                {isEn
                  ? 'Commit Running Configuration to Startup Storage (NVRAM)'
                  : 'انتقال و ثبت دائمی تغییرات از حافظه موقت به حافظه استارتاپ'}
              </p>
              <p className={isLight ? 'text-amber-800' : 'text-amber-300/90'}>
                {isEn
                  ? 'Active modifications currently exist only in volatile DRAM (running-config) and will be lost on power loss or reload. Confirming will execute "write memory" (copy running-config startup-config) to persist these changes permanently.'
                  : 'تغییرات اعمال‌شده در حال حاضر فقط در حافظه موقت (Running-Config) قرار دارند و با راه‌اندازی مجدد یا قطع برق از بین خواهند رفت. با تایید شما، دستور write memory اجرا شده و تنظیمات به حافظه پایدار (NVRAM) منتقل می‌شوند.'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'summary'
                    ? isLight
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : isLight
                    ? 'text-slate-600 hover:bg-slate-100'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  {isEn ? 'Detected Changes' : 'لیست تغییرات'} (
                  {loadingData ? '...' : combinedPending.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('cli')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'cli'
                    ? isLight
                      ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : isLight
                    ? 'text-slate-600 hover:bg-slate-100'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{isEn ? 'Cisco CLI & Diff Preview' : 'پیش‌نمایش دستورات و Diff'}</span>
              </button>
            </div>

            {activeTab === 'cli' && (
              <button
                type="button"
                onClick={handleCopyCli}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  copied
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40'
                    : isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
                title={isEn ? 'Copy CLI commands' : 'کپی دستورات'}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? (isEn ? 'Copied' : 'کپی شد') : (isEn ? 'Copy' : 'کپی')}</span>
              </button>
            )}
          </div>

          {/* Tab 1: Changes Summary */}
          {activeTab === 'summary' && (
            <div className="space-y-2.5">
              {loadingData && combinedPending.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                  <span className="text-xs">
                    {isEn ? 'Inspecting unwritten changes on device...' : 'در حال بررسی تغییرات ذخیره‌نشده روی دستگاه...'}
                  </span>
                </div>
              ) : combinedPending.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      {isEn
                        ? 'The following items will be permanently committed to startup-config:'
                        : 'موارد زیر به طور دائم در استارتاپ کانفیگ ثبت خواهند شد:'}
                    </span>
                  </p>

                  <div className={`space-y-1.5 overflow-y-auto pr-1 ${
                    isFullscreen ? 'max-h-[55vh]' : 'max-h-56'
                  }`}>
                    {combinedPending.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition ${
                          isLight
                            ? 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
                            : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/70 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                {item.target || 'General'}
                              </span>
                              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                {item.change}
                              </span>
                            </div>
                            {item.details && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                {item.details}
                              </div>
                            )}
                          </div>
                        </div>

                        {item.timestamp && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>{item.timestamp}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  className={`p-5 rounded-xl border text-center space-y-1.5 ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-600'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-300'
                  }`}
                >
                  <FileCode className="w-6 h-6 text-amber-500 mx-auto" />
                  <p className="text-xs font-bold">
                    {isEn ? 'Unsaved Active Configuration Detected' : 'تغییرات فعال در حافظه جاری شناسایی شد'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isEn
                      ? 'The device state in RAM differs from NVRAM. Executing write memory will synchronize running-config with startup-config.'
                      : 'وضعیت دستگاه در رم با ان‌وی‌رم تفاوت دارد. با اجرای دستور write memory، کانفیگ استارتاپ با کانفیگ فعال همگام خواهد شد.'}
                  </p>
                </div>
              )}

              {/* Status summary grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <div
                  className={`p-2 rounded-lg border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    {isEn ? 'Source Storage' : 'منبع ذخیره‌سازی'}
                  </span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-[11px]">
                    DRAM (Running)
                  </span>
                </div>

                <div
                  className={`p-2 rounded-lg border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    {isEn ? 'Target Storage' : 'مقصد ذخیره‌سازی'}
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                    NVRAM (Startup)
                  </span>
                </div>

                <div
                  className={`p-2 rounded-lg border col-span-2 sm:col-span-1 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    {isEn ? 'IOS Execution' : 'دستور اجرایی سیسکو'}
                  </span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">
                    write memory
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Cisco CLI Script / Diff Preview */}
          {activeTab === 'cli' && (
            <div className="space-y-2">
              <div
                className={`p-3 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto border shadow-inner ${
                  isFullscreen ? 'max-h-[60vh]' : 'max-h-64'
                } ${
                  isLight
                    ? 'bg-slate-950 text-emerald-400 border-slate-800'
                    : 'bg-slate-950 text-emerald-400 border-slate-800'
                }`}
                dir="ltr"
              >
                <pre className="whitespace-pre">{cliScript}</pre>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {isEn
                  ? 'Command equivalent: copy running-config startup-config'
                  : 'معادل دستوری: copy running-config startup-config'}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className={`px-5 py-3.5 border-t flex items-center justify-between shrink-0 ${
            isLight
              ? 'bg-slate-50/90 border-slate-200'
              : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>{isEn ? 'Safe NVRAM write validation' : 'اعتبارسنجی امن ذخیره در استارتاپ'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isWriting}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                isLight
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {isEn ? 'Cancel' : 'انصراف'}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isWriting}
              className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-sans cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isWriting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>{isEn ? 'Writing to NVRAM...' : 'در حال ذخیره در NVRAM...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-slate-950" />
                  <span className="font-bold">
                    {isEn ? 'Confirm & Write to NVRAM' : 'تایید و ذخیره در استارتاپ'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
