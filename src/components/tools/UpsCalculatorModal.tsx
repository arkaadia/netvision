import React, { useState, useMemo } from 'react';
import {
  BatteryCharging,
  Battery,
  Zap,
  Clock,
  Gauge,
  Layers,
  Info,
  Copy,
  Check,
  Minus,
  X,
  Sliders,
  RotateCcw,
  FileText,
  Server,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Device } from '../../types';
import { loadPhysicalMapAudits, generateRackAuditReport } from './upsPowerUtils';
import { UpsPhysicalMapAuditTab } from './UpsPhysicalMapAuditTab';

interface UpsCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  isEn: boolean;
  isLightMode: boolean;
  devices?: Device[];
}

interface StandardBatterySpec {
  model: string;
  voltage: number;
  ah: number;
  weightKg: number;
  categoryEn: string;
  categoryFa: string;
}

const STANDARD_UPS_BATTERIES: StandardBatterySpec[] = [
  { model: '12V 7Ah', voltage: 12, ah: 7, weightKg: 2.1, categoryEn: 'Small Desktop / Mini UPS', categoryFa: 'یو‌پی‌اس خانگی و سبک' },
  { model: '12V 9Ah', voltage: 12, ah: 9, weightKg: 2.6, categoryEn: 'Compact Rackmount', categoryFa: 'رک‌مونت فشرده' },
  { model: '12V 12Ah', voltage: 12, ah: 12, weightKg: 3.8, categoryEn: '1-2 kVA Standard UPS', categoryFa: 'یوپی‌اس اداری ۱ تا ۲ کاوا' },
  { model: '12V 18Ah', voltage: 12, ah: 18, weightKg: 5.3, categoryEn: '2-3 kVA Extended Run', categoryFa: 'یوپی‌اس شبکه ۲ تا ۳ کاوا' },
  { model: '12V 28Ah', voltage: 12, ah: 28, weightKg: 8.5, categoryEn: 'Medium Network Rack', categoryFa: 'رک شبکه اداری و سرور کوچک' },
  { model: '12V 42Ah', voltage: 12, ah: 42, weightKg: 13.5, categoryEn: 'Enterprise Server Rack', categoryFa: 'سرور روم سازمانی و دیتاسنتر' },
  { model: '12V 65Ah', voltage: 12, ah: 65, weightKg: 20.0, categoryEn: 'High-Demand Server Room', categoryFa: 'اتاق سرور پرمصرف و بک‌اند' },
  { model: '12V 100Ah', voltage: 12, ah: 100, weightKg: 30.5, categoryEn: 'Data Center Extended Backup', categoryFa: 'دیتاسنتر و پشتیبانی طولانی‌مدت' },
  { model: '12V 120Ah', voltage: 12, ah: 120, weightKg: 36.0, categoryEn: 'Industrial High-Capacity', categoryFa: 'صنعتی و مخابراتی سنگین' },
  { model: '12V 150Ah', voltage: 12, ah: 150, weightKg: 44.0, categoryEn: 'Heavy Industrial', categoryFa: 'صنعتی ظرفیت بسیار بالا' },
  { model: '12V 200Ah', voltage: 12, ah: 200, weightKg: 58.0, categoryEn: 'Long Runtime Telecom Station', categoryFa: 'سایت‌های مخابراتی مگاواتی' },
];

export const UpsCalculatorModal: React.FC<UpsCalculatorModalProps> = ({
  isOpen,
  onClose,
  onMinimize,
  isEn,
  isLightMode,
  devices = []
}) => {
  // Mode: 'forward' = Calculate required batteries from Load & Time
  //       'reverse' = Calculate runtime & power from existing batteries
  //       'physical_maps' = Physical Maps & Racks power audit
  const [activeMode, setActiveMode] = useState<'forward' | 'reverse' | 'physical_maps'>('forward');
  const [selectedMapId, setSelectedMapId] = useState<string>('');
  const [appliedMapNotification, setAppliedMapNotification] = useState<string | null>(null);

  // Forward Mode Inputs
  const [loadWatts, setLoadWatts] = useState<number>(800);
  const [backupHours, setBackupHours] = useState<number>(2);
  const [backupMinutes, setBackupMinutes] = useState<number>(0);
  const [dcBusVoltage, setDcBusVoltage] = useState<number>(48); // 12, 24, 36, 48, 72, 96, 120, 192, 240
  const [inverterEfficiency, setInverterEfficiency] = useState<number>(90); // 90%
  const [depthOfDischarge, setDepthOfDischarge] = useState<number>(80); // 80% DoD for AGM/GEL
  const [powerFactor, setPowerFactor] = useState<number>(0.8); // 0.8
  const [safetyHeadroom, setSafetyHeadroom] = useState<number>(25); // 25% safety margin
  const [showAdvancedParams, setShowAdvancedParams] = useState<boolean>(false);
  const [showFormulasGuide, setShowFormulasGuide] = useState<boolean>(false);

  // Physical Map & Rack Audits
  const physicalMapAudits = useMemo(() => {
    return loadPhysicalMapAudits(devices, powerFactor, safetyHeadroom);
  }, [devices, powerFactor, safetyHeadroom]);

  const selectedMapAudit = useMemo(() => {
    if (!selectedMapId) return null;
    return physicalMapAudits.find((m) => m.mapId === selectedMapId) || null;
  }, [physicalMapAudits, selectedMapId]);

  const handleApplyWattsFromMap = (watts: number, label: string) => {
    setLoadWatts(watts);
    setActiveMode('forward');
    setAppliedMapNotification(
      isEn
        ? `Applied ${watts.toLocaleString()} W from "${label}" to UPS Sizing!`
        : `توان ${watts.toLocaleString()} وات از "${label}" در فرم محاسبه‌گر اعمال شد!`
    );
    setTimeout(() => {
      setAppliedMapNotification(null);
    }, 4500);
  };

  const handleSelectPhysicalMap = (mapId: string) => {
    setSelectedMapId(mapId);
    if (mapId) {
      const found = physicalMapAudits.find((m) => m.mapId === mapId);
      if (found) {
        setLoadWatts(found.totalWatts);
        setAppliedMapNotification(
          isEn
            ? `Linked to "${found.mapName}": ${found.totalWatts.toLocaleString()} W (${found.totalRacks} racks)`
            : `متصل به "${found.mapName}": ${found.totalWatts.toLocaleString()} وات (${found.totalRacks} رک)`
        );
        setTimeout(() => {
          setAppliedMapNotification(null);
        }, 4500);
      }
    }
  };

  // Reverse Mode Inputs
  const [reverseSelectedBatteryAh, setReverseSelectedBatteryAh] = useState<number>(42);
  const [reverseCustomAh, setReverseCustomAh] = useState<string>('');
  const [reverseBatteryCount, setReverseBatteryCount] = useState<number>(16);
  const [reverseDcBusVoltage, setReverseDcBusVoltage] = useState<number>(48);
  const [reverseTargetType, setReverseTargetType] = useState<'find_time' | 'find_power'>('find_time');
  const [reverseGivenWatts, setReverseGivenWatts] = useState<number>(800);
  const [reverseGivenHours, setReverseGivenHours] = useState<number>(3);

  // Feedback State
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // -------------------------------------------------------------
  // Calculations: Forward Mode (Load & Time -> Battery Matrix)
  // -------------------------------------------------------------
  const forwardCalculations = useMemo(() => {
    const totalRuntimeHours = Math.max(0.01, backupHours + backupMinutes / 60);
    const validWatts = Math.max(1, loadWatts);
    const eff = Math.min(1, Math.max(0.5, inverterEfficiency / 100));
    const dod = Math.min(1, Math.max(0.4, depthOfDischarge / 100));
    const pf = Math.min(1, Math.max(0.5, powerFactor));
    const headroom = 1 + safetyHeadroom / 100;

    // Apparent Power (kVA)
    const loadKva = (validWatts / (pf * 1000));
    const recommendedUpsKva = loadKva * headroom;
    const recommendedUpsWatts = validWatts * headroom;

    // Total Energy Required at battery bank (Watt-hours)
    // Energy_Wh = (Load_Watts * Runtime_Hours) / (Inverter_Efficiency * DoD)
    const rawWhNeeded = (validWatts * totalRuntimeHours) / (eff * dod);

    // Required Ampere-hours (Ah) at DC bus voltage
    const requiredAh = rawWhNeeded / dcBusVoltage;

    // Continuous DC discharge current (Amperes)
    const dcDischargeCurrent = validWatts / (dcBusVoltage * eff);

    // Matrix for all standard batteries
    const batteryComparison = STANDARD_UPS_BATTERIES.map((bat) => {
      const seriesCount = Math.max(1, Math.round(dcBusVoltage / bat.voltage));
      // Parallel strings needed to meet required Ah
      const parallelStrings = Math.max(1, Math.ceil(requiredAh / bat.ah));
      const totalBatteries = seriesCount * parallelStrings;
      const totalInstalledAh = parallelStrings * bat.ah;
      const totalStoredEnergyWh = totalBatteries * bat.voltage * bat.ah;
      const totalUsableWh = totalStoredEnergyWh * eff * dod;
      const actualRuntimeHours = totalUsableWh / validWatts;
      const totalWeightKg = totalBatteries * bat.weightKg;

      return {
        ...bat,
        seriesCount,
        parallelStrings,
        totalBatteries,
        totalInstalledAh,
        totalStoredEnergyWh,
        actualRuntimeHours,
        totalWeightKg
      };
    });

    // Determine optimal battery recommendation (least parallel strings >= 1 and reasonable total count)
    const recommendedChoice = batteryComparison.reduce((best, cur) => {
      if (!best) return cur;
      // Prefer single string if possible, or lowest total excess Ah
      if (cur.parallelStrings === 1 && best.parallelStrings > 1) return cur;
      if (cur.parallelStrings === 1 && best.parallelStrings === 1) {
        return Math.abs(cur.totalInstalledAh - requiredAh) < Math.abs(best.totalInstalledAh - requiredAh) ? cur : best;
      }
      return cur.totalBatteries < best.totalBatteries ? cur : best;
    }, batteryComparison[0]);

    return {
      totalRuntimeHours,
      loadKva,
      recommendedUpsKva,
      recommendedUpsWatts,
      rawWhNeeded,
      requiredAh,
      dcDischargeCurrent,
      batteryComparison,
      recommendedChoice
    };
  }, [
    loadWatts,
    backupHours,
    backupMinutes,
    dcBusVoltage,
    inverterEfficiency,
    depthOfDischarge,
    powerFactor,
    safetyHeadroom
  ]);

  // -------------------------------------------------------------
  // Calculations: Reverse Mode (Batteries -> Runtime & Power)
  // -------------------------------------------------------------
  const reverseCalculations = useMemo(() => {
    const batAh = reverseCustomAh ? parseFloat(reverseCustomAh) || 42 : reverseSelectedBatteryAh;
    const count = Math.max(1, reverseBatteryCount);
    const eff = Math.min(1, Math.max(0.5, inverterEfficiency / 100));
    const dod = Math.min(1, Math.max(0.4, depthOfDischarge / 100));
    const pf = Math.min(1, Math.max(0.5, powerFactor));

    // Batteries per string based on selected DC Bus
    const seriesPerString = Math.max(1, Math.round(reverseDcBusVoltage / 12));
    const parallelStrings = Math.floor(count / seriesPerString);
    const isExactMultiple = count % seriesPerString === 0;
    const effectiveBatteries = parallelStrings * seriesPerString;

    // Total stored energy (Wh)
    const totalStoredWh = effectiveBatteries * 12 * batAh;
    const totalUsableWh = totalStoredWh * eff * dod;
    const totalBankAh = parallelStrings * batAh;

    // Scenario A: Given Load -> Find Runtime
    const givenLoadW = Math.max(1, reverseGivenWatts);
    const runtimeHoursFromLoad = totalUsableWh / givenLoadW;
    const rtHours = Math.floor(runtimeHoursFromLoad);
    const rtMins = Math.round((runtimeHoursFromLoad - rtHours) * 60);

    // Scenario B: Given Runtime -> Find Supported Power
    const givenHours = Math.max(0.05, reverseGivenHours);
    const supportedWatts = totalUsableWh / givenHours;
    const supportedKva = supportedWatts / (pf * 1000);

    return {
      batAh,
      seriesPerString,
      parallelStrings,
      isExactMultiple,
      effectiveBatteries,
      totalStoredWh,
      totalUsableWh,
      totalBankAh,
      runtimeHoursFromLoad,
      rtHours,
      rtMins,
      supportedWatts,
      supportedKva
    };
  }, [
    reverseSelectedBatteryAh,
    reverseCustomAh,
    reverseBatteryCount,
    reverseDcBusVoltage,
    inverterEfficiency,
    depthOfDischarge,
    powerFactor,
    reverseGivenWatts,
    reverseGivenHours
  ]);

  // Format hours and minutes display
  const formatDuration = (hoursDecimal: number) => {
    const h = Math.floor(hoursDecimal);
    const m = Math.round((hoursDecimal - h) * 60);
    if (isEn) {
      if (h === 0) return `${m} mins`;
      if (m === 0) return `${h} hrs`;
      return `${h} hrs ${m} mins`;
    } else {
      if (h === 0) return `${m} دقیقه`;
      if (m === 0) return `${h} ساعت`;
      return `${h} ساعت و ${m} دقیقه`;
    }
  };

  // Copy sizing summary report to clipboard
  const handleCopyReport = () => {
    let text = '';
    const now = new Date().toLocaleString();

    if (activeMode === 'physical_maps') {
      const target = selectedMapAudit || physicalMapAudits[0];
      if (target) {
        text = generateRackAuditReport(target, isEn);
      }
    } else if (activeMode === 'forward') {
      const f = forwardCalculations;
      if (isEn) {
        text = `=== NetTopology UPS & Battery Sizing Report ===
Generated: ${now}
Load Power: ${loadWatts} Watts (${f.loadKva.toFixed(2)} kVA @ PF ${powerFactor})
Recommended UPS Capacity: ${f.recommendedUpsKva.toFixed(2)} kVA (${Math.round(f.recommendedUpsWatts)} W with ${safetyHeadroom}% headroom)
Target Backup Time: ${backupHours}h ${backupMinutes}m (${f.totalRuntimeHours.toFixed(2)} hrs)
UPS DC Bus: ${dcBusVoltage}V DC (Inverter Eff: ${inverterEfficiency}%, DoD: ${depthOfDischarge}%)
Required Total Bank Energy: ${(f.rawWhNeeded / 1000).toFixed(2)} kWh (${f.requiredAh.toFixed(1)} Ah @ ${dcBusVoltage}V)
Continuous DC Current: ${f.dcDischargeCurrent.toFixed(1)} A

--- Standard Battery Options ---
${f.batteryComparison.map((b) => `• ${b.model}: ${b.totalBatteries} batteries (${b.seriesCount} series x ${b.parallelStrings} parallel strings) => ~${formatDuration(b.actualRuntimeHours)} backup, Total Weight: ${b.totalWeightKg.toFixed(0)} kg`).join('\n')}

Optimal Selection: ${f.recommendedChoice.model} (${f.recommendedChoice.totalBatteries} units total)
==============================================`;
      } else {
        text = `=== گزارش مهندسی محاسبه یو‌پی‌اس و بانک باتری NetTopology ===
زمان گزارش: ${now}
توان مصرفی بار: ${loadWatts} وات (${f.loadKva.toFixed(2)} کیلوولت‌آمپر با ضریب توان ${powerFactor})
ظرفیت یو‌پی‌اس پیشنهادی: ${f.recommendedUpsKva.toFixed(2)} kVA (با احتساب ${safetyHeadroom}٪ حاشیه اطمینان)
مدت زمان نگهداری برق: ${backupHours} ساعت و ${backupMinutes} دقیقه
ولتاژ باس DC یوپی‌اس: ${dcBusVoltage} ولت (راندمان اینورتر: ${inverterEfficiency}٪، عمق دشارژ: ${depthOfDischarge}٪)
کل انرژی مورد نیاز بانک باتری: ${(f.rawWhNeeded / 1000).toFixed(2)} کیلووات‌ساعت (${f.requiredAh.toFixed(1)} آمپرساعت)
جریان تخلیه دشارژ پیوسته: ${f.dcDischargeCurrent.toFixed(1)} آمپر

--- گزینه‌های مختلف باتری‌های استاندارد یو‌پی‌اس ---
${f.batteryComparison.map((b) => `• ${b.model}: تعداد کل ${b.totalBatteries} عدد (${b.seriesCount} عدد سری × ${b.parallelStrings} استرینگ موازی) => زمان برق‌دهی واقعی: ${formatDuration(b.actualRuntimeHours)}، وزن کل: ${b.totalWeightKg.toFixed(0)} کیلوگرم`).join('\n')}

گزینه بهینه پیشنهادی: باتری ${f.recommendedChoice.model} (تعداد کل: ${f.recommendedChoice.totalBatteries} عدد)
==============================================`;
      }
    } else {
      const r = reverseCalculations;
      if (isEn) {
        text = `=== NetTopology Reverse Battery Sizing Report ===
Generated: ${now}
Battery Model: 12V ${r.batAh} Ah
Installed Batteries: ${reverseBatteryCount} units (${r.seriesPerString} series x ${r.parallelStrings} strings @ ${reverseDcBusVoltage}V DC)
Total Usable Energy: ${(r.totalUsableWh / 1000).toFixed(2)} kWh (${r.totalBankAh} Ah total)
${reverseTargetType === 'find_time'
  ? `Applied Load: ${reverseGivenWatts} W => Estimated Runtime: ${r.rtHours}h ${r.rtMins}m (${r.runtimeHoursFromLoad.toFixed(2)} hrs)`
  : `Desired Runtime: ${reverseGivenHours} hrs => Maximum Supported Load: ${Math.round(r.supportedWatts)} W (${r.supportedKva.toFixed(2)} kVA)`}
==============================================`;
      } else {
        text = `=== گزارش محاسبه معکوس بانک باتری NetTopology ===
زمان گزارش: ${now}
مشخصات باتری: ۱۲ ولت ${r.batAh} آمپرساعت
تعداد باتری‌های موجود: ${reverseBatteryCount} عدد (${r.seriesPerString} سری × ${r.parallelStrings} استرینگ موازی در باس ${reverseDcBusVoltage} ولت)
کل انرژی مفید قابل استفاده: ${(r.totalUsableWh / 1000).toFixed(2)} کیلووات‌ساعت (${r.totalBankAh} آمپرساعت کل)
${reverseTargetType === 'find_time'
  ? `توان بار متصل: ${reverseGivenWatts} وات => زمان پشتیبانی برق: ${r.rtHours} ساعت و ${r.rtMins} دقیقه`
  : `مدت زمان برق‌دهی هدف: ${reverseGivenHours} ساعت => حداکثر توان قابل پشتیبانی: ${Math.round(r.supportedWatts)} وات (${r.supportedKva.toFixed(2)} کیلوولت‌آمپر)`}
==============================================`;
      }
    }

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  // Pull total estimated wattage from active devices
  const handleApplyTopologyLoad = () => {
    if (!devices || devices.length === 0) return;
    // Estimate wattage per device type
    let totalEstimated = 0;
    devices.forEach((d) => {
      const model = (d.model || '').toLowerCase();
      if (model.includes('poe') || model.includes('370w') || model.includes('740w')) {
        totalEstimated += 450;
      } else if (d.type === 'switch') {
        totalEstimated += 75;
      } else if (d.type === 'router') {
        totalEstimated += 110;
      } else {
        totalEstimated += 35;
      }
    });
    setLoadWatts(Math.max(100, Math.round(totalEstimated)));
  };

  if (!isOpen) return null;

  return (
    <div
      id="ups-calculator-modal-overlay"
      className="fixed top-0 left-0 right-0 bottom-8 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in"
      data-modal-backdrop="true"
    >
      <div
        id="ups-calculator-modal-window"
        className={`w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border transition-all duration-200 overflow-hidden ${
          isLightMode
            ? 'bg-white text-slate-900 border-slate-200 shadow-slate-400/40'
            : 'bg-slate-950 text-slate-100 border-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.8)]'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
            isLightMode ? 'border-slate-100 bg-slate-50/90' : 'border-slate-800/80 bg-slate-900/70'
          } rounded-t-2xl`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
              <BatteryCharging className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-wide">
                  {isEn ? 'UPS Capacity & Battery Bank Sizing Calculator' : 'محاسبه‌گر توان یو‌پی‌اس و بانک باتری شبکه'}
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 font-semibold border border-amber-500/30">
                  {isEn ? 'Watts ⇄ kVA / Ah / Runtime' : 'وات ⇄ کاوا / آمپرساعت / زمان'}
                </span>
              </div>
              <p className={`text-[11px] ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn
                  ? 'Calculate kVA, battery count (12V 28Ah, 42Ah, etc.) & backup runtime or reverse-size existing banks'
                  : 'محاسبه توان kVA، تعداد باتری‌های ۱۲ ولت (۲۸، ۴۲ آمپر و...) و زمان برق‌دهی یا محاسبه معکوس بانک باتری'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onMinimize}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLightMode
                  ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-amber-300'
              }`}
              title={isEn ? 'Minimize' : 'مینیمایز به نوار ابزار پایین'}
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

        {/* Mode Switcher Tabs */}
        <div className={`px-5 py-2.5 border-b shrink-0 flex flex-wrap items-center justify-between gap-3 ${
          isLightMode ? 'bg-slate-100/70 border-slate-200' : 'bg-slate-900/40 border-slate-800/80'
        }`}>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/10 dark:bg-black/30 border border-white/5">
            <button
              onClick={() => setActiveMode('forward')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
                activeMode === 'forward'
                  ? 'bg-amber-500 text-white font-bold shadow-md shadow-amber-500/30'
                  : isLightMode
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>{isEn ? 'Size Batteries (From Load & Time)' : 'محاسبه باتری بر اساس توان و زمان'}</span>
            </button>

            <button
              onClick={() => setActiveMode('reverse')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
                activeMode === 'reverse'
                  ? 'bg-amber-500 text-white font-bold shadow-md shadow-amber-500/30'
                  : isLightMode
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isEn ? 'Reverse Sizing (From Existing Batteries)' : 'محاسبه معکوس با باتری‌های موجود'}</span>
            </button>

            <button
              onClick={() => setActiveMode('physical_maps')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
                activeMode === 'physical_maps'
                  ? 'bg-amber-500 text-white font-bold shadow-md shadow-amber-500/30'
                  : isLightMode
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>{isEn ? 'Physical Maps & Racks' : 'نقشه‌ها و تفکیک رک‌ها'}</span>
              {physicalMapAudits.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeMode === 'physical_maps' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-500'
                }`}>
                  {physicalMapAudits.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFormulasGuide(!showFormulasGuide)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 border transition cursor-pointer ${
                showFormulasGuide
                  ? 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                  : isLightMode
                  ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEn ? 'Formulas & Guide' : 'فرمول‌ها و راهنما'}</span>
            </button>

            <button
              onClick={handleCopyReport}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer border ${
                copiedReport
                  ? 'bg-emerald-500 text-white border-emerald-600'
                  : isLightMode
                  ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
              title={isEn ? 'Copy full calculation report' : 'کپی متن گزارش کامل محاسبات'}
            >
              {copiedReport ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedReport ? (isEn ? 'Copied!' : 'کپی شد!') : (isEn ? 'Copy Report' : 'کپی گزارش')}</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {/* Notification Banner when map load is applied */}
          {appliedMapNotification && (
            <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-1 ${
              isLightMode ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
            }`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{appliedMapNotification}</span>
              </div>
              <button
                onClick={() => setAppliedMapNotification(null)}
                className="p-0.5 rounded text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Formulas and Electrical Knowledge Accordion */}
          {showFormulasGuide && (
            <div className={`p-4 rounded-xl border text-xs space-y-2.5 animate-in fade-in ${
              isLightMode
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
            }`}>
              <div className="flex items-center gap-2 font-bold text-amber-500">
                <FileText className="w-4 h-4" />
                <span>{isEn ? 'UPS Sizing Formulas & Best Engineering Practices' : 'فرمول‌های مهندسی برق یو‌پی‌اس و اصول محاسبه باتری'}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                <div className="p-2.5 rounded-lg bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/5 space-y-1">
                  <p className="font-bold text-amber-500">{isEn ? '1. Apparent Power (kVA):' : '۱. محاسبه توان ظاهری (kVA):'}</p>
                  <p>kVA = Watts / (Power Factor × 1000)</p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {isEn ? 'Standard server/switch PF is 0.8 to 0.9. Add 20-25% headroom for inrush/expansion.' : 'ضریب توان سرور و سوئیچ معمولاً ۰.۸ تا ۰.۹ است. ۲۵٪ حاشیه امن برای رشد بار لحاظ کنید.'}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/5 space-y-1">
                  <p className="font-bold text-amber-500">{isEn ? '2. Battery Capacity (Ah):' : '۲. محاسبه ظرفیت آمپرساعت باتری (Ah):'}</p>
                  <p>Ah = (Load_Watts × Hours) / (V_DC × Efficiency × DoD)</p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {isEn ? 'DoD (Depth of Discharge) is typically 80% to protect battery lifecycle. Efficiency ~90%.' : 'عمق دشارژ مجاز ۸۰٪ جهت حفظ سلامت باتری و راندمان اینورتر معمولاً ۹۰٪ محاسبه می‌شود.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODE 1: FORWARD SIZING (Load & Time -> Battery Matrix) */}
          {/* ========================================================= */}
          {activeMode === 'forward' && (
            <div className="space-y-5">
              {/* Input Form Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Load Power (Watts & kVA) */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div>
                    <label className="text-xs font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        {isEn ? 'Required Power (Watts)' : 'توان مصرفی بار (وات)'}
                      </span>
                      <span className="text-[11px] font-mono text-amber-500 font-semibold">
                        ≈ {forwardCalculations.loadKva.toFixed(2)} kVA
                      </span>
                    </label>
                    <p className={`text-[10px] mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {isEn ? 'Total active equipment consumption' : 'مجموع توان مصرفی تجهیزات اکتیو'}
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      min={10}
                      max={100000}
                      step={50}
                      value={loadWatts}
                      onChange={(e) => setLoadWatts(Math.max(1, parseInt(e.target.value) || 0))}
                      className={`w-full px-3 py-2 rounded-lg font-mono text-base font-bold border transition ${
                        isLightMode
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                          : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500'
                      }`}
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">W</span>
                  </div>

                  {/* Quick Presets & Physical Map Selector */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {[300, 600, 1200, 2400, 4800].map((w) => (
                        <button
                          key={w}
                          onClick={() => setLoadWatts(w)}
                          className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition cursor-pointer ${
                            loadWatts === w
                              ? 'bg-amber-500 text-white border-amber-600 font-bold'
                              : isLightMode
                              ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {w >= 1000 ? `${(w / 1000).toFixed(1)}k` : `${w}W`}
                        </button>
                      ))}
                    </div>

                    {/* Physical Map Selector Dropdown */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <Server className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{isEn ? 'Physical Map Selection:' : 'انتخاب نقشه فیزیکی:'}</span>
                        </span>
                        {selectedMapAudit && (
                          <button
                            type="button"
                            onClick={() => setActiveMode('physical_maps')}
                            className="text-[10px] text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>{isEn ? 'View Racks' : 'مشاهده رک‌ها'}</span>
                            <ArrowRight className="w-2.5 h-2.5 rtl:rotate-180" />
                          </button>
                        )}
                      </div>

                      <select
                        value={selectedMapId}
                        onChange={(e) => handleSelectPhysicalMap(e.target.value)}
                        className={`w-full px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border cursor-pointer focus:outline-none transition ${
                          isLightMode
                            ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500 shadow-sm'
                            : 'bg-slate-950 text-slate-100 border-slate-700 focus:border-indigo-400 shadow-sm'
                        }`}
                      >
                        <option value="">{isEn ? '⚡ Manual Entry (No Map Linked)' : '⚡ مقدار دستی (بدون اتصال به نقشه)'}</option>
                        {physicalMapAudits.map((map) => (
                          <option key={map.mapId} value={map.mapId}>
                            {map.mapName} ({map.totalRacks} {isEn ? 'Racks' : 'رک'} ➔ {map.totalWatts.toLocaleString()}W)
                          </option>
                        ))}
                      </select>

                      {selectedMapAudit && (
                        <div className={`p-2 rounded-lg border text-[10px] flex items-center justify-between gap-2 ${
                          isLightMode ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                        }`}>
                          <div className="truncate">
                            <span className="font-bold">{selectedMapAudit.mapName}: </span>
                            <span>{selectedMapAudit.totalRacks} {isEn ? 'racks' : 'رک'} • {selectedMapAudit.totalWatts.toLocaleString()} W</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setLoadWatts(selectedMapAudit.totalWatts)}
                            title={isEn ? 'Re-sync load watts from map' : 'همگام‌سازی مجدد توان از روی نقشه'}
                            className="px-1.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold shrink-0 cursor-pointer text-[10px]"
                          >
                            {isEn ? 'Re-sync' : 'همگام‌سازی'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Desired Backup Duration */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div>
                    <label className="text-xs font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        {isEn ? 'Backup Runtime' : 'زمان نگهداری برق (بک‌آپ)'}
                      </span>
                      <span className="text-[11px] font-mono text-amber-500 font-semibold">
                        {formatDuration(forwardCalculations.totalRuntimeHours)}
                      </span>
                    </label>
                    <p className={`text-[10px] mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {isEn ? 'Hours & minutes of required autonomy' : 'مدت زمان مورد نیاز روشن ماندن شبکه'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-slate-400 block mb-1">{isEn ? 'Hours' : 'ساعت'}</label>
                      <input
                        type="number"
                        min={0}
                        max={72}
                        value={backupHours}
                        onChange={(e) => setBackupHours(Math.max(0, parseInt(e.target.value) || 0))}
                        className={`w-full px-2.5 py-1.5 rounded-lg font-mono text-sm font-bold border transition ${
                          isLightMode
                            ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                            : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-400 block mb-1">{isEn ? 'Minutes' : 'دقیقه'}</label>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        step={5}
                        value={backupMinutes}
                        onChange={(e) => setBackupMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                        className={`w-full px-2.5 py-1.5 rounded-lg font-mono text-sm font-bold border transition ${
                          isLightMode
                            ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                            : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Runtime presets */}
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: '30m', h: 0, m: 30 },
                      { label: '1h', h: 1, m: 0 },
                      { label: '2h', h: 2, m: 0 },
                      { label: '4h', h: 4, m: 0 },
                      { label: '8h', h: 8, m: 0 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        onClick={() => {
                          setBackupHours(p.h);
                          setBackupMinutes(p.m);
                        }}
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition cursor-pointer ${
                          backupHours === p.h && backupMinutes === p.m
                            ? 'bg-amber-500 text-white border-amber-600 font-bold'
                            : isLightMode
                            ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. UPS DC Bus Voltage */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div>
                    <label className="text-xs font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        {isEn ? 'UPS DC Bus Voltage' : 'ولتاژ لینک باتری یوپی‌اس (DC)'}
                      </span>
                      <span className="text-[11px] font-mono text-amber-500 font-semibold">
                        {dcBusVoltage}V DC
                      </span>
                    </label>
                    <p className={`text-[10px] mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {isEn ? 'Series batteries per string (12V each)' : 'تعداد باتری‌های سری در هر استرینگ'}
                    </p>
                  </div>

                  <div>
                    <select
                      value={dcBusVoltage}
                      onChange={(e) => setDcBusVoltage(parseInt(e.target.value) || 48)}
                      className={`w-full px-3 py-2 rounded-lg font-mono text-sm font-bold border transition cursor-pointer ${
                        isLightMode
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                          : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500'
                      }`}
                    >
                      <option value={12}>12V DC (1x 12V Battery - Mini UPS)</option>
                      <option value={24}>24V DC (2x 12V Batteries - 1-2 kVA)</option>
                      <option value={36}>36V DC (3x 12V Batteries - 2 kVA)</option>
                      <option value={48}>48V DC (4x 12V Batteries - 2-3 kVA Standard)</option>
                      <option value={72}>72V DC (6x 12V Batteries - 3 kVA Extended)</option>
                      <option value={96}>96V DC (8x 12V Batteries - 5-6 kVA)</option>
                      <option value={120}>120V DC (10x 12V Batteries - 6-8 kVA)</option>
                      <option value={192}>192V DC (16x 12V Batteries - 10-20 kVA Industrial)</option>
                      <option value={240}>240V DC (20x 12V Batteries - 20-40 kVA Modular)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{isEn ? 'Series count / string:' : 'تعداد سری در هر استرینگ:'}</span>
                    <span className="font-bold text-amber-500">{dcBusVoltage / 12} {isEn ? 'Units' : 'عدد'}</span>
                  </div>
                </div>
              </div>

              {/* Advanced Engineering Sliders (Collapsible) */}
              <div className={`rounded-xl border transition-all ${
                isLightMode ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-900/30 border-slate-800'
              }`}>
                <button
                  type="button"
                  onClick={() => setShowAdvancedParams(!showAdvancedParams)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-slate-400">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Advanced Electrical & Safety Parameters' : 'پارامترهای پیشرفته الکتریکی، ضریب توان و راندمان'}</span>
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-amber-500 font-mono">
                    <span>η: {inverterEfficiency}% | DoD: {depthOfDischarge}% | PF: {powerFactor} | +{safetyHeadroom}%</span>
                    {showAdvancedParams ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {showAdvancedParams && (
                  <div className="p-4 pt-0 border-t border-black/5 dark:border-white/5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-400">{isEn ? 'Inverter Efficiency (η):' : 'راندمان اینورتر (η):'}</span>
                        <span className="font-bold text-amber-500 font-mono">{inverterEfficiency}%</span>
                      </div>
                      <input
                        type="range"
                        min={75}
                        max={98}
                        value={inverterEfficiency}
                        onChange={(e) => setInverterEfficiency(parseInt(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-400">{isEn ? 'Depth of Discharge (DoD):' : 'عمق تخلیه مجاز (DoD):'}</span>
                        <span className="font-bold text-amber-500 font-mono">{depthOfDischarge}%</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={95}
                        value={depthOfDischarge}
                        onChange={(e) => setDepthOfDischarge(parseInt(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-400">{isEn ? 'Power Factor (PF):' : 'ضریب توان (Power Factor):'}</span>
                        <span className="font-bold text-amber-500 font-mono">{powerFactor}</span>
                      </div>
                      <input
                        type="range"
                        min={6}
                        max={10}
                        value={powerFactor * 10}
                        onChange={(e) => setPowerFactor(parseInt(e.target.value) / 10)}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-400">{isEn ? 'Safety Margin (Headroom):' : 'حاشیه اطمینان (Headroom):'}</span>
                        <span className="font-bold text-amber-500 font-mono">+{safetyHeadroom}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={50}
                        step={5}
                        value={safetyHeadroom}
                        onChange={(e) => setSafetyHeadroom(parseInt(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3 rounded-xl border ${
                  isLightMode ? 'bg-amber-50/60 border-amber-200' : 'bg-amber-950/20 border-amber-500/30'
                }`}>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">
                    {isEn ? 'Recommended UPS Size' : 'حداقل ظرفیت یوپی‌اس پیشنهادی'}
                  </span>
                  <div className="text-base font-bold font-mono text-amber-500 mt-0.5">
                    {forwardCalculations.recommendedUpsKva.toFixed(2)} kVA
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    ({Math.round(forwardCalculations.recommendedUpsWatts)} W max)
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    {isEn ? 'Total Bank Energy' : 'کل انرژی ذخیره‌سازی لازم'}
                  </span>
                  <div className="text-base font-bold font-mono mt-0.5">
                    {(forwardCalculations.rawWhNeeded / 1000).toFixed(2)} kWh
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({Math.round(forwardCalculations.rawWhNeeded)} Wh)
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    {isEn ? 'Required Bank Capacity' : 'ظرفیت کل آمپرساعت باس'}
                  </span>
                  <div className="text-base font-bold font-mono text-cyan-500 mt-0.5">
                    {forwardCalculations.requiredAh.toFixed(1)} Ah
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    (@ {dcBusVoltage}V DC)
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    {isEn ? 'Continuous DC Current' : 'جریان تخلیه دشارژ پیوسته'}
                  </span>
                  <div className="text-base font-bold font-mono text-emerald-500 mt-0.5">
                    {forwardCalculations.dcDischargeCurrent.toFixed(1)} A
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {isEn ? 'from battery bus' : 'جریان خروجی از باس'}
                  </span>
                </div>
              </div>

              {/* Standard Battery Comparison Table */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold flex items-center gap-2">
                    <Battery className="w-4 h-4 text-amber-500" />
                    <span>{isEn ? 'Standard UPS Battery Configurations Matrix' : 'جدول جامع تعداد باتری‌های استاندارد یو‌پی‌اس برای این بار'}</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {isEn ? `DC Bus: ${dcBusVoltage}V (${dcBusVoltage / 12} per string)` : `باس DC: ${dcBusVoltage} ولت (${dcBusVoltage / 12} عدد سری)`}
                  </span>
                </div>

                <div className={`rounded-xl border overflow-hidden ${
                  isLightMode ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900/40'
                }`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className={`text-[10px] font-mono uppercase border-b ${
                        isLightMode ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        <tr>
                          <th className="px-3 py-2.5">{isEn ? 'Battery Model' : 'مدل باتری'}</th>
                          <th className="px-3 py-2.5">{isEn ? 'Application / Category' : 'کاربرد و رده'}</th>
                          <th className="px-3 py-2.5 text-center">{isEn ? 'Series / String' : 'تعداد سری'}</th>
                          <th className="px-3 py-2.5 text-center">{isEn ? 'Parallel Strings' : 'استرینگ موازی'}</th>
                          <th className="px-3 py-2.5 text-center font-bold text-amber-500">{isEn ? 'Total Batteries' : 'تعداد کل باتری'}</th>
                          <th className="px-3 py-2.5 text-center">{isEn ? 'Installed Ah' : 'ظرفیت نهایی'}</th>
                          <th className="px-3 py-2.5 text-center">{isEn ? 'Est. Runtime' : 'زمان واقعی'}</th>
                          <th className="px-3 py-2.5 text-center">{isEn ? 'Bank Weight' : 'وزن تقریبی'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5 font-mono text-[11px]">
                        {forwardCalculations.batteryComparison.map((item) => {
                          const isRecommended = item.model === forwardCalculations.recommendedChoice.model;
                          const isSpecialUserRequested = item.model === '12V 42Ah' || item.model === '12V 28Ah';

                          return (
                            <tr
                              key={item.model}
                              className={`transition-colors ${
                                isRecommended
                                  ? isLightMode
                                    ? 'bg-amber-50/80 font-bold'
                                    : 'bg-amber-950/30 font-bold'
                                  : isSpecialUserRequested
                                  ? isLightMode
                                    ? 'bg-cyan-50/50'
                                    : 'bg-cyan-950/20'
                                  : isLightMode
                                  ? 'hover:bg-slate-50'
                                  : 'hover:bg-slate-800/40'
                              }`}
                            >
                              <td className="px-3 py-2.5 font-bold flex items-center gap-1.5 whitespace-nowrap">
                                <span className={isRecommended ? 'text-amber-500' : isSpecialUserRequested ? 'text-cyan-400' : ''}>
                                  {item.model}
                                </span>
                                {isRecommended && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-white font-sans">
                                    {isEn ? 'Optimal' : 'پیشنهادی'}
                                  </span>
                                )}
                                {isSpecialUserRequested && !isRecommended && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-sans">
                                    {isEn ? 'Popular' : 'پرکاربرد'}
                                  </span>
                                )}
                              </td>

                              <td className="px-3 py-2.5 text-slate-400 font-sans text-[10px]">
                                {isEn ? item.categoryEn : item.categoryFa}
                              </td>

                              <td className="px-3 py-2.5 text-center">
                                {item.seriesCount} {isEn ? 'units' : 'عدد'}
                              </td>

                              <td className="px-3 py-2.5 text-center font-bold">
                                {item.parallelStrings} {isEn ? 'string(s)' : 'استرینگ'}
                              </td>

                              <td className="px-3 py-2.5 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                                  isRecommended
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : isLightMode
                                    ? 'bg-slate-100 text-slate-800'
                                    : 'bg-slate-800 text-slate-100'
                                }`}>
                                  {item.totalBatteries} {isEn ? 'units' : 'عدد'}
                                </span>
                              </td>

                              <td className="px-3 py-2.5 text-center text-slate-400">
                                {item.totalInstalledAh} Ah
                              </td>

                              <td className="px-3 py-2.5 text-center font-bold text-emerald-500">
                                {formatDuration(item.actualRuntimeHours)}
                              </td>

                              <td className="px-3 py-2.5 text-center text-slate-400">
                                ~{Math.round(item.totalWeightKg)} kg
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODE 2: REVERSE SIZING (Existing Batteries -> Time/Power) */}
          {/* ========================================================= */}
          {activeMode === 'reverse' && (
            <div className="space-y-5">
              {/* Configuration of Existing Battery Bank */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Battery Model */}
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div>
                    <label className="text-xs font-bold flex items-center gap-1.5">
                      <Battery className="w-3.5 h-3.5 text-amber-500" />
                      <span>{isEn ? 'Existing Battery Model' : 'مدل باتری موجود'}</span>
                    </label>
                    <p className={`text-[10px] mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {isEn ? 'Select standard capacity or custom Ah' : 'انتخاب ظرفیت استاندارد یا وارد کردن آمپرساعت دلخواه'}
                    </p>
                  </div>

                  <select
                    value={reverseSelectedBatteryAh}
                    onChange={(e) => {
                      setReverseSelectedBatteryAh(parseInt(e.target.value));
                      setReverseCustomAh('');
                    }}
                    className={`w-full px-3 py-2 rounded-lg font-mono text-sm font-bold border transition cursor-pointer ${
                      isLightMode
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                        : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500'
                    }`}
                  >
                    <option value={7}>12V 7 Ah (Mini UPS)</option>
                    <option value={9}>12V 9 Ah (Compact Rack)</option>
                    <option value={12}>12V 12 Ah (1-2 kVA)</option>
                    <option value={18}>12V 18 Ah (2-3 kVA)</option>
                    <option value={28}>12V 28 Ah (Office Rack)</option>
                    <option value={42}>12V 42 Ah (Enterprise Server)</option>
                    <option value={65}>12V 65 Ah (Heavy Server)</option>
                    <option value={100}>12V 100 Ah (Data Center)</option>
                    <option value={150}>12V 150 Ah (Telecom)</option>
                    <option value={200}>12V 200 Ah (Industrial)</option>
                  </select>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      {isEn ? 'Or Custom Ah:' : 'یا وارد کردن آمپرساعت دلخواه:'}
                    </label>
                    <input
                      type="number"
                      placeholder={isEn ? 'e.g. 55' : 'مثلاً ۵۵'}
                      value={reverseCustomAh}
                      onChange={(e) => setReverseCustomAh(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg font-mono text-xs border ${
                        isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-100'
                      }`}
                    />
                  </div>
                </div>

                {/* 2. Total Quantity of Batteries */}
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div>
                    <label className="text-xs font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        {isEn ? 'Total Battery Quantity' : 'تعداد کل باتری‌های موجود'}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-500">
                        {reverseBatteryCount} {isEn ? 'units' : 'عدد'}
                      </span>
                    </label>
                    <p className={`text-[10px] mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {isEn ? 'Total count of 12V batteries you own' : 'تعداد کل باتری‌های ۱۲ ولت در اختیار شما'}
                    </p>
                  </div>

                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={reverseBatteryCount}
                    onChange={(e) => setReverseBatteryCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className={`w-full px-3 py-2 rounded-lg font-mono text-base font-bold border transition ${
                      isLightMode
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                        : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500'
                    }`}
                  />

                  {/* Preset count buttons */}
                  <div className="flex flex-wrap gap-1">
                    {[2, 4, 8, 12, 16, 20, 24, 32].map((cnt) => (
                      <button
                        key={cnt}
                        onClick={() => setReverseBatteryCount(cnt)}
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition cursor-pointer ${
                          reverseBatteryCount === cnt
                            ? 'bg-amber-500 text-white border-amber-600 font-bold'
                            : isLightMode
                            ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. DC Bus Voltage */}
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div>
                    <label className="text-xs font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-amber-500" />
                        {isEn ? 'UPS DC Bus Voltage' : 'ولتاژ باس DC یوپی‌اس'}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-500">
                        {reverseDcBusVoltage}V DC
                      </span>
                    </label>
                    <p className={`text-[10px] mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {isEn ? 'Determines how many batteries are in series' : 'مشخص‌کننده تعداد باتری‌های سری در هر شاخه'}
                    </p>
                  </div>

                  <select
                    value={reverseDcBusVoltage}
                    onChange={(e) => setReverseDcBusVoltage(parseInt(e.target.value) || 48)}
                    className={`w-full px-3 py-2 rounded-lg font-mono text-sm font-bold border transition cursor-pointer ${
                      isLightMode
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                        : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500'
                    }`}
                  >
                    <option value={12}>12V DC (1 battery / string)</option>
                    <option value={24}>24V DC (2 batteries / string)</option>
                    <option value={36}>36V DC (3 batteries / string)</option>
                    <option value={48}>48V DC (4 batteries / string)</option>
                    <option value={72}>72V DC (6 batteries / string)</option>
                    <option value={96}>96V DC (8 batteries / string)</option>
                    <option value={120}>120V DC (10 batteries / string)</option>
                    <option value={192}>192V DC (16 batteries / string)</option>
                    <option value={240}>240V DC (20 batteries / string)</option>
                  </select>

                  <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                    <span>{isEn ? 'Configuration:' : 'آرایش بانک:'}</span>
                    <span className="font-bold text-cyan-400">
                      {reverseCalculations.seriesPerString}S × {reverseCalculations.parallelStrings}P
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning if count does not match series multiple */}
              {!reverseCalculations.isExactMultiple && (
                <div className={`p-3 rounded-xl border flex items-center gap-3 text-xs ${
                  isLightMode ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                }`}>
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <span className="font-bold">{isEn ? 'Uneven Battery Count Warning: ' : 'هشدار عدم تطابق تعداد باتری: '}</span>
                    <span>
                      {isEn
                        ? `For ${reverseDcBusVoltage}V DC bus, batteries must be grouped in multiples of ${reverseCalculations.seriesPerString}. Currently using ${reverseCalculations.effectiveBatteries} batteries (${reverseBatteryCount - reverseCalculations.effectiveBatteries} unused/spare).`
                        : `برای باس ${reverseDcBusVoltage} ولت، تعداد باتری‌ها باید مضربی از ${reverseCalculations.seriesPerString} عدد باشد. در حال حاضر ${reverseCalculations.effectiveBatteries} باتری در مدار قرار می‌گیرند (${reverseBatteryCount - reverseCalculations.effectiveBatteries} عدد مازاد/رزرو).`}
                    </span>
                  </div>
                </div>
              )}

              {/* Reverse Evaluation Mode Tabs */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-black/10 dark:border-white/10 pb-2">
                  <span className="text-xs font-bold text-slate-400">{isEn ? 'Calculate Target:' : 'هدف محاسبه:'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setReverseTargetType('find_time')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                        reverseTargetType === 'find_time'
                          ? 'bg-amber-500 text-white border-amber-600 font-bold'
                          : isLightMode
                          ? 'bg-white text-slate-600 border-slate-200'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {isEn ? 'Given Load (Watts) ➜ Find Runtime (Hours/Mins)' : 'ورود توان مصرفی (وات) ➜ محاسبه زمان نگهداری برق'}
                    </button>

                    <button
                      onClick={() => setReverseTargetType('find_power')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                        reverseTargetType === 'find_power'
                          ? 'bg-amber-500 text-white border-amber-600 font-bold'
                          : isLightMode
                          ? 'bg-white text-slate-600 border-slate-200'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {isEn ? 'Given Desired Time ➜ Find Maximum Supported Power' : 'ورود زمان مورد نظر ➜ محاسبه حداکثر توان خروجی'}
                    </button>
                  </div>
                </div>

                {/* Sub-scenario A: Given Load -> Find Runtime */}
                {reverseTargetType === 'find_time' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl border space-y-3 ${
                      isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                    }`}>
                      <label className="text-xs font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          {isEn ? 'Applied Load Power (Watts):' : 'توان مصرفی متصل به یوپی‌اس (وات):'}
                        </span>
                        <span className="text-xs font-mono text-amber-500 font-semibold">
                          ≈ {(reverseGivenWatts / (powerFactor * 1000)).toFixed(2)} kVA
                        </span>
                      </label>

                      <div className="relative">
                        <input
                          type="number"
                          min={10}
                          max={50000}
                          step={50}
                          value={reverseGivenWatts}
                          onChange={(e) => setReverseGivenWatts(Math.max(1, parseInt(e.target.value) || 1))}
                          className={`w-full px-3 py-2 rounded-lg font-mono text-lg font-bold border transition ${
                            isLightMode
                              ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                              : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500'
                          }`}
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">W</span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {[200, 500, 800, 1200, 2000, 3500].map((w) => (
                          <button
                            key={w}
                            onClick={() => setReverseGivenWatts(w)}
                            className={`px-2 py-0.5 text-[10px] font-mono rounded border transition cursor-pointer ${
                              reverseGivenWatts === w
                                ? 'bg-amber-500 text-white border-amber-600 font-bold'
                                : isLightMode
                                ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            {w}W
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Result Output Card */}
                    <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                      isLightMode
                        ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 text-emerald-950'
                        : 'bg-gradient-to-br from-emerald-950/30 to-teal-950/30 border-emerald-500/40 text-emerald-100'
                    }`}>
                      <div>
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {isEn ? 'Estimated Backup Autonomy' : 'زمان تخمینی برق‌دهی باتری‌ها'}
                        </span>
                        <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-500 mt-2">
                          {reverseCalculations.rtHours} {isEn ? 'hrs' : 'ساعت'} {reverseCalculations.rtMins} {isEn ? 'mins' : 'دقیقه'}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                          ≈ {reverseCalculations.runtimeHoursFromLoad.toFixed(2)} {isEn ? 'decimal hours total' : 'ساعت دقیق'}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-emerald-500/20 grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-400 block">{isEn ? 'Total Usable Energy:' : 'کل انرژی مفید:'}</span>
                          <span className="font-bold text-emerald-400">
                            {(reverseCalculations.totalUsableWh / 1000).toFixed(2)} kWh
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">{isEn ? 'Bank Capacity:' : 'ظرفیت موازی:'}</span>
                          <span className="font-bold text-emerald-400">
                            {reverseCalculations.totalBankAh} Ah @ {reverseDcBusVoltage}V
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-scenario B: Given Desired Time -> Find Supported Power */}
                {reverseTargetType === 'find_power' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl border space-y-3 ${
                      isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                    }`}>
                      <label className="text-xs font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{isEn ? 'Desired Backup Duration (Hours):' : 'مدت زمان برق‌دهی مورد نیاز (ساعت):'}</span>
                      </label>

                      <div className="relative">
                        <input
                          type="number"
                          min={0.2}
                          max={48}
                          step={0.5}
                          value={reverseGivenHours}
                          onChange={(e) => setReverseGivenHours(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                          className={`w-full px-3 py-2 rounded-lg font-mono text-lg font-bold border transition ${
                            isLightMode
                              ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                              : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-500'
                          }`}
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">Hours</span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {[1, 2, 3, 4, 6, 8, 12].map((h) => (
                          <button
                            key={h}
                            onClick={() => setReverseGivenHours(h)}
                            className={`px-2 py-0.5 text-[10px] font-mono rounded border transition cursor-pointer ${
                              reverseGivenHours === h
                                ? 'bg-amber-500 text-white border-amber-600 font-bold'
                                : isLightMode
                                ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            {h}h
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Result Output Card */}
                    <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                      isLightMode
                        ? 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200 text-cyan-950'
                        : 'bg-gradient-to-br from-cyan-950/30 to-blue-950/30 border-cyan-500/40 text-cyan-100'
                    }`}>
                      <div>
                        <span className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                          <Zap className="w-4 h-4" />
                          {isEn ? 'Maximum Supported Load Capacity' : 'حداکثر توان قابل تامین در این مدت'}
                        </span>
                        <div className="text-2xl sm:text-3xl font-extrabold font-mono text-cyan-500 mt-2">
                          {Math.round(reverseCalculations.supportedWatts)} Watts
                        </div>
                        <p className="text-sm text-cyan-600 dark:text-cyan-300 mt-1 font-mono font-bold">
                          ≈ {reverseCalculations.supportedKva.toFixed(2)} kVA (PF: {powerFactor})
                        </p>
                      </div>

                      <div className="pt-3 border-t border-cyan-500/20 grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-400 block">{isEn ? 'Total Usable Energy:' : 'کل انرژی مفید:'}</span>
                          <span className="font-bold text-cyan-400">
                            {(reverseCalculations.totalUsableWh / 1000).toFixed(2)} kWh
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">{isEn ? 'Continuous Current:' : 'جریان مجاز پیوسته:'}</span>
                          <span className="font-bold text-cyan-400">
                            {(reverseCalculations.supportedWatts / (reverseDcBusVoltage * (inverterEfficiency / 100))).toFixed(1)} A
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODE 3: PHYSICAL MAPS & RACKS POWER AUDIT */}
          {/* ========================================================= */}
          {activeMode === 'physical_maps' && (
            <UpsPhysicalMapAuditTab
              audits={physicalMapAudits}
              selectedMapId={selectedMapId || physicalMapAudits[0]?.mapId || ''}
              onSelectMapId={(id) => handleSelectPhysicalMap(id)}
              onApplyWattsToCalculator={handleApplyWattsFromMap}
              isEn={isEn}
              isLightMode={isLightMode}
            />
          )}
        </div>

        {/* Modal Footer Bar */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t shrink-0 ${
            isLightMode ? 'border-slate-100 bg-slate-50/80' : 'border-slate-800/80 bg-slate-900/60'
          } rounded-b-2xl text-xs`}
        >
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>
              {activeMode === 'forward'
                ? isEn
                  ? `Sizing for ${loadWatts}W (${forwardCalculations.loadKva.toFixed(2)} kVA) @ ${forwardCalculations.totalRuntimeHours.toFixed(1)}h`
                  : `محاسبه برای بار ${loadWatts} وات (${forwardCalculations.loadKva.toFixed(2)} kVA) در ${forwardCalculations.totalRuntimeHours.toFixed(1)} ساعت`
                : activeMode === 'reverse'
                ? isEn
                  ? `Bank: ${reverseBatteryCount}x 12V ${reverseCalculations.batAh}Ah @ ${reverseDcBusVoltage}V DC`
                  : `بانک: ${reverseBatteryCount} باتری ۱۲ ولت ${reverseCalculations.batAh}Ah در باس ${reverseDcBusVoltage} ولت`
                : isEn
                ? `Physical Audit: ${selectedMapAudit ? selectedMapAudit.mapName : 'All Maps'} • ${selectedMapAudit ? selectedMapAudit.totalWatts.toLocaleString() : (physicalMapAudits[0]?.totalWatts || 0).toLocaleString()} W Total Load`
                : `ممیزی نقشه فیزیکی: ${selectedMapAudit ? selectedMapAudit.mapName : 'تمام نقشه‌ها'} • توان کل: ${selectedMapAudit ? selectedMapAudit.totalWatts.toLocaleString() : (physicalMapAudits[0]?.totalWatts || 0).toLocaleString()} وات`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                isLightMode
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
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
