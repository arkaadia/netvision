import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CustomTopologyTower, TowerType } from '../../types';
import { X, Radio, Check, Layers, ArrowUpRight, Palette, Shield } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface AddTowerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (towerData: Omit<CustomTopologyTower, 'id' | 'devices' | 'x' | 'y'>) => void;
  onSaveTower?: (towerData: Omit<CustomTopologyTower, 'id' | 'devices' | 'x' | 'y'>) => void;
  editingTower?: CustomTopologyTower | null;
  initialData?: CustomTopologyTower | null;
}

interface TowerTypeOption {
  type: TowerType;
  title_en: string;
  title_fa: string;
  desc_en: string;
  desc_fa: string;
  defaultHeight: number;
  availableHeights: number[];
}

const TOWER_TYPE_OPTIONS: TowerTypeOption[] = [
  {
    type: 'guyed_g35',
    title_en: 'G35 Guyed Mast Tower',
    title_fa: 'دکل مهاری استاندارد G35',
    desc_en: 'Triangular lattice 3m sections with guy wire tension anchor cables. Standard for heights up to 36m.',
    desc_fa: 'سکشن‌های سه ضلعی ۳ متری با سیم مهاری بکسل استاندارد. مناسب دیش‌های ۳۰dBi تا ارتفاع ۳۶ متر.',
    defaultHeight: 30,
    availableHeights: [18, 24, 30, 36],
  },
  {
    type: 'guyed_g45',
    title_en: 'G45 Heavy Guyed Tower',
    title_fa: 'دکل مهاری سنگین صنعتی G45',
    desc_en: 'Heavy-duty triangular lattice mast with larger face width. Capable of multiple high-gain dishes up to 48m.',
    desc_fa: 'دکل مهاری صنعتی با قاعده عریض‌تر و تحمل بار باد بالا جهت نصب چندین دیش و رادیوی سنگین تا ۴۸ متر.',
    defaultHeight: 36,
    availableHeights: [24, 30, 36, 42, 48],
  },
  {
    type: 'self_supporting_3leg',
    title_en: '3-Legged Self-Supporting Tower',
    title_fa: 'دکل خودایستا سه پایه',
    desc_en: 'Trapezoidal steel lattice tower with wide reinforced concrete base. No guy wires needed.',
    desc_fa: 'دکل مشبک لتیس با پایه ذوزنقه‌ای عریض بتنی بدون نیاز به سیم مهار. مناسب فضاهای صنعتی و پشت‌بام.',
    defaultHeight: 30,
    availableHeights: [24, 30, 36, 42],
  },
  {
    type: 'self_supporting_4leg',
    title_en: '4-Legged Self-Supporting Tower',
    title_fa: 'دکل خودایستا چهار پایه صنعتی',
    desc_en: 'Four-legged heavy carrier telecommunication tower engineered for extreme microwave dish payloads up to 60m.',
    desc_fa: 'دکل مخابراتی سنگین چهار پایه با بالاترین پایداری در برابر بادهای شدید و نصب دیش‌های بزرگ ۳۴dBi تا ۶۰ متر.',
    defaultHeight: 36,
    availableHeights: [30, 36, 48, 60],
  },
  {
    type: 'monopole',
    title_en: 'Monopole Tubular Mast',
    title_fa: 'دکل منوپل لوله‌ای مخابراتی',
    desc_en: 'Tubular steel monopole with minimal ground footprint. Ideal for rooftop or urban space-constrained sites.',
    desc_fa: 'دکل تک‌پایه منوپل استوانه‌ای با اشغال حداقل فضای سطح زمین، ایده‌آل برای محیط‌های اداری و پشت‌بام.',
    defaultHeight: 24,
    availableHeights: [18, 24, 30],
  },
];

const TOWER_COLORS = [
  '#f59e0b', // Amber
  '#0284c7', // Sky blue
  '#10b981', // Emerald
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#64748b', // Slate
];

export const AddTowerModal: React.FC<AddTowerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveTower,
  editingTower,
  initialData,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const isLightMode = typeof document !== 'undefined' && (
    document.querySelector('.theme-light') !== null ||
    localStorage.getItem('panel_theme') === 'light' ||
    localStorage.getItem('theme_mode') === 'light'
  );

  const effectiveEditingTower = editingTower || initialData;
  const saveHandler = onSave || onSaveTower;

  const [selectedType, setSelectedType] = useState<TowerType>(
    effectiveEditingTower?.type || 'guyed_g35'
  );
  const [name, setName] = useState(
    effectiveEditingTower?.name || (isEn ? 'Tower-01 (G35 30m)' : 'دکل مخابراتی مهاری G35')
  );
  const [heightMeters, setHeightMeters] = useState<number>(
    effectiveEditingTower?.heightMeters || 30
  );
  const [color, setColor] = useState(effectiveEditingTower?.color || '#f59e0b');

  const activeTypeOption =
    TOWER_TYPE_OPTIONS.find((t) => t.type === selectedType) || TOWER_TYPE_OPTIONS[0];

  const handleTypeSelect = (opt: TowerTypeOption) => {
    setSelectedType(opt.type);
    if (!effectiveEditingTower) {
      setHeightMeters(opt.defaultHeight);
      setName(
        isEn
          ? `${opt.title_en} (${opt.defaultHeight}m)`
          : `${opt.title_fa} (${opt.defaultHeight} متر)`
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saveHandler) {
      saveHandler({
        name: name.trim() || (isEn ? 'Telecom Tower' : 'دکل مخابراتی'),
        type: selectedType,
        heightMeters: Number(heightMeters),
        color,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed top-0 left-0 right-0 bottom-8 z-50 flex items-center justify-center p-4 modal-backdrop-blur animate-in fade-in duration-200 ${
        isLightMode ? 'bg-slate-900/40 theme-light' : 'bg-slate-950/80'
      }`}
    >
      <div
        className={`relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border ${
          isLightMode
            ? 'bg-white border-slate-200 text-slate-800 shadow-slate-300/60'
            : 'bg-slate-900 border-slate-800 text-slate-200 shadow-2xl'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isLightMode ? 'bg-slate-50 border-slate-200' : 'border-slate-800 bg-slate-950/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl ${
                isLightMode
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                {editingTower
                  ? isEn
                    ? 'Edit Telecommunication Tower'
                    : 'ویرایش دکل مخابراتی'
                  : isEn
                  ? 'Add Telecommunication Tower / Mast'
                  : 'افزودن دکل مخابراتی و آنتن به نقشه'}
              </h2>
              <p className={`text-xs mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn
                  ? 'Place guyed masts, self-supporting or monopole towers to mount radios and parabolic dishes'
                  : 'قرار دادن دکل‌های مهاری، خودایستا یا منوپل جهت نصب انواع رادیوهای وایرلس و دیش‌های پارابولیک'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition cursor-pointer ${
              isLightMode
                ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Tower Type Selection */}
          <div className="space-y-3">
            <label className={`text-xs font-bold flex items-center gap-1.5 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>{isEn ? 'Select Tower Structure Type:' : 'انتخاب نوع سازه دکل مخابراتی:'}</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TOWER_TYPE_OPTIONS.map((opt) => {
                const isSelected = selectedType === opt.type;
                return (
                  <div
                    key={opt.type}
                    onClick={() => handleTypeSelect(opt)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                      isSelected
                        ? isLightMode
                          ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/30 shadow-md shadow-amber-200/50'
                          : 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30 shadow-lg shadow-amber-950/40'
                        : isLightMode
                        ? 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/80'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isLightMode ? (isSelected ? 'text-amber-950' : 'text-slate-900') : 'text-white'}`}>
                          {isEn ? opt.title_en : opt.title_fa}
                        </span>
                        {isSelected && (
                          <div className="p-1 rounded-full bg-amber-500 text-slate-950">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <p className={`text-[10px] mt-1 leading-relaxed ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                        {isEn ? opt.desc_en : opt.desc_fa}
                      </p>
                    </div>

                    <div className={`flex items-center gap-1.5 text-[10px] font-mono self-start px-2 py-1 rounded-lg border ${
                      isLightMode
                        ? 'text-amber-800 bg-amber-100/70 border-amber-300'
                        : 'text-amber-400 bg-slate-900/80 border-slate-800'
                    }`}>
                      <span>{isEn ? 'Height Options:' : 'ارتفاع‌های استاندارد:'}</span>
                      <span>{opt.availableHeights.join('m, ')}m</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tower Name & Height */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                {isEn ? 'Tower Name / Identifier:' : 'نام / شناسه دکل:'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none transition ${
                  isLightMode
                    ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-amber-600'
                    : 'bg-slate-950 border-slate-700 text-white focus:border-amber-500'
                }`}
                placeholder="e.g. Tower-Site-Alpha (G35 30m)"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`text-xs font-semibold flex items-center gap-1.5 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isEn ? 'Total Height (Meters):' : 'ارتفاع کلی دکل (متر):'}</span>
                </label>
                <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                  isLightMode
                    ? 'text-amber-900 bg-amber-100 border-amber-300'
                    : 'text-amber-400 bg-amber-950/60 border-amber-500/30'
                }`}>
                  {heightMeters} m
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeTypeOption.availableHeights.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      setHeightMeters(h);
                      if (!editingTower) {
                        setName(
                          isEn
                            ? `${activeTypeOption.title_en} (${h}m)`
                            : `${activeTypeOption.title_fa} (${h} متر)`
                        );
                      }
                    }}
                    className={`flex-1 min-w-[50px] py-1.5 text-xs font-bold font-mono rounded-xl transition cursor-pointer ${
                      heightMeters === h
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : isLightMode
                        ? 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                        : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {h}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Accent Color Picker */}
          <div>
            <label className={`block text-xs font-semibold mb-2 flex items-center gap-1.5 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
              <Palette className="w-3.5 h-3.5 text-amber-500" />
              <span>{isEn ? 'Accent Theme Color:' : 'رنگ نمادین سازه:'}</span>
            </label>
            <div className="flex items-center gap-2">
              {TOWER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-xl transition-all cursor-pointer ${
                    color === c ? 'ring-2 ring-white scale-110 shadow-sm' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-t ${
            isLightMode ? 'bg-slate-50 border-slate-200' : 'border-slate-800 bg-slate-950/80'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
              isLightMode
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {isEn ? 'Cancel' : 'انصراف'}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-950/30 transition active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>
              {editingTower
                ? isEn
                  ? 'Save Tower Changes'
                  : 'ذخیره تغییرات دکل'
                : isEn
                ? 'Create & Place Tower'
                : 'ایجاد و استقرار دکل'}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
