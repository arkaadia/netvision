import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CustomTopologyTower, MountedTowerDevice, Device } from '../../types';
import { HARDWARE_CATALOG, HardwareCatalogTemplate } from '../../data/hardwareCatalog';
import {
  X,
  Radio,
  Wifi,
  Compass,
  Check,
  Search,
  Server,
  Layers,
  Building2,
  AlertCircle,
  ArrowUpRight,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface MountRadioOnTowerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tower: CustomTopologyTower;
  editingDevice?: MountedTowerDevice | null;
  onSave?: (device: MountedTowerDevice) => void;
  onSaveRadio?: (towerId: string, device: MountedTowerDevice) => void;
  inventoryDevices?: Device[];
  mountedDeviceIds?: Set<string>;
}

const AZIMUTH_PRESETS = [
  { label_en: 'North (0°)', label_fa: 'شمال (۰°)', deg: 0 },
  { label_en: 'North-East (45°)', label_fa: 'شمال شرق (۴۵°)', deg: 45 },
  { label_en: 'East (90°)', label_fa: 'شرق (۹۰°)', deg: 90 },
  { label_en: 'South-East (135°)', label_fa: 'جنوب شرق (۱۳۵°)', deg: 135 },
  { label_en: 'South (180°)', label_fa: 'جنوب (۱۸۰°)', deg: 180 },
  { label_en: 'South-West (225°)', label_fa: 'جنوب غرب (۲۲۵°)', deg: 225 },
  { label_en: 'West (270°)', label_fa: 'غرب (۲۷۰°)', deg: 270 },
  { label_en: 'North-West (315°)', label_fa: 'شمال غرب (۳۱۵°)', deg: 315 },
];

const FREQUENCY_OPTIONS = [
  '5 GHz (802.11ac / airMAX)',
  '60 GHz (Millimeter Wave 1-2Gbps)',
  '24 GHz (Carrier PTP)',
  '11 GHz (Licensed Microwave)',
  '70/80 GHz (E-Band 10Gbps)',
  '2.4 GHz (Legacy / Long Range)',
];

export const MountRadioOnTowerModal: React.FC<MountRadioOnTowerModalProps> = ({
  isOpen,
  onClose,
  tower,
  editingDevice,
  onSave,
  onSaveRadio,
  inventoryDevices = [],
  mountedDeviceIds = new Set(),
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [sourceMode, setSourceMode] = useState<'catalog' | 'inventory'>('catalog');
  const [catalogCategory, setCatalogCategory] = useState<'wireless_radio' | 'dish_antenna'>('wireless_radio');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    editingDevice ? editingDevice.model : 'mikrotik-wireless-wire-dish'
  );
  const [name, setName] = useState(editingDevice ? editingDevice.name : '');
  const [brand, setBrand] = useState(editingDevice ? editingDevice.brand : 'MikroTik');
  const [model, setModel] = useState(editingDevice ? editingDevice.model : 'Wireless Wire Dish');
  const [category, setCategory] = useState<'wireless_radio' | 'dish_antenna'>(
    editingDevice ? editingDevice.category : 'wireless_radio'
  );
  const [heightMeters, setHeightMeters] = useState<number>(
    editingDevice ? editingDevice.heightMeters : Math.min(30, tower.heightMeters)
  );
  const [azimuthDegrees, setAzimuthDegrees] = useState<number>(
    editingDevice?.azimuthDegrees !== undefined ? editingDevice.azimuthDegrees : 0
  );
  const [frequency, setFrequency] = useState(
    editingDevice?.frequency || '5 GHz (802.11ac / airMAX)'
  );
  const [targetLink, setTargetLink] = useState(editingDevice?.targetLink || '');
  const [ip, setIp] = useState(editingDevice?.ip || '');
  const [notes, setNotes] = useState(editingDevice?.notes || '');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);

  // Catalog items filtered by radio or dish
  const catalogTemplates = useMemo(() => {
    return HARDWARE_CATALOG.filter(
      (item) => item.category === 'wireless_radio' || item.category === 'dish_antenna'
    );
  }, []);

  const filteredCatalog = useMemo(() => {
    return catalogTemplates.filter((item) => {
      if (item.category !== catalogCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.model.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.description_fa.toLowerCase().includes(q) ||
        item.description_en.toLowerCase().includes(q)
      );
    });
  }, [catalogTemplates, catalogCategory, searchQuery]);

  // Inventory items
  const filteredInventory = useMemo(() => {
    return inventoryDevices.filter((dev) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        dev.name.toLowerCase().includes(q) ||
        (dev.ip && dev.ip.toLowerCase().includes(q)) ||
        (dev.model && dev.model.toLowerCase().includes(q))
      );
    });
  }, [inventoryDevices, searchQuery]);

  // Select catalog item
  const handleSelectTemplate = (tpl: HardwareCatalogTemplate) => {
    setSelectedTemplateId(tpl.id);
    setBrand(tpl.brand);
    setModel(tpl.model);
    setCategory(tpl.category as 'wireless_radio' | 'dish_antenna');
    if (!name || name === model) {
      setName(tpl.model);
    }
  };

  // Select inventory item
  const handleSelectInventory = (dev: Device) => {
    const isAlreadyMounted =
      mountedDeviceIds.has(dev.id) ||
      mountedDeviceIds.has(dev.id.replace(/^hw-/, '')) ||
      (tower.devices || []).some(
        (d) =>
          d.id === dev.id ||
          (dev.name && d.name && d.name.trim().toLowerCase() === dev.name.trim().toLowerCase())
      );

    if (isAlreadyMounted) return;

    setSelectedInventoryId(dev.id);
    setName(dev.name);
    setIp(dev.ip || '');
    setBrand((dev as any).vendor || (dev as any).brand || 'MikroTik');
    setModel(dev.model || dev.name);
    setCategory('wireless_radio');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const deviceId = editingDevice
      ? editingDevice.id
      : selectedInventoryId || `radio-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const azimuthObj = AZIMUTH_PRESETS.find((p) => p.deg === azimuthDegrees);
    const azimuthLabel = azimuthObj
      ? isEn
        ? azimuthObj.label_en
        : azimuthObj.label_fa
      : `${azimuthDegrees}°`;

    const newDevice: MountedTowerDevice = {
      id: deviceId,
      name: name.trim() || model,
      brand,
      model,
      category,
      heightMeters: Number(heightMeters),
      azimuthDegrees,
      azimuthLabel,
      frequency,
      ip: ip.trim() || undefined,
      targetLink: targetLink.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (onSave) {
      onSave(newDevice);
    } else if (onSaveRadio) {
      onSaveRadio(tower.id, newDevice);
    }
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed top-0 left-0 right-0 bottom-8 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>
                  {editingDevice
                    ? isEn
                      ? 'Edit Mounted Radio / Dish'
                      : 'ویرایش رادیو و آنتن دکل'
                    : isEn
                    ? 'Mount Wireless Radio / Dish on Tower'
                    : 'نصب رادیوی وایرلس / دیش بر روی دکل'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                  {tower.name} ({tower.heightMeters}m)
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEn
                  ? 'Configure elevation height, azimuth direction, frequency and target link'
                  : 'تنظیم ارتفاع نصب روی دکل، جهت دید (آزیموت)، فرکانس کاری و مشخصات لینک'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Source Selection: Catalog vs Inventory */}
          {!editingDevice && (
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">
                  {isEn ? 'Hardware Source:' : 'منبع انتخاب تجهیز:'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSourceMode('catalog')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    sourceMode === 'catalog'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Hardware Catalog' : 'کاتالوگ رادیو و دیش'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceMode('inventory')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    sourceMode === 'inventory'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>
                    {isEn
                      ? `Network Inventory (${inventoryDevices.length})`
                      : `تجهیزات موجود در انبار (${inventoryDevices.length})`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Catalog Selection Mode */}
          {!editingDevice && sourceMode === 'catalog' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCatalogCategory('wireless_radio')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                      catalogCategory === 'wireless_radio'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isEn ? 'Wireless Radios & PTP' : 'رادیوهای بی‌سیم و PTP'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogCategory('dish_antenna')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                      catalogCategory === 'dish_antenna'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isEn ? 'Parabolic Dishes & Sectors' : 'دیش‌های پارابولیک و سکتور'}
                  </button>
                </div>

                <div className="relative min-w-[200px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isEn ? 'Search model, brand...' : 'جستجوی مدل، برند...'}
                    className="w-full px-3 py-1.5 pl-8 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1 scrollbar-thin">
                {filteredCatalog.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`p-3 rounded-2xl border cursor-pointer transition flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{tpl.model}</span>
                        </div>
                        <div className="text-[11px] text-amber-400 font-mono mt-0.5">
                          {tpl.brand}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                          {isEn ? tpl.description_en : tpl.description_fa}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="p-1 rounded-full bg-amber-500 text-slate-950">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Inventory Selection Mode */}
          {!editingDevice && sourceMode === 'inventory' && (
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isEn ? 'Filter inventory devices...' : 'فیلتر دیوایس‌های انبار...'}
                  className="w-full px-3 py-1.5 pl-8 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1 scrollbar-thin">
                {filteredInventory.map((dev) => {
                  const isSelected = selectedInventoryId === dev.id;
                  const isAlreadyMounted =
                    mountedDeviceIds.has(dev.id) ||
                    mountedDeviceIds.has(dev.id.replace(/^hw-/, '')) ||
                    (tower.devices || []).some(
                      (d) =>
                        d.id === dev.id ||
                        (dev.name && d.name && d.name.trim().toLowerCase() === dev.name.trim().toLowerCase())
                    );

                  return (
                    <div
                      key={dev.id}
                      onClick={() => !isAlreadyMounted && handleSelectInventory(dev)}
                      className={`p-3 rounded-2xl border transition flex items-start justify-between gap-2 ${
                        isAlreadyMounted
                          ? 'opacity-40 bg-slate-950/40 border-slate-800 cursor-not-allowed'
                          : isSelected
                          ? 'bg-cyan-950/40 border-cyan-500 ring-2 ring-cyan-500/30 cursor-pointer'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 cursor-pointer'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white font-mono">{dev.name}</span>
                          {isAlreadyMounted && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {isEn ? 'Already Deployed' : 'موجود در نقشه'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-cyan-400 font-mono mt-0.5">{dev.ip}</div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {dev.vendor || 'MikroTik'} • {dev.model || 'Radio'}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="p-1 rounded-full bg-cyan-500 text-slate-950">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form Fields Section */}
          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-amber-400 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              <span>{isEn ? 'Tower Mounting Parameters:' : 'پارامترهای نصب بر روی دکل:'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Device Custom Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isEn ? 'Device Name / Tag:' : 'نام / برچسب رادیو:'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Radio-HQ-PTP-01"
                />
              </div>

              {/* IP Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isEn ? 'IP Address:' : 'آدرس آی‌پی (اختیاری):'}
                </label>
                <input
                  type="text"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500 font-mono"
                  placeholder="192.168.88.1"
                />
              </div>

              {/* Mounting Elevation Height */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEn ? 'Mount Elevation (Height):' : 'ارتفاع نصب روی دکل:'}</span>
                  </label>
                  <span className="text-xs font-bold font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                    {heightMeters} m ({isEn ? `Max ${tower.heightMeters}m` : `حداکثر ${tower.heightMeters} متر`})
                  </span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={tower.heightMeters}
                  step={3}
                  value={heightMeters}
                  onChange={(e) => setHeightMeters(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>3m (Base)</span>
                  <span>{Math.round(tower.heightMeters / 2)}m</span>
                  <span>{tower.heightMeters}m (Top)</span>
                </div>
              </div>

              {/* Azimuth / Direction Heading */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEn ? 'Azimuth Direction (Heading):' : 'جهت دید آنتن (آزیموت):'}</span>
                  </label>
                  <span className="text-xs font-bold font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                    {azimuthDegrees}° ({AZIMUTH_PRESETS.find((p) => p.deg === azimuthDegrees)?.label_en || `${azimuthDegrees}°`})
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={359}
                  step={5}
                  value={azimuthDegrees}
                  onChange={(e) => setAzimuthDegrees(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                {/* Azimuth Quick Presets */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {AZIMUTH_PRESETS.map((p) => (
                    <button
                      key={p.deg}
                      type="button"
                      onClick={() => setAzimuthDegrees(p.deg)}
                      className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition ${
                        azimuthDegrees === p.deg
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {p.deg}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Operating Frequency */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEn ? 'Operating Frequency / Band:' : 'فرکانس کاری / باند لینک:'}</span>
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                >
                  {FREQUENCY_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Link / Remote Station */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isEn ? 'Target Link Destination:' : 'مقصد لینک (ایستگاه طرف مقابل):'}
                </label>
                <input
                  type="text"
                  value={targetLink}
                  onChange={(e) => setTargetLink(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  placeholder={isEn ? 'e.g. PTP Link to HQ Data Center' : 'مثال: لینک PTP به دیتاسنتر مرکزی'}
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            {isEn ? 'Cancel' : 'انصراف'}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-950/40 transition active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>
              {editingDevice
                ? isEn
                  ? 'Update Radio on Tower'
                  : 'به‌روزرسانی رادیو روی دکل'
                : isEn
                ? 'Mount Radio onto Tower'
                : 'نصب رادیو بر روی دکل'}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
