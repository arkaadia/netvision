import React, { useState, useMemo } from 'react';
import {
  Server,
  Zap,
  Gauge,
  BatteryCharging,
  Flame,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ArrowRight,
  Search,
  Filter,
  Layers,
  Cpu,
  HelpCircle,
  HardDrive
} from 'lucide-react';
import {
  PhysicalMapPowerAudit,
  RackPowerItem,
  generateRackAuditReport
} from './upsPowerUtils';

interface UpsPhysicalMapAuditTabProps {
  audits: PhysicalMapPowerAudit[];
  selectedMapId: string;
  onSelectMapId: (id: string) => void;
  onApplyWattsToCalculator: (watts: number, label: string) => void;
  isEn: boolean;
  isLightMode: boolean;
}

export const UpsPhysicalMapAuditTab: React.FC<UpsPhysicalMapAuditTabProps> = ({
  audits,
  selectedMapId,
  onSelectMapId,
  onApplyWattsToCalculator,
  isEn,
  isLightMode
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [expandedRacks, setExpandedRacks] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [densityFilter, setDensityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  // Find currently active audit
  const activeAudit = useMemo(() => {
    return audits.find((a) => a.mapId === selectedMapId) || audits[0] || null;
  }, [audits, selectedMapId]);

  // Expand all racks initially or when activeAudit changes
  React.useEffect(() => {
    if (activeAudit) {
      const initialMap: Record<string, boolean> = {};
      activeAudit.racks.forEach((r) => {
        initialMap[r.id] = true;
      });
      setExpandedRacks(initialMap);
    }
  }, [activeAudit?.mapId]);

  const toggleRackExpand = (rackId: string) => {
    setExpandedRacks((prev) => ({
      ...prev,
      [rackId]: !prev[rackId]
    }));
  };

  const handleCopyReport = () => {
    if (!activeAudit) return;
    const reportText = generateRackAuditReport(activeAudit, isEn);
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered racks based on search & density
  const filteredRacks = useMemo(() => {
    if (!activeAudit) return [];
    return activeAudit.racks.filter((rack) => {
      if (densityFilter !== 'all' && rack.densityCategory !== densityFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = rack.name.toLowerCase().includes(query);
        const matchDevice = rack.devices.some(
          (d) =>
            d.name.toLowerCase().includes(query) ||
            d.brand.toLowerCase().includes(query) ||
            d.model.toLowerCase().includes(query)
        );
        return matchName || matchDevice;
      }
      return true;
    });
  }, [activeAudit, densityFilter, searchQuery]);

  if (!activeAudit) {
    return (
      <div className={`p-8 rounded-xl border text-center space-y-3 ${
        isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
      }`}>
        <Server className="w-8 h-8 text-slate-400 mx-auto" />
        <p className="text-sm font-semibold">
          {isEn ? 'No physical maps or rack data detected' : 'هیچ نقشه فیزیکی یا داده رکی یافت نشد'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header Toolbar: Map Selector & Sizing Actions */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 ${
          isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
        }`}
      >
        <div className="flex-1 w-full md:w-auto">
          <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${
            isLightMode ? 'text-slate-700' : 'text-slate-300'
          }`}>
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>{isEn ? 'Select Physical Topology Map:' : 'انتخاب نقشه فیزیکی تپولوژی:'}</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeAudit.mapId}
              onChange={(e) => onSelectMapId(e.target.value)}
              className={`flex-1 min-w-[240px] px-3 py-2 text-xs font-semibold rounded-lg border cursor-pointer focus:outline-none transition ${
                isLightMode
                  ? 'bg-white text-slate-900 border-slate-300 focus:border-amber-500 shadow-sm'
                  : 'bg-slate-950 text-slate-100 border-slate-700 focus:border-amber-500 shadow-sm'
              }`}
            >
              {audits.map((m) => (
                <option key={m.mapId} value={m.mapId}>
                  {m.mapName} ({m.totalRacks} {isEn ? 'Racks' : 'رک'} • {m.totalWatts.toLocaleString()}W)
                </option>
              ))}
            </select>

            <span
              className={`px-2 py-1 rounded text-[10px] font-mono border ${
                activeAudit.sourceType === 'custom_map'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-500/30'
                  : activeAudit.sourceType === 'default_physical'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/30'
              }`}
            >
              {activeAudit.sourceType === 'custom_map'
                ? isEn ? 'Custom Map' : 'نقشه سفارشی'
                : activeAudit.sourceType === 'default_physical'
                ? isEn ? 'Active Topology' : 'توپولوژی فعال'
                : isEn ? 'Demo Template' : 'قالب نمونه'}
            </span>
          </div>
          {activeAudit.description && (
            <p className={`text-[11px] mt-1 line-clamp-1 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {activeAudit.description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={handleCopyReport}
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer border ${
              copied
                ? 'bg-emerald-500 text-white border-emerald-600'
                : isLightMode
                ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
            title={isEn ? 'Copy full electrical audit report' : 'کپی گزارش ممیزی برق کل رک‌ها'}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? (isEn ? 'Copied!' : 'کپی شد!') : (isEn ? 'Export Audit' : 'خروجی گزارش')}</span>
          </button>

          <button
            onClick={() => onApplyWattsToCalculator(activeAudit.totalWatts, activeAudit.mapName)}
            className="flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.98]"
            title={isEn ? 'Apply total wattage of all racks to UPS Battery sizing' : 'نشاندن کل توان رک‌ها در فرم محاسبه باتری و یو‌پی‌اس'}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{isEn ? 'Apply to UPS Sizing' : 'اعمال به محاسبه‌گر یوپی‌اس'}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>
      </div>

      {/* 2. High-Level Data Center Electrical KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Power */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between ${
          isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">{isEn ? 'Total Room Load' : 'توان کل بار'}</span>
            <Zap className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-mono font-bold text-amber-500">
              {activeAudit.totalWatts.toLocaleString()} <span className="text-xs font-normal">W</span>
            </div>
            <div className={`text-[10px] font-mono mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {(activeAudit.totalWatts / 1000).toFixed(2)} kW
            </div>
          </div>
        </div>

        {/* Apparent Power */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between ${
          isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">{isEn ? 'Apparent Power' : 'توان ظاهری'}</span>
            <Gauge className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-mono font-bold text-indigo-400">
              {activeAudit.totalKva.toFixed(2)} <span className="text-xs font-normal">kVA</span>
            </div>
            <div className={`text-[10px] mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              @ PF 0.8
            </div>
          </div>
        </div>

        {/* Rack Count & Avg */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between ${
          isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">{isEn ? 'Racks & Density' : 'رک‌ها و تراکم'}</span>
            <Server className="w-3.5 h-3.5 text-cyan-500" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-mono font-bold text-cyan-400">
              {activeAudit.totalRacks} <span className="text-xs font-normal">{isEn ? 'Racks' : 'رک'}</span>
            </div>
            <div className={`text-[10px] font-mono mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              avg {(activeAudit.avgWattsPerRack / 1000).toFixed(2)} kW/rack
            </div>
          </div>
        </div>

        {/* Recommended Central UPS */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between ${
          isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">{isEn ? 'Sized UPS' : 'یو‌پی‌اس پیشنهادی'}</span>
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-mono font-bold text-emerald-400">
              {activeAudit.recommendedUpsKva.toFixed(1)} <span className="text-xs font-normal">kVA</span>
            </div>
            <div className={`text-[10px] mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {isEn ? '+25% Headroom' : 'با ۲۵٪ حاشیه امن'}
            </div>
          </div>
        </div>

        {/* Heat Dissipation & AC Cooling */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between ${
          isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">{isEn ? 'AC Cooling Load' : 'سرمایش مورد نیاز'}</span>
            <Flame className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-mono font-bold text-rose-400">
              {activeAudit.heatDissipationTons.toFixed(1)} <span className="text-xs font-normal">{isEn ? 'Tons AC' : 'تن تبرید'}</span>
            </div>
            <div className={`text-[10px] font-mono mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {activeAudit.heatDissipationBtu.toLocaleString(undefined, { maximumFractionDigits: 0 })} BTU/h
            </div>
          </div>
        </div>

        {/* Mains Feeder Rating */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between ${
          isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium">{isEn ? 'Mains Current' : 'جریان فیدر برق'}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-mono font-bold text-violet-400">
              {activeAudit.minMainsAmps230V.toFixed(1)} <span className="text-xs font-normal">A</span>
            </div>
            <div className={`text-[10px] mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              @ 230V 1-Phase
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isEn ? 'Search rack or device...' : 'جستجوی رک یا تجهیز...'}
            className={`w-full pl-8 pr-3 py-1.5 rounded-lg border focus:outline-none transition ${
              isLightMode
                ? 'bg-white text-slate-900 border-slate-300 focus:border-amber-500'
                : 'bg-slate-950 text-slate-200 border-slate-700 focus:border-amber-500'
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <span className={`text-[11px] font-medium mr-1 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
            {isEn ? 'Density:' : 'تراکم بار:'}
          </span>
          {[
            { key: 'all', labelEn: 'All Racks', labelFa: 'همه رک‌ها' },
            { key: 'low', labelEn: '< 2.2 kW (Standard)', labelFa: 'عادی (< ۲.۲ kW)' },
            { key: 'medium', labelEn: '2.2 - 4.5 kW', labelFa: 'متوسط (۲.۲ تا ۴.۵ kW)' },
            { key: 'high', labelEn: '> 4.5 kW (High)', labelFa: 'بالا (> ۴.۵ kW)' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setDensityFilter(tab.key as any)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition cursor-pointer shrink-0 ${
                densityFilter === tab.key
                  ? 'bg-amber-500 text-white border-amber-600 font-bold'
                  : isLightMode
                  ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {isEn ? tab.labelEn : tab.labelFa}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Rack-by-Rack Interactive Cabinet Cards */}
      <div className="space-y-4">
        {filteredRacks.length === 0 ? (
          <div className={`p-8 rounded-xl border text-center ${
            isLightMode ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-900/30 border-slate-800 text-slate-400'
          }`}>
            <p className="text-xs">
              {isEn ? 'No racks match your search criteria' : 'هیچ رکی با فیلتر یا جستجوی انتخابی مطابقت ندارد'}
            </p>
          </div>
        ) : (
          filteredRacks.map((rack, idx) => {
            const isExpanded = !!expandedRacks[rack.id];
            const loadPercent = Math.min(100, (rack.totalWatts / 5000) * 100);

            return (
              <div
                key={rack.id}
                className={`rounded-xl border transition-all ${
                  isLightMode
                    ? 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Rack Header Bar */}
                <div
                  className={`p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b ${
                    isLightMode ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800/60 bg-slate-950/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        rack.densityCategory === 'high'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : rack.densityCategory === 'medium'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-sm font-bold ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                          {rack.name}
                        </h4>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {rack.units}U
                        </span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                            rack.densityCategory === 'high'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-500/30'
                              : rack.densityCategory === 'medium'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/30'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30'
                          }`}
                        >
                          {rack.densityCategory === 'high'
                            ? isEn ? 'High Density (>4.5 kW)' : 'تراکم بالا (> ۴.۵ kW)'
                            : rack.densityCategory === 'medium'
                            ? isEn ? 'Medium Density' : 'تراکم متوسط'
                            : isEn ? 'Standard Density' : 'تراکم استاندارد'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>{rack.deviceCount} {isEn ? 'Mounted Devices' : 'تجهیز نصب‌شده'}</span>
                        <span>•</span>
                        <span>{isEn ? 'PDU:' : 'پی‌دی‌یو پیشنهادی:'} {rack.recommendedPdu}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rack Power Metrics & Sizing Action */}
                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right rtl:text-left">
                      <div className="text-base font-mono font-bold text-amber-500">
                        {rack.totalWatts.toLocaleString()} W
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {rack.totalKva.toFixed(2)} kVA • {rack.currentAmps230V.toFixed(1)}A @ 230V
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onApplyWattsToCalculator(rack.totalWatts, rack.name)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                          isLightMode
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border-amber-500/30'
                        }`}
                        title={isEn ? `Size UPS specifically for ${rack.name}` : `محاسبه باتری و یوپی‌اس اختصاصی فقط برای ${rack.name}`}
                      >
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span className="hidden sm:inline">{isEn ? 'Size This Rack' : 'محاسبه فقط این رک'}</span>
                      </button>

                      <button
                        onClick={() => toggleRackExpand(rack.id)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          isLightMode
                            ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                        title={isExpanded ? (isEn ? 'Collapse devices' : 'بستن لیست') : (isEn ? 'Expand devices' : 'مشاهده لیست تجهیزات')}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Rack Power Gauge Bar */}
                <div className="px-4 pt-3">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>{isEn ? 'Rack Thermal & Electrical Budget' : 'ظرفیت بار حرارتی و الکتریکی رک'}</span>
                    <span>{loadPercent.toFixed(0)}% / 5kW cap</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        rack.densityCategory === 'high'
                          ? 'bg-rose-500'
                          : rack.densityCategory === 'medium'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, loadPercent))}%` }}
                    />
                  </div>
                </div>

                {/* Expandable Device Table */}
                {isExpanded && (
                  <div className="p-4 pt-3">
                    {rack.devices.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        {isEn ? 'No equipment mounted in this rack cabinet.' : 'هیچ تجهیز سخت‌افزاری در این رک ثبت نشده است.'}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left rtl:text-right text-xs">
                          <thead>
                            <tr className={`border-b text-[10px] font-mono uppercase tracking-wider ${
                              isLightMode ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'
                            }`}>
                              <th className="py-2 px-2.5">{isEn ? 'Pos' : 'یونیت'}</th>
                              <th className="py-2 px-2.5">{isEn ? 'Device Name' : 'نام تجهیز'}</th>
                              <th className="py-2 px-2.5">{isEn ? 'Category' : 'دسته‌بندی'}</th>
                              <th className="py-2 px-2.5">{isEn ? 'Brand & Model' : 'برند و مدل'}</th>
                              <th className="py-2 px-2.5">{isEn ? 'PSU' : 'پاور'}</th>
                              <th className="py-2 px-2.5 text-right rtl:text-left">{isEn ? 'Power' : 'توان (وات)'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                            {rack.devices.map((dev) => (
                              <tr
                                key={dev.id}
                                className={`transition ${
                                  isLightMode ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                                }`}
                              >
                                <td className="py-2 px-2.5 font-bold text-amber-500 shrink-0">
                                  {dev.uPosition}
                                </td>
                                <td className="py-2 px-2.5 font-semibold text-slate-800 dark:text-slate-200">
                                  {dev.name}
                                </td>
                                <td className="py-2 px-2.5 text-slate-500 dark:text-slate-400 capitalize">
                                  {dev.category}
                                </td>
                                <td className="py-2 px-2.5 text-slate-600 dark:text-slate-300">
                                  {dev.brand} {dev.model}
                                </td>
                                <td className="py-2 px-2.5 text-slate-500 dark:text-slate-400">
                                  {dev.powerSupplyCount}x
                                </td>
                                <td className="py-2 px-2.5 font-bold text-right rtl:text-left">
                                  <span className={dev.watts > 0 ? 'text-amber-500' : 'text-slate-400'}>
                                    {dev.watts} W
                                  </span>
                                  {dev.isEstimated && dev.watts > 0 && (
                                    <span className="text-[9px] text-slate-400 ml-1 font-normal" title={isEn ? 'Estimated from model rating' : 'تخمین مهندسی بر اساس رده تجهیز'}>
                                      (est)
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. Standalone / Unmounted Devices (Canvas equipment not mounted in racks) */}
      {activeAudit.unmountedDevices.length > 0 && (
        <div
          className={`p-4 rounded-xl border space-y-3 ${
            isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <h4 className={`text-xs font-bold flex items-center gap-1.5 ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>
              <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
              <span>{isEn ? 'Standalone Canvas Equipment (Outside Racks):' : 'سایر تجهیزات مستقر در نقشه (خارج از رک):'}</span>
            </h4>
            <span className="text-[11px] font-mono text-indigo-400 font-bold">
              {activeAudit.unmountedDevices.reduce((s, u) => s + u.watts, 0).toLocaleString()} W
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {activeAudit.unmountedDevices.map((dev) => (
              <div
                key={dev.id}
                className={`p-2.5 rounded-lg border flex items-center justify-between text-[11px] ${
                  isLightMode ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="truncate pr-2 rtl:pr-0 rtl:pl-2">
                  <div className="font-semibold truncate">{dev.name}</div>
                  <div className="text-[10px] text-slate-400 capitalize">{dev.type} {dev.model}</div>
                </div>
                <div className="font-mono font-bold text-amber-500 shrink-0">
                  {dev.watts} W
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
