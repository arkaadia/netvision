import React, { useState } from 'react';
import {
  X,
  Minus,
  Copy,
  Check,
  ExternalLink,
  Download,
  Terminal,
  Shield,
  Info,
  Globe,
  Radio,
} from 'lucide-react';
import { Device } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

export interface WinBoxLauncherModalProps {
  device: Device;
  isOpen: boolean;
  onClose: () => void;
  isLightMode?: boolean;
}

export const WinBoxLauncherModal: React.FC<WinBoxLauncherModalProps> = ({
  device,
  isOpen,
  onClose,
  isLightMode = false,
}) => {
  const { isEn } = useLanguage();
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedReg, setCopiedReg] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick' | 'protocol' | 'cli'>('quick');

  if (!isOpen || !device) return null;

  const targetHost = (device.ssh_host || device.ip || '').trim();
  const username = (device.ssh_username || 'admin').trim();
  const password = device.ssh_password || '';
  const winboxPort = (device as any).winbox_port || 8291;

  // URI Scheme for WinBox URL handler
  const protocolUrlWithCreds = password
    ? `winbox://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${targetHost}:${winboxPort}`
    : `winbox://${encodeURIComponent(username)}@${targetHost}:${winboxPort}`;

  const protocolUrlSimple = `winbox://${targetHost}`;

  // Direct CLI command for winbox.exe / winbox64.exe
  const cliCommand = password
    ? `winbox64.exe ${targetHost} ${username} "${password}"`
    : `winbox64.exe ${targetHost} ${username}`;

  const handleLaunchProtocol = (simple = false) => {
    const url = simple ? protocolUrlSimple : protocolUrlWithCreds;
    try {
      const a = document.createElement('a');
      a.href = url;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 500);
    } catch (e) {
      console.error('Launch WinBox error:', e);
    }
  };

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleDownloadLauncherBat = () => {
    const batContent = `@echo off
rem ========================================================
rem MikroTik WinBox Quick Launcher for ${device.name || targetHost}
rem IP: ${targetHost} | User: ${username} | Port: ${winboxPort}
rem ========================================================
title Launching WinBox - ${targetHost}
echo Connecting to ${targetHost}...

rem 1. Check if winbox64.exe or winbox.exe is in PATH
where winbox64.exe >nul 2>nul && (start "" winbox64.exe ${targetHost} ${username} ${password ? `"${password}"` : ''} && exit)
where winbox.exe >nul 2>nul && (start "" winbox.exe ${targetHost} ${username} ${password ? `"${password}"` : ''} && exit)

rem 2. Check common Windows download and desktop locations
if exist "%USERPROFILE%\\Downloads\\winbox64.exe" (
  start "" "%USERPROFILE%\\Downloads\\winbox64.exe" ${targetHost} ${username} ${password ? `"${password}"` : ''}
  exit
)
if exist "%USERPROFILE%\\Downloads\\winbox.exe" (
  start "" "%USERPROFILE%\\Downloads\\winbox.exe" ${targetHost} ${username} ${password ? `"${password}"` : ''}
  exit
)
if exist "%USERPROFILE%\\Desktop\\winbox64.exe" (
  start "" "%USERPROFILE%\\Desktop\\winbox64.exe" ${targetHost} ${username} ${password ? `"${password}"` : ''}
  exit
)
if exist "%USERPROFILE%\\Desktop\\winbox.exe" (
  start "" "%USERPROFILE%\\Desktop\\winbox.exe" ${targetHost} ${username} ${password ? `"${password}"` : ''}
  exit
)
if exist "%ProgramFiles%\\MikroTik\\winbox64.exe" (
  start "" "%ProgramFiles%\\MikroTik\\winbox64.exe" ${targetHost} ${username} ${password ? `"${password}"` : ''}
  exit
)

rem 3. Fallback generic invocation
start "" winbox.exe ${targetHost} ${username} ${password ? `"${password}"` : ''}
`;

    const blob = new Blob([batContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `winbox_${targetHost.replace(/[^a-zA-Z0-9_.-]/g, '_')}.bat`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadRegFix = () => {
    const regContent = `Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\\winbox]
@="URL:WinBox Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\\winbox\\shell]

[HKEY_CLASSES_ROOT\\winbox\\shell\\open]

[HKEY_CLASSES_ROOT\\winbox\\shell\\open\\command]
@="cmd /c for %%I in (winbox64.exe winbox.exe) do if exist \\"%%~$PATH:I\\" (start \\"\\" \\"%%~$PATH:I\\" \\"%1\\") else if exist \\"%USERPROFILE%\\\\Downloads\\\\winbox64.exe\\" (start \\"\\" \\"%USERPROFILE%\\\\Downloads\\\\winbox64.exe\\" \\"%1\\") else (start \\"\\" winbox64.exe \\"%1\\")"
`;

    const blob = new Blob([regContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `register_winbox_protocol.reg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="winbox-launcher-backdrop"
      className="fixed top-0 left-0 right-0 bottom-8 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="winbox-launcher-modal"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
          isLightMode
            ? 'bg-white border-slate-300 text-slate-900 shadow-slate-900/20'
            : 'bg-slate-950 border-slate-800 text-slate-100 shadow-black/80'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 py-3 border-b ${
            isLightMode
              ? 'bg-slate-50 border-slate-200'
              : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {/* WinBox Logo */}
            <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center shadow-xs shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="4" fill="#0284c7" />
                <path d="M6 7h3l2 7 2-5 2 5 2-7h3l-3.5 11h-2.5l-2-5-2 5H9L6 7z" fill="white" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">
                  {isEn ? 'MikroTik WinBox Launcher' : 'اجرای نرم‌افزار WinBox میکروتیک'}
                </h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  Port 8291
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate max-w-[280px]">
                {device.name} • {targetHost}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              id="winbox-modal-minimize-btn"
              onClick={onClose}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isLightMode
                  ? 'bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
                  : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
              }`}
              title={isEn ? 'Close' : 'بستن'}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              id="winbox-modal-close-btn"
              onClick={onClose}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isLightMode
                  ? 'bg-slate-100 text-slate-600 hover:text-rose-600 border-slate-200'
                  : 'bg-slate-800 text-slate-400 hover:text-rose-400 border-slate-700'
              }`}
              title={isEn ? 'Close' : 'بستن'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex items-center px-4 border-b text-xs font-mono ${
            isLightMode ? 'bg-slate-100/70 border-slate-200' : 'bg-slate-900/40 border-slate-800/80'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('quick')}
            className={`py-2 px-3 border-b-2 font-semibold transition-all cursor-pointer ${
              activeTab === 'quick'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isEn ? 'Direct Launch' : 'اجرای مستقیم'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cli')}
            className={`py-2 px-3 border-b-2 font-semibold transition-all cursor-pointer ${
              activeTab === 'cli'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isEn ? 'CLI & Launcher (.bat)' : 'دستور خط فرمان و فایل اجرا'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('protocol')}
            className={`py-2 px-3 border-b-2 font-semibold transition-all cursor-pointer ${
              activeTab === 'protocol'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isEn ? 'Windows Protocol Setup' : 'ثبت پروتکل ویندوز'}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4">
          {/* Target Host Details Banner */}
          <div
            className={`p-3 rounded-lg border text-xs flex items-center justify-between font-mono ${
              isLightMode
                ? 'bg-slate-50 border-slate-200 text-slate-700'
                : 'bg-slate-900/60 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-400">{isEn ? 'Target Host / IP' : 'آدرس مقصد / IP'}</span>
              <span className="font-bold text-sm text-sky-400">{targetHost || '127.0.0.1'}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-400">{isEn ? 'User' : 'نام کاربری'}</span>
              <span className="font-semibold text-slate-200">{username}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-400">{isEn ? 'Port' : 'پورت'}</span>
              <span className="font-semibold text-emerald-400">{winboxPort}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-400">{isEn ? 'Password' : 'رمز عبور'}</span>
              <span className="font-semibold text-slate-400">
                {password ? '••••••••' : isEn ? '(None)' : '(ندارد)'}
              </span>
            </div>
          </div>

          {activeTab === 'quick' && (
            <div className="space-y-3">
              <div
                className={`p-3 rounded-lg border text-xs leading-relaxed flex items-start gap-2.5 ${
                  isLightMode
                    ? 'bg-sky-50/80 border-sky-200 text-sky-950'
                    : 'bg-sky-950/30 border-sky-800/40 text-sky-200'
                }`}
              >
                <Radio className="w-4 h-4 text-sky-400 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="font-semibold">
                    {isEn
                      ? 'Launch signal sent to your operating system via winbox:// protocol.'
                      : 'سیگنال اجرای WinBox از طریق پروتکل winbox:// به سیستم‌عامل شما ارسال شد.'}
                  </p>
                  <p className="text-[11px] opacity-80 mt-1">
                    {isEn
                      ? 'If WinBox is already associated with winbox:// on your PC, it will open automatically.'
                      : 'اگر نرم‌افزار WinBox در سیستم شما نصب یا ثبت شده باشد، بلافاصله باز خواهد شد.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  id="winbox-trigger-with-creds"
                  onClick={() => handleLaunchProtocol(false)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-900/30 active:scale-95 transition-all cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none">
                    <rect x="2" y="2" width="20" height="20" rx="4" fill="white" fillOpacity="0.2" />
                    <path d="M6 7h3l2 7 2-5 2 5 2-7h3l-3.5 11h-2.5l-2-5-2 5H9L6 7z" fill="white" />
                  </svg>
                  <span>{isEn ? 'Open WinBox (With Auth)' : 'اجرای WinBox (با مشخصات)'}</span>
                </button>

                <button
                  type="button"
                  id="winbox-trigger-simple"
                  onClick={() => handleLaunchProtocol(true)}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border font-semibold text-xs transition-all active:scale-95 cursor-pointer ${
                    isLightMode
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <ExternalLink className="w-4 h-4 text-sky-400" />
                  <span>{isEn ? 'Open WinBox (IP Only)' : 'اجرای WinBox (صرفاً آدرس IP)'}</span>
                </button>
              </div>

              {/* WebFig Link */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">
                  {isEn ? 'Also accessible via Web Browser:' : 'دسترسی وب نیز فعال است:'}
                </span>
                <a
                  href={`http://${targetHost}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1.5 font-bold text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>WebFig (HTTP)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {activeTab === 'cli' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  {isEn ? 'Direct Command Line for CMD / PowerShell / Terminal:' : 'دستور خط فرمان مستقیم در CMD یا ترمینال ویندوز:'}
                </label>
                <div
                  className={`flex items-center justify-between p-2 rounded-lg border font-mono text-xs ${
                    isLightMode
                      ? 'bg-slate-100 border-slate-300 text-slate-900'
                      : 'bg-slate-900 border-slate-800 text-sky-300'
                  }`}
                >
                  <span className="truncate mr-2 select-all">{cliCommand}</span>
                  <button
                    type="button"
                    id="winbox-copy-cli-btn"
                    onClick={handleCopyCmd}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-sans font-semibold shrink-0 cursor-pointer"
                  >
                    {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCmd ? (isEn ? 'Copied' : 'کپی شد') : (isEn ? 'Copy' : 'کپی')}</span>
                  </button>
                </div>
              </div>

              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  isLightMode
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div>
                  <h4 className="font-bold text-xs flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isEn ? '1-Click Desktop Launcher (.bat)' : 'فایل اجرای تک‌کلیک دسکتاپ (.bat)'}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isEn
                      ? 'Auto-finds winbox64.exe on your Desktop/Downloads and connects.'
                      : 'فایل winbox64.exe روی سیستم را پیدا کرده و با ۱ کلیک متصل می‌شود.'}
                  </p>
                </div>
                <button
                  type="button"
                  id="winbox-download-bat-btn"
                  onClick={handleDownloadLauncherBat}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs active:scale-95 transition-transform"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Download .bat' : 'دانلود .bat'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'protocol' && (
            <div className="space-y-3">
              <div
                className={`p-3 rounded-lg border text-xs leading-relaxed flex items-start gap-2.5 ${
                  isLightMode
                    ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                    : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                }`}
              >
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {isEn
                      ? 'Enable 1-Click WinBox opening from your browser'
                      : 'فعال‌سازی باز شدن مستقیم WinBox با ۱ کلیک از مرورگر'}
                  </p>
                  <p className="text-[11px] opacity-80 mt-1">
                    {isEn
                      ? 'Windows requires registering the "winbox://" URL protocol once. Download and run this .reg file, and WinBox will launch directly from every browser click forever.'
                      : 'ویندوز برای باز کردن مستقیم WinBox از مرورگر نیاز به ثبت یکباره پروتکل "winbox://" دارد. با اجرای این فایل رجیستری، برای همیشه با کلیک روی آیکون WinBox مستقیماً نرم‌افزار باز می‌شود.'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  id="winbox-download-reg-btn"
                  onClick={handleDownloadRegFix}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer shadow-md active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>{isEn ? 'Download Windows Protocol Fix (.reg)' : 'دانلود فایل فعال‌سازی پروتکل (.reg)'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-4 py-2.5 border-t text-[11px] font-mono ${
            isLightMode ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}
        >
          <span>{isEn ? 'MikroTik RouterOS WinBox Client' : 'کلاینت WinBox میکروتیک'}</span>
          <button
            type="button"
            onClick={onClose}
            className="font-semibold hover:text-white transition-colors cursor-pointer"
          >
            {isEn ? 'Close' : 'بستن'}
          </button>
        </div>
      </div>
    </div>
  );
};
