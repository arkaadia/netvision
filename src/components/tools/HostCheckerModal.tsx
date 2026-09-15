import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Radar,
  Minus,
  X,
  Play,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowUpDown,
  Square
} from 'lucide-react';
import { CheckHostNodeMeta, NodeCheckResult, PingItem } from './types';

interface HostCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  isEn: boolean;
  isLightMode: boolean;
  devices?: any[];
}

// Convert 2-letter ISO country code into country flag emoji
export function getFlagEmoji(countryCode?: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const code = countryCode.toUpperCase();
  const offset = 127397;
  try {
    return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + offset));
  } catch {
    return '🌐';
  }
}

const PRESET_HOSTS = [
  { label: 'Cloudflare (1.1.1.1)', host: '1.1.1.1' },
  { label: 'Google Public (8.8.8.8)', host: '8.8.8.8' },
  { label: 'Google Web (google.com)', host: 'google.com' },
  { label: 'Cloudflare Web', host: 'cloudflare.com' },
  { label: 'Quad9 (9.9.9.9)', host: '9.9.9.9' }
];

const NODE_LIMITS = [3, 5, 10, 15, 20, 25];

export const HostCheckerModal: React.FC<HostCheckerModalProps> = ({
  isOpen,
  onClose,
  onMinimize,
  isEn,
  isLightMode,
  devices = []
}) => {
  const [targetHost, setTargetHost] = useState<string>('1.1.1.1');
  const [maxNodes, setMaxNodes] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [permanentLink, setPermanentLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, NodeCheckResult>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ok' | 'partial' | 'timeout' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'latency_asc' | 'latency_desc' | 'country' | 'loss'>('latency_asc');
  const [copied, setCopied] = useState<boolean>(false);
  const [pollCount, setPollCount] = useState<number>(0);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingActiveRef = useRef<boolean>(false);

  // Clean up polling timer on unmount or close
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
      isPollingActiveRef.current = false;
    };
  }, []);

  const handleStopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    isPollingActiveRef.current = false;
    setIsLoading(false);
  };

  const handleStartCheck = async (hostToTest?: string) => {
    const finalHost = (hostToTest || targetHost).trim();
    if (!finalHost) return;

    handleStopPolling();
    setIsLoading(true);
    setError(null);
    setResults({});
    setRequestId(null);
    setPermanentLink(null);
    setPollCount(0);

    try {
      const res = await fetch('/api/tools/check-host/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: finalHost,
          max_nodes: maxNodes
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isEn ? 'Failed to initiate check request' : 'خطا در ثبت درخواست بررسی در سرور چِک‌هاست'));
      }

      setRequestId(data.requestId);
      setPermanentLink(data.permanentLink);

      // Initialize results with node metadata
      const initialMap: Record<string, NodeCheckResult> = {};
      const rawNodes = data.nodes || {};
      for (const nodeKey of Object.keys(rawNodes)) {
        const rawMeta = rawNodes[nodeKey] || [];
        const meta: CheckHostNodeMeta = {
          countryCode: rawMeta[0] || 'xx',
          countryName: rawMeta[1] || 'Unknown',
          city: rawMeta[2] || '',
          ip: rawMeta[3] || '',
          asn: rawMeta[4] || ''
        };
        initialMap[nodeKey] = {
          nodeKey,
          meta,
          status: 'pending',
          pings: [],
          sentCount: 0,
          receivedCount: 0,
          packetLossPercent: 0
        };
      }
      setResults(initialMap);

      // Begin polling check results
      isPollingActiveRef.current = true;
      startPollingResults(data.requestId, initialMap);
    } catch (err: any) {
      setError(err.message || (isEn ? 'Network communication failure' : 'خطا در برقراری ارتباط با سرور'));
      setIsLoading(false);
    }
  };

  const startPollingResults = (reqId: string, baseNodes: Record<string, NodeCheckResult>) => {
    let attempts = 0;
    const maxAttempts = 22; // ~33 seconds max
    let currentMap = { ...baseNodes };

    const poll = async () => {
      if (!isPollingActiveRef.current) return;
      attempts++;
      setPollCount(attempts);

      try {
        const res = await fetch(`/api/tools/check-host/result?request_id=${encodeURIComponent(reqId)}`);
        const data = await res.json();

        if (res.ok && data.success && data.results) {
          const rawResults = data.results;
          let allFinished = true;

          const updatedMap = { ...currentMap };

          for (const nodeKey of Object.keys(updatedMap)) {
            const nodeRaw = rawResults[nodeKey];
            if (!nodeRaw || !nodeRaw[0]) {
              allFinished = false;
              continue;
            }

            // nodeRaw is [[['OK', 0.014, '1.1.1.1'], ['OK', 0.015], ...]]
            const pingList: PingItem[] = (nodeRaw[0] || []) as PingItem[];
            const sentCount = pingList.length;
            const okPings = pingList.filter(p => p && p[0] === 'OK');
            const receivedCount = okPings.length;
            const lossPercent = sentCount > 0 ? Math.round(((sentCount - receivedCount) / sentCount) * 100) : 100;

            const latencies = okPings.map(p => (p?.[1] ? Number(p[1]) * 1000 : 0)).filter(n => n > 0);
            const avgLatencyMs = latencies.length > 0 ? Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1)) : undefined;
            const minLatencyMs = latencies.length > 0 ? Number(Math.min(...latencies).toFixed(1)) : undefined;
            const maxLatencyMs = latencies.length > 0 ? Number(Math.max(...latencies).toFixed(1)) : undefined;

            // Resolved IP is stored in the 3rd element of the first ping item
            const resolvedIp = pingList[0]?.[2] || undefined;

            let status: NodeCheckResult['status'] = 'pending';
            if (sentCount >= 4 || attempts >= 4) {
              if (lossPercent === 0) {
                status = 'ok';
              } else if (lossPercent < 100) {
                status = 'partial_loss';
              } else {
                status = 'timeout';
              }
            } else if (sentCount > 0) {
              status = lossPercent === 0 ? 'ok' : 'partial_loss';
            }

            updatedMap[nodeKey] = {
              ...updatedMap[nodeKey],
              status,
              pings: pingList,
              resolvedIp,
              sentCount,
              receivedCount,
              packetLossPercent: lossPercent,
              avgLatencyMs,
              minLatencyMs,
              maxLatencyMs
            };
          }

          currentMap = updatedMap;
          setResults(updatedMap);

          if (allFinished && Object.keys(updatedMap).length > 0) {
            handleStopPolling();
            return;
          }
        }

        if (attempts >= maxAttempts) {
          handleStopPolling();
        }
      } catch (e) {
        console.warn('Poll error:', e);
      }
    };

    // First immediate poll after 800ms
    setTimeout(poll, 800);
    // Then every 1500ms
    pollTimerRef.current = setInterval(poll, 1500);
  };

  const resultsList = useMemo(() => Object.values(results), [results]);

  // Summary Metrics calculations
  const metrics = useMemo(() => {
    const total = resultsList.length;
    const completed = resultsList.filter(r => r.status !== 'pending' || r.pings.length > 0);
    const okCount = resultsList.filter(r => r.status === 'ok').length;
    const partialCount = resultsList.filter(r => r.status === 'partial_loss').length;
    const timeoutCount = resultsList.filter(r => r.status === 'timeout').length;
    const pendingCount = total - completed.length;

    const latencies = resultsList
      .map(r => r.avgLatencyMs)
      .filter((l): l is number => typeof l === 'number' && l > 0);

    const avgLatency = latencies.length > 0
      ? Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1))
      : null;

    let fastest: NodeCheckResult | null = null;
    let slowest: NodeCheckResult | null = null;

    for (const r of resultsList) {
      if (typeof r.avgLatencyMs === 'number' && r.avgLatencyMs > 0) {
        if (!fastest || (r.avgLatencyMs < (fastest.avgLatencyMs || Infinity))) {
          fastest = r;
        }
        if (!slowest || (r.avgLatencyMs > (slowest.avgLatencyMs || 0))) {
          slowest = r;
        }
      }
    }

    const totalSent = resultsList.reduce((acc, r) => acc + r.sentCount, 0);
    const totalReceived = resultsList.reduce((acc, r) => acc + r.receivedCount, 0);
    const overallLoss = totalSent > 0 ? Math.round(((totalSent - totalReceived) / totalSent) * 100) : 0;

    return {
      total,
      completed: completed.length,
      okCount,
      partialCount,
      timeoutCount,
      pendingCount,
      avgLatency,
      fastest,
      slowest,
      overallLoss
    };
  }, [resultsList]);

  // Filtered and sorted results
  const displayResults = useMemo(() => {
    let list = [...resultsList];

    // Status filter
    if (filterStatus === 'ok') {
      list = list.filter(r => r.status === 'ok');
    } else if (filterStatus === 'partial') {
      list = list.filter(r => r.status === 'partial_loss');
    } else if (filterStatus === 'timeout') {
      list = list.filter(r => r.status === 'timeout');
    } else if (filterStatus === 'pending') {
      list = list.filter(r => r.status === 'pending');
    }

    // Text search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r =>
        r.meta.countryName.toLowerCase().includes(q) ||
        r.meta.city.toLowerCase().includes(q) ||
        r.meta.countryCode.toLowerCase().includes(q) ||
        r.meta.asn.toLowerCase().includes(q) ||
        r.nodeKey.toLowerCase().includes(q) ||
        (r.resolvedIp && r.resolvedIp.toLowerCase().includes(q))
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'latency_asc') {
        const latA = a.avgLatencyMs ?? 999999;
        const latB = b.avgLatencyMs ?? 999999;
        return latA - latB;
      }
      if (sortBy === 'latency_desc') {
        const latA = a.avgLatencyMs ?? -1;
        const latB = b.avgLatencyMs ?? -1;
        return latB - latA;
      }
      if (sortBy === 'country') {
        return a.meta.countryName.localeCompare(b.meta.countryName);
      }
      if (sortBy === 'loss') {
        return b.packetLossPercent - a.packetLossPercent;
      }
      return 0;
    });

    return list;
  }, [resultsList, filterStatus, searchQuery, sortBy]);

  const handleCopyReport = () => {
    if (resultsList.length === 0) return;
    const lines: string[] = [
      `=======================================================`,
      `Global Host Check Report: ${targetHost}`,
      `Date: ${new Date().toISOString()}`,
      `Permanent Link: ${permanentLink || 'N/A'}`,
      `Average Latency: ${metrics.avgLatency !== null ? `${metrics.avgLatency} ms` : 'N/A'}`,
      `Overall Packet Loss: ${metrics.overallLoss}%`,
      `Total Nodes: ${metrics.total} (OK: ${metrics.okCount}, Partial: ${metrics.partialCount}, Timeout: ${metrics.timeoutCount})`,
      `=======================================================`,
      `Country | City | Node | Resolved IP | Avg RTT | Loss %`,
      `-------------------------------------------------------`
    ];

    resultsList.forEach(r => {
      lines.push(
        `${r.meta.countryName} | ${r.meta.city || '-'} | ${r.nodeKey} | ${r.resolvedIp || '-'} | ${r.avgLatencyMs !== undefined ? `${r.avgLatencyMs}ms` : 'Pending'} | ${r.packetLossPercent}%`
      );
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      id="host-checker-modal-overlay"
      className="fixed top-0 left-0 right-0 bottom-8 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="host-checker-modal-container"
        className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all duration-200 ${
          isLightMode
            ? 'bg-white text-slate-900 border-slate-200 shadow-slate-300/60'
            : 'bg-slate-950 text-slate-100 border-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.8)]'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b select-none ${
            isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl flex items-center justify-center shadow-sm ${
                isLightMode ? 'bg-teal-500 text-white shadow-teal-500/20' : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
              }`}
            >
              <Radar className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-sm sm:text-base font-bold tracking-tight ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                  {isEn ? 'Global Host Checker' : 'هاست چکر بین‌المللی'}
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    isLightMode
                      ? 'bg-teal-50 text-teal-700 border-teal-200'
                      : 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                  }`}
                >
                  Check-Host API
                </span>
                {isLoading && (
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-500 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{isEn ? `Testing (${pollCount})...` : `در حال بررسی (${pollCount})...`}</span>
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn
                  ? 'Multi-country latency & ICMP ping diagnostics from global server nodes'
                  : 'تست پینگ، میزان تاخیر (RTT) و افت پکت هاست و آی‌پی از سرورهای کشورهای مختلف جهان'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onMinimize}
              title={isEn ? 'Minimize' : 'کوچک کردن'}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isLightMode ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title={isEn ? 'Close' : 'بستن'}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isLightMode ? 'hover:bg-rose-100 text-slate-600 hover:text-rose-600' : 'hover:bg-rose-500/20 text-slate-400 hover:text-rose-400'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* Controls Bar: Target Host & Max Nodes */}
          <div
            className={`p-4 rounded-xl border space-y-3.5 ${
              isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              {/* Target Host Input */}
              <div className="sm:col-span-6">
                <label className={`block text-xs font-semibold mb-1.5 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                  {isEn ? 'Target Hostname, Domain or IP' : 'آدرس هاست، دامنه یا آی‌پی مقصد'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={targetHost}
                    onChange={(e) => setTargetHost(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleStartCheck()}
                    placeholder="google.com, 1.1.1.1, ..."
                    className={`w-full px-3.5 py-2 text-xs font-mono rounded-lg border focus:outline-none transition ${
                      isLightMode
                        ? 'bg-white text-slate-900 border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500'
                        : 'bg-slate-950 text-teal-300 border-slate-700 focus:border-teal-400 focus:ring-1 focus:ring-teal-400'
                    }`}
                  />
                  {targetHost && (
                    <button
                      onClick={() => setTargetHost('')}
                      className={`absolute right-2.5 top-2.5 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Max Nodes */}
              <div className="sm:col-span-3">
                <label className={`block text-xs font-semibold mb-1.5 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                  {isEn ? 'Global Nodes Count' : 'تعداد سرورهای جهانی'}
                </label>
                <select
                  value={maxNodes}
                  onChange={(e) => setMaxNodes(Number(e.target.value))}
                  disabled={isLoading}
                  className={`w-full px-3 py-2 text-xs font-mono rounded-lg border cursor-pointer focus:outline-none transition ${
                    isLightMode
                      ? 'bg-white text-slate-900 border-slate-300 focus:border-teal-500'
                      : 'bg-slate-950 text-slate-200 border-slate-700 focus:border-teal-400'
                  }`}
                >
                  {NODE_LIMITS.map(num => (
                    <option key={num} value={num}>
                      {isEn ? `${num} Nodes / Countries` : `${num} سرور / کشور`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="sm:col-span-3 flex items-center gap-2">
                {!isLoading ? (
                  <button
                    onClick={() => handleStartCheck()}
                    disabled={!targetHost.trim()}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-md transition cursor-pointer ${
                      !targetHost.trim()
                        ? 'opacity-50 cursor-not-allowed bg-slate-400'
                        : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-teal-500/20 active:scale-[0.98]'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isEn ? 'Run Check' : 'شروع بررسی'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStopPolling}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-500/20 transition cursor-pointer active:scale-[0.98]"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>{isEn ? 'Stop' : 'توقف'}</span>
                  </button>
                )}

                {resultsList.length > 0 && !isLoading && (
                  <button
                    onClick={() => handleStartCheck()}
                    title={isEn ? 'Re-check' : 'بررسی مجدد'}
                    className={`p-2 rounded-lg border transition cursor-pointer ${
                      isLightMode
                        ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Presets & Devices */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className={`text-[11px] font-medium mr-1 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn ? 'Quick Presets:' : 'پیش‌فرض‌های آماده:'}
              </span>

              {PRESET_HOSTS.map((preset) => (
                <button
                  key={preset.host}
                  onClick={() => {
                    setTargetHost(preset.host);
                    handleStartCheck(preset.host);
                  }}
                  disabled={isLoading}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition border cursor-pointer ${
                    targetHost === preset.host
                      ? isLightMode
                        ? 'bg-teal-50 border-teal-300 text-teal-700 font-semibold'
                        : 'bg-teal-500/20 border-teal-500/40 text-teal-300 font-semibold'
                      : isLightMode
                      ? 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs ${
                isLightMode
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="flex-1 font-medium">{error}</div>
              <button
                onClick={() => handleStartCheck()}
                className="px-2.5 py-1 rounded-md bg-rose-600 text-white hover:bg-rose-500 transition text-[11px]"
              >
                {isEn ? 'Retry' : 'تلاش مجدد'}
              </button>
            </div>
          )}

          {/* Metrics & Report summary */}
          {resultsList.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Avg RTT */}
              <div
                className={`p-3.5 rounded-xl border ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className={`text-[11px] font-medium flex items-center justify-between ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <span>{isEn ? 'Global Avg Latency' : 'میانگین تاخیر جهانی'}</span>
                  <Clock className="w-3.5 h-3.5 opacity-70" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span
                    className={`text-xl font-bold font-mono ${
                      metrics.avgLatency === null
                        ? isLightMode ? 'text-slate-400' : 'text-slate-600'
                        : metrics.avgLatency < 60
                        ? 'text-emerald-500'
                        : metrics.avgLatency < 140
                        ? 'text-blue-500'
                        : metrics.avgLatency < 220
                        ? 'text-amber-500'
                        : 'text-rose-500'
                    }`}
                  >
                    {metrics.avgLatency !== null ? `${metrics.avgLatency}` : '--'}
                  </span>
                  <span className={`text-xs font-semibold ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                    ms
                  </span>
                </div>
                <div className={`text-[10px] mt-1 truncate ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {isEn ? 'Across responding nodes' : 'بین نودهای پاسخ‌داده'}
                </div>
              </div>

              {/* Fastest Server */}
              <div
                className={`p-3.5 rounded-xl border ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className={`text-[11px] font-medium flex items-center justify-between ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <span>{isEn ? 'Fastest Node' : 'سریع‌ترین سرور'}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-emerald-500">
                    {metrics.fastest?.avgLatencyMs !== undefined ? `${metrics.fastest.avgLatencyMs}` : '--'}
                  </span>
                  <span className={`text-xs font-semibold ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                    ms
                  </span>
                </div>
                <div className={`text-[10px] mt-1 truncate font-medium ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                  {metrics.fastest ? (
                    <span className="flex items-center gap-1">
                      <span>{getFlagEmoji(metrics.fastest.meta.countryCode)}</span>
                      <span>{metrics.fastest.meta.countryName}</span>
                      {metrics.fastest.meta.city && <span className="opacity-75">({metrics.fastest.meta.city})</span>}
                    </span>
                  ) : (
                    '--'
                  )}
                </div>
              </div>

              {/* Packet Loss */}
              <div
                className={`p-3.5 rounded-xl border ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className={`text-[11px] font-medium flex items-center justify-between ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <span>{isEn ? 'Total Packet Loss' : 'مجموع افت پکت'}</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span
                    className={`text-xl font-bold font-mono ${
                      metrics.overallLoss === 0
                        ? 'text-emerald-500'
                        : metrics.overallLoss < 25
                        ? 'text-amber-500'
                        : 'text-rose-500'
                    }`}
                  >
                    {metrics.overallLoss}%
                  </span>
                </div>
                <div className={`text-[10px] mt-1 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {metrics.timeoutCount > 0
                    ? isEn ? `${metrics.timeoutCount} nodes unreachable` : `${metrics.timeoutCount} نود بی‌پاسخ`
                    : isEn ? 'All packets delivered' : 'ارتباط کاملاً پایدار'}
                </div>
              </div>

              {/* Testing Progress */}
              <div
                className={`p-3.5 rounded-xl border ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className={`text-[11px] font-medium flex items-center justify-between ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <span>{isEn ? 'Nodes Tested' : 'نودهای تکمیل‌شده'}</span>
                  <Radar className="w-3.5 h-3.5 text-teal-500" />
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-teal-500">
                    {metrics.completed}
                  </span>
                  <span className={`text-xs font-semibold ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    / {metrics.total}
                  </span>
                </div>
                <div className={`text-[10px] mt-1 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {isLoading
                    ? isEn ? 'Polling node results...' : 'دریافت پاسخ‌ها...'
                    : isEn ? 'Diagnostic complete' : 'پایان بررسی'}
                </div>
              </div>
            </div>
          )}

          {/* Filtering, Search & Action Bar */}
          {resultsList.length > 0 && (
            <div
              className={`p-3 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs ${
                isLightMode ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-900/40 border-slate-800'
              }`}
            >
              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    filterStatus === 'all'
                      ? isLightMode
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-900 shadow-sm'
                      : isLightMode
                      ? 'text-slate-600 hover:bg-slate-200'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {isEn ? `All (${metrics.total})` : `همه (${metrics.total})`}
                </button>

                <button
                  onClick={() => setFilterStatus('ok')}
                  className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition cursor-pointer ${
                    filterStatus === 'ok'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isLightMode
                      ? 'text-emerald-700 hover:bg-emerald-50'
                      : 'text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{isEn ? `OK (${metrics.okCount})` : `سالم (${metrics.okCount})`}</span>
                </button>

                {metrics.partialCount > 0 && (
                  <button
                    onClick={() => setFilterStatus('partial')}
                    className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition cursor-pointer ${
                      filterStatus === 'partial'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : isLightMode
                        ? 'text-amber-700 hover:bg-amber-50'
                        : 'text-amber-400 hover:bg-amber-500/10'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>{isEn ? `Loss (${metrics.partialCount})` : `افت پکت (${metrics.partialCount})`}</span>
                  </button>
                )}

                {metrics.timeoutCount > 0 && (
                  <button
                    onClick={() => setFilterStatus('timeout')}
                    className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition cursor-pointer ${
                      filterStatus === 'timeout'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : isLightMode
                        ? 'text-rose-700 hover:bg-rose-50'
                        : 'text-rose-400 hover:bg-rose-500/10'
                    }`}
                  >
                    <XCircle className="w-3 h-3" />
                    <span>{isEn ? `Timeout (${metrics.timeoutCount})` : `قطع (${metrics.timeoutCount})`}</span>
                  </button>
                )}
              </div>

              {/* Search, Sort and Export */}
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 sm:w-44">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isEn ? 'Search country, city, ASN...' : 'جستجوی کشور، شهر، ASN...'}
                    className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none ${
                      isLightMode
                        ? 'bg-white text-slate-900 border-slate-300 focus:border-teal-500'
                        : 'bg-slate-950 text-slate-200 border-slate-700 focus:border-teal-400'
                    }`}
                  />
                </div>

                {/* Sort */}
                <div className="flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className={`px-2 py-1.5 text-xs rounded-lg border cursor-pointer focus:outline-none ${
                      isLightMode
                        ? 'bg-white text-slate-900 border-slate-300'
                        : 'bg-slate-950 text-slate-200 border-slate-700'
                    }`}
                  >
                    <option value="latency_asc">{isEn ? 'Fastest First' : 'کمترین تاخیر'}</option>
                    <option value="latency_desc">{isEn ? 'Slowest First' : 'بیشترین تاخیر'}</option>
                    <option value="country">{isEn ? 'Country Name' : 'نام کشور'}</option>
                    <option value="loss">{isEn ? 'Highest Loss' : 'بیشترین افت پکت'}</option>
                  </select>
                </div>

                {/* Copy Report */}
                <button
                  onClick={handleCopyReport}
                  title={isEn ? 'Copy Full Report to Clipboard' : 'کپی گزارش به کلیپ‌بورد'}
                  className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                    copied
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : isLightMode
                      ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline text-[11px] font-medium">
                    {copied ? (isEn ? 'Copied' : 'کپی شد') : (isEn ? 'Copy' : 'کپی')}
                  </span>
                </button>

                {/* Permanent Link */}
                {permanentLink && (
                  <a
                    href={permanentLink}
                    target="_blank"
                    rel="noreferrer"
                    title={isEn ? 'Open official Check-Host report' : 'مشاهده گزارش رسمی در سایت Check-Host'}
                    className={`p-1.5 rounded-lg border transition flex items-center gap-1.5 ${
                      isLightMode
                        ? 'bg-white border-slate-300 text-teal-700 hover:bg-slate-100'
                        : 'bg-slate-800 border-slate-700 text-teal-300 hover:text-white'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px] font-medium">Check-Host</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Results Grid */}
          {resultsList.length === 0 && !isLoading ? (
            <div
              className={`py-16 px-4 rounded-2xl border text-center flex flex-col items-center justify-center space-y-3 ${
                isLightMode ? 'bg-slate-50/50 border-slate-200' : 'bg-slate-900/30 border-slate-800/80'
              }`}
            >
              <div
                className={`p-4 rounded-2xl border ${
                  isLightMode ? 'bg-white border-slate-200 text-teal-600 shadow-sm' : 'bg-slate-900 border-slate-800 text-teal-400'
                }`}
              >
                <Radar className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className={`text-sm font-semibold ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>
                  {isEn ? 'Ready for Multi-Country Host Diagnostics' : 'آماده بررسی و تست پینگ از کشورهای مختلف جهان'}
                </h3>
                <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {isEn
                    ? 'Enter an IP or domain address above and click "Run Check" to send parallel ICMP ping requests from global nodes.'
                    : 'یک آدرس IP، دامنه یا نام سرور را در کادر بالا وارد کرده و دکمه «شروع بررسی» را بزنید تا تست پینگ از نودهای مختلف دنیا آغاز شود.'}
                </p>
              </div>
              <button
                onClick={() => handleStartCheck()}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 shadow-md shadow-teal-500/20 transition cursor-pointer"
              >
                {isEn ? 'Test with 1.1.1.1 Now' : 'بررسی تست با 1.1.1.1'}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayResults.length === 0 ? (
                <div className={`p-8 text-center text-xs rounded-xl border ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-900/40 border-slate-800 text-slate-400'}`}>
                  {isEn ? 'No nodes match your active filters or search term.' : 'هیچ سروری مطابق با فیلتر یا عبارت جستجوی شما یافت نشد.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {displayResults.map((item) => {
                    const isPending = item.status === 'pending';
                    const isOk = item.status === 'ok';
                    const isPartial = item.status === 'partial_loss';
                    const isTimeout = item.status === 'timeout';

                    return (
                      <div
                        key={item.nodeKey}
                        className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                          isLightMode
                            ? 'bg-white border-slate-200 hover:border-teal-400 hover:shadow-md'
                            : 'bg-slate-900/70 border-slate-800 hover:border-teal-500/50 hover:bg-slate-900'
                        }`}
                      >
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-2xl select-none" role="img" aria-label={item.meta.countryName}>
                              {getFlagEmoji(item.meta.countryCode)}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                                  {item.meta.countryName}
                                </span>
                                {item.meta.city && (
                                  <span className={`text-[11px] font-medium truncate ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {item.meta.city}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px] text-slate-400">
                                <span>{item.nodeKey.split('.')[0]}</span>
                                {item.meta.asn && (
                                  <span className={`px-1.5 py-0.2 rounded border ${
                                    isLightMode ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-800 text-slate-400 border-slate-700'
                                  }`}>
                                    {item.meta.asn}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0">
                            {isPending && (
                              <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                                isLightMode ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                              }`}>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>{isEn ? 'Pinging...' : 'در حال تست'}</span>
                              </span>
                            )}
                            {isOk && (
                              <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                isLightMode ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              }`}>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{isEn ? '100% OK' : 'بدون افت'}</span>
                              </span>
                            )}
                            {isPartial && (
                              <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                isLightMode ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              }`}>
                                <AlertTriangle className="w-3 h-3" />
                                <span>{item.packetLossPercent}% {isEn ? 'Loss' : 'افت'}</span>
                              </span>
                            )}
                            {isTimeout && (
                              <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                isLightMode ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}>
                                <XCircle className="w-3 h-3" />
                                <span>{isEn ? 'Unreachable' : 'عدم پاسخ'}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Ping sequence indicator (4 pings) */}
                        <div className="space-y-1.5">
                          <div className={`text-[10px] font-semibold flex items-center justify-between ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            <span>{isEn ? 'Ping Samples (4x ICMP):' : 'نمونه‌های پینگ (۴ بار):'}</span>
                            {item.resolvedIp && (
                              <span className="font-mono opacity-80 truncate max-w-[140px]" title={`Target IP: ${item.resolvedIp}`}>
                                IP: {item.resolvedIp}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-4 gap-1.5">
                            {[0, 1, 2, 3].map((idx) => {
                              const ping = item.pings[idx];
                              if (!ping) {
                                return (
                                  <div
                                    key={idx}
                                    className={`py-1 px-1 rounded-md text-[10px] font-mono text-center border animate-pulse ${
                                      isLightMode ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-slate-800/60 border-slate-700 text-slate-500'
                                    }`}
                                  >
                                    ...
                                  </div>
                                );
                              }

                              const statusType = ping[0];
                              const rttMs = ping[1] !== undefined ? Number((Number(ping[1]) * 1000).toFixed(1)) : null;

                              if (statusType === 'OK') {
                                return (
                                  <div
                                    key={idx}
                                    className={`py-1 px-1 rounded-md text-[10px] font-mono text-center font-semibold border transition ${
                                      rttMs !== null && rttMs < 60
                                        ? isLightMode
                                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                        : rttMs !== null && rttMs < 140
                                        ? isLightMode
                                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                                          : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                                        : isLightMode
                                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                                        : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                    }`}
                                  >
                                    {rttMs !== null ? `${rttMs}ms` : 'OK'}
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={idx}
                                  className={`py-1 px-1 rounded-md text-[10px] font-mono text-center font-semibold border ${
                                    isLightMode ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                  }`}
                                >
                                  {isEn ? 'Timeout' : 'بی‌پاسخ'}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Card Footer: Latency Stats */}
                        <div
                          className={`pt-2 border-t flex items-center justify-between text-xs ${
                            isLightMode ? 'border-slate-100' : 'border-slate-800'
                          }`}
                        >
                          <div className={`text-[10px] font-mono ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {item.minLatencyMs !== undefined && item.maxLatencyMs !== undefined ? (
                              <span>Min: {item.minLatencyMs}ms · Max: {item.maxLatencyMs}ms</span>
                            ) : (
                              <span>Node IP: {item.meta.ip || item.nodeKey}</span>
                            )}
                          </div>

                          <div className="flex items-baseline gap-1">
                            <span className={`text-[11px] font-medium ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                              {isEn ? 'Avg RTT:' : 'میانگین:'}
                            </span>
                            <span
                              className={`font-mono font-bold text-sm ${
                                item.avgLatencyMs === undefined
                                  ? isLightMode ? 'text-slate-400' : 'text-slate-600'
                                  : item.avgLatencyMs < 60
                                  ? 'text-emerald-500'
                                  : item.avgLatencyMs < 140
                                  ? 'text-blue-500'
                                  : item.avgLatencyMs < 220
                                  ? 'text-amber-500'
                                  : 'text-rose-500'
                              }`}
                            >
                              {item.avgLatencyMs !== undefined ? `${item.avgLatencyMs} ms` : '--'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`px-5 py-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs select-none ${
            isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className={`flex items-center gap-2 text-[11px] ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
            <span>{isEn ? 'Powered by Check-Host.net distributed nodes' : 'طراحی‌شده بر پایه شبکه سرورهای توزیع‌شده Check-Host.net'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                isLightMode
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {isEn ? 'Close' : 'بستن'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
