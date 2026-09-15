import React, { useState } from 'react';
import {
  Globe2,
  Minus,
  X,
  Play,
  Loader2,
  Copy,
  Check,
  Terminal,
  Activity,
  AlertCircle
} from 'lucide-react';

interface DnsUtilitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  isEn: boolean;
  isLightMode: boolean;
}

interface DnsAnswer {
  name: string;
  ttl: string;
  class: string;
  type: string;
  data: string;
}

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'ANY'];

const NAMESERVER_PRESETS = [
  { label: 'System Default', value: '' },
  { label: 'Cloudflare (1.1.1.1)', value: '1.1.1.1' },
  { label: 'Google Public (8.8.8.8)', value: '8.8.8.8' },
  { label: 'Quad9 Security (9.9.9.9)', value: '9.9.9.9' }
];

export const DnsUtilitiesModal: React.FC<DnsUtilitiesModalProps> = ({
  isOpen,
  onClose,
  onMinimize,
  isEn,
  isLightMode
}) => {
  const [activeTab, setActiveTab] = useState<'dns' | 'ping'>('dns');

  // DNS State
  const [dnsTarget, setDnsTarget] = useState<string>('google.com');
  const [recordType, setRecordType] = useState<string>('A');
  const [nameserver, setNameserver] = useState<string>('');
  const [isDnsLoading, setIsDnsLoading] = useState<boolean>(false);
  const [dnsAnswers, setDnsAnswers] = useState<DnsAnswer[]>([]);
  const [dnsRawOutput, setDnsRawOutput] = useState<string>('');
  const [dnsError, setDnsError] = useState<string | null>(null);

  // Ping State
  const [pingTarget, setPingTarget] = useState<string>('8.8.8.8');
  const [pingCount, setPingCount] = useState<number>(4);
  const [isPingLoading, setIsPingLoading] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<any | null>(null);
  const [pingError, setPingError] = useState<string | null>(null);

  const [copied, setCopied] = useState<boolean>(false);

  const handleRunDns = async () => {
    if (!dnsTarget.trim()) return;
    setIsDnsLoading(true);
    setDnsError(null);
    setDnsAnswers([]);
    setDnsRawOutput('');

    try {
      const res = await fetch('/api/tools/dns-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: dnsTarget.trim(),
          recordType,
          nameserver: nameserver.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isEn ? 'DNS Query failed' : 'پرس‌وجوی DNS با خطا مواجه شد'));
      }
      setDnsAnswers(data.answers || []);
      setDnsRawOutput(data.rawOutput || '');
    } catch (err: any) {
      setDnsError(err.message);
    } finally {
      setIsDnsLoading(false);
    }
  };

  const handleRunPing = async () => {
    if (!pingTarget.trim()) return;
    setIsPingLoading(true);
    setPingError(null);
    setPingResult(null);

    try {
      const res = await fetch('/api/tools/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: pingTarget.trim(),
          count: pingCount
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isEn ? 'Ping test failed' : 'تست پینگ با خطا مواجه شد'));
      }
      setPingResult(data);
    } catch (err: any) {
      setPingError(err.message);
    } finally {
      setIsPingLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="dns-utilities-modal-overlay"
      className="fixed top-0 left-0 right-0 bottom-8 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in"
    >
      <div
        id="dns-utilities-modal-window"
        className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border transition-all duration-200 ${
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white shadow-md">
              <Globe2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">
                {isEn ? 'Network Utilities: DNS & Ping' : 'ابزارهای شبکه: استعلام DNS و پینگ'}
              </h3>
              <p className={`text-[11px] ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn ? 'Query DNS records (Dig / Nslookup) and perform ICMP latency diagnostics' : 'استعلام جامع رکوردهای دی‌ان‌اس و سنجش تاخیر پکت‌های ICMP'}
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

        {/* Tab switcher */}
        <div
          className={`flex items-center gap-1 px-5 py-2 border-b shrink-0 ${
            isLightMode ? 'border-slate-100 bg-slate-50/40' : 'border-slate-850 bg-slate-900/30'
          }`}
        >
          <button
            onClick={() => setActiveTab('dns')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'dns'
                ? isLightMode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-sm'
                : isLightMode
                ? 'text-slate-600 hover:bg-slate-100'
                : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>{isEn ? 'DNS & Dig Records' : 'استعلام DNS و Dig'}</span>
          </button>

          <button
            onClick={() => setActiveTab('ping')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'ping'
                ? isLightMode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-sm'
                : isLightMode
                ? 'text-slate-600 hover:bg-slate-100'
                : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{isEn ? 'ICMP Ping Diagnostics' : 'سنجش پینگ ICMP'}</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {activeTab === 'dns' ? (
            <>
              {/* DNS Input Bar */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-5">
                    <label className={`block text-xs font-semibold mb-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {isEn ? 'Target Hostname or IP' : 'نام هاست یا آدرس آی‌پی'}
                    </label>
                    <input
                      type="text"
                      value={dnsTarget}
                      onChange={(e) => setDnsTarget(e.target.value)}
                      placeholder="google.com"
                      className={`w-full px-3 py-1.5 text-xs font-mono rounded-lg border focus:outline-none ${
                        isLightMode
                          ? 'bg-white text-slate-900 border-slate-300 focus:border-blue-500'
                          : 'bg-slate-950 text-cyan-300 border-slate-700 focus:border-cyan-400'
                      }`}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={`block text-xs font-semibold mb-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {isEn ? 'Record' : 'نوع رکورد'}
                    </label>
                    <select
                      value={recordType}
                      onChange={(e) => setRecordType(e.target.value)}
                      className={`w-full px-2 py-1.5 text-xs font-mono rounded-lg border cursor-pointer ${
                        isLightMode
                          ? 'bg-white text-slate-900 border-slate-300'
                          : 'bg-slate-950 text-cyan-300 border-slate-700'
                      }`}
                    >
                      {RECORD_TYPES.map((rt) => (
                        <option key={rt} value={rt}>{rt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className={`block text-xs font-semibold mb-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {isEn ? 'Nameserver' : 'نیم‌سرور'}
                    </label>
                    <select
                      value={nameserver}
                      onChange={(e) => setNameserver(e.target.value)}
                      className={`w-full px-2 py-1.5 text-xs rounded-lg border cursor-pointer ${
                        isLightMode
                          ? 'bg-white text-slate-900 border-slate-300'
                          : 'bg-slate-950 text-slate-300 border-slate-700'
                      }`}
                    >
                      {NAMESERVER_PRESETS.map((ns) => (
                        <option key={ns.label} value={ns.value}>{ns.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex items-end">
                    <button
                      onClick={handleRunDns}
                      disabled={isDnsLoading}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        isDnsLoading
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : isLightMode
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:opacity-90 shadow-sm'
                      }`}
                    >
                      {isDnsLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{isEn ? 'Querying...' : 'درحال پرسش'}</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Resolve' : 'استعلام'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {dnsError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{dnsError}</span>
                </div>
              )}

              {/* Answers Table */}
              {dnsAnswers.length > 0 && (
                <div
                  className={`rounded-xl border overflow-hidden ${
                    isLightMode ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <table className="w-full text-xs font-mono text-left rtl:text-right">
                    <thead
                      className={`text-[10px] uppercase border-b ${
                        isLightMode ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      <tr>
                        <th className="px-3.5 py-2">Host</th>
                        <th className="px-3.5 py-2">TTL</th>
                        <th className="px-3.5 py-2">Type</th>
                        <th className="px-3.5 py-2">Data / IP / Target</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {dnsAnswers.map((ans, idx) => (
                        <tr key={idx} className={isLightMode ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]'}>
                          <td className="px-3.5 py-2 text-slate-400">{ans.name}</td>
                          <td className="px-3.5 py-2 text-slate-500">{ans.ttl}</td>
                          <td className="px-3.5 py-2 font-bold text-cyan-400">{ans.type}</td>
                          <td className="px-3.5 py-2 font-bold text-indigo-400">{ans.data}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Raw Dig Terminal Output */}
              {dnsRawOutput && (
                <div
                  className={`p-3.5 rounded-xl border ${
                    isLightMode ? 'bg-slate-900 text-slate-200 border-slate-800' : 'bg-black/80 text-emerald-300 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 text-xs font-mono text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Raw Dig Console Response' : 'خروجی متنی کنسول Dig'}</span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(dnsRawOutput);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="hover:text-white transition"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono whitespace-pre-wrap overflow-x-auto max-h-48 custom-scrollbar">
                    {dnsRawOutput}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Ping Tab */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-7">
                    <label className={`block text-xs font-semibold mb-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {isEn ? 'Host to Ping' : 'آدرس هاست جهت پینگ'}
                    </label>
                    <input
                      type="text"
                      value={pingTarget}
                      onChange={(e) => setPingTarget(e.target.value)}
                      placeholder="8.8.8.8"
                      className={`w-full px-3 py-1.5 text-xs font-mono rounded-lg border focus:outline-none ${
                        isLightMode
                          ? 'bg-white text-slate-900 border-slate-300 focus:border-blue-500'
                          : 'bg-slate-950 text-cyan-300 border-slate-700 focus:border-cyan-400'
                      }`}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={`block text-xs font-semibold mb-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {isEn ? 'Count' : 'تعداد'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={pingCount}
                      onChange={(e) => setPingCount(parseInt(e.target.value, 10))}
                      className={`w-full px-2 py-1.5 text-xs font-mono rounded-lg border ${
                        isLightMode ? 'bg-white border-slate-300' : 'bg-slate-950 border-slate-700'
                      }`}
                    />
                  </div>

                  <div className="sm:col-span-3 flex items-end">
                    <button
                      onClick={handleRunPing}
                      disabled={isPingLoading}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        isPingLoading
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : isLightMode
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:opacity-90 shadow-sm'
                      }`}
                    >
                      {isPingLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{isEn ? 'Pinging...' : 'در حال پینگ'}</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Start Ping' : 'شروع پینگ'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {pingError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pingError}</span>
                </div>
              )}

              {pingResult && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div
                      className={`p-3 rounded-xl border ${
                        isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                      }`}
                    >
                      <span className="text-[10px] text-slate-400 block">{isEn ? 'Packets Tx/Rx' : 'بسته‌های ارسالی/دریافتی'}</span>
                      <span className="text-sm font-bold font-mono text-cyan-400">
                        {pingResult.transmitted} / {pingResult.received}
                      </span>
                    </div>

                    <div
                      className={`p-3 rounded-xl border ${
                        isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                      }`}
                    >
                      <span className="text-[10px] text-slate-400 block">{isEn ? 'Packet Loss' : 'اتلاف بسته'}</span>
                      <span
                        className={`text-sm font-bold font-mono ${
                          pingResult.packetLossPct === 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {pingResult.packetLossPct}%
                      </span>
                    </div>

                    <div
                      className={`p-3 rounded-xl border ${
                        isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                      }`}
                    >
                      <span className="text-[10px] text-slate-400 block">{isEn ? 'Average Latency' : 'میانگین تاخیر'}</span>
                      <span className="text-sm font-bold font-mono text-indigo-400">
                        {pingResult.avgRttMs ? `${pingResult.avgRttMs}ms` : '—'}
                      </span>
                    </div>

                    <div
                      className={`p-3 rounded-xl border ${
                        isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                      }`}
                    >
                      <span className="text-[10px] text-slate-400 block">{isEn ? 'Min / Max' : 'حداقل / حداکثر'}</span>
                      <span className="text-sm font-bold font-mono text-slate-300">
                        {pingResult.minRttMs ? `${pingResult.minRttMs} / ${pingResult.maxRttMs}ms` : '—'}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`p-3.5 rounded-xl border ${
                      isLightMode ? 'bg-slate-900 text-slate-200 border-slate-800' : 'bg-black/80 text-emerald-300 border-slate-800'
                    }`}
                  >
                    <pre className="text-[11px] font-mono whitespace-pre-wrap">
                      {pingResult.rawOutput}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t shrink-0 ${
            isLightMode ? 'border-slate-100 bg-slate-50/80' : 'border-slate-800/80 bg-slate-900/60'
          } rounded-b-2xl`}
        >
          <span className="text-xs text-slate-400 font-mono">
            {isEn ? 'ICMP & DNS tools execute directly via backend system utilities' : 'ابزارها مستقیماً توسط زیرسیستم بک‌اند لینوکس اجرا می‌شوند'}
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
