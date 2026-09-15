import React, { useState } from 'react';
import {
  ShieldCheck,
  Minus,
  X,
  Play,
  Loader2,
  Copy,
  Check,
  Calendar,
  Lock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Tag
} from 'lucide-react';

interface CertLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  isEn: boolean;
  isLightMode: boolean;
}

export const CertLookupModal: React.FC<CertLookupModalProps> = ({
  isOpen,
  onClose,
  onMinimize,
  isEn,
  isLightMode
}) => {
  const [host, setHost] = useState<string>('google.com');
  const [port, setPort] = useState<number>(443);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [certData, setCertData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleInspect = async () => {
    if (!host.trim()) return;
    setIsLoading(true);
    setError(null);
    setCertData(null);

    try {
      const res = await fetch('/api/tools/cert-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host.trim(),
          port
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isEn ? 'Certificate inspection failed' : 'بررسی گواهی با خطا مواجه شد'));
      }
      setCertData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="cert-lookup-modal-overlay"
      className="fixed top-0 left-0 right-0 bottom-8 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in"
    >
      <div
        id="cert-lookup-modal-window"
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">
                {isEn ? 'SSL / TLS Certificate Inspector' : 'بازرس گواهی‌های امنیتی SSL / TLS'}
              </h3>
              <p className={`text-[11px] ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn ? 'Verify X.509 chains, expiration dates, SANs, TLS ciphers & security status' : 'بررسی زنجیره اعتماد X.509، تاریخ‌های انقضا، نام‌های مستعار SAN و الگوریتم‌های TLS'}
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
              <div className="sm:col-span-8">
                <label className={`block text-xs font-semibold mb-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                  {isEn ? 'Target Domain / Hostname' : 'دامنه یا نام هاست مقصد'}
                </label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="example.com"
                  className={`w-full px-3 py-1.5 text-xs font-mono rounded-lg border focus:outline-none ${
                    isLightMode
                      ? 'bg-white text-slate-900 border-slate-300 focus:border-amber-500'
                      : 'bg-slate-950 text-cyan-300 border-slate-700 focus:border-cyan-400'
                  }`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={`block text-xs font-semibold mb-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                  {isEn ? 'Port' : 'پورت'}
                </label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value, 10))}
                  className={`w-full px-2 py-1.5 text-xs font-mono rounded-lg border ${
                    isLightMode ? 'bg-white border-slate-300' : 'bg-slate-950 border-slate-700'
                  }`}
                />
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  onClick={handleInspect}
                  disabled={isLoading}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isLoading
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : isLightMode
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                      : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 shadow-sm'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isEn ? 'Checking...' : 'در حال بررسی'}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Inspect' : 'بررسی'}</span>
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

          {/* Certificate Details */}
          {certData && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                  certData.isExpired
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : certData.daysRemaining !== null && certData.daysRemaining < 30
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-emerald-500/10 border-emerald-500/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  {certData.isExpired ? (
                    <XCircle className="w-7 h-7 text-rose-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-sm font-bold">
                      {certData.isExpired
                        ? (isEn ? 'Certificate Expired!' : 'گواهی امنیتی منقضی شده است!')
                        : (isEn ? 'Valid TLS Certificate' : 'گواهی امنیتی معتبر است')}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">
                      CN: {certData.subject?.commonName || certData.host}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right rtl:text-left">
                    <span className="text-[10px] text-slate-400 block">{isEn ? 'Days Remaining' : 'روزهای باقی‌مانده'}</span>
                    <span
                      className={`text-lg font-bold font-mono ${
                        certData.daysRemaining !== null && certData.daysRemaining < 30
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {certData.daysRemaining !== null ? `${certData.daysRemaining} days` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Issuer & Validity Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Subject & Issuer */}
                <div
                  className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                    isLightMode ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                  <div className="font-semibold text-slate-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEn ? 'Issuer Authority' : 'مرجع صادرکننده گواهی'}</span>
                  </div>
                  <div className="font-mono text-cyan-300 font-bold">
                    {certData.issuer?.organization || certData.issuer?.commonName || 'Unknown CA'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {certData.issuer?.commonName}
                  </div>
                </div>

                {/* Validity Period */}
                <div
                  className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                    isLightMode ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                  <div className="font-semibold text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isEn ? 'Validity Timeline' : 'بازه زمانی اعتبار'}</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-300">
                    <span>{isEn ? 'From:' : 'از:'}</span> <b className="text-emerald-400">{certData.validFrom || '—'}</b>
                  </div>
                  <div className="font-mono text-[11px] text-slate-300">
                    <span>{isEn ? 'To:' : 'تا:'}</span> <b className="text-amber-400">{certData.validTo || '—'}</b>
                  </div>
                </div>
              </div>

              {/* Protocol & Cipher */}
              <div
                className={`p-3.5 rounded-xl border space-y-2 ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{isEn ? 'Negotiated TLS Version:' : 'نسخه پروتکل TLS:'}</span>
                  <span className="font-mono font-bold text-cyan-400">{certData.tlsVersion}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{isEn ? 'Cipher Suite:' : 'الگوریتم رمزنگاری:'}</span>
                  <span className="font-mono font-bold text-indigo-400 truncate max-w-sm">{certData.cipher}</span>
                </div>
                {certData.sha256Fingerprint && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-700/30">
                    <span className="text-slate-400">{isEn ? 'SHA-256 Fingerprint:' : 'اثر انگشت SHA-256:'}</span>
                    <span className="font-mono text-[10px] text-slate-400 truncate max-w-sm">{certData.sha256Fingerprint}</span>
                  </div>
                )}
              </div>

              {/* SANs (Subject Alternative Names) */}
              {certData.sans && certData.sans.length > 0 && (
                <div
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                    <Tag className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isEn ? `Subject Alternative Names (${certData.sans.length} SANs)` : `دامنه‌های مجاز گواهی (${certData.sans.length} دامنه)`}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                    {certData.sans.map((san: string, idx: number) => (
                      <span
                        key={idx}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          isLightMode
                            ? 'bg-white text-slate-700 border-slate-300'
                            : 'bg-slate-950 text-cyan-300 border-slate-800'
                        }`}
                      >
                        {san}
                      </span>
                    ))}
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
            {isEn ? 'Direct TLS handshake inspection via standard OpenSSL / Python' : 'بررسی اتصال زنده TLS با استاندارد OpenSSL'}
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
