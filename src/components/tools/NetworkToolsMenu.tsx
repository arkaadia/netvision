import React, { useRef, useEffect } from 'react';
import {
  NetworkToolId
} from './types';
import {
  Calculator,
  KeyRound,
  SearchCode,
  Globe2,
  Route,
  ShieldCheck,
  FileCode2,
  BatteryCharging,
  Radar,
  X
} from 'lucide-react';

interface NetworkToolsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (id: NetworkToolId) => void;
  isEn: boolean;
  isLightMode: boolean;
}

interface ToolMenuItem {
  id: NetworkToolId;
  icon: React.ComponentType<{ className?: string }>;
  titleEn: string;
  titleFa: string;
  descEn: string;
  descFa: string;
  badgeEn?: string;
  badgeFa?: string;
  badgeColor?: string;
}

const TOOL_ITEMS: ToolMenuItem[] = [
  {
    id: 'ip_subnetting',
    icon: Calculator,
    titleEn: 'IP Subnet Calculator',
    titleFa: 'محاسبه‌گر ساب‌نتینگ آی‌پی',
    descEn: 'IPv4/IPv6 CIDR, VLSM planner, masks & binary visualizer',
    descFa: 'محاسبه CIDR، ماسک شبکه، جدول باینری و برنامه‌ریز VLSM',
    badgeEn: 'IPv4/IPv6',
    badgeFa: 'نسخه ۴ و ۶',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
  },
  {
    id: 'password_gen',
    icon: KeyRound,
    titleEn: 'Device Password Generator',
    titleFa: 'تولیدکننده رمز عبور تجهیزات',
    descEn: 'Cisco Secret 5/8/9, RouterOS safe & entropy scoring',
    descFa: 'تولید کلمات عبور امن برای روتر و سوئیچ، سکرت سیسکو و میکروتیک',
    badgeEn: 'Crypto Safe',
    badgeFa: 'امن و رمزنگاری‌شده',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  },
  {
    id: 'port_scanner',
    icon: SearchCode,
    titleEn: 'TCP Port Scanner',
    titleFa: 'اسکنر پورت‌های TCP',
    descEn: 'Fast live socket scan with service & banner detection',
    descFa: 'اسکن سریع پورت‌های باز شبکه با شناسایی سرویس و بنر تجهیزات',
    badgeEn: 'Live Socket',
    badgeFa: 'سوکت زنده',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
  },
  {
    id: 'net_utils',
    icon: Globe2,
    titleEn: 'DNS & Ping Utilities',
    titleFa: 'ابزارهای DNS و پینگ شبکه',
    descEn: 'Dig, nslookup records (A, MX, TXT) and live ICMP test',
    descFa: 'استعلام رکوردهای DNS (A, AAAA, MX, TXT) و تست پینگ ICMP',
    badgeEn: 'DNS / ICMP',
    badgeFa: 'دی‌ان‌اس و پینگ',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  },
  {
    id: 'trace_tools',
    icon: Route,
    titleEn: 'Traceroute & Hop Analysis',
    titleFa: 'ردیابی مسیر و تحلیل تاخیر پکت',
    descEn: 'Hop-by-hop latency visualizer, RTT & packet loss tracking',
    descFa: 'ردیابی پرش‌های بسته داده، بررسی مسیر شبکه و تاخیر هر هاپ',
    badgeEn: 'Path Matrix',
    badgeFa: 'تحلیل مسیر',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
  },
  {
    id: 'cert_lookup',
    icon: ShieldCheck,
    titleEn: 'SSL/TLS Certificate Inspector',
    titleFa: 'بررسی و تحلیل گواهی‌های SSL/TLS',
    descEn: 'Issuer, validity dates, SANs, cipher suite & fingerprint',
    descFa: 'تحلیل گواهی امنیتی، صادرکننده، تاریخ انقضا و الگوریتم رمز',
    badgeEn: 'X.509',
    badgeFa: 'گواهی امنیتی',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  },
  {
    id: 'header_analyzer',
    icon: FileCode2,
    titleEn: 'HTTP Header & Security Analyzer',
    titleFa: 'تحلیل هدرهای وب و امنیت HTTP',
    descEn: 'Audit HSTS, CSP, X-Frame-Options & security grade (A+ to F)',
    descFa: 'ارزیابی هدرهای امنیتی، ممیزی HSTS و CSP و رتبه‌بندی امنیتی',
    badgeEn: 'Security Audit',
    badgeFa: 'ممیزی امنیتی',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
  },
  {
    id: 'ups_calculator',
    icon: BatteryCharging,
    titleEn: 'UPS & Battery Bank Sizing',
    titleFa: 'محاسبه‌گر توان و باتری یو‌پی‌اس',
    descEn: 'Watts to kVA, 12V 28Ah/42Ah battery bank count, runtime & reverse sizing',
    descFa: 'تبدیل وات به کاوا، تعداد باتری‌های ۱۲ ولت (۲۸، ۴۲ آمپر و...) و محاسبه معکوس زمان برق‌دهی',
    badgeEn: 'UPS / Power',
    badgeFa: 'برق و باتری',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  },
  {
    id: 'host_checker',
    icon: Radar,
    titleEn: 'Global Host Checker',
    titleFa: 'هاست چکر بین‌المللی',
    descEn: 'Live multi-country latency & ping check across global nodes (Check-Host.net API)',
    descFa: 'بررسی وضعیت و تست پینگ آدرس یا هاست از کشورهای مختلف جهان با نودهای Check-Host',
    badgeEn: 'Multi-Country',
    badgeFa: 'چندکشوری',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30'
  }
];

export const NetworkToolsMenu: React.FC<NetworkToolsMenuProps> = ({
  isOpen,
  onClose,
  onSelectTool,
  isEn,
  isLightMode
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      id="network-tools-bottom-menu"
      className={`absolute bottom-full mb-2 z-[1300] w-96 max-w-[calc(100vw-24px)] rounded-2xl shadow-2xl border transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${
        isEn ? 'right-0' : 'left-0'
      } ${
        isLightMode
          ? 'bg-white/95 text-slate-900 border-slate-200 shadow-slate-300/60 backdrop-blur-xl'
          : 'bg-slate-950/95 text-slate-100 border-slate-800 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
          isLightMode ? 'border-slate-100 bg-slate-50/80' : 'border-slate-800/80 bg-slate-900/50'
        } rounded-t-2xl`}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <SearchCode className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold font-mono tracking-wide">
              {isEn ? 'Network Engineering Tools' : 'ابزارهای مهندسی شبکه'}
            </h4>
            <p className={`text-[10px] ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {isEn ? 'Quick diagnostic and calculation suite' : 'مجموعه ابزارهای تشخیصی و محاسباتی شبکه'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded-lg transition ${
            isLightMode ? 'hover:bg-slate-200 text-slate-400 hover:text-slate-700' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
          }`}
          title={isEn ? 'Close' : 'بستن'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tool Items List */}
      <div className="p-2 space-y-1 max-h-[460px] overflow-y-auto custom-scrollbar">
        {TOOL_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTool(item.id);
                onClose();
              }}
              className={`w-full group text-start p-2.5 rounded-xl flex items-start gap-3 transition-all duration-150 cursor-pointer ${
                isLightMode
                  ? 'hover:bg-indigo-50/70 border border-transparent hover:border-indigo-100'
                  : 'hover:bg-white/[0.06] border border-transparent hover:border-white/10'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${
                  isLightMode
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white'
                    : 'bg-white/5 text-cyan-400 border border-white/10 group-hover:bg-cyan-500/20 group-hover:text-cyan-300'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span
                    className={`text-xs font-semibold truncate ${
                      isLightMode ? 'text-slate-800 group-hover:text-indigo-600' : 'text-slate-100 group-hover:text-cyan-300'
                    }`}
                  >
                    {isEn ? item.titleEn : item.titleFa}
                  </span>
                  {(isEn ? item.badgeEn : item.badgeFa) && (
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                        item.badgeColor || (isLightMode ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white/5 text-slate-300 border-white/10')
                      }`}
                    >
                      {isEn ? item.badgeEn : item.badgeFa}
                    </span>
                  )}
                </div>
                <p className={`text-[10.5px] leading-tight line-clamp-1 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {isEn ? item.descEn : item.descFa}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <div
        className={`px-3 py-2 text-[10px] text-center border-t ${
          isLightMode ? 'border-slate-100 bg-slate-50/50 text-slate-400' : 'border-slate-800/60 bg-black/30 text-slate-500'
        } rounded-b-2xl font-mono`}
      >
        {isEn ? 'Tools support minimize & dock for uninterrupted work' : 'ابزارها از قابلیت مینیمایز در نوار پایین جهت کار هم‌زمان پشتیبانی می‌کنند'}
      </div>
    </div>
  );
};
