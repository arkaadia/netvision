import React, { useState } from 'react';
import {
  SearchCode,
  Minus,
  X,
  Play,
  Loader2,
  Copy,
  Check,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Device } from '../../types';

interface PortScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  allDevices?: Device[];
  isEn: boolean;
  isLightMode: boolean;
}

interface PortScanResult {
  port: number;
  service: string;
  state: 'open' | 'closed' | 'filtered';
  latencyMs: number;
  banner?: string;
}

const COMMON_PRESETS = [
  { label: 'Management (SSH/Telnet/Winbox)', ports: '22,23,80,443,8291,8728' },
  { label: 'Web Services (HTTP/S/Alt)', ports: '80,443,8000,8080,8443,8888' },
  { label: 'MikroTik Suite', ports: '21,22,23,80,443,2000,8291,8728,8729' },
  { label: 'Databases', ports: '1433,1521,3306,5432,6379,27017' },
  { label: 'Top 20 Common Ports', ports: '21,22,23,25,53,80,110,135,139,143,443,445,993,995,1433,3306,3389,5432,8080,8291' }
];

export const PortScannerModal: React.FC<PortScannerModalProps> = ({
  isOpen,
  onClose,
  onMinimize,
  allDevices = [],
  isEn,
  isLightMode
}) => {
  const [host, setHost] = useState<string>('127.0.0.1');
  const [portsInput, setPortsInput] = useState<string>('22,23,80,443,8291');
  const [timeoutSec, setTimeoutSec] = useState<number>(0.8);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [results, setResults] = useState<PortScanResult[]>([]);
  const [filterOpenOnly, setFilterOpenOnly] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleStartScan = async () => {
    if (!host.trim()) {
      setErrorMessage(isEn ? 'Please specify a target IP or hostname' : 'لطفاً آدرس آی‌پی یا نام هاست را وارد کنید');
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);
    setResults([]);

    try {
      // Parse ports
      const rawTokens = portsInput.split(/[\s,]+/);
      const parsedPorts: number[] = [];
      for (const token of rawTokens) {
        if (!token) continue;
        if (token.includes('-')) {
          const [startStr, endStr] = token.split('-');
          const start = parseInt(startStr, 10);
          const end = parseInt(endStr, 10);
          if (!isNaN(start) && !isNaN(end)) {
            for (let p = Math.min(start, end); p <= Math.min(Math.max(start, end), Math.min(start, end) + 100); p++) {
              if (p > 0 && p <= 65535) parsedPorts.push(p);
            }
          }
        } else {
          const p = parseInt(token, 10);
          if (!isNaN(p) && p > 0 && p <= 65535) parsedPorts.push(p);
        }
      }

      const res = await fetch('/api/tools/port-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host.trim(),
          ports: parsedPorts.length ? Array.from(new Set(parsedPorts)) : undefined,
          timeout: timeoutSec
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isEn ? 'Scan failed' : 'اسکن با خطا مواجه شد'));
      }

      setResults(data.results || []);
    } catch (err: any) {
      setErrorMessage(err.message || (isEn ? 'Network error during port scan' : 'خطای ارتباطی در اجرای اسکن'));
    } finally {
      setIsScanning(false);
    }
  };

  const displayedResults = filterOpenOnly
    ? results.filter((r) => r.state === 'open')
    : results;

  const openCount = results.filter((r) => r.state === 'open').length;

  if (!isOpen) return null;

  return (
    <div
      id="port-scanner-modal-overlay"
      className="fixed top-0 left-0 right-0 bottom-8 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in"
    >
      <div
        id="port-scanner-modal-window"
        className={`w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border transition-all duration-200 overflow-hidden ${
          isLightMode
            ? 'bg-white text-slate-900 border-slate-200 shadow-slate-400/40'
            : 'bg-slate-950 text-slate-100 border-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.8)]'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
            isLightMode ? 'border-slate-100 bg-slate-50/80' : 'border-slate-800/80 bg-slate-900/60'
          } rounded-t-2xl`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
              <SearchCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">
                {isEn ? 'TCP Socket Port Scanner' : 'اسکنر پورت‌های TCP'}
              </h3>
              <p className={`text-[11px] ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn ? 'Live multi-threaded socket probe with service identification' : 'اسکن چندنخی و بلادرنگ سوکت با شناسایی پورت‌های باز و سرویس‌ها'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onMinimize}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLightMode
                  ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-cyan-300'
              }`}
              title={isEn ? 'Minimize' : 'مینیمایز به نوار پایین'}
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

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Controls */}
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              {/* Target Host */}
              <div className={allDevices && allDevices.length > 0 ? "sm:col-span-4" : "sm:col-span-6"}>
                <label className={`block text-xs font-semibold mb-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                  {isEn ? 'Target Host / IP' : 'آدرس آی‌پی یا نام هاست'}
                </label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="192.168.1.1 or example.com"
                  className={`w-full px-3 py-1.5 text-xs font-mono rounded-lg border focus:outline-none ${
                    isLightMode
                      ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500'
                      : 'bg-slate-950 text-cyan-300 border-slate-700 focus:border-cyan-400'
                  }`}
                />
              </div>

              {/* Topology Selector if available */}
              {allDevices && allDevices.length > 0 && (
                <div className="sm:col-span-3">
                  <label className={`block text-xs font-semibold mb-1 truncate ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                    {isEn ? 'From Topology' : 'تجهیز از توپولوژی'}
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) setHost(e.target.value);
                    }}
                    className={`w-full px-2 py-1.5 text-xs rounded-lg border cursor-pointer truncate ${
                      isLightMode
                        ? 'bg-white text-slate-700 border-slate-300 focus:border-indigo-500'
                        : 'bg-slate-950 text-slate-300 border-slate-700 focus:border-cyan-400'
                    }`}
                    title={isEn ? 'Select device from topology' : 'انتخاب از تجهیزات توپولوژی'}
                  >
                    <option value="">{isEn ? '-- Select Device --' : '-- انتخاب تجهیز --'}</option>
                    {allDevices.map((d) => (
                      <option key={d.id} value={d.ip}>
                        {d.name} ({d.ip})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Ports */}
              <div className={allDevices && allDevices.length > 0 ? "sm:col-span-3" : "sm:col-span-4"}>
                <label className={`block text-xs font-semibold mb-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                  {isEn ? 'Ports (comma or range)' : 'پورت‌ها (با کاما یا محدوده)'}
                </label>
                <input
                  type="text"
                  value={portsInput}
                  onChange={(e) => setPortsInput(e.target.value)}
                  placeholder="22,80,443,8000-8010"
                  className={`w-full px-3 py-1.5 text-xs font-mono rounded-lg border focus:outline-none ${
                    isLightMode
                      ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500'
                      : 'bg-slate-950 text-cyan-300 border-slate-700 focus:border-cyan-400'
                  }`}
                />
              </div>

              {/* Scan Button */}
              <div className="sm:col-span-2">
                <button
                  onClick={handleStartScan}
                  disabled={isScanning}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isScanning
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : isLightMode
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 shadow-sm'
                  }`}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isEn ? 'Scanning...' : 'در حال اسکن'}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Scan' : 'شروع اسکن'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-dashed border-slate-700/30">
              <span className={`text-[10px] ${isLightMode ? 'text-slate-500' : 'text-slate-400'} mr-1`}>
                {isEn ? 'Presets:' : 'پیش‌فرض‌ها:'}
              </span>
              {COMMON_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setPortsInput(preset.ports)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer border ${
                    isLightMode
                      ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Results Table Header Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono">
                {isEn ? 'Scan Results' : 'نتایج اسکن'}
              </span>
              {results.length > 0 && (
                <span className="text-[11px] font-mono text-emerald-400">
                  ({openCount} {isEn ? 'open' : 'پورت باز'} / {results.length} {isEn ? 'scanned' : 'بررسی شده'})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-[11px] cursor-pointer text-slate-400">
                <input
                  type="checkbox"
                  checked={filterOpenOnly}
                  onChange={(e) => setFilterOpenOnly(e.target.checked)}
                  className="accent-cyan-500"
                />
                <span>{isEn ? 'Open only' : 'فقط پورت‌های باز'}</span>
              </label>

              {results.length > 0 && (
                <button
                  onClick={() => {
                    const text = results
                      .map((r) => `Port ${r.port} (${r.service}): ${r.state.toUpperCase()} [${r.latencyMs}ms] ${r.banner || ''}`)
                      .join('\n');
                    navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition ${
                    isLightMode ? 'bg-white border-slate-300' : 'bg-white/5 border-white/10'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Results Table */}
          <div
            className={`rounded-xl border overflow-hidden ${
              isLightMode ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}
          >
            {displayedResults.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {isScanning
                  ? (isEn ? 'Scanning ports... Please wait.' : 'در حال اسکن پورت‌ها... لطفاً شکیبا باشید.')
                  : (isEn ? 'No scan results yet. Enter a target and click Scan.' : 'هنوز اسکنی انجام نشده است. هاست را وارد کرده و دکمه اسکن را بزنید.')}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-64 custom-scrollbar">
                <table className="w-full text-xs font-mono text-left rtl:text-right">
                  <thead
                    className={`text-[10px] uppercase border-b ${
                      isLightMode ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    <tr>
                      <th className="px-3.5 py-2">Port</th>
                      <th className="px-3.5 py-2">{isEn ? 'Service' : 'سرویس'}</th>
                      <th className="px-3.5 py-2">{isEn ? 'State' : 'وضعیت'}</th>
                      <th className="px-3.5 py-2">{isEn ? 'Latency' : 'تاخیر'}</th>
                      <th className="px-3.5 py-2">{isEn ? 'Banner / Version' : 'بنر / نسخه'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {displayedResults.map((r) => (
                      <tr
                        key={r.port}
                        className={`transition ${
                          r.state === 'open'
                            ? isLightMode
                              ? 'bg-emerald-50/50'
                              : 'bg-emerald-950/20'
                            : isLightMode
                            ? 'hover:bg-slate-50'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="px-3.5 py-2 font-bold text-cyan-400">{r.port}</td>
                        <td className="px-3.5 py-2 text-slate-300">{r.service}</td>
                        <td className="px-3.5 py-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 border ${
                              r.state === 'open'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : r.state === 'filtered'
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : 'bg-slate-800/60 text-slate-400 border-slate-700/60'
                            }`}
                          >
                            {r.state === 'open' ? (
                              <CheckCircle2 className="w-2.5 h-2.5" />
                            ) : (
                              <XCircle className="w-2.5 h-2.5" />
                            )}
                            {r.state.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3.5 py-2 text-slate-400">{r.latencyMs}ms</td>
                        <td className="px-3.5 py-2 text-slate-300 text-[11px] truncate max-w-xs">
                          {r.banner || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t shrink-0 ${
            isLightMode ? 'border-slate-100 bg-slate-50/80' : 'border-slate-800/80 bg-slate-900/60'
          } rounded-b-2xl`}
        >
          <span className="text-xs text-slate-400 font-mono">
            {isEn ? 'Socket connection timeout:' : 'مهلت ارتباط سوکت:'} {timeoutSec}s
          </span>

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
  );
};
