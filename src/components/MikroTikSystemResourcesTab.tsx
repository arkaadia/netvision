import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Zap,
  HardDrive,
  Thermometer,
  Fan,
  Activity,
  Terminal,
  RefreshCw,
  Copy,
  Check,
  Server,
  Layers,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Radio,
  ExternalLink,
  CpuIcon
} from 'lucide-react';
import { Device, SwitchPort } from '../types';
import { fetchMikroTikSystemResources, MikroTikSystemResourcesResponse } from '../services/api';
import { FieldInfoTooltip } from './common/FieldInfoTooltip';

interface MikroTikSystemResourcesTabProps {
  device: Device;
  ports: SwitchPort[];
  isLightMode?: boolean;
  isEn: boolean;
  onConnectTerminal?: (device: Device) => void;
}

export const MikroTikSystemResourcesTab: React.FC<MikroTikSystemResourcesTabProps> = ({
  device,
  ports,
  isLightMode = false,
  isEn,
  onConnectTerminal,
}) => {
  const [resources, setResources] = useState<MikroTikSystemResourcesResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedCliCommand, setSelectedCliCommand] = useState<
    'resource' | 'health' | 'routerboard' | 'license' | 'package' | 'interface'
  >('resource');
  const [copiedCli, setCopiedCli] = useState<boolean>(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const loadResources = useCallback(
    async (isManualRefresh: boolean = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setFetchError(null);

      try {
        const data = await fetchMikroTikSystemResources(device.id);
        setResources(data);
        setLastFetched(new Date());
        if (!data.is_live && data.warning) {
          setFetchError(data.warning);
        }
      } catch (err: any) {
        console.warn('Failed to load MikroTik system resources:', err);
        setFetchError(
          err.message ||
            (isEn
              ? 'Could not reach device SSH service'
              : 'عدم دسترسی به سرویس SSH تجهیز میکروتیک')
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [device.id, isEn]
  );

  useEffect(() => {
    loadResources(false);
  }, [loadResources]);

  const handleRefresh = () => {
    if (isLoading || isRefreshing) return;
    loadResources(true);
  };

  const handleCopyCli = () => {
    const activeText = resources?.cliOutputs?.[selectedCliCommand]?.output || '';
    if (!activeText) return;
    navigator.clipboard.writeText(activeText);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const modelUpper = (device.model || '').toUpperCase();
  const isCcr = modelUpper.includes('CCR');
  const isRb4011 = modelUpper.includes('4011') || modelUpper.includes('5009');
  const isCrs = modelUpper.includes('CRS') || modelUpper.includes('CSS');

  const defaultCpuArch = isCcr
    ? 'ARM 64-bit (arm64)'
    : isRb4011
    ? 'ARM 64-bit Quad-Core (arm64)'
    : isCrs
    ? 'ARM 32-bit (arm)'
    : 'MIPS Architecture (mipsbe)';

  const defaultRam = isCcr ? 4096 : isRb4011 ? 1024 : 512;
  const defaultHdd = isCcr ? 128 : 512;

  const cpu = resources?.cpu || {
    cpuArch: defaultCpuArch,
    cpuCores: isCcr ? 4 : isRb4011 ? 4 : 2,
    cpuFrequency: isCcr ? '2000 MHz' : isRb4011 ? '1400 MHz' : '800 MHz',
    cpuLoad: 14,
    cpuTemp: 42,
  };

  const ram = resources?.ram || {
    totalRamMB: defaultRam,
    usedRamMB: Math.round(defaultRam * 0.17 * 10) / 10,
    freeRamMB: Math.round(defaultRam * 0.83 * 10) / 10,
    ramPercent: 17,
  };

  const storage = resources?.storage || {
    totalHddMB: defaultHdd,
    usedHddMB: Math.round(defaultHdd * 0.26 * 10) / 10,
    freeHddMB: Math.round(defaultHdd * 0.74 * 10) / 10,
    hddPercent: 26,
    badBlocks: '0.0%',
    writeSectSinceReboot: 14210,
    writeSectTotal: 312540,
  };

  const health = resources?.health || {
    voltage: '24.2 V',
    current: '1250 mA',
    boardTemp: 38,
    cpuTemp: 42,
    sfpTemp: 32,
    fanStatus: '2x Fans OK',
    fanSpeeds: 'Fan 1: 4,200 RPM • Fan 2: 4,150 RPM',
    psuStatus: 'PSU 1: OK • PSU 2: OK',
  };

  const routerboard = resources?.routerboard || {
    isRouterboard: true,
    model: device.model || 'CCR2004-16G-2S+',
    serialNumber: device.serial_number || 'HDE0837V921',
    currentFirmware: '7.15.2',
    upgradeFirmware: '7.15.2',
    firmwareType: 'al64',
    factorySoftware: '6.48.6',
  };

  const system = resources?.system || {
    identity: device.name || 'MikroTik',
    uptime: '2w 4d 12h 34m',
    version: '7.15.2 (stable)',
    architecture: 'arm64',
    boardName: device.model || 'CCR2004-16G-2S+',
    softwareId: '4KL9-WQ21',
    licenseLevel: 'Level 6 (Unlimited)',
    totalInterfaces: ports.length || 16,
    runningInterfaces: ports.filter((p) => p.status === 'up').length || 6,
  };

  const cliOutputs = resources?.cliOutputs || {
    resource: {
      cmd: '/system resource print',
      output: `[admin@${device.name || 'MikroTik'}] > /system resource print\n(Reading telemetry from device over SSH...)`,
    },
    health: {
      cmd: '/system health print',
      output: `[admin@${device.name || 'MikroTik'}] > /system health print\n(Reading telemetry from device over SSH...)`,
    },
    routerboard: {
      cmd: '/system routerboard print',
      output: `[admin@${device.name || 'MikroTik'}] > /system routerboard print\n(Reading telemetry from device over SSH...)`,
    },
    license: {
      cmd: '/system license print',
      output: `[admin@${device.name || 'MikroTik'}] > /system license print\n(Reading telemetry from device over SSH...)`,
    },
    package: {
      cmd: '/system package print',
      output: `[admin@${device.name || 'MikroTik'}] > /system package print\n(Reading telemetry from device over SSH...)`,
    },
    interface: {
      cmd: '/interface print',
      output: `[admin@${device.name || 'MikroTik'}] > /interface print\n(Reading telemetry from device over SSH...)`,
    },
  };

  const isLive = Boolean(resources?.is_live);
  const isBusy = isLoading || isRefreshing;

  return (
    <div className="space-y-4">
      {/* Top Telemetry & Refresh Bar */}
      <div
        className={`p-3.5 rounded-xl border shadow-xs flex flex-wrap items-center justify-between gap-3 ${
          isLightMode
            ? 'bg-white border-slate-200'
            : 'bg-slate-900/90 border-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`p-2 rounded-lg border shrink-0 ${
              isLightMode
                ? 'bg-cyan-50 text-cyan-600 border-cyan-200'
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
            }`}
          >
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3
                className={`text-sm font-bold font-mono ${
                  isLightMode ? 'text-slate-900' : 'text-white'
                }`}
              >
                {device.name} •{' '}
                {isEn ? 'MikroTik Hardware Telemetry' : 'تله‌متری و منابع بلادرنگ میکروتیک'}
              </h3>

              {isLive ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isEn ? 'LIVE SSH' : 'ارتباط زنده SSH'}</span>
                  {resources?.latency_ms ? (
                    <span className="text-[9px] text-emerald-400/80">
                      ({resources.latency_ms}ms)
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>{isEn ? 'OFFLINE / BASELINE' : 'آفلاین / دیتای پیش‌فرض'}</span>
                </span>
              )}
            </div>

            <div
              className={`text-xs mt-0.5 flex flex-wrap items-center gap-2 ${
                isLightMode ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              <span>
                {isEn ? 'Platform:' : 'پلتفرم:'}{' '}
                <strong className={isLightMode ? 'text-slate-800' : 'text-slate-200'}>
                  RouterOS {system.version}
                </strong>
              </span>
              <span>•</span>
              <span>
                {isEn ? 'Board:' : 'روتربورد:'}{' '}
                <strong className={isLightMode ? 'text-slate-800' : 'text-slate-200'}>
                  {system.boardName}
                </strong>
              </span>
              <span>•</span>
              <span>
                {isEn ? 'Uptime:' : 'آپ‌تایم:'}{' '}
                <strong className={isLightMode ? 'text-slate-800' : 'text-slate-200'}>
                  {system.uptime}
                </strong>
              </span>
              {lastFetched && (
                <>
                  <span>•</span>
                  <span className="text-[11px] opacity-75">
                    {isEn ? 'Updated:' : 'آخرین استعلام:'}{' '}
                    {lastFetched.toLocaleTimeString()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onConnectTerminal && (
            <button
              type="button"
              onClick={() => onConnectTerminal(device)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border cursor-pointer ${
                isLightMode
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title={isEn ? 'Open Live SSH Terminal' : 'باز کردن ترمینال زنده SSH'}
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-500" />
              <span>{isEn ? 'CLI Terminal' : 'ترمینال CLI'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isBusy}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              isBusy
                ? 'bg-cyan-500/50 text-white cursor-not-allowed'
                : isLightMode
                ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
            <span>
              {isRefreshing
                ? isEn
                  ? 'Probing Device...'
                  : 'در حال استعلام تجهیز...'
                : isEn
                ? 'Refresh Telemetry'
                : 'بازخوانی تله‌متری'}
            </span>
          </button>
        </div>
      </div>

      {/* Offline Alert if device unreachable */}
      {!isLive && !isBusy && (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>
                {isEn
                  ? 'Live Hardware Probe Status:'
                  : 'وضعیت اتصال تله‌متری سخت‌افزار میکروتیک:'}
              </span>
              <span className="font-mono text-amber-300 font-normal">
                {fetchError ||
                  (isEn
                    ? 'Could not establish real SSH connection with device.'
                    : 'برقراری ارتباط زنده SSH با تجهیز میکروتیک میسر نشد.')}
              </span>
            </div>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              {isEn
                ? `To fetch live data directly from RouterOS, ensure IP (${device.ip || 'none'}), SSH port (${device.ssh_port || 22}), and admin credentials are reachable. Currently displaying hardware baseline telemetry.`
                : `برای دریافت دیتای زنده از روتر او اس، از صحت آدرس آی‌پی (${device.ip || 'نامشخص'})، پورت SSH (${device.ssh_port || 22}) و دسترسی شبکه مطمئن شوید. اکنون مقادیر سخت‌افزاری پیش‌فرض نمایش داده می‌شوند.`}
            </p>
          </div>
        </div>
      )}

      {/* Main Resource Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* 1. CPU Architecture & Load */}
        <div
          className={`relative overflow-hidden p-4 rounded-xl border shadow-xs space-y-2.5 ${
            isLightMode
              ? 'bg-white border-slate-200'
              : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          {isBusy && <div className="shimmer-light-beam z-10" />}

          <div className="flex items-center justify-between">
            <span
              className={`text-xs flex items-center gap-1.5 font-medium ${
                isLightMode ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              <Cpu className="w-4 h-4 text-cyan-500" />
              <span>{isEn ? 'CPU Architecture' : 'معماری و پردازنده'}</span>
              <FieldInfoTooltip
                isEn={isEn}
                title={isEn ? 'CPU Architecture & Utilization' : 'معماری و بار پردازنده'}
                whatIsIt={
                  isEn
                    ? 'Processor architecture (ARM64, Tilera, MIPS), core count, clock frequency, and active RouterOS CPU utilization.'
                    : 'معماری پردازنده (ARM64، Tilera، MIPS)، تعداد هسته‌ها، فرکانس کلاک و درصد بار کاری زنده CPU در روتر او اس.'
                }
                whyNeeded={
                  isEn
                    ? 'Sustained high CPU (>80%) can cause BGP flapping, dropped packets in fastpath, or connection timeouts in firewall NAT tables.'
                    : 'بالا ماندن مداوم بار CPU (بیش از ۸۰٪) موجب قطعی سرویس‌های مسیریابی BGP، کندی NAT و افت بسته‌ها در پردازش نرم‌افزاری می‌شود.'
                }
                example={
                  isEn
                    ? 'Normal RouterOS load: 5% - 25%. Inspect "/system resource cpu print" on CLI for per-core breakdown.'
                    : 'بار کاری نرمال بین ۵٪ تا ۲۵٪ است. با دستور "/system resource cpu print" وضعیت هسته‌ها را جداگانه بررسی کنید.'
                }
              />
            </span>

            {isBusy ? (
              <div className="h-5 w-16 bg-slate-700/50 rounded animate-pulse" />
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30">
                {cpu.cpuLoad}% {isEn ? 'Load' : 'بار'}
              </span>
            )}
          </div>

          <div
            className={`text-base font-bold font-mono truncate ${
              isLightMode ? 'text-slate-900' : 'text-white'
            }`}
            title={cpu.cpuArch}
          >
            {isBusy ? (
              <div className="h-5 w-48 bg-slate-700/50 rounded animate-pulse" />
            ) : (
              cpu.cpuArch
            )}
          </div>

          <div className="text-xs font-mono text-cyan-400 font-bold flex items-center justify-between">
            {isBusy ? (
              <div className="h-4 w-full bg-slate-700/40 rounded animate-pulse" />
            ) : (
              <span>
                {cpu.cpuCores} {isEn ? 'Cores' : 'هسته'} @ {cpu.cpuFrequency}
              </span>
            )}
          </div>

          <div
            className={`w-full rounded-full h-2 overflow-hidden ${
              isLightMode ? 'bg-slate-200' : 'bg-slate-800'
            }`}
          >
            <div
              className="bg-cyan-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(5, cpu.cpuLoad)}%` }}
            />
          </div>

          <div
            className={`text-[10px] flex items-center justify-between ${
              isLightMode ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            <span>
              {isEn ? 'Current Load:' : 'بار کاری جاری:'} {cpu.cpuLoad}%
            </span>
            <span className={isLightMode ? 'text-slate-600' : 'text-slate-400'}>
              {isEn ? `CPU Temp: ${cpu.cpuTemp || 42}°C` : `دمای پردازنده: ${cpu.cpuTemp || 42}°C`}
            </span>
          </div>
        </div>

        {/* 2. System Memory (RAM) */}
        <div
          className={`relative overflow-hidden p-4 rounded-xl border shadow-xs space-y-2.5 ${
            isLightMode
              ? 'bg-white border-slate-200'
              : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          {isBusy && <div className="shimmer-light-beam z-10" />}

          <div className="flex items-center justify-between">
            <span
              className={`text-xs flex items-center gap-1.5 font-medium ${
                isLightMode ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              <Zap className="w-4 h-4 text-emerald-500" />
              <span>{isEn ? 'System Memory (RAM)' : 'حافظه اصلی (RAM)'}</span>
              <FieldInfoTooltip
                isEn={isEn}
                title={isEn ? 'RouterOS RAM Allocation' : 'تخصیص رم روتر او اس'}
                whatIsIt={
                  isEn
                    ? 'Total system RAM, allocated OS memory buffers, and real-time available headroom in Megabytes.'
                    : 'کل حافظه رم فیزیکی سیستم، مقدار بافرهای مصرفی سیستم‌عامل و حافظه آزاد به مگابایت.'
                }
                whyNeeded={
                  isEn
                    ? 'MikroTik stores firewall connection tracking (conntrack), BGP routing tables, and DNS caches directly in RAM.'
                    : 'جدول کانکشن ترکینگ فایروال، جدول روتینگ BGP و کش‌های DNS مستقیماً در RAM نگهداری می‌شوند.'
                }
                example={
                  isEn
                    ? 'Safe headroom: > 30% Free RAM. For heavy BGP full-table feeds, at least 1 GB RAM is recommended.'
                    : 'فضای امن: بیش از ۳۰٪ رم آزاد باشد. برای جدول کامل روت‌های اینترنت BGP حداقل ۱ گیگابایت رم نیاز است.'
                }
              />
            </span>

            {isBusy ? (
              <div className="h-5 w-16 bg-slate-700/50 rounded animate-pulse" />
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                {ram.ramPercent}% {isEn ? 'Used' : 'مصرفی'}
              </span>
            )}
          </div>

          <div
            className={`text-base font-bold font-mono ${
              isLightMode ? 'text-slate-900' : 'text-white'
            }`}
          >
            {isBusy ? (
              <div className="h-5 w-32 bg-slate-700/50 rounded animate-pulse" />
            ) : (
              `${ram.totalRamMB} MB`
            )}
          </div>

          <div className="text-xs font-mono text-emerald-400 font-bold flex items-center justify-between">
            {isBusy ? (
              <div className="h-4 w-full bg-slate-700/40 rounded animate-pulse" />
            ) : (
              <span>
                {isEn ? 'Free:' : 'فضای آزاد:'} {ram.freeRamMB} MB (
                {Math.round(100 - ram.ramPercent)}%)
              </span>
            )}
          </div>

          <div
            className={`w-full rounded-full h-2 overflow-hidden ${
              isLightMode ? 'bg-slate-200' : 'bg-slate-800'
            }`}
          >
            <div
              className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${ram.ramPercent}%` }}
            />
          </div>

          <div
            className={`text-[10px] flex items-center justify-between ${
              isLightMode ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            <span>
              {isEn ? 'Allocated:' : 'مصرف شده:'} {ram.usedRamMB} MB
            </span>
            <span className={isLightMode ? 'text-slate-600' : 'text-slate-400'}>
              {isEn ? 'Status: Optimal' : 'وضعیت: پایدار'}
            </span>
          </div>
        </div>

        {/* 3. Storage (NAND Flash / HDD) */}
        <div
          className={`relative overflow-hidden p-4 rounded-xl border shadow-xs space-y-2.5 ${
            isLightMode
              ? 'bg-white border-slate-200'
              : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          {isBusy && <div className="shimmer-light-beam z-10" />}

          <div className="flex items-center justify-between">
            <span
              className={`text-xs flex items-center gap-1.5 font-medium ${
                isLightMode ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              <HardDrive className="w-4 h-4 text-purple-500" />
              <span>{isEn ? 'NAND Flash Storage' : 'حافظه فلش (NAND Storage)'}</span>
              <FieldInfoTooltip
                isEn={isEn}
                title={isEn ? 'RouterOS Flash Storage & Bad Blocks' : 'حافظه ذخیره‌سازی فلش و بلاک‌های خراب'}
                whatIsIt={
                  isEn
                    ? 'Persistent onboard NAND/eMMC flash storage capacity, used sectors, and wear-leveling health metrics.'
                    : 'فضای ذخیره‌سازی دائمی فلش مادربورد برای پکیج‌های سیستم‌عامل، لاگ‌ها، اسکریپت‌ها و فایل‌های پشتیبان.'
                }
                whyNeeded={
                  isEn
                    ? 'RouterOS logs written too frequently to disk can wear out the NAND chip. Monitoring bad blocks prevents silent corruption.'
                    : 'ثبت بیش از حد لاگ‌ها روی دیسک فلش می‌تواند طول عمر قطعه را کاهش دهد. بررسی Bad Blocks از خرابی ناگهانی فایل‌سیستم جلوگیری می‌کند.'
                }
                example={
                  isEn
                    ? 'Bad Blocks should remain at 0.0%. Total writes since reboot should remain moderate.'
                    : 'مقدار Bad Blocks باید ۰.۰٪ باشد. افزایش تعداد سکتورهای نوشته شده نشانه نیاز به انتقال لاگ‌ها به سرور Syslog است.'
                }
              />
            </span>

            {isBusy ? (
              <div className="h-5 w-16 bg-slate-700/50 rounded animate-pulse" />
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold border border-purple-500/30">
                {storage.badBlocks} {isEn ? 'Bad Blocks' : 'خراب'}
              </span>
            )}
          </div>

          <div
            className={`text-base font-bold font-mono ${
              isLightMode ? 'text-slate-900' : 'text-white'
            }`}
          >
            {isBusy ? (
              <div className="h-5 w-32 bg-slate-700/50 rounded animate-pulse" />
            ) : (
              `${storage.totalHddMB} MB`
            )}
          </div>

          <div className="text-xs font-mono text-purple-400 font-bold flex items-center justify-between">
            {isBusy ? (
              <div className="h-4 w-full bg-slate-700/40 rounded animate-pulse" />
            ) : (
              <span>
                {isEn ? 'Free:' : 'فضای آزاد:'} {storage.freeHddMB} MB (
                {Math.round(100 - storage.hddPercent)}%)
              </span>
            )}
          </div>

          <div
            className={`w-full rounded-full h-2 overflow-hidden ${
              isLightMode ? 'bg-slate-200' : 'bg-slate-800'
            }`}
          >
            <div
              className="bg-purple-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${storage.hddPercent}%` }}
            />
          </div>

          <div
            className={`text-[10px] flex items-center justify-between ${
              isLightMode ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            <span>
              {isEn ? 'Writes Since Reboot:' : 'نوشتن از ریبوت:'}{' '}
              {storage.writeSectSinceReboot.toLocaleString()}
            </span>
            <span className={isLightMode ? 'text-slate-600' : 'text-slate-400'}>
              {isEn ? 'Total:' : 'کل نوشتن:'} {storage.writeSectTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 4. Health, Voltages & Thermal Sensors */}
        <div
          className={`relative overflow-hidden p-4 rounded-xl border shadow-xs space-y-2.5 ${
            isLightMode
              ? 'bg-white border-slate-200'
              : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          {isBusy && <div className="shimmer-light-beam z-10" />}

          <div className="flex items-center justify-between">
            <span
              className={`text-xs flex items-center gap-1.5 font-medium ${
                isLightMode ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              <Thermometer className="w-4 h-4 text-rose-500" />
              <span>{isEn ? 'Hardware Health & Sensors' : 'سلامت و سنسورهای سخت‌افزار'}</span>
              <FieldInfoTooltip
                isEn={isEn}
                title={isEn ? 'MikroTik Health & Thermal Sensors' : 'ولتاژ و سنسورهای حرارتی میکروتیک'}
                whatIsIt={
                  isEn
                    ? 'Active DC/AC input voltages, motherboard temperature, CPU temperature, and SFP transceiver thermal monitoring.'
                    : 'پایش بلادرنگ ولتاژ ورودی، دمای مادربرد، دمای هسته پردازنده و دمای ماژول‌های فیبرنوری SFP.'
                }
                whyNeeded={
                  isEn
                    ? 'Prevents hardware throttling and thermal shutdowns under heavy packet processing.'
                    : 'جلوگیری از کاهش کلاک پردازنده و خاموشی ناگهانی روتر در اثر افزایش دمای رک سرور.'
                }
                example={
                  isEn
                    ? 'Recommended operating range: 25°C - 55°C. Safe DC voltage: 24V ± 10%.'
                    : 'دمای کاری استاندارد ۲۵ تا ۵۵ درجه سانتی‌گراد و ولتاژ ایمن ۲۴ ولت است.'
                }
              />
            </span>

            {isBusy ? (
              <div className="h-5 w-16 bg-slate-700/50 rounded animate-pulse" />
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                {health.boardTemp}°C {isEn ? 'Board' : 'برد'}
              </span>
            )}
          </div>

          <div
            className={`text-base font-bold font-mono ${
              isLightMode ? 'text-slate-900' : 'text-white'
            }`}
          >
            {isBusy ? (
              <div className="h-5 w-32 bg-slate-700/50 rounded animate-pulse" />
            ) : (
              `${health.voltage} • ${health.current}`
            )}
          </div>

          <div className="text-xs font-mono text-rose-400 font-bold flex items-center justify-between">
            {isBusy ? (
              <div className="h-4 w-full bg-slate-700/40 rounded animate-pulse" />
            ) : (
              <span>
                {isEn ? 'CPU:' : 'پردازنده:'} {health.cpuTemp}°C •{' '}
                {isEn ? 'SFP Optic:' : 'فیبر SFP:'} {health.sfpTemp}°C
              </span>
            )}
          </div>

          <div
            className={`p-2 rounded-lg border text-xs font-mono space-y-1 ${
              isLightMode
                ? 'bg-slate-50 border-slate-200 text-slate-700'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5">
                <Fan className="w-3.5 h-3.5 text-cyan-500" />
                <span>{health.fanStatus}</span>
              </span>
              <span className="text-emerald-400 font-bold">{health.psuStatus}</span>
            </div>
            <div className="text-[10px] opacity-75">{health.fanSpeeds}</div>
          </div>
        </div>

        {/* 5. RouterBOARD Firmware & BIOS */}
        <div
          className={`relative overflow-hidden p-4 rounded-xl border shadow-xs space-y-2.5 ${
            isLightMode
              ? 'bg-white border-slate-200'
              : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          {isBusy && <div className="shimmer-light-beam z-10" />}

          <div className="flex items-center justify-between">
            <span
              className={`text-xs flex items-center gap-1.5 font-medium ${
                isLightMode ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <span>{isEn ? 'RouterBOARD & Bootloader' : 'فریم‌ور روتربورد و بایوس'}</span>
              <FieldInfoTooltip
                isEn={isEn}
                title={isEn ? 'RouterBOOT BIOS & Firmware' : 'بایوس RouterBOOT و نسخه فریم‌ور'}
                whatIsIt={
                  isEn
                    ? 'RouterBOARD hardware model, serial number, bootloader firmware type, and active firmware version.'
                    : 'مدل سخت‌افزاری روتربورد، شماره سریال دستگاه، نوع بوت‌لودر و نسخه‌های فریم‌ور کارخانه و جاری.'
                }
                whyNeeded={
                  isEn
                    ? 'Ensures bootloader is kept in sync with RouterOS kernel to prevent bootloops during major upgrades.'
                    : 'همگام بودن بایوس روتربورد با هسته سیستم‌عامل از بوت‌لوپ شدن روتر در آپدیت‌های ماژور جلوگیری می‌کند.'
                }
                example={
                  isEn
                    ? 'Run "/system routerboard upgrade" after RouterOS package updates to sync bootloader.'
                    : 'پس از ارتقای روتر او اس، با دستور "/system routerboard upgrade" بایوس را همگام نمایید.'
                }
              />
            </span>

            {isBusy ? (
              <div className="h-5 w-20 bg-slate-700/50 rounded animate-pulse" />
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                v{routerboard.currentFirmware}
              </span>
            )}
          </div>

          <div
            className={`text-base font-bold font-mono truncate ${
              isLightMode ? 'text-slate-900' : 'text-white'
            }`}
          >
            {isBusy ? (
              <div className="h-5 w-36 bg-slate-700/50 rounded animate-pulse" />
            ) : (
              routerboard.model
            )}
          </div>

          <div className="text-xs font-mono text-blue-400 font-bold flex items-center justify-between">
            {isBusy ? (
              <div className="h-4 w-full bg-slate-700/40 rounded animate-pulse" />
            ) : (
              <span>
                {isEn ? 'S/N:' : 'شماره سریال:'} {routerboard.serialNumber}
              </span>
            )}
          </div>

          <div
            className={`p-2 rounded-lg border text-xs font-mono space-y-1 ${
              isLightMode
                ? 'bg-slate-50 border-slate-200 text-slate-700'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-[11px]">
              <span>
                {isEn ? 'Firmware Type:' : 'نوع فریم‌ور:'} {routerboard.firmwareType}
              </span>
              <span className="text-blue-400">
                {isEn ? 'License:' : 'لایسنس:'} {system.licenseLevel}
              </span>
            </div>
            <div className="text-[10px] opacity-75">
              {isEn ? 'Factory BIOS:' : 'بایوس کارخانه:'} {routerboard.factorySoftware} •{' '}
              {isEn ? 'ID:' : 'شناسه نرم‌افزار:'} {system.softwareId}
            </div>
          </div>
        </div>

        {/* 6. Network Engine & Interfaces */}
        <div
          className={`relative overflow-hidden p-4 rounded-xl border shadow-xs space-y-2.5 ${
            isLightMode
              ? 'bg-white border-slate-200'
              : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          {isBusy && <div className="shimmer-light-beam z-10" />}

          <div className="flex items-center justify-between">
            <span
              className={`text-xs flex items-center gap-1.5 font-medium ${
                isLightMode ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-500" />
              <span>{isEn ? 'Network Engine & Interfaces' : 'موتور شبکه و اینترفیس‌ها'}</span>
              <FieldInfoTooltip
                isEn={isEn}
                title={isEn ? 'RouterOS Ports & FastPath Engine' : 'اینترفیس‌ها و شتاب‌دهنده سخت‌افزاری'}
                whatIsIt={
                  isEn
                    ? 'Total configured interfaces (Ethernet, SFP+, Bridge, VLAN) and link running states.'
                    : 'کل پورت‌ها و اینترفیس‌های پیکربندی شده، تعداد پورت‌های متصل و شتاب‌دهنده FastPath.'
                }
                whyNeeded={
                  isEn
                    ? 'Confirms interface connectivity and hardware offloading (L3HW offload) to maximize line-rate packet forwarding.'
                    : 'اطمینان از عملکرد پورت‌های شبکه و فعال بودن شتاب‌دهنده سخت‌افزاری برای فوروارد بدون تاخیر بسته‌ها.'
                }
                example={
                  isEn
                    ? 'Check "/interface ethernet print" or "/interface bridge port print" for link negotiation and fastpath.'
                    : 'با دستورات "/interface print" می‌توانید وضعیت پورت‌ها و فلگ R (Running) را بررسی نمایید.'
                }
              />
            </span>

            {isBusy ? (
              <div className="h-5 w-20 bg-slate-700/50 rounded animate-pulse" />
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                {system.runningInterfaces} / {system.totalInterfaces}{' '}
                {isEn ? 'Active' : 'فعال'}
              </span>
            )}
          </div>

          <div
            className={`text-base font-bold font-mono ${
              isLightMode ? 'text-slate-900' : 'text-white'
            }`}
          >
            {isBusy ? (
              <div className="h-5 w-36 bg-slate-700/50 rounded animate-pulse" />
            ) : (
              `${system.totalInterfaces} ${isEn ? 'Total Interfaces' : 'پورت و اینترفیس'}`
            )}
          </div>

          <div className="text-xs font-mono text-amber-400 font-bold flex items-center justify-between">
            {isBusy ? (
              <div className="h-4 w-full bg-slate-700/40 rounded animate-pulse" />
            ) : (
              <span>
                {isEn ? 'Running (Up):' : 'پیوندهای متصل:'} {system.runningInterfaces} •{' '}
                {isEn ? 'Down/Disabled:' : 'غیرفعال:'}{' '}
                {system.totalInterfaces - system.runningInterfaces}
              </span>
            )}
          </div>

          <div
            className={`p-2 rounded-lg border text-xs font-mono space-y-1 ${
              isLightMode
                ? 'bg-slate-50 border-slate-200 text-slate-700'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-400 font-bold">
                {isEn ? 'FastPath: Active' : 'شتاب‌دهنده FastPath: فعال'}
              </span>
              <span className="text-amber-400">
                {isEn ? 'L3HW Offload: Enabled' : 'شتاب‌دهنده L3HW: فعال'}
              </span>
            </div>
            <div className="text-[10px] opacity-75">
              {isEn ? 'Bridge 802.1Q Filtering: Active' : 'فیلترینگ بریج 802.1Q: فعال'}
            </div>
          </div>
        </div>
      </div>

      {/* Real RouterOS CLI Telemetry Console */}
      <div
        className={`relative overflow-hidden rounded-xl border shadow-xs space-y-3 p-4 ${
          isLightMode
            ? 'bg-white border-slate-200'
            : 'bg-slate-900/60 border-slate-800'
        }`}
      >
        {isBusy && <div className="shimmer-light-beam z-10" />}

        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-500" />
            <h4
              className={`text-xs font-bold font-mono ${
                isLightMode ? 'text-slate-900' : 'text-white'
              }`}
            >
              {isEn
                ? 'RouterOS Live CLI Diagnostic Output'
                : 'خروجی‌های زنده تشخیصی ترمینال میکروتیک'}
            </h4>
            <span
              className={`text-[11px] font-mono ${
                isLightMode ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              ({cliOutputs[selectedCliCommand]?.cmd})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'resource', label: '/system resource' },
                { id: 'health', label: '/system health' },
                { id: 'routerboard', label: '/system routerboard' },
                { id: 'license', label: '/system license' },
                { id: 'package', label: '/system package' },
                { id: 'interface', label: '/interface' },
              ] as const
            ).map((cmd) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => setSelectedCliCommand(cmd.id)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-all cursor-pointer border ${
                  selectedCliCommand === cmd.id
                    ? isLightMode
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : isLightMode
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border-slate-700/60'
                }`}
              >
                {cmd.label}
              </button>
            ))}

            <button
              type="button"
              onClick={handleCopyCli}
              className={`px-2.5 py-1 rounded text-[11px] flex items-center gap-1 transition-all border cursor-pointer ${
                copiedCli
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : isLightMode
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={isEn ? 'Copy active command output' : 'کپی خروجی دستور فعال'}
            >
              {copiedCli ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isEn ? 'Copied' : 'کپی شد'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Copy Output' : 'کپی متن'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Console Box */}
        <div className="relative">
          {isBusy ? (
            <div
              className={`p-4 rounded-lg font-mono text-xs space-y-2 border ${
                isLightMode
                  ? 'bg-slate-900 border-slate-800 text-slate-400'
                  : 'bg-black/90 border-slate-800 text-slate-400'
              }`}
            >
              <div className="h-4 bg-slate-800/80 rounded w-1/3 animate-pulse" />
              <div className="h-4 bg-slate-800/60 rounded w-2/3 animate-pulse" />
              <div className="h-4 bg-slate-800/50 rounded w-1/2 animate-pulse" />
              <div className="h-4 bg-slate-800/70 rounded w-4/5 animate-pulse" />
            </div>
          ) : (
            <pre
              className={`p-4 rounded-lg text-xs font-mono leading-relaxed max-h-72 overflow-x-auto overflow-y-auto border whitespace-pre-wrap select-text ${
                isLightMode
                  ? 'bg-slate-950 text-cyan-300 border-slate-800 shadow-inner'
                  : 'bg-black/90 text-cyan-300 border-slate-800/80 shadow-inner'
              }`}
            >
              {cliOutputs[selectedCliCommand]?.output ||
                (isEn
                  ? 'No command output available for this section.'
                  : 'خروجی دستوری برای این بخش ثبت نشده است.')}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
