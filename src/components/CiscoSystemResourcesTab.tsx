import React, { useState } from 'react';
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
  Layers,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Device, SwitchPort } from '../types';

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCliCommand, setSelectedCliCommand] = useState<'cpu' | 'memory' | 'env' | 'power' | 'version'>('cpu');
  const [copiedCli, setCopiedCli] = useState(false);
  const [telemetryTick, setTelemetryTick] = useState(0);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setTelemetryTick((prev) => prev + 1);
      setIsRefreshing(false);
    }, 450);
  };

  // Derive realistic hardware specs from device model
  const modelUpper = (device.model || '').toUpperCase();
  const isCatalyst9000 = modelUpper.includes('9300') || modelUpper.includes('9200') || modelUpper.includes('9500');
  const isCatalyst3850 = modelUpper.includes('3850') || modelUpper.includes('3650');
  const isNexus = modelUpper.includes('NEXUS') || modelUpper.includes('N9K') || modelUpper.includes('N3K');

  const cpuArch = isCatalyst9000
    ? 'x86 Quad-Core @ 1.80 GHz (x86_64)'
    : isCatalyst3850
    ? 'ARMv7 Multi-Core @ 1.20 GHz'
    : isNexus
    ? 'Intel Xeon 4-Core @ 2.40 GHz'
    : 'PowerPC APM86392 Dual-Core @ 600 MHz';

  const totalRamMB = isCatalyst9000 ? 8192 : isCatalyst3850 ? 4096 : isNexus ? 16384 : 512;
  const totalFlashMB = isCatalyst9000 ? 16384 : isCatalyst3850 ? 2048 : isNexus ? 32768 : 128;
  const nvramKB = isCatalyst9000 ? 4096 : isCatalyst3850 ? 2048 : isNexus ? 8192 : 512;

  // Real-time jitter for dynamic display
  const baseCpu = 14 + (telemetryTick % 5);
  const cpuLoad5s = Math.min(95, baseCpu);
  const cpuLoad1m = Math.max(8, baseCpu - 2);
  const cpuLoad5m = Math.max(6, baseCpu - 4);

  const usedRamMB = Math.round(totalRamMB * (0.22 + ((telemetryTick % 3) * 0.01)));
  const freeRamMB = totalRamMB - usedRamMB;
  const ramPercent = Math.round((usedRamMB / totalRamMB) * 100);

  const usedFlashMB = Math.round(totalFlashMB * 0.38);
  const freeFlashMB = totalFlashMB - usedFlashMB;
  const flashPercent = Math.round((usedFlashMB / totalFlashMB) * 100);

  const usedNvramKB = Math.round(nvramKB * 0.09);
  const freeNvramKB = nvramKB - usedNvramKB;

  // Active port calculations
  const upPortsCount = ports.filter((p) => p.status === 'up').length;
  const totalPortsCount = ports.length || 48;

  // PoE Calculation from ports
  const poeDeliveringPorts = ports.filter((p) => p.poe_status === 'delivering' || (p.poe_power && p.poe_power > 0));
  const totalPoeWatts = ports.reduce((acc, p) => acc + (Number(p.poe_power) || 0), 0) || 78;
  const maxPoeWatts = 370;
  const poePercent = Math.min(100, Math.round((totalPoeWatts / maxPoeWatts) * 100));

  // Temperature
  const currentTemp = 33 + (telemetryTick % 3);

  // Formatted Cisco CLI Commands outputs
  const cliOutputs: Record<string, { cmd: string; output: string }> = {
    cpu: {
      cmd: 'show processes cpu sorted',
      output: `${device.name || 'Switch'}# show processes cpu sorted
CPU utilization for five seconds: ${cpuLoad5s}%/2%; one minute: ${cpuLoad1m}%; five minutes: ${cpuLoad5m}%
 PID Runtime(ms)     Invoked      uSecs   5Sec   1Min   5Min TTY Process
   1           0           4          0  0.00%  0.00%  0.00%   0 Chunk Manager
   2        3412       12891        264  1.42%  1.18%  1.10%   0 IP Input
   3        1248        8912        140  0.88%  0.72%  0.68%   0 Spanning Tree
   4        5820       24810        234  1.20%  1.10%  0.95%   0 SSH Process
   5         940        4812        195  0.45%  0.38%  0.32%   0 SNMP Engine
   6         420        2100        200  0.20%  0.15%  0.12%   0 CDP Protocol
   7         310        1520        203  0.15%  0.12%  0.10%   0 LLDP Protocol
[OK - Normal System Load]`
    },
    memory: {
      cmd: 'show memory statistics',
      output: `${device.name || 'Switch'}# show memory statistics
                Head    Total(b)     Used(b)     Free(b)   Lowest(b)  Largest(b)
Processor   2B088480   ${(totalRamMB * 1024 * 1024).toLocaleString()}   ${(usedRamMB * 1024 * 1024).toLocaleString()}   ${(freeRamMB * 1024 * 1024).toLocaleString()}   ${(freeRamMB * 1024 * 900).toLocaleString()}   ${(freeRamMB * 1024 * 800).toLocaleString()}
      I/O   3B088480    67108864    18454784    48654080    47185920    46530560

Memory summary:
  Total Processor Memory: ${totalRamMB} MB
  Processor Memory Used : ${usedRamMB} MB (${ramPercent}%)
  Processor Memory Free : ${freeRamMB} MB (${100 - ramPercent}%)
  I/O Memory Used       : 17.6 MB (27.5%)
[OK - Memory Allocation Healthy]`
    },
    env: {
      cmd: 'show environment all',
      output: `${device.name || 'Switch'}# show environment all
FAN 1 is OK, Speed: 4820 RPM, Airflow: Front to Back
FAN 2 is OK, Speed: 4790 RPM, Airflow: Front to Back
FAN 3 is OK, Speed: 4850 RPM, Airflow: Front to Back

SYSTEM TEMPERATURE is OK
System Temperature Sensor: ${currentTemp} Celsius (Threshold: 65 Celsius)
Internal Ambient Sensor  : 31 Celsius
Inlet Air Sensor         : 27 Celsius
Exhaust Air Sensor       : 36 Celsius

POWER SUPPLY 1 is OK (AC Input: 220V, Output: 12V / 54V PoE, Capacity: 640W)
POWER SUPPLY 2 is PRESENT / REDUNDANT (RPS Standby Mode)
[OK - Thermal & Fan Telemetry Optimal]`
    },
    power: {
      cmd: 'show power inline',
      output: `${device.name || 'Switch'}# show power inline
Available: ${maxPoeWatts}.0(w)  Used: ${totalPoeWatts}.0(w)  Remaining: ${maxPoeWatts - totalPoeWatts}.0(w)

Interface Admin  Oper       Power(Watts) Device              Class Max
--------- ------ ---------- ------------ ------------------- ----- ----
Gi1/0/1   auto   on         15.4         IP Phone 8845       3     30.0
Gi1/0/2   auto   on         15.4         IP Phone 8845       3     30.0
Gi1/0/3   auto   on         25.5         Cisco Catalyst AP   4     30.0
Gi1/0/4   auto   on         15.4         Cisco Desk Camera   3     30.0
Gi1/0/5   auto   off        0.0          n/a                 n/a   30.0
[PoE Power Management Active - ${poeDeliveringPorts.length || 4} Devices Delivering]`
    },
    version: {
      cmd: 'show version',
      output: `${device.name || 'Switch'}# show version
Cisco IOS Software, ${device.model || 'Catalyst L2/L3 Switch'} Software
Technical Support: http://www.cisco.com/techsupport
Copyright (c) 1986-2024 by Cisco Systems, Inc.
Compiled Fri 12-Jan-24 14:32 by prod_rel_team

ROM: Bootstrap program is ${device.model || 'Catalyst'} boot loader
BOOTLDR: Version 15.2(7)E7, RELEASE SOFTWARE (fc3)

${device.name || 'Switch'} uptime is 48 days, 14 hours, 32 minutes
System returned to ROM by power-on
System image file is "flash:${(device.model || 'c2960x').toLowerCase()}-universalk9-mz.152-7.E7.bin"

cisco ${device.model || 'WS-C2960X-48TS-L'} (PowerPC) processor with ${totalRamMB * 1024}K bytes of memory.
Processor board ID FOC2149V001
Last reload reason: Power-on
${totalPortsCount} Gigabit Ethernet interfaces
${nvramKB}K bytes of non-volatile configuration memory.
${totalFlashMB * 1024}K bytes of physical memory.`
    }
  };

  const handleCopyCli = () => {
    const activeText = cliOutputs[selectedCliCommand]?.output || '';
    if (!activeText) return;
    navigator.clipboard.writeText(activeText);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

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
                {device.name} • {isEn ? 'Hardware Telemetry' : 'منابع و تله‌متری سخت‌افزار'}
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isEn ? 'HEALTH: NORMAL' : 'وضعیت: نرمال'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              Model: <span className="text-cyan-300 font-bold">{device.model || 'Cisco Switch'}</span> • IP:{' '}
              <span className="text-slate-200">{device.ip || '192.168.1.1'}</span> • Uptime:{' '}
              <span className="text-slate-300">48d 14h 32m</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onConnectTerminal && (
            <button
              type="button"
              onClick={() => onConnectTerminal(device)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              title={isEn ? 'Open Cisco CLI Terminal' : 'باز کردن خط فرمان ترمینال سیسکو'}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isEn ? 'Cisco CLI' : 'ترمینال سیسکو'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            title={isEn ? 'Refresh Live System Telemetry' : 'بروزرسانی داده‌های زنده تله‌متری'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? (isEn ? 'Reading...' : 'در حال خواندن...') : (isEn ? 'Refresh' : 'بروزرسانی')}</span>
          </button>
        </div>
      </div>

      {/* Main Resource Cards Grid (Matching MikroTik Device Manage System Resources style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* 1. CPU Architecture & Load */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs flex items-center gap-1.5 text-slate-300 font-medium">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>{isEn ? 'CPU Architecture' : 'معماری و پردازنده'}</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
              {cpuLoad5s}% {isEn ? 'Load' : 'بار'}
            </span>
          </div>
          <div className="text-base font-bold font-mono text-white truncate" title={cpuArch}>
            {cpuArch}
          </div>
          <div className="text-xs font-mono text-cyan-300 font-bold flex items-center justify-between">
            <span>5s: {cpuLoad5s}% • 1m: {cpuLoad1m}% • 5m: {cpuLoad5m}%</span>
          </div>
          <div className="w-full rounded-full h-2 overflow-hidden bg-slate-800">
            <div
              className="bg-cyan-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(5, cpuLoad5s)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>{isEn ? 'Current Load:' : 'بار کاری جاری:'} {cpuLoad5s}%</span>
            <span className="text-slate-500">{isEn ? 'Interrupts: 2%' : 'وقفه‌ها: ۲٪'}</span>
          </div>
        </div>

        {/* 2. System Memory (RAM) */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs flex items-center gap-1.5 text-slate-300 font-medium">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>{isEn ? 'System Memory (RAM)' : 'حافظه اصلی (RAM)'}</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              {ramPercent}% {isEn ? 'Used' : 'مصرف'}
            </span>
          </div>
          <div className="text-base font-bold font-mono text-white">
            {totalRamMB >= 1024 ? `${totalRamMB / 1024} GB (${totalRamMB} MB)` : `${totalRamMB} MB`}
          </div>
          <div className="text-xs font-mono text-emerald-300 font-bold flex items-center justify-between">
            <span>{isEn ? 'Free:' : 'فضای آزاد:'} {freeRamMB} MB ({100 - ramPercent}%)</span>
          </div>
          <div className="w-full rounded-full h-2 overflow-hidden bg-slate-800">
            <div
              className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(5, ramPercent)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>{isEn ? 'Used:' : 'مصرف‌شده:'} {usedRamMB} MB</span>
            <span className="text-slate-500">{isEn ? 'I/O Buffers: 18 MB' : 'بافر I/O: ۱۸ مگ'}</span>
          </div>
        </div>

        {/* 3. Flash & NVRAM Storage */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs flex items-center gap-1.5 text-slate-300 font-medium">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span>{isEn ? 'Flash & NVRAM Storage' : 'حافظه ذخیره‌سازی فلش'}</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
              {flashPercent}% {isEn ? 'Used' : 'اشغال'}
            </span>
          </div>
          <div className="text-base font-bold font-mono text-white">
            {totalFlashMB >= 1024 ? `${totalFlashMB / 1024} GB Flash` : `${totalFlashMB} MB Flash`}
          </div>
          <div className="text-xs font-mono text-purple-300 font-bold flex items-center justify-between">
            <span>{isEn ? 'Free:' : 'فضای آزاد:'} {freeFlashMB} MB ({100 - flashPercent}%)</span>
          </div>
          <div className="w-full rounded-full h-2 overflow-hidden bg-slate-800">
            <div
              className="bg-purple-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(5, flashPercent)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>NVRAM: {usedNvramKB} KB / {nvramKB} KB</span>
            <span className="text-slate-500">{isEn ? 'Startup-Config: OK' : 'استارتاپ کانفیگ: سالم'}</span>
          </div>
        </div>

        {/* 4. Thermal & Chassis Environmental Sensors */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs flex items-center gap-1.5 text-slate-300 font-medium">
              <Thermometer className="w-4 h-4 text-amber-400" />
              <span>{isEn ? 'Thermal & Sensors' : 'حرارت و سنسورهای شاسی'}</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              {isEn ? 'NORMAL' : 'نرمال'}
            </span>
          </div>
          <div className="text-base font-bold font-mono text-white flex items-center gap-2">
            <span>{currentTemp}°C</span>
            <span className="text-xs font-normal text-slate-400 font-mono">/ {Math.round(currentTemp * 1.8 + 32)}°F</span>
          </div>
          <div className="text-xs font-mono text-amber-300 font-bold flex items-center justify-between">
            <span>{isEn ? 'Threshold:' : 'آستانه هشدار:'} 65°C (Safe Zone)</span>
          </div>
          <div className="w-full rounded-full h-2 overflow-hidden bg-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-500 to-amber-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.round((currentTemp / 65) * 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>{isEn ? 'Inlet Air:' : 'هوای ورودی:'} 27°C</span>
            <span className="text-slate-500">{isEn ? 'Exhaust: 36°C' : 'هوای خروجی: ۳۶°C'}</span>
          </div>
        </div>

        {/* 5. PoE Power Budget & Power Supply */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs flex items-center gap-1.5 text-slate-300 font-medium">
              <BatteryCharging className="w-4 h-4 text-blue-400" />
              <span>{isEn ? 'PoE Power Supply' : 'تغذیه و توان PoE'}</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
              {poePercent}% {isEn ? 'Drawn' : 'مصرف'}
            </span>
          </div>
          <div className="text-base font-bold font-mono text-white">
            {maxPoeWatts} Watts {isEn ? 'Budget' : 'ظرفیت'}
          </div>
          <div className="text-xs font-mono text-blue-300 font-bold flex items-center justify-between">
            <span>{isEn ? 'Available:' : 'باقیمانده:'} {maxPoeWatts - totalPoeWatts} W ({100 - poePercent}%)</span>
          </div>
          <div className="w-full rounded-full h-2 overflow-hidden bg-slate-800">
            <div
              className="bg-blue-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(5, poePercent)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>{isEn ? 'Delivering:' : 'مصرف جاری:'} {totalPoeWatts} W</span>
            <span className="text-slate-500">
              {poeDeliveringPorts.length || 4} {isEn ? 'Ports Powered' : 'پورت برق‌دار'}
            </span>
          </div>
        </div>

        {/* 6. Cooling Fans & Hardware Status */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs flex items-center gap-1.5 text-slate-300 font-medium">
              <Fan className="w-4 h-4 text-teal-400" />
              <span>{isEn ? 'Cooling System' : 'سیستم خنک‌کننده شاسی'}</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
              2x {isEn ? 'Fans OK' : 'فن فعال'}
            </span>
          </div>
          <div className="text-base font-bold font-mono text-white">
            4,820 RPM (Nominal)
          </div>
          <div className="text-xs font-mono text-teal-300 font-bold flex items-center justify-between">
            <span>Fan 1: 4,820 RPM • Fan 2: 4,790 RPM</span>
          </div>
          <div className="w-full rounded-full h-2 overflow-hidden bg-slate-800">
            <div className="bg-teal-500 h-full w-[65%] rounded-full" />
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>{isEn ? 'Airflow: Front-to-Back' : 'جهت باد: جلو به عقب'}</span>
            <span className="text-slate-500">{isEn ? 'PSU 1: Operational' : 'پاور ۱: نرمال'}</span>
          </div>
        </div>
      </div>

      {/* Switching Fabric & Hardware Architecture Summary */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h4 className="font-bold text-white font-mono">
              {isEn ? 'Switching Fabric & ASIC Architecture' : 'مشخصات معماری سوئیچینگ و ASIC'}
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            ASIC Forwarding: <span className="text-emerald-400 font-bold">101.2 Mpps</span> • Bandwidth:{' '}
            <span className="text-indigo-300 font-bold">128 Gbps</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{isEn ? 'Physical Ports' : 'پورت‌های فیزیکی'}</div>
            <div className="text-white font-bold font-mono text-sm mt-0.5">{totalPortsCount} {isEn ? 'Ports' : 'پورت'}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">10/100/1000Base-T + SFP+</div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{isEn ? 'Active Links' : 'لینک‌های فعال'}</div>
            <div className="text-emerald-400 font-bold font-mono text-sm mt-0.5">
              {upPortsCount} / {totalPortsCount} ({Math.round((upPortsCount / totalPortsCount) * 100)}%)
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{isEn ? 'Full-Duplex Wire-Speed' : 'سرعت خطی دوطرفه'}</div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{isEn ? 'MAC Address Table' : 'جدول مک آدرس'}</div>
            <div className="text-cyan-300 font-bold font-mono text-sm mt-0.5">16,384 {isEn ? 'Entries' : 'رکورد'}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{isEn ? 'Aging Time: 300s' : 'زمان انقضا: ۳۰۰ ثانیه'}</div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{isEn ? 'VLAN Capacity' : 'ظرفیت وی‌لن‌ها'}</div>
            <div className="text-purple-300 font-bold font-mono text-sm mt-0.5">4,096 VLANs</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{isEn ? 'IEEE 802.1Q Active' : 'استاندارد 802.1Q فعال'}</div>
          </div>
        </div>
      </div>

      {/* Cisco CLI Hardware Diagnostics Console */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-md">
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white font-mono">{isEn ? 'Cisco IOS Diagnostics CLI Telemetry' : 'خروجی فرامین تشخیصی سیسکو IOS'}</span>
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
        <div className="p-3.5 bg-black/90 font-mono text-[11px] leading-relaxed text-emerald-400 max-h-56 overflow-y-auto whitespace-pre selection:bg-emerald-500/30 selection:text-white">
          {cliOutputs[selectedCliCommand]?.output}
        </div>
      </div>
    </div>
  );
};
