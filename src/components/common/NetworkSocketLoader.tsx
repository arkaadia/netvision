import React, { useEffect, useState } from 'react';

interface NetworkSocketLoaderProps {
  isEn?: boolean;
  message?: string;
  subMessage?: string;
  compact?: boolean;
}

export const NetworkSocketLoader: React.FC<NetworkSocketLoaderProps> = ({
  isEn = false,
  message,
  subMessage,
  compact = false,
}) => {
  const [dataActivity, setDataActivity] = useState(true);
  const [dots, setDots] = useState('');

  // Realistic random network packet burst blink
  useEffect(() => {
    const interval = setInterval(() => {
      setDataActivity((prev) => !prev);
    }, 120 + Math.random() * 200);

    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);

    return () => {
      clearInterval(interval);
      clearInterval(dotsInterval);
    };
  }, []);

  const defaultTitle = isEn ? 'Loading Page...' : 'در حال بارگذاری صفحه...';
  const defaultDesc = isEn
    ? 'Please wait, loading system data and telemetry'
    : 'لطفاً شکیبا باشید، در حال آماده‌سازی و بارگذاری اطلاعات سامانه';

  return (
    <div
      id="network-socket-loader"
      className="flex flex-col items-center justify-center select-none"
      dir={isEn ? 'ltr' : 'rtl'}
    >
      {/* Background Pulse Rings */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-44 h-44 rounded-full bg-cyan-500/10 animate-ping opacity-30 pointer-events-none" />
        <div className="absolute w-36 h-36 rounded-full bg-indigo-500/15 animate-pulse opacity-40 pointer-events-none" />

        {/* Medium-sized Realistic Ethernet RJ45 Socket */}
        <div className="relative w-36 h-32 rounded-2xl bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 p-2.5 shadow-[0_15px_35px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.25),0_0_25px_rgba(14,165,233,0.2)] border border-slate-600/60 flex flex-col justify-between">
          
          {/* Top Status Panel: LINK & ACT LEDs */}
          <div className="flex items-center justify-between px-2 pt-0.5 pb-1">
            {/* Left LED: Link (Solid Green with subtle glow) */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981,0_0_18px_#34d399] ring-2 ring-emerald-500/30" />
                <div className="absolute -inset-1 rounded-full bg-emerald-400/20 animate-pulse" />
              </div>
              <span className="text-[9px] font-mono font-bold tracking-wider text-emerald-400/90 uppercase">
                LNK
              </span>
            </div>

            {/* Socket Model Label */}
            <div className="text-[8px] font-mono tracking-widest text-slate-400/70 uppercase">
              10G-RJ45
            </div>

            {/* Right LED: Activity / Data (Blinking Amber/Yellow LED) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono font-bold tracking-wider text-amber-400/90 uppercase">
                ACT
              </span>
              <div className="relative flex items-center justify-center">
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-75 ${
                    dataActivity
                      ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b,0_0_20px_#fbbf24] scale-110 opacity-100 ring-2 ring-amber-400/40'
                      : 'bg-amber-900/60 shadow-none scale-95 opacity-30 ring-0'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* RJ45 Port Socket Body / Receptacle Cavity */}
          <div className="relative w-full flex-1 rounded-xl bg-gradient-to-b from-[#060911] via-[#090d16] to-[#04060a] border-2 border-slate-700/80 shadow-[inset_0_4px_12px_rgba(0,0,0,0.95)] flex flex-col items-center justify-between p-2 overflow-hidden">
            
            {/* Top Latch Tab Notch */}
            <div className="w-12 h-2 rounded-b-md bg-slate-800/90 border-b border-x border-slate-600/60 shadow-inner -mt-2" />

            {/* Internal 8 Gold-Plated Contact Pins */}
            <div className="w-full flex items-center justify-center gap-1 my-auto px-1">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((pin) => (
                <div
                  key={pin}
                  className="relative flex flex-col items-center"
                  style={{ animationDelay: `${pin * 75}ms` }}
                >
                  {/* Gold Pin Wire */}
                  <div className="w-1.5 h-7 rounded-sm bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 shadow-[0_0_6px_rgba(245,158,11,0.5)] border-t border-amber-200/80 transition-all duration-300">
                    <div
                      className={`w-full h-1/2 bg-white/40 rounded-t-sm ${
                        dataActivity ? 'opacity-80' : 'opacity-20'
                      }`}
                    />
                  </div>
                  {/* Pin Base Contact Point */}
                  <div className="w-1.5 h-1 rounded-b bg-amber-700" />
                </div>
              ))}
            </div>

            {/* Bottom Inner Jack Recess / Guide Rails */}
            <div className="w-full flex items-center justify-between px-1.5 pt-0.5">
              <div className="w-2.5 h-1.5 rounded-sm bg-slate-800/80 border border-slate-700/50" />
              <div className="w-16 h-1 rounded-full bg-cyan-500/30 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full animate-pulse transition-all"
                  style={{ width: dataActivity ? '100%' : '35%' }}
                />
              </div>
              <div className="w-2.5 h-1.5 rounded-sm bg-slate-800/80 border border-slate-700/50" />
            </div>
          </div>

          {/* Metal Casing Mounting Clips / Ground Tabs on Bottom */}
          <div className="flex items-center justify-between px-3 -mb-1">
            <div className="w-3 h-1 rounded-full bg-slate-600/80 shadow-sm" />
            <div className="w-3 h-1 rounded-full bg-slate-600/80 shadow-sm" />
          </div>
        </div>
      </div>

      {/* Loading Titles & Telemetry Messages */}
      {!compact && (
        <div className="mt-7 text-center">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <h2 className="text-sm font-bold tracking-wide text-slate-100">
              {message || defaultTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-sans flex items-center justify-center gap-1">
            <span>{subMessage || defaultDesc}</span>
            <span className="text-cyan-400 font-bold w-4 inline-block text-left">{dots}</span>
          </p>

          {/* Network Activity Metrics Badge */}
          <div className="mt-3 inline-flex items-center gap-3 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[10px] font-mono text-slate-400 shadow-inner">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {isEn ? 'PHY: 1000Base-T' : 'پورت: ۱۰۰۰Base-T'}
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-1 text-amber-400">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  dataActivity ? 'bg-amber-400' : 'bg-amber-600/40'
                }`}
              />
              {isEn ? 'Data Stream Active' : 'جریان فعال داده'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
