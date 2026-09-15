import React, { useState } from 'react';
import {
  Route,
  Minus,
  X,
  Play,
  Loader2,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ArrowDown,
  Terminal
} from 'lucide-react';

interface TracerouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  isEn: boolean;
  isLightMode: boolean;
}

interface HopInfo {
  hop: number;
  host: string;
  ip: string;
  rttMs: number | null;
  rtts: (number | null)[];
}

export const TracerouteModal: React.FC<TracerouteModalProps> = ({
  isOpen,
  onClose,
  onMinimize,
  isEn,
  isLightMode
}) => {
  const [target, setTarget] = useState<string>('1.1.1.1');
  const [maxHops, setMaxHops] = useState<number>(20);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hops, setHops] = useState<HopInfo[]>([]);
  const [rawOutput, setRawOutput] = useState<string>('');
  const [reachedTarget, setReachedTarget] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleRunTrace = async () => {
    if (!target.trim()) return;
    setIsLoading(true);
    setError(null);
    setHops([]);
    setRawOutput('');
    setReachedTarget(false);

    try {
      const res = await fetch('/api/tools/traceroute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: target.trim(),
          maxHops,
          timeout: 2
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isEn ? 'Traceroute failed' : 'ردیابی مسیر با خطا مواجه شد'));
      }
      setHops(data.hops || []);
      setRawOutput(data.rawOutput || '');
      setReachedTarget(!!data.reachedTarget);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="traceroute-modal-overlay"
      className="fixed top-0 left-0 right-0 bottom-8 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in"
    >
      <div
        id="traceroute-modal-window"
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-md">
              <Route className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">
                {isEn ? 'Traceroute & Hop Path Analyzer' : 'ردیابی مسیر شبکه و تحلیل هاپ‌ها'}
              </h3>
              <p className={`text-[11px] ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn ? 'Real-time packet routing, intermediate routers & hop latency profiling' : 'تحلیل گره‌های بین‌راهی شبکه، سنجش زمان تاخیر هر پرش و بررسی سلامت مسیر'}
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
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7">
                <label className={`block text-xs font-semibold mb-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                  {isEn ? 'Target Host or IP' : 'آدرس آی‌پی یا هاست مقصد'}
                </label>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="8.8.8.8 or cloudflare.com"
                  className={`w-full px-3 py-1.5 text-xs font-mono rounded-lg border focus:outline-none ${
                    isLightMode
                      ? 'bg-white text-slate-900 border-slate-300 focus:border-purple-500'
                      : 'bg-slate-950 text-cyan-300 border-slate-700 focus:border-cyan-400'
                  }`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={`block text-xs font-semibold mb-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                  {isEn ? 'Max Hops' : 'حداکثر هاپ'}
                </label>
                <input
                  type="number"
                  min="5"
                  max="35"
                  value={maxHops}
                  onChange={(e) => setMaxHops(parseInt(e.target.value, 10))}
                  className={`w-full px-2 py-1.5 text-xs font-mono rounded-lg border ${
                    isLightMode ? 'bg-white border-slate-300' : 'bg-slate-950 border-slate-700'
                  }`}
                />
              </div>

              <div className="sm:col-span-3 flex items-end">
                <button
                  onClick={handleRunTrace}
                  disabled={isLoading}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isLoading
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : isLightMode
                      ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                      : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:opacity-90 shadow-sm'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isEn ? 'Tracing...' : 'در حال ردیابی...'}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Trace Route' : 'ردیابی مسیر'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Hop Results Matrix */}
          {hops.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span>{isEn ? `Path Graph (${hops.length} Hops)` : `نمودار مسیر (${hops.length} پرش)`}</span>
                  {reachedTarget && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {isEn ? 'Destination Reached' : 'مقصد با موفقیت پاسخ داد'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowRaw(!showRaw)}
                    className={`px-2 py-1 rounded text-xs flex items-center gap-1 border transition ${
                      isLightMode ? 'bg-white border-slate-300' : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <Terminal className="w-3 h-3" />
                    <span>{showRaw ? (isEn ? 'Show Visual' : 'نمایش گرافیکی') : (isEn ? 'Raw Terminal' : 'خروجی ترمینال')}</span>
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(rawOutput);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className={`p-1.5 rounded border text-xs transition ${
                      isLightMode ? 'bg-white border-slate-300' : 'bg-white/5 border-white/10'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {showRaw ? (
                <div
                  className={`p-3.5 rounded-xl border ${
                    isLightMode ? 'bg-slate-900 text-slate-200 border-slate-800' : 'bg-black/80 text-emerald-300 border-slate-800'
                  }`}
                >
                  <pre className="text-[11px] font-mono whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                    {rawOutput}
                  </pre>
                </div>
              ) : (
                <div
                  className={`rounded-xl border overflow-hidden ${
                    isLightMode ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="overflow-x-auto max-h-72 custom-scrollbar">
                    <table className="w-full text-xs font-mono text-left rtl:text-right">
                      <thead
                        className={`text-[10px] uppercase border-b ${
                          isLightMode ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        <tr>
                          <th className="px-3 py-2">Hop</th>
                          <th className="px-3 py-2">{isEn ? 'Router / IP' : 'روتر / آی‌پی'}</th>
                          <th className="px-3 py-2">{isEn ? 'Hostname' : 'نام هاست'}</th>
                          <th className="px-3 py-2">{isEn ? 'Latency' : 'تاخیر (RTT)'}</th>
                          <th className="px-3 py-2">{isEn ? 'Speed' : 'سرعت'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {hops.map((h) => {
                          const isTimeout = !h.ip || h.ip === '*';
                          const rtt = h.rttMs;
                          let rttColor = 'text-emerald-400';
                          let barColor = 'bg-emerald-500';
                          if (rtt && rtt > 150) {
                            rttColor = 'text-rose-400';
                            barColor = 'bg-rose-500';
                          } else if (rtt && rtt > 80) {
                            rttColor = 'text-amber-400';
                            barColor = 'bg-amber-500';
                          } else if (rtt && rtt > 30) {
                            rttColor = 'text-cyan-400';
                            barColor = 'bg-cyan-500';
                          }

                          return (
                            <tr
                              key={h.hop}
                              className={isLightMode ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]'}
                            >
                              <td className="px-3 py-2 font-bold text-slate-400">
                                #{h.hop}
                              </td>
                              <td className="px-3 py-2 font-bold text-cyan-400">
                                {isTimeout ? (
                                  <span className="text-slate-500 italic">* * * (Request Timed Out)</span>
                                ) : (
                                  h.ip
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-400 truncate max-w-xs">
                                {h.host || '—'}
                              </td>
                              <td className={`px-3 py-2 font-bold ${rttColor}`}>
                                {rtt !== null ? `${rtt} ms` : '—'}
                              </td>
                              <td className="px-3 py-2 w-28">
                                {rtt !== null ? (
                                  <div className="w-full bg-slate-700/30 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full ${barColor}`}
                                      style={{ width: `${Math.min(100, Math.max(10, (rtt / 200) * 100))}%` }}
                                    />
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-600">no reply</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t shrink-0 ${
            isLightMode ? 'border-slate-100 bg-slate-50/80' : 'border-slate-800/80 bg-slate-900/60'
          } rounded-b-2xl`}
        >
          <span className="text-xs text-slate-400 font-mono">
            {isEn ? 'Uses ICMP/UDP sockets with TTL incrementing' : 'استفاده از سوکت‌های ارسالی با فیلد TTL افزایشی'}
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
