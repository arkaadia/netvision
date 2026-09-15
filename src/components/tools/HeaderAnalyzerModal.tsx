import React, { useState } from 'react';
import {
  FileCode2,
  Minus,
  X,
  Play,
  Loader2,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';

interface HeaderAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  isEn: boolean;
  isLightMode: boolean;
}

export const HeaderAnalyzerModal: React.FC<HeaderAnalyzerModalProps> = ({
  isOpen,
  onClose,
  onMinimize,
  isEn,
  isLightMode
}) => {
  const [targetUrl, setTargetUrl] = useState<string>('https://google.com');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleAnalyze = async () => {
    if (!targetUrl.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/tools/header-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isEn ? 'Header inspection failed' : 'تحلیل هدر با خطا مواجه شد'));
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
      case 'B':
        return 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40';
      case 'C':
        return 'text-amber-400 bg-amber-500/20 border-amber-500/40';
      default:
        return 'text-rose-400 bg-rose-500/20 border-rose-500/40';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="header-analyzer-modal-overlay"
      className="fixed top-0 left-0 right-0 bottom-8 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in"
    >
      <div
        id="header-analyzer-modal-window"
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-md">
              <FileCode2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">
                {isEn ? 'HTTP Response & Security Header Analyzer' : 'تحلیلگر هدرهای وب و امنیت HTTP'}
              </h3>
              <p className={`text-[11px] ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn ? 'Audit HSTS, CSP, X-Frame-Options, CORS & server security grade' : 'ممیزی جامع هدرهای امنیتی، بررسی HSTS، CSP و وضعیت نشت اطلاعات سرور'}
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
              <div className="sm:col-span-9">
                <label className={`block text-xs font-semibold mb-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                  {isEn ? 'Target URL' : 'آدرس وب‌سایت یا سرور (URL)'}
                </label>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://example.com"
                  className={`w-full px-3 py-1.5 text-xs font-mono rounded-lg border focus:outline-none ${
                    isLightMode
                      ? 'bg-white text-slate-900 border-slate-300 focus:border-rose-500'
                      : 'bg-slate-950 text-cyan-300 border-slate-700 focus:border-cyan-400'
                  }`}
                />
              </div>

              <div className="sm:col-span-3 flex items-end">
                <button
                  onClick={handleAnalyze}
                  disabled={isLoading}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isLoading
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : isLightMode
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                      : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:opacity-90 shadow-sm'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isEn ? 'Auditing...' : 'در حال بررسی'}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Audit Headers' : 'ممیزی هدرها'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="space-y-4">
              {/* Score & Grade Overview */}
              <div
                className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold font-mono border shadow-md ${getGradeColor(
                      result.securityGrade
                    )}`}
                  >
                    {result.securityGrade}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">
                      {isEn ? 'Security Posture Grade' : 'نمره امنیت هدرهای وب'}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">
                      HTTP {result.statusCode} • {result.latencyMs}ms {isEn ? 'response time' : 'زمان پاسخ'}
                    </p>
                  </div>
                </div>

                <div className="text-right rtl:text-left">
                  <span className="text-[10px] text-slate-400 block">{isEn ? 'Security Score' : 'امتیاز امنیتی'}</span>
                  <span className="text-xl font-bold font-mono text-cyan-400">
                    {result.securityScore} / 100
                  </span>
                </div>
              </div>

              {/* Security Audits List */}
              <div
                className={`rounded-xl border overflow-hidden ${
                  isLightMode ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="p-3 bg-slate-900/60 border-b border-slate-800 text-xs font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>{isEn ? 'Security Headers Audit Matrix' : 'ماتریس ارزیابی هدرهای امنیتی'}</span>
                </div>

                <div className="divide-y divide-slate-800/40 text-xs">
                  {result.securityAudit?.map((item: any, idx: number) => {
                    const isPass = item.status === 'pass';
                    const isWarn = item.status === 'warn';

                    return (
                      <div
                        key={idx}
                        className={`p-3 flex items-start gap-3 transition ${
                          isLightMode ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isPass ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : isWarn ? (
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-mono font-bold text-slate-200">{item.header}</span>
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                                isPass
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : isWarn
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {item.recommendation}
                          </p>
                          {item.value && (
                            <div className="mt-1 font-mono text-[10px] text-slate-300 bg-slate-900/60 p-1.5 rounded border border-slate-800 truncate">
                              {item.value}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* All Raw Headers Table */}
              {result.headers && (
                <div
                  className={`rounded-xl border overflow-hidden ${
                    isLightMode ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="p-3 bg-slate-900/40 border-b border-slate-800 text-xs font-semibold flex items-center justify-between">
                    <span>{isEn ? 'All Response Headers' : 'تمامی هدرهای دریافتی از سرور'}</span>
                    <button
                      onClick={() => {
                        const raw = Object.entries(result.headers)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join('\n');
                        navigator.clipboard.writeText(raw);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? (isEn ? 'Copied' : 'کپی شد') : (isEn ? 'Copy all' : 'کپی همه')}</span>
                    </button>
                  </div>

                  <div className="max-h-52 overflow-y-auto custom-scrollbar font-mono text-[11px]">
                    <table className="w-full text-left rtl:text-right">
                      <tbody className="divide-y divide-slate-800/40">
                        {Object.entries(result.headers).map(([k, v], idx) => (
                          <tr key={idx} className={isLightMode ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]'}>
                            <td className="px-3.5 py-1.5 font-bold text-slate-400 w-44 shrink-0">{k}</td>
                            <td className="px-3.5 py-1.5 text-slate-300 break-all">{String(v)}</td>
                          </tr>
                        ))}
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
            {isEn ? 'Standard OWASP security header assessment' : 'ارزیابی منطبق بر رهنمودهای امنیتی OWASP'}
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
