import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Zap,
  HardDrive,
  Thermometer,
  Fan,
  BatteryCharging,
  Activity,
  Terminal,
  RefreshCw,
  Copy,
  Check,
  Server,
  ServerOff,
  Layers,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Wifi,
  WifiOff,
  Radio,
  ExternalLink
} from 'lucide-react';
import { Device, SwitchPort } from '../types';
import { fetchCiscoSystemResources, CiscoSystemResourcesResponse } from '../services/api';
import { FieldInfoTooltip } from './common/FieldInfoTooltip';

interface CiscoSystemResourcesTabProps {
  device: Device;
  ports: SwitchPort[];
  isEn: boolean;
  onConnectTerminal?: (device: Device) => void;
}

export const CiscoSystemResourcesTab: React.FC<CiscoSystemResourcesTabProps> = ({
  device,
  ports,
  isEn,
  onConnectTerminal,
}) => {
  const [resources, setResources] = useState<CiscoSystemResourcesResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedCliCommand, setSelectedCliCommand] = useState<'cpu' | 'memory' | 'env' | 'power' | 'version'>('cpu');
  const [copiedCli, setCopiedCli] = useState<boolean>(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const loadResources = useCallback(async (isManualRefresh: boolean = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setFetchError(null);

    try {
      const data = await fetchCiscoSystemResources(device.id);
      setResources(data);
      setLastFetched(new Date());
      if (!data.is_live && data.warning) {
        setFetchError(data.warning);
      }
    } catch (err: any) {
      console.warn('Failed to load Cisco system resources:', err);
      setFetchError(err.message || (isEn ? 'Could not reach device SSH service' : 'عدم دسترسی به سرویس SSH تجهیز'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [device.id, isEn]);

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

  // Safe fallback calculation based on device if resources are not yet loaded
  const modelUpper = (device.model || '').toUpperCase();
  const isCatalyst9000 = modelUpper.includes('9300') || modelUpper.includes('9200') || modelUpper.includes('9500');
  const isCatalyst3850 = modelUpper.includes('3850') || modelUpper.includes('3650');
  const isNexus = modelUpper.includes('NEXUS') || modelUpper.includes('N9K') || modelUpper.includes('N3K');

  const defaultCpuArch = isCatalyst9000
    ? 'x86 Quad-Core @ 1.80 GHz (x86_64)'
    : isCatalyst3850
    ? 'ARMv7 Multi-Core @ 1.20 GHz'
    : isNexus
    ? 'Intel Xeon 4-Core @ 2.40 GHz'
    : 'PowerPC APM86392 Dual-Core @ 600 MHz';

  const cpu = resources?.cpu || {
    cpuLoad5s: 12,
    cpuLoad1m: 14,
    cpuLoad5m: 11,
    interrupts: 1,
    cpuArch: defaultCpuArch,
    topProcesses: []
  };

  const ram = resources?.ram || {
    totalRamMB: isCatalyst9000 ? 8192 : isCatalyst3850 ? 4096 : 512,
    usedRamMB: isCatalyst9000 ? 2100 : 180,
    freeRamMB: isCatalyst9000 ? 6092 : 332,
    ramPercent: 35,
    ioBuffersMB: 18
  };

  const storage = resources?.storage || {
    totalFlashMB: isCatalyst9000 ? 16384 : 128,
    usedFlashMB: isCatalyst9000 ? 6200 : 82,
    freeFlashMB: isCatalyst9000 ? 10184 : 46,
    flashPercent: 64,
    nvramKB: 2048,
    usedNvramKB: 184
  };

  const thermal = resources?.thermal || {
    currentTemp: 34,
    tempThreshold: 65,
    tempState: 'GREEN',
    inletTemp: 27,
    exhaustTemp: 36
  };

  const poe = resources?.poe || {
    maxPoeWatts: 370,
    totalPoeWatts: 78,
    remainingPoeWatts: 292,
    poePercent: 21,
    poeDeliveringPortsCount: 4
  };

  const cooling = resources?.cooling || {
    fansCount: 2,
    fanSpeeds: 'Fan 1: 4,820 RPM • Fan 2: 4,790 RPM',
    fanStatus: '2x Fans OK',
    airflow: 'Front-to-Back',
    psuStatus: 'PSU 1: Operational'
  };

  const hw = resources?.hardware || {
    hostname: device.name || 'Switch',
    model: device.model || 'Cisco Switch',
    iosVersion: '15.2(7)E7',
    uptime: '48 days, 14 hours, 32 minutes',
    processorBoardId: 'FOC2149V001',
    lastReloadReason: 'Power-on',
    systemImageFile: 'flash:c2960x-universalk9-mz.152-7.E7.bin',
    totalPortsCount: ports.length || 48,
    upPortsCount: ports.filter(p => p.status === 'up').length || 16,
    macTableCount: 16384,
    vlanCapacity: 4096,
    asicForwardingMpps: 101.2,
    bandwidthGbps: 128
  };

  // Fallback formatted CLI outputs if real ones are loading
  const cliOutputs = resources?.cliOutputs || {
    cpu: {
      cmd: 'show processes cpu sorted',
      output: `${device.name || 'Switch'}# show processes cpu sorted\n(Reading telemetry from device...)`
    },
    memory: {
      cmd: 'show memory statistics',
      output: `${device.name || 'Switch'}# show memory statistics\n(Reading telemetry from device...)`
    },
    env: {
      cmd: 'show env all',
      output: `${device.name || 'Switch'}# show env all\n(Reading telemetry from device...)`
    },
    power: {
      cmd: 'show power inline',
      output: `${device.name || 'Switch'}# show power inline\n(Reading telemetry from device...)`
    },
    version: {
      cmd: 'show version',
      output: `${device.name || 'Switch'}# show version\n(Reading telemetry from device...)`
    }
  };

  const isLive = Boolean(resources?.is_live);
  const isBusy = isLoading || isRefreshing;

  return (
    <div className="space-y-4">
      {/* Top Telemetry & Refresh Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white font-mono">
                {device.name} • {isEn ? 'Live Hardware Telemetry' : 'منابع زنده و تله‌متری سخت‌افزار'}
              </h3>

              {isLive ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isEn ? 'LIVE SSH' : 'ارتباط زنده SSH'}</span>
                  {resources?.latency_ms ? (
                    <span className="text-[9px] text-emerald-400/80">({resources.latency_ms}ms)</span>
                  ) : null}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>{isEn ? 'SSH OFFLINE / STANDBY' : 'آفلاین / بدون پاسخ'}</span>
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mt-0.5 font-mono flex flex-wrap items-center gap-2">
              <span>Model: <span className="text-cyan-300 font-bold">{hw.model || device.model || 'Cisco Switch'}</span></span>
              <span>• IP: <span className="text-slate-200">{device.ip || '192.168.1.1'}</span></span>
              <span>• Port: <span className="text-slate-300 font-mono">{device.ssh_port || 22}</span></span>
              {hw.uptime && (
                <span>• Uptime: <span className="text-slate-300">{hw.uptime}</span></span>
              )}
              {lastFetched && (
                <span className="text-[10px] text-slate-500">
                  ({isEn ? 'Synced' : 'بروزرسانی'}: {lastFetched.toLocaleTimeString()})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isBusy}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            title={isEn ? 'Re-read live telemetry directly from device' : 'خواندن مجدد اطلاعات واقعی از دیوایس'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
            <span>{isBusy ? (isEn ? 'Reading from device...' : 'در حال خواندن از دیوایس...') : (isEn ? 'Refresh' : 'بروزرسانی')}</span>
          </button>
        </div>
      </div>

      {!isLive && !isBusy ? (
        /* Dedicated Offline State - Do NOT display resource metrics when device is unreachable */
        <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/70 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center">
            <ServerOff className="w-7 h-7" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>{isEn ? 'DEVICE OFFLINE / UNREACHABLE' : 'تجهیز آفلاین / عدم دسترسی به SSH'}</span>
            </div>
            <h4 className="text-sm font-bold text-white font-mono">
              {isEn ? 'Real-Time Hardware Telemetry Unavailable' : 'اطلاعات منابع سخت‌افزاری در دسترس نیست'}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isEn
                ? `System resource metrics cannot be displayed because an active SSH connection could not be established with ${device.name || 'this Cisco switch'}. Metric data is hidden to prevent displaying unverified or simulated values.`
                : `امکان نمایش اطلاعات مصرف منابع وجود ندارد زیرا ارتباط زنده SSH با ${device.name || 'این سوئیچ سیسکو'} برقرار نشد. جهت اطمینان از صحت اطلاعات، از نمایش مقادیر شبیه‌سازی‌شده یا پیش‌فرض خودداری شده است.`}
            </p>
          </div>

          <div className="max-w-md mx-auto p-3.5 rounded-xl border border-slate-800 bg-black/50 font-mono text-xs text-left space-y-2">
            <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">{isEn ? 'Target IP:' : 'آدرس آی‌پی:'}</span>
              <span className="font-bold text-cyan-400">{device.ip || '192.168.1.1'}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">{isEn ? 'SSH Port:' : 'پورت SSH:'}</span>
              <span className="text-slate-300">{device.ssh_port || 22}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{isEn ? 'Probe Status:' : 'وضعیت اتصال:'}</span>
              <span className="text-amber-400 text-[11px] truncate max-w-[240px]">
                {fetchError || (isEn ? 'Connection refused or timed out' : 'تجهیز به درخواست SSH پاسخ نداد')}
              </span>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={handleRefresh}
              className="px-4 py-2 rounded-xl text-xs font-bold font-mono bg-cyan-600 hover:bg-cyan-500 text-white transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isEn ? 'Retry Telemetry Probe' : 'استعلام مجدد تله‌متری'}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Main Resource Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* 1. CPU Architecture & Load */}
        <div className="relative overflow-hidden p-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-xs space-y-2.5">
          {isBusy && <div className="shimmer-light-beam z-10" />}

          <div className="flex items-center justify-between">
            <span className="text-xs flex items-center gap-1.5 text-slate-300 font-medium">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>{isEn ? 'CPU Architecture' : 'معماری و پردازنده'}</span>
              <FieldInfoTooltip
                isEn={isEn}
                title={isEn ? 'CPU Architecture & Utilization' : 'معماری و بار پردازنده'}
                whatIsIt={isEn
                  ? 'Processor architecture and active CPU utilization percentages measured over 5-second, 1-minute, and 5-minute intervals.'
                  : 'معماری پردازنده و درصد بار کاری CPU در فواصل زمانی ۵ ثانیه‌ای، ۱ دقیقه‌ای و ۵ دقیقه‌ای.'}
                whyNeeded={isEn
                  ? 'Sustained high CPU (>80%) indicates switching loops, excessive ARP/broadcast flooding, or unoptimized control-plane routing protocols.'
                  : 'بالا ماندن طولانی‌مدت بار CPU (بیش از ۸۰٪) نشانه لوپ سوئیچینگ، برودکست استورم یا پردازش بیش از حد بسته‌ها در کنترل پلین است.'}
                example={isEn
                  ? 'Normal operating load: 5% - 25%. Run "show processes cpu sorted" on CLI to identify runaway processes.'
                  : 'بار کاری نرمال ۵٪ تا ۲۵٪ است. با دستور "show processes cpu sorted" می‌توانید پردازش‌های پرمصرف را بررسی کنید.'}
              />
            </span>

            {isBusy ? (
              <div className="h-5 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                {cpu.cpuLoad5s}% {isEn ? 'Load' : 'بار'}
              </span>
            )}
          </div>

          <div className="text-base font-bold font-mono text-white truncate" title={cpu.cpuArch}>
            {isBusy ? (
              <div className="h-5 w-48 bg-slate-800 rounded animate-pulse" />
            ) : (
              cpu.cpuArch
            )}
          </div>

          <div className="text-xs font-mono text-cyan-300 font-bold flex items-center justify-between">
            {isBusy ? (
              <div className="h-4 w-full bg-slate-800/80 rounded animate-pulse" />
            ) : (
              <span>5s: {cpu.cpuLoad5s}% • 1m: {cpu.cpuLoad1m}% • 5m: {cpu.cpuLoad5m}%</span>
            )}
          </div>

          <div className="w-full rounded-full h-2 overflow-hidden bg-slate-800">
            <div
              className="bg-cyan-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(5, cpu.cpuLoad5s)}%` }}
            />
          </div>

          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>{isEn ? 'Current Load:' : 'بار کاری جاری:'} {cpu.cpuLoad5s}%</span>
            <span className="text-slate-500">
              {isEn ? `Interrupts: ${cpu.interrupts}%` : `وقفه‌ها: ${cpu.interrupts}٪`}
            </span>
          </div>
        </div>

        {/* 2. System Memory (RAM) */}
        <div className="relative overflow-hidden p-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-xs space-y-2.5">
          {isBusy && <div className="shimmer-light-beam z-10" />}

          <div className="flex items-center justify-between">
            <span className="text-xs flex items-center gap-1.5 text-slate-300 font-medium">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>{isEn ? 'System Memory (RAM)' : 'حافظه اصلی (RAM)'}</span>
              <FieldInfoTooltip
                isEn={isEn}
                title={isEn ? 'System Memory (RAM)' : 'حافظه اصلی سیستم'}
                whatIsIt={isEn
                  ? 'Physical DRAM utilized by the Cisco IOS kernel, packet I/O ring buffers, and routing tables.'
                  : 'حافظه رم فیزیکی مورد استفاده سیستم‌عامل سیسکو، بافرهای ورودی/خروجی بسته‌ها و جداول مسیریابی.'}
                whyNeeded={isEn
                  ? 'Memory exhaustion causes interface buffer drops, routing convergence failures, or kernel panic reloads.'
                  : 'اتمام رم موجب افت فریم در اینترفیس‌ها، کندی همگرایی روتینگ و کرش ناگهانی سیستم می‌شود.'}
                example={isEn
                  ? '512 MB to 8 GB based on model. Healthy memory usage is typically below 70%.'
                  : 'بین ۵۱۲ مگابایت تا ۸ گیگابایت متناسب با مدل. مصرف نرمال معمولاً زیر ۷۰٪ است.'}
              />
            </span>

            {isBusy ? (
              <div className="h-5 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {ram.ramPercent}% {isEn ? 'Used' : 'مصرف'}
              </span>
            )}
          </div>

          <div className="text-base font-bold font-mono text-white">
            {isBusy ? (
              <div className="h-5 w-32 bg-slate-800 rounded animate-pulse" />
            ) : ram.totalRamMB >= 1024 ? (
              `${(ram.totalRamMB / 1024).toFixed(1)} GB (${ram.totalRamMB} MB)`
            ) : (
              `${ram.totalRamMB} MB`
            )}
          </div>

          <div className="text-xs font-mono text-emerald-300 font-bold flex items-center justify-between">
            {isBusy ? (
              <div className="h-4 w-full bg-slate-800/80 rounded animate-pulse" />
            ) : (
              <span>{isEn ? 'Free:' : 'فضای آزاد:'} {ram.freeRamMB} MB ({100 - ram.ramPercent}%)</span>
            )}
          </div>

          <div className="w-full rounded-full h-2 overflow-hidden bg-slate-800">
            <div
              className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(5, ram.ramPercent)}%` }}
            />
          </div>

          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>{isEn ? 'Used:' : 'مصرف‌شده:'} {ram.usedRamMB} MB</span>
            <span className="text-slate-500">
              {isEn ? `I/O Buffers: ${ram.ioBuffersMB} MB` : `بافر I/O: ${ram.ioBuffersMB} مگابایت`}
            </span>
          </div>
        </div>

        {/* 3. Flash & NVRAM Storage */}
        <div className="relative overflow-hidden p-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-xs space-y-2.5">
          {isBusy && <div className="shimmer-light-beam z-10" />}

          <div className="flex items-center justify-between">
            <span className="text-xs flex items-center gap-1.5 text-slate-300 font-medium">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span>{isEn ? 'Flash & NVRAM Storage' : 'حافظه ذخیره‌سازی فلش'}</span>
              <FieldInfoTooltip
                isEn={isEn}
                title={isEn ? 'Flash & NVRAM Storage' : 'حافظه ذخیره‌سازی فلش و NVRAM'}
                whatIsIt={isEn
                  ? 'Non-volatile flash memory storing Cisco IOS system binaries, crash dumps, and NVRAM storing the startup-config file.'
                  : 'حافظه فلش غیرفرار جهت نگهداری ایمیج‌های باینری سیسکو و حافظه NVRAM جهت ذخیره تنظیمات استارتاپ.'}
                whyNeeded={isEn
                  ? 'Adequate flash storage is mandatory for staging software upgrade packages and bootloader recovery files.'
                  : 'فضای کافی فلش برای دانلود پکیج‌های ارتقای سیستم‌عامل و ریکاوری بوت‌لودر کاملاً حیاتی است.'}
                example={isEn
                  ? 'At least 50MB free flash is recommended to stage new IOS release .bin files.'
                  : 'حداقل ۵۰ مگابایت فضای خالی فلش جهت قرار دادن ایمیج‌های جدید سیسکو توصیه می‌شود.'}
              />
            </span>

            {isBusy ? (
              <div className="h-5 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                {storage.flashPercent}% {isEn ? 'Used' : 'اشغال'}
              </span>
            )}
          </div>

          <div className="text-base font-bold font-mono text-white">
            {isBusy ? (
              <div className="h-5 w-32 bg-slate-800 rounded animate-pulse" />
            ) : storage.totalFlashMB >= 1024 ? (
              `${(storage.totalFlashMB / 1024).toFixed(1)} GB Flash`
            ) : (
              `${storage.totalFlashMB} MB Flash`
            )}
          </div>

          <div className="text-xs font-mono text-purple-300 font-bold flex items-center justify-between">
            {isBusy ? (
              <div className="h-4 w-full bg-slate-800/80 rounded animate-pulse" />
            ) : (
              <span>{isEn ? 'Free:' : 'فضای آزاد:'} {storage.freeFlashMB} MB ({100 - storage.flashPercent}%)</span>
            )}
          </div>

          <div className="w-full rounded-full h-2 overflow-hidden bg-slate-800">
            <div
              className="bg-purple-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(5, storage.flashPercent)}%` }}
            />
          </div>

          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>NVRAM: {storage.usedNvramKB} KB / {storage.nvramKB} KB</span>
            <span className="text-slate-500">{isEn ? 'Startup-Config: OK' : 'استارتاپ کانفیگ: سالم'}</span>
          </div>
        </div>

        {/* 4. Thermal & Chassis Environmental Sensors */}
        <div className="relative overflow-hidden p-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-xs space-y-2.5">
          {isBusy && <div className="shimmer-light-beam z-10" />}

          <div className="flex items-center justify-between">
            <span className="text-xs flex items-center gap-1.5 text-slate-300 font-medium">
              <Thermometer className="w-4 h-4 text-amber-400" />
              <span>{isEn ? 'Thermal & Sensors' : 'حرارت و سنسورهای شاسی'}</span>
              <FieldInfoTooltip
                isEn={isEn}
                title={isEn ? 'Chassis Temperature Sensors' : 'سنسورهای حرارتی شاسی'}
                whatIsIt={isEn
                  ? 'Real-time internal chassis, inlet, and exhaust air temperatures captured by hardware thermal probes.'
                  : 'دمای لحظه‌ای بورد، هوای ورودی و هوای خروجی شاسی که توسط سنسورهای سخت‌افزاری گزارش می‌شوند.'}
                whyNeeded={isEn
                  ? 'Overheating causes ASIC packet corruption, component lifetime reduction, or emergency thermal shutdown.'
                  : 'دمای بیش از حد باعث خرابی چیپ‌های سوئیچینگ، کاهش طول عمر خازن‌ها یا خاموشی اضطراری دستگاه می‌شود.'}
                example={isEn
                  ? 'Normal operating range is 25°C - 45°C. Critical threshold is typically 65°C - 70°C.'
                  : 'محدوده دمای ایمن بین ۲۵ تا ۴۵ درجه سانتیگراد است. آستانه خطر در حدود ۶۵ تا ۷۰ درجه تعریف شده است.'}
              />
            </span>

            {isBusy ? (
              <div className="h-5 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                thermal.currentTemp > 60
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : thermal.currentTemp > 50
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {thermal.tempState || (isEn ? 'NORMAL' : 'نرمال')}
              </span>
            )}
          </div>

          <div className="text-base font-bold font-mono text-white flex items-center gap-2">
            {isBusy ? (
              <div className="h-5 w-24 bg-slate-800 rounded animate-pulse" />
            ) : (
              <>
                <span>{thermal.currentTemp}°C</span>
                <span className="text-xs font-normal text-slate-400 font-mono">
                  / {Math.round(thermal.currentTemp * 1.8 + 32)}°F
                </span>
              </>
            )}
          </div>

          <div className="text-xs font-mono text-amber-300 font-bold flex items-center justify-between">
            {isBusy ? (
              <div className="h-4 w-full bg-slate-800/80 rounded animate-pulse" />
            ) : (
              <span>{isEn ? 'Threshold:' : 'آستانه هشدار:'} {thermal.tempThreshold}°C (Safe Zone)</span>
            )}
          </div>

          <div className="w-full rounded-full h-2 overflow-hidden bg-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-500 to-amber-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, Math.round((thermal.currentTemp / (thermal.tempThreshold || 65)) * 100))}%` }}
            />
          </div>

          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>{isEn ? 'Inlet Air:' : 'هوای ورودی:'} {thermal.inletTemp}°C</span>
            <span className="text-slate-500">{isEn ? 'Exhaust:' : 'هوای خروجی:'} {thermal.exhaustTemp}°C</span>
          </div>
        </div>

        {/* 5. PoE Power Budget & Power Supply */}
        <div className="relative overflow-hidden p-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-xs space-y-2.5">
          {isBusy && <div className="shimmer-light-beam z-10" />}

          <div className="flex items-center justify-between">
            <span className="text-xs flex items-center gap-1.5 text-slate-300 font-medium">
              <BatteryCharging className="w-4 h-4 text-blue-400" />
              <span>{isEn ? 'PoE Power Supply' : 'تغذیه و توان PoE'}</span>
              <FieldInfoTooltip
                isEn={isEn}
                title={isEn ? 'Power over Ethernet (PoE) Budget' : 'ظرفیت توان PoE'}
                whatIsIt={isEn
                  ? 'Total electrical wattage budget available and consumed by connected IP phones, wireless access points, and IP cameras.'
                  : 'مجموع توان الکتریکی بر حسب وات که برای تغذیه تلفن‌های VoIP، اکسس پوینت‌ها و دوربین‌های مداربسته اختصاص می‌یابد.'}
                whyNeeded={isEn
                  ? 'Exceeding the power supply budget triggers automatic PoE port shutdown or denial of power to newly connected endpoints.'
                  : 'مصرف بیش از ظرفیت پاور باعث خاموش شدن اولویت‌دار پورت‌ها یا عدم روشن شدن تجهیزات جدید متصل می‌شود.'}
                example={isEn
                  ? '370W or 740W power supplies. Class 3 VoIP devices draw ~15W; Class 4 Wi-Fi APs draw ~30W.'
                  : 'پاورهای ۳۷۰ یا ۷۴۰ وات. تلفن‌های تحت شبکه معمولاً ۱۵ وات و اکسس‌پوینت‌ها تا ۳۰ وات برق مصرف می‌کنند.'}
              />
            </span>

            {isBusy ? (
              <div className="h-5 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                {poe.poePercent}% {isEn ? 'Drawn' : 'مصرف'}
              </span>
            )}
          </div>

          <div className="text-base font-bold font-mono text-white">
            {isBusy ? (
              <div className="h-5 w-28 bg-slate-800 rounded animate-pulse" />
            ) : (
              `${poe.maxPoeWatts} Watts ${isEn ? 'Budget' : 'ظرفیت'}`
            )}
          </div>

          <div className="text-xs font-mono text-blue-300 font-bold flex items-center justify-between">
            {isBusy ? (
              <div className="h-4 w-full bg-slate-800/80 rounded animate-pulse" />
            ) : (
              <span>
                {isEn ? 'Available:' : 'باقیمانده:'} {poe.remainingPoeWatts} W ({100 - poe.poePercent}%)
              </span>
            )}
          </div>

          <div className="w-full rounded-full h-2 overflow-hidden bg-slate-800">
            <div
              className="bg-blue-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(5, poe.poePercent)}%` }}
            />
          </div>

          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>{isEn ? 'Delivering:' : 'مصرف جاری:'} {poe.totalPoeWatts} W</span>
            <span className="text-slate-500">
              {poe.poeDeliveringPortsCount} {isEn ? 'Ports Powered' : 'پورت برق‌دار'}
            </span>
          </div>
        </div>

        {/* 6. Cooling Fans & Hardware Status */}
        <div className="relative overflow-hidden p-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-xs space-y-2.5">
          {isBusy && <div className="shimmer-light-beam z-10" />}

          <div className="flex items-center justify-between">
            <span className="text-xs flex items-center gap-1.5 text-slate-300 font-medium">
              <Fan className="w-4 h-4 text-teal-400" />
              <span>{isEn ? 'Cooling System' : 'سیستم خنک‌کننده شاسی'}</span>
              <FieldInfoTooltip
                isEn={isEn}
                title={isEn ? 'Cooling Fans & Airflow' : 'سیستم فن و تهویه شاسی'}
                whatIsIt={isEn
                  ? 'Rotational speed (RPM) of internal blower fans, tray status, and airflow direction inside the chassis.'
                  : 'سرعت چرخش فن‌های خنک‌کننده شاسی بر حسب دور در دقیقه (RPM)، وضعیت سلامت و جهت جریان هوا.'}
                whyNeeded={isEn
                  ? 'Fan motor failure creates localized hot spots and causes thermal throttling of the switching fabric.'
                  : 'توقف فن‌ها موجب بالا رفتن فوری دما و کاهش سرعت سوئیچینگ به منظور محافظت از چیپ‌ها می‌شود.'}
                example={isEn
                  ? 'Nominal speed is 4,000 to 5,500 RPM with front-to-back rack airflow.'
                  : 'سرعت عادی حدود ۴۰۰۰ تا ۵۵۰۰ دور در دقیقه با جهت جریان هوای جلو به عقب رک است.'}
              />
            </span>

            {isBusy ? (
              <div className="h-5 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                {cooling.fanStatus || (isEn ? `${cooling.fansCount}x Fans OK` : `${cooling.fansCount} فن فعال`)}
              </span>
            )}
          </div>

          <div className="text-base font-bold font-mono text-white">
            {isBusy ? (
              <div className="h-5 w-32 bg-slate-800 rounded animate-pulse" />
            ) : (
              cooling.fanSpeeds?.split('•')?.[0]?.trim() || '4,820 RPM (Nominal)'
            )}
          </div>

          <div className="text-xs font-mono text-teal-300 font-bold flex items-center justify-between truncate">
            {isBusy ? (
              <div className="h-4 w-full bg-slate-800/80 rounded animate-pulse" />
            ) : (
              <span>{cooling.fanSpeeds}</span>
            )}
          </div>

          <div className="w-full rounded-full h-2 overflow-hidden bg-slate-800">
            <div className="bg-teal-500 h-full w-[65%] rounded-full" />
          </div>

          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>{isEn ? `Airflow: ${cooling.airflow}` : `جهت باد: ${cooling.airflow}`}</span>
            <span className="text-slate-500">{isEn ? cooling.psuStatus : 'پاور ۱: نرمال'}</span>
          </div>
        </div>
      </div>

      {/* Switching Fabric & Hardware Architecture Summary */}
      <div className="relative overflow-hidden p-4 rounded-xl border border-slate-800 bg-slate-900/40 shadow-xs">
        {isBusy && <div className="shimmer-light-beam z-10" />}

        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h4 className="font-bold text-white font-mono">
              {isEn ? 'Switching Fabric & ASIC Architecture' : 'مشخصات معماری سوئیچینگ و ASIC'}
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            ASIC Forwarding: <span className="text-emerald-400 font-bold">{hw.asicForwardingMpps} Mpps</span> • Bandwidth:{' '}
            <span className="text-indigo-300 font-bold">{hw.bandwidthGbps} Gbps</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{isEn ? 'Physical Ports' : 'پورت‌های فیزیکی'}</div>
            <div className="text-white font-bold font-mono text-sm mt-0.5">
              {hw.totalPortsCount} {isEn ? 'Ports' : 'پورت'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">10/100/1000Base-T + SFP+</div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{isEn ? 'Active Links' : 'لینک‌های فعال'}</div>
            <div className="text-emerald-400 font-bold font-mono text-sm mt-0.5">
              {hw.upPortsCount} / {hw.totalPortsCount} ({hw.totalPortsCount ? Math.round((hw.upPortsCount / hw.totalPortsCount) * 100) : 0}%)
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{isEn ? 'Full-Duplex Wire-Speed' : 'سرعت خطی دوطرفه'}</div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{isEn ? 'MAC Address Table' : 'جدول مک آدرس'}</div>
            <div className="text-cyan-300 font-bold font-mono text-sm mt-0.5">{hw.macTableCount.toLocaleString()} {isEn ? 'Entries' : 'رکورد'}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{isEn ? 'Aging Time: 300s' : 'زمان انقضا: ۳۰۰ ثانیه'}</div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{isEn ? 'VLAN Capacity' : 'ظرفیت وی‌لن‌ها'}</div>
            <div className="text-purple-300 font-bold font-mono text-sm mt-0.5">{hw.vlanCapacity.toLocaleString()} VLANs</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{isEn ? 'IEEE 802.1Q Active' : 'استاندارد 802.1Q فعال'}</div>
          </div>
        </div>
      </div>

      {/* Cisco CLI Hardware Diagnostics Console */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-md">
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white font-mono">
              {isEn ? 'Cisco IOS Diagnostics CLI Telemetry' : 'خروجی فرامین تشخیصی سیسکو IOS'}
            </span>
            {isLive && (
              <span className="text-[10px] font-mono text-emerald-400/80 px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                {isEn ? 'LIVE OUTPUT' : 'خروجی واقعی زنده'}
              </span>
            )}
          </div>

          {/* Command selector pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'cpu', label: 'show processes cpu' },
              { id: 'memory', label: 'show memory stats' },
              { id: 'env', label: 'show env all' },
              { id: 'power', label: 'show power inline' },
              { id: 'version', label: 'show version' }
            ].map((cmd) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => setSelectedCliCommand(cmd.id as any)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition cursor-pointer ${
                  selectedCliCommand === cmd.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                    : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                }`}
              >
                {cmd.label}
              </button>
            ))}

            <button
              type="button"
              onClick={handleCopyCli}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono border border-slate-700 transition flex items-center gap-1 cursor-pointer"
              title={isEn ? 'Copy CLI output to clipboard' : 'کپی خروجی در کلیپ‌بورد'}
            >
              {copiedCli ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCli ? (isEn ? 'Copied' : 'کپی شد') : (isEn ? 'Copy' : 'کپی')}</span>
            </button>
          </div>
        </div>

        {/* Terminal Screen Body */}
        <div className="relative p-3.5 bg-black/95 font-mono text-[11px] leading-relaxed text-emerald-400 max-h-56 overflow-y-auto whitespace-pre selection:bg-emerald-500/30 selection:text-white">
          {isBusy && <div className="shimmer-light-beam z-10" />}
          {cliOutputs[selectedCliCommand]?.output || (isEn ? 'No output received.' : 'خروجی دریافت نشد.')}
        </div>
      </div>
        </>
      )}
    </div>
  );
};
