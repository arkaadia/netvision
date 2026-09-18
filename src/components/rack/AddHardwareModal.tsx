import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CustomTopologyRack,
  CustomTopologyTower,
  TowerType,
  RackUnitSize,
  RackDepth,
  HardwareCategory,
  MountedHardwareDevice,
  NetworkCardConfig,
  NetworkPortType,
  Device,
  TopologyNode,
} from '../../types';
import { HARDWARE_CATEGORIES, HARDWARE_CATALOG, HardwareCatalogTemplate } from '../../data/hardwareCatalog';
import { HardwareSvgRenderer } from './HardwareSvgRenderer';
import { convertNodeToHardwareDevice } from './PhysicalNodeOnCanvas';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Check,
  Server,
  Plus,
  Trash2,
  Network,
  Layers,
  Eye,
  EyeOff,
  AlertTriangle,
  Sparkles,
  Zap,
  BatteryCharging,
  Boxes,
  Search,
  Router as RouterIcon,
  Wifi,
  Shield,
  Building2,
  Box,
  Radio,
  Palette,
  ArrowUpRight,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface AddHardwareModalProps {
  isOpen: boolean;
  onClose: () => void;
  racks: CustomTopologyRack[];
  defaultRackId?: string;
  defaultTargetU?: number;
  editingDevice?: MountedHardwareDevice | null;
  onSaveHardware: (rackId: string, device: MountedHardwareDevice) => void;
  inventoryDevices?: Device[];
  currentMapDeviceIds?: string[];
  isLightMode?: boolean;
  onMinimize?: () => void;
  onAddRack?: (rack: Omit<CustomTopologyRack, 'id' | 'devices' | 'x' | 'y'>) => void;
  onAddTower?: (tower: Omit<CustomTopologyTower, 'id' | 'devices' | 'x' | 'y'>) => void;
}

const PORT_TYPES: NetworkPortType[] = [
  '1GbE RJ45',
  '2.5GbE RJ45',
  '10GbE RJ45',
  '1GbE SFP',
  '10G SFP+',
  '25G SFP28',
  '40G QSFP+',
  '100G QSFP28',
  '8G FC',
  '16G FC',
  '32G FC',
];

interface ColorOption {
  color: string;
  label_en: string;
  label_fa: string;
}

const RACK_SIZES: RackUnitSize[] = [12, 16, 21, 24, 28, 32, 36, 40, 42, 44, 48];
const RACK_DEPTHS: RackDepth[] = [60, 80, 100, 120];
const RACK_COLORS: ColorOption[] = [
  { color: '#0f172a', label_en: 'Slate Black', label_fa: 'مشکی صنعتی' },
  { color: '#1e293b', label_en: 'Dark Gray', label_fa: 'طوسی تیره' },
  { color: '#18181b', label_en: 'Charcoal', label_fa: 'زغالی' },
  { color: '#0369a1', label_en: 'Telecom Blue', label_fa: 'آبی مخابراتی' },
  { color: '#1e1b4b', label_en: 'Deep Indigo', label_fa: 'سرمه‌ای تیره' },
  { color: '#064e3b', label_en: 'Industrial Emerald', label_fa: 'سبز صنعتی' },
];

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
const TOWER_COLORS: ColorOption[] = [
  { color: '#f59e0b', label_en: 'Aviation Orange', label_fa: 'نارنجی هشدار هوانوردی' },
  { color: '#0284c7', label_en: 'Industrial Blue', label_fa: 'آبی صنعتی' },
  { color: '#10b981', label_en: 'Galvanized Green', label_fa: 'سبز گالوانیزه' },
  { color: '#ef4444', label_en: 'Signal Red', label_fa: 'قرمز هشدار دکل' },
  { color: '#8b5cf6', label_en: 'Purple', label_fa: 'بنفش صنعتی' },
  { color: '#64748b', label_en: 'Galvanized Steel Gray', label_fa: 'طوسی گالوانیزه روی' },
];

const RackSvgPreview: React.FC<{
  units: number;
  depth: number;
  color: string;
  isLightMode: boolean;
}> = ({ units, depth, color, isLightMode }) => {
  return (
    <div
      className={`p-4 rounded-2xl border flex flex-col items-center justify-center ${
        isLightMode ? 'bg-slate-100/90 border-slate-300' : 'bg-slate-950 border-slate-800'
      }`}
    >
      <svg width={220} height={300} viewBox="0 0 220 300" className="drop-shadow-lg">
        <defs>
          <linearGradient id="modalRackFrameGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
          <pattern id="modalMeshPattern" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.2" fill="#475569" opacity="0.35" />
          </pattern>
        </defs>

        {/* Outer Cabinet Frame */}
        <rect x="25" y="16" width="170" height="252" rx="8" fill="url(#modalRackFrameGrad)" stroke="#64748b" strokeWidth="1.5" />

        {/* Top Roof Vent / Cable Ingress */}
        <rect x="55" y="20" width="110" height="9" rx="3" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
        <line x1="65" y1="24.5" x2="155" y2="24.5" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* Internal 19" EIA-310 Mounting Chamber */}
        <rect x="42" y="34" width="136" height="220" fill="#020617" stroke="#334155" strokeWidth="1" />
        <rect x="42" y="34" width="136" height="220" fill="url(#modalMeshPattern)" />

        {/* Left and Right 19" Mounting Rails */}
        <rect x="44" y="38" width="12" height="212" rx="1.5" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
        <rect x="164" y="38" width="12" height="212" rx="1.5" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />

        {/* Mounting Rail Holes / Ticks */}
        {Array.from({ length: 13 }).map((_, i) => (
          <g key={i}>
            <circle cx="50" cy={46 + i * 16} r="1.5" fill="#94a3b8" />
            <circle cx="170" cy={46 + i * 16} r="1.5" fill="#94a3b8" />
          </g>
        ))}

        {/* U markings text */}
        <text x="33" y="48" fontSize="7.5" fill="#64748b" textAnchor="middle" fontFamily="monospace">
          {units}U
        </text>
        <text x="33" y="148" fontSize="7.5" fill="#64748b" textAnchor="middle" fontFamily="monospace">
          {Math.round(units / 2)}U
        </text>
        <text x="33" y="248" fontSize="7.5" fill="#64748b" textAnchor="middle" fontFamily="monospace">
          1U
        </text>

        {/* Base / Plinth & Casters */}
        <rect x="35" y="268" width="150" height="9" rx="3" fill="#1e293b" stroke="#334155" />
        <rect x="45" y="277" width="16" height="6" rx="2" fill="#475569" />
        <rect x="159" y="277" width="16" height="6" rx="2" fill="#475569" />

        {/* Depth Badge */}
        <rect x="65" y="232" width="90" height="18" rx="9" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
        <text x="110" y="244" fontSize="9" fontWeight="bold" fill="#38bdf8" textAnchor="middle" fontFamily="sans-serif">
          {units}U • {depth}cm Depth
        </text>
      </svg>
    </div>
  );
};

const TowerSvgPreview: React.FC<{
  type: TowerType;
  heightMeters: number;
  color: string;
  isLightMode: boolean;
}> = ({ type, heightMeters, color, isLightMode }) => {
  const isMonopole = type === 'monopole';
  const isGuyed = type === 'guyed_g35' || type === 'guyed_g45';

  return (
    <div
      className={`p-4 rounded-2xl border flex flex-col items-center justify-center ${
        isLightMode ? 'bg-slate-100/90 border-slate-300' : 'bg-slate-950 border-slate-800'
      }`}
    >
      <svg width={220} height={300} viewBox="0 0 220 300" className="drop-shadow-lg">
        {/* Guy Wires (if guyed) */}
        {isGuyed && (
          <g stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" opacity="0.65">
            <line x1="110" y1="55" x2="25" y2="270" />
            <line x1="110" y1="55" x2="195" y2="270" />
            <line x1="110" y1="130" x2="35" y2="270" />
            <line x1="110" y1="130" x2="185" y2="270" />
            <line x1="110" y1="195" x2="45" y2="270" />
            <line x1="110" y1="195" x2="175" y2="270" />
          </g>
        )}

        {/* Tower Body */}
        {isMonopole ? (
          // Monopole tubular mast
          <g>
            <polygon points="104,28 116,28 120,270 100,270" fill={color} stroke="#0f172a" strokeWidth="1.5" />
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={i} x1="102" y1={46 + i * 28} x2="118" y2={46 + i * 28} stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
            ))}
          </g>
        ) : (
          // Lattice Mast (Guyed or Self-Supporting)
          <g stroke={color} strokeWidth="1.8">
            {type.includes('self') ? (
              // Trapezoidal wide base for self-supporting
              <>
                <line x1="102" y1="32" x2="75" y2="270" strokeWidth="2.5" />
                <line x1="118" y1="32" x2="145" y2="270" strokeWidth="2.5" />
                {Array.from({ length: 8 }).map((_, i) => {
                  const yTop = 32 + i * 29;
                  const yBottom = 32 + (i + 1) * 29;
                  const xLeftTop = 102 - i * 3.3;
                  const xRightTop = 118 + i * 3.3;
                  const xLeftBottom = 102 - (i + 1) * 3.3;
                  const xRightBottom = 118 + (i + 1) * 3.3;
                  return (
                    <g key={i}>
                      <line x1={xLeftTop} y1={yTop} x2={xRightTop} y2={yTop} strokeWidth="1.5" />
                      <line x1={xLeftTop} y1={yTop} x2={xRightBottom} y2={yBottom} strokeWidth="1.2" opacity="0.85" />
                      <line x1={xRightTop} y1={yTop} x2={xLeftBottom} y2={yBottom} strokeWidth="1.2" opacity="0.85" />
                    </g>
                  );
                })}
              </>
            ) : (
              // Triangular parallel lattice for G35 / G45
              <>
                <line x1="100" y1="32" x2="100" y2="270" strokeWidth="2.2" />
                <line x1="120" y1="32" x2="120" y2="270" strokeWidth="2.2" />
                {Array.from({ length: 10 }).map((_, i) => (
                  <g key={i}>
                    <line x1="100" y1={32 + i * 23} x2="120" y2={32 + i * 23} strokeWidth="1.5" />
                    <line x1="100" y1={32 + i * 23} x2="120" y2={32 + (i + 1) * 23} strokeWidth="1.2" opacity="0.8" />
                  </g>
                ))}
              </>
            )}
          </g>
        )}

        {/* Top Mast & Aviation Obstruction Red Beacon */}
        <line x1="110" y1="16" x2="110" y2="32" stroke="#94a3b8" strokeWidth="2" />
        <circle cx="110" cy="14" r="3.5" fill="#ef4444" className="animate-pulse" />

        {/* Microwave Antennas mounted on preview */}
        <ellipse cx="88" cy="62" rx="8" ry="12" fill="#f8fafc" stroke="#475569" strokeWidth="1" />
        <ellipse cx="132" cy="92" rx="7" ry="10" fill="#f8fafc" stroke="#475569" strokeWidth="1" />

        {/* Base Foundation */}
        <rect x="65" y="270" width="90" height="11" rx="3" fill="#334155" stroke="#475569" />

        {/* Height Badge */}
        <rect x="60" y="242" width="100" height="18" rx="9" fill="#0f172a" stroke={color} strokeWidth="1" />
        <text x="110" y="254" fontSize="9" fontWeight="bold" fill={color} textAnchor="middle" fontFamily="sans-serif">
          {heightMeters}m Height
        </text>
      </svg>
    </div>
  );
};

export const AddHardwareModal: React.FC<AddHardwareModalProps> = ({
  isOpen,
  onClose,
  racks,
  defaultRackId,
  defaultTargetU,
  editingDevice,
  onSaveHardware,
  inventoryDevices = [],
  currentMapDeviceIds = [],
  isLightMode: propIsLightMode,
  onMinimize,
  onAddRack,
  onAddTower,
}) => {
  const { t, isEn, isRtl } = useLanguage();

  const isLightMode = propIsLightMode ?? (typeof document !== 'undefined' && (
    document.querySelector('.theme-light') !== null ||
    document.documentElement.classList.contains('light') ||
    document.documentElement.classList.contains('theme-light') ||
    localStorage.getItem('panel_theme') === 'light' ||
    localStorage.getItem('theme_mode') === 'light'
  ));

  // Compute set of devices already mounted across any rack in this map
  const mountedLookup = useMemo(() => {
    const ids = new Set<string>();
    const names = new Set<string>();
    const ips = new Set<string>();
    const rackNameByDev = new Map<string, string>();

    racks.forEach((r) => {
      (r.devices || []).forEach((d) => {
        ids.add(d.id);
        const cleanId = d.id.replace(/^hw-/, '');
        ids.add(cleanId);
        ids.add(`hw-${cleanId}`);
        if (d.name) {
          const lower = d.name.trim().toLowerCase();
          names.add(lower);
          rackNameByDev.set(lower, r.name);
        }
        if (d.ip) {
          const cleanIp = d.ip.trim();
          ips.add(cleanIp);
          rackNameByDev.set(cleanIp, r.name);
        }
        rackNameByDev.set(d.id, r.name);
        rackNameByDev.set(cleanId, r.name);
      });
    });

    return { ids, names, ips, rackNameByDev };
  }, [racks]);

  const mapDeviceSet = useMemo(() => {
    return new Set(currentMapDeviceIds || []);
  }, [currentMapDeviceIds]);

  const checkDeviceIsAlreadyMounted = (dev: Device) => {
    const cleanId = dev.id.replace(/^hw-/, '');
    const isIdMounted =
      mountedLookup.ids.has(dev.id) ||
      mountedLookup.ids.has(cleanId) ||
      mountedLookup.ids.has(`hw-${cleanId}`);
    const isNameMounted = dev.name
      ? mountedLookup.names.has(dev.name.trim().toLowerCase())
      : false;
    const isIpMounted = dev.ip ? mountedLookup.ips.has(dev.ip.trim()) : false;

    const rackName =
      mountedLookup.rackNameByDev.get(dev.id) ||
      mountedLookup.rackNameByDev.get(cleanId) ||
      (dev.name ? mountedLookup.rackNameByDev.get(dev.name.trim().toLowerCase()) : undefined) ||
      (dev.ip ? mountedLookup.rackNameByDev.get(dev.ip.trim()) : undefined);

    const isMounted = isIdMounted || isNameMounted || isIpMounted;
    const isAlreadyAdded = isMounted;

    return {
      isAlreadyAdded,
      isMounted,
      rackName,
    };
  };

  const [sourceMode, setSourceMode] = useState<'inventory' | 'catalog'>(() => {
    return inventoryDevices.length > 0 && !editingDevice && racks.length > 0 ? 'inventory' : 'catalog';
  });
  const [selectedInventoryDeviceId, setSelectedInventoryDeviceId] = useState<string | null>(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');

  const [activeCategory, setActiveCategory] = useState<HardwareCategory>(() => {
    return 'server_rack';
  });
  const [selectedTemplate, setSelectedTemplate] = useState<HardwareCatalogTemplate>(() => {
    const rackTpl = HARDWARE_CATALOG.find((t) => t.category === 'server_rack');
    return rackTpl || HARDWARE_CATALOG[0];
  });
  const [selectedGeneration, setSelectedGeneration] = useState<string>('Standard');
  const [targetRackId, setTargetRackId] = useState<string>(defaultRackId || (racks[0]?.id ?? ''));
  const [targetU, setTargetU] = useState<number>(defaultTargetU || 1);
  const [customName, setCustomName] = useState<string>('');
  const [previewViewMode, setPreviewViewMode] = useState<'front' | 'rear'>('front');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Rack creation state
  const [rackName, setRackName] = useState<string>('');
  const [rackUnits, setRackUnits] = useState<RackUnitSize>(42);
  const [rackDepth, setRackDepth] = useState<RackDepth>(100);
  const [rackColor, setRackColor] = useState<string>('#0f172a');

  // Tower creation state
  const [towerType, setTowerType] = useState<TowerType>('guyed_g35');
  const [towerName, setTowerName] = useState<string>('');
  const [towerHeight, setTowerHeight] = useState<number>(30);
  const [towerColor, setTowerColor] = useState<string>('#f59e0b');

  // Auto-generate Rack name
  useEffect(() => {
    if (isOpen && activeCategory === 'server_rack' && !rackName) {
      const existingNames = new Set(racks.map((r) => r.name.trim().toLowerCase()));
      let num = 1;
      let candidate = isEn ? `Rack-0${num}` : `رک-0${num}`;
      while (existingNames.has(candidate.toLowerCase())) {
        num++;
        const numStr = num < 10 ? `0${num}` : `${num}`;
        candidate = isEn ? `Rack-${numStr}` : `رک-${numStr}`;
      }
      setRackName(candidate);
    }
  }, [isOpen, activeCategory, racks, isEn, rackName]);

  // Auto-generate Tower name
  useEffect(() => {
    if (isOpen && activeCategory === 'telecom_tower' && !towerName) {
      const opt = TOWER_TYPE_OPTIONS.find((t) => t.type === towerType) || TOWER_TYPE_OPTIONS[0];
      setTowerName(isEn ? `${opt.title_en} (${towerHeight}m)` : `${opt.title_fa} (${towerHeight} متر)`);
    }
  }, [isOpen, activeCategory, towerType, towerHeight, isEn, towerName]);

  // Check duplicate rack name
  const isDuplicateRackName = useMemo(() => {
    if (!rackName.trim()) return false;
    return racks.some((r) => r.name.trim().toLowerCase() === rackName.trim().toLowerCase());
  }, [racks, rackName]);

  // Power and PDU state
  const [powerSupplyCount, setPowerSupplyCount] = useState<number>(2);
  const [powerWatts, setPowerWatts] = useState<number>(500);
  const [pduOutletsCount, setPduOutletsCount] = useState<number>(8);
  const [pduOutletType, setPduOutletType] = useState<string>('IEC C13');
  const [pduAmperage, setPduAmperage] = useState<number>(16);

  // Network cards state
  const [networkCards, setNetworkCards] = useState<NetworkCardConfig[]>([]);

  // Selected Rack Info
  const currentRack = useMemo(() => {
    return racks.find((r) => r.id === targetRackId) || racks[0];
  }, [racks, targetRackId]);

  // Helper function: check slot collision in target rack
  const getCollision = (rack: CustomTopologyRack | undefined, uStart: number, heightU: number, excludeDevId?: string) => {
    if (!rack) return null;
    const uEnd = uStart + heightU - 1;
    if (uStart < 1 || uEnd > rack.units) {
      return {
        hasCollision: true,
        outOfBounds: true,
        message: isEn
          ? `Slot U${uStart}-U${uEnd} exceeds rack capacity (${rack.units}U)!`
          : `موقعیت U${uStart} تا U${uEnd} خارج از ظرفیت رک (${rack.units}U) است!`,
      };
    }
    for (const dev of rack.devices) {
      if (excludeDevId && dev.id === excludeDevId) continue;
      const devStart = dev.startU;
      const devEnd = dev.startU + dev.heightU - 1;
      if (Math.max(uStart, devStart) <= Math.min(uEnd, devEnd)) {
        return {
          hasCollision: true,
          outOfBounds: false,
          collidingDevice: dev,
          message: isEn
            ? `Slot U${uStart}-U${uEnd} is occupied by "${dev.name}" (U${devStart}-U${devEnd})!`
            : `فضای انتخابی U${uStart} تا U${uEnd} توسط تجهیز «${dev.name}» (U${devStart} تا U${devEnd}) اشغال شده است!`,
        };
      }
    }
    return null;
  };

  // Helper function: find lowest free contiguous slot of heightU
  const findFirstFreeSlot = (rack: CustomTopologyRack | undefined, heightU: number, excludeDevId?: string): number | null => {
    if (!rack) return null;
    for (let u = 1; u <= rack.units - heightU + 1; u++) {
      const col = getCollision(rack, u, heightU, excludeDevId);
      if (!col) return u;
    }
    return null;
  };

  // Active collision status
  const currentCollision = useMemo(() => {
    return getCollision(currentRack, targetU, selectedTemplate.heightU, editingDevice?.id);
  }, [currentRack, targetU, selectedTemplate.heightU, editingDevice]);

  // Filtered inventory devices
  const filteredInventoryDevices = useMemo(() => {
    const q = inventorySearch.toLowerCase().trim();
    if (!q) return inventoryDevices;
    return inventoryDevices.filter((d) => {
      return (
        d.name.toLowerCase().includes(q) ||
        d.ip.toLowerCase().includes(q) ||
        (d.model && d.model.toLowerCase().includes(q)) ||
        (d.vendor && d.vendor.toLowerCase().includes(q)) ||
        (d.building && d.building.toLowerCase().includes(q)) ||
        (d.type && d.type.toLowerCase().includes(q))
      );
    });
  }, [inventoryDevices, inventorySearch]);

  const selectedInventoryDevice = useMemo(() => {
    if (!selectedInventoryDeviceId) return null;
    return inventoryDevices.find((d) => d.id === selectedInventoryDeviceId) || null;
  }, [inventoryDevices, selectedInventoryDeviceId]);

  // Categories available in hardware catalog (rack tab 1, tower tab 2, then equipment)
  const rackAvailableCategories = useMemo(() => {
    return HARDWARE_CATEGORIES;
  }, []);

  // Filtered hardware catalog templates based on search query or active category
  const filteredCatalogTemplates = useMemo(() => {
    const q = catalogSearch.toLowerCase().trim();
    if (!q) {
      return HARDWARE_CATALOG.filter((t) => t.category === activeCategory);
    }
    return HARDWARE_CATALOG.filter((t) => {
      const modelMatch = (t.model || '').toLowerCase().includes(q);
      const brandMatch = (t.brand || '').toLowerCase().includes(q);
      const descFaMatch = (t.description_fa || '').toLowerCase().includes(q);
      const descEnMatch = (t.description_en || '').toLowerCase().includes(q);
      const catMatch = (t.category || '').toLowerCase().includes(q);
      return modelMatch || brandMatch || descFaMatch || descEnMatch || catMatch;
    });
  }, [catalogSearch, activeCategory]);

  // Select an inventory device and automatically configure its physical profile
  const handleSelectInventoryDevice = (dev: Device) => {
    setSelectedInventoryDeviceId(dev.id);
    const hw = convertNodeToHardwareDevice(dev as unknown as TopologyNode);
    setActiveCategory(hw.category);

    const matchingTemplate: HardwareCatalogTemplate = {
      id: `inv-tpl-${dev.id}`,
      brand: hw.brand,
      model: hw.model,
      category: hw.category,
      heightU: hw.heightU,
      defaultGeneration: 'Standard',
      generations: ['Standard'],
      description_fa: `${dev.name} (${dev.ip}) - تجهیز انبار شبکه`,
      description_en: `${dev.name} (${dev.ip}) - Network Equipment Inventory`,
      defaultPowerWatts: hw.category.includes('server') ? 550 : hw.category.includes('router') ? 120 : 220,
      defaultPowerSupplyCount: hw.category.includes('server') ? 2 : 1,
      defaultNetworkCards: hw.networkCards.map((c) => ({
        name: c.name,
        portCount: c.portCount,
        portType: c.portType,
        slot: c.slot,
      })),
    };

    setSelectedTemplate(matchingTemplate);
    setSelectedGeneration('Standard');
    setCustomName(dev.name);
    setNetworkCards(hw.networkCards);
    setPowerSupplyCount(matchingTemplate.defaultPowerSupplyCount || 1);
    setPowerWatts(matchingTemplate.defaultPowerWatts);

    // If defaultTargetU was passed, strictly preserve it; otherwise pick first free slot
    if (defaultTargetU !== undefined && defaultTargetU !== null && defaultTargetU > 0) {
      setTargetU(defaultTargetU);
    } else {
      const chosenRack = racks.find((r) => r.id === targetRackId) || racks[0];
      const freeSlot = findFirstFreeSlot(chosenRack, hw.heightU);
      if (freeSlot !== null) {
        setTargetU(freeSlot);
      }
    }
  };

  // Initialize form state
  useEffect(() => {
    if (editingDevice) {
      setActiveCategory(editingDevice.category);
      const tpl =
        HARDWARE_CATALOG.find((t) => t.category === editingDevice.category && t.model === editingDevice.model) ||
        HARDWARE_CATALOG[0];
      setSelectedTemplate(tpl);
      setSelectedGeneration(editingDevice.generation || tpl.defaultGeneration || '');
      setCustomName(editingDevice.name);
      setTargetU(editingDevice.startU);
      setNetworkCards(editingDevice.networkCards || []);
      setPowerSupplyCount(editingDevice.powerSupplyCount ?? (tpl.defaultPowerSupplyCount ?? 2));
      setPowerWatts(editingDevice.powerWatts ?? tpl.defaultPowerWatts);
      setPduOutletsCount(editingDevice.pduOutletsCount ?? (tpl.defaultPduOutlets ?? 8));
      setPduOutletType(editingDevice.pduOutletType ?? (tpl.defaultPduOutletType ?? 'IEC C13'));
      setPduAmperage(editingDevice.pduAmperage ?? (tpl.defaultPduAmperage ?? 16));
      if (defaultRackId) setTargetRackId(defaultRackId);
    } else {
      if (defaultRackId) setTargetRackId(defaultRackId);

      // When the user clicked a specific unit on the rack, strictly set targetU to that unit
      if (defaultTargetU !== undefined && defaultTargetU !== null && defaultTargetU > 0) {
        setTargetU(defaultTargetU);
      }

      if (inventoryDevices.length > 0 && !selectedInventoryDeviceId) {
        const firstAvailable =
          inventoryDevices.find((d) => !checkDeviceIsAlreadyMounted(d).isAlreadyAdded) ||
          inventoryDevices[0];
        handleSelectInventoryDevice(firstAvailable);
        if (defaultTargetU !== undefined && defaultTargetU !== null && defaultTargetU > 0) {
          setTargetU(defaultTargetU);
        }
      } else {
        const tpl = HARDWARE_CATALOG.find((t) => t.category === activeCategory) || HARDWARE_CATALOG[0];
        setSelectedTemplate(tpl);
        setSelectedGeneration(tpl.defaultGeneration || tpl.generations?.[0] || '');
        setCustomName(`${tpl.brand} ${tpl.model}`);
        setPowerWatts(tpl.defaultPowerWatts);
        setPowerSupplyCount(tpl.defaultPowerSupplyCount ?? (tpl.category.includes('server') || tpl.category.includes('storage') ? 2 : tpl.category.includes('panel') || tpl.category.includes('cable') || tpl.category === 'blank_panel' ? 0 : 1));
        setPduOutletsCount(tpl.defaultPduOutlets ?? 8);
        setPduOutletType(tpl.defaultPduOutletType ?? 'IEC C13');
        setPduAmperage(tpl.defaultPduAmperage ?? 16);

        const chosenRack = racks.find((r) => r.id === (defaultRackId || racks[0]?.id)) || racks[0];

        let initialU = defaultTargetU || 1;
        if (!defaultTargetU) {
          const collisionCheck = getCollision(chosenRack, initialU, tpl.heightU);
          if (collisionCheck) {
            const freeSlot = findFirstFreeSlot(chosenRack, tpl.heightU);
            if (freeSlot !== null) initialU = freeSlot;
          }
        }
        setTargetU(initialU);

        setNetworkCards(
          tpl.defaultNetworkCards.map((c, i) => ({
            id: `nic-${Date.now()}-${i}`,
            name: c.name,
            portCount: c.portCount,
            portType: c.portType,
            slot: c.slot,
          }))
        );
      }
    }
  }, [editingDevice, defaultRackId, defaultTargetU, isOpen]);

  // When changing category in add mode
  const handleCategoryChange = (cat: HardwareCategory) => {
    setActiveCategory(cat);
    const tpls = HARDWARE_CATALOG.filter((t) => t.category === cat);
    if (tpls.length > 0) {
      const tpl = tpls[0];
      handleTemplateChange(tpl);
    }
  };

  // When changing template
  const handleTemplateChange = (tpl: HardwareCatalogTemplate) => {
    setSelectedTemplate(tpl);
    if (tpl.category === 'server_rack') {
      if (RACK_SIZES.includes(tpl.heightU as RackUnitSize)) {
        setRackUnits(tpl.heightU as RackUnitSize);
      }
      if (tpl.generations && tpl.generations[0]) {
        const dMatch = tpl.generations[0].match(/(\d+)/);
        if (dMatch) {
          const d = parseInt(dMatch[1], 10) as RackDepth;
          if (RACK_DEPTHS.includes(d)) setRackDepth(d);
        }
      }
      return;
    }
    if (tpl.category === 'telecom_tower') {
      let matchedType: TowerType = 'guyed_g35';
      if (tpl.id.includes('g45')) matchedType = 'guyed_g45';
      else if (tpl.id.includes('3leg')) matchedType = 'self_supporting_3leg';
      else if (tpl.id.includes('4leg')) matchedType = 'self_supporting_4leg';
      else if (tpl.id.includes('monopole')) matchedType = 'monopole';
      else if (tpl.id.includes('g35')) matchedType = 'guyed_g35';
      setTowerType(matchedType);
      setTowerHeight(tpl.heightU || 30);
      return;
    }

    setSelectedGeneration(tpl.defaultGeneration || tpl.generations?.[0] || '');
    setCustomName(`${tpl.brand} ${tpl.model}`);
    setPowerWatts(tpl.defaultPowerWatts);
    setPowerSupplyCount(tpl.defaultPowerSupplyCount ?? (tpl.category.includes('server') || tpl.category.includes('storage') ? 2 : tpl.category.includes('panel') || tpl.category.includes('cable') || tpl.category === 'blank_panel' ? 0 : 1));
    setPduOutletsCount(tpl.defaultPduOutlets ?? 8);
    setPduOutletType(tpl.defaultPduOutletType ?? 'IEC C13');
    setPduAmperage(tpl.defaultPduAmperage ?? 16);
    setNetworkCards(
      tpl.defaultNetworkCards.map((c, i) => ({
        id: `nic-${Date.now()}-${i}`,
        name: c.name,
        portCount: c.portCount,
        portType: c.portType,
        slot: c.slot,
      }))
    );

    // Only auto-relocate if defaultTargetU was not explicitly provided by user
    if (!defaultTargetU) {
      const col = getCollision(currentRack, targetU, tpl.heightU, editingDevice?.id);
      if (col) {
        const freeU = findFirstFreeSlot(currentRack, tpl.heightU, editingDevice?.id);
        if (freeU !== null) setTargetU(freeU);
      }
    }
  };

  // Add a new network card
  const handleAddNic = () => {
    const newIdx = networkCards.length + 1;
    const newCard: NetworkCardConfig = {
      id: `nic-${Date.now()}-${Math.random()}`,
      name: `PCIe NIC ${newIdx}`,
      portCount: 2,
      portType: '10G SFP+',
      slot: `Slot ${newIdx}`,
    };
    setNetworkCards([...networkCards, newCard]);
  };

  // Remove a network card
  const handleRemoveNic = (nicId: string) => {
    setNetworkCards(networkCards.filter((c) => c.id !== nicId));
  };

  // Update a network card field
  const handleUpdateNic = (nicId: string, field: keyof NetworkCardConfig, value: any) => {
    setNetworkCards(
      networkCards.map((c) => (c.id === nicId ? { ...c, [field]: value } : c))
    );
  };

  if (!isOpen) return null;

  // Auto-find slot action
  const handleAutoFindSlot = () => {
    const freeU = findFirstFreeSlot(currentRack, selectedTemplate.heightU, editingDevice?.id);
    if (freeU !== null) {
      setTargetU(freeU);
    }
  };

  // Temporary device object for live preview
  const previewDevice: MountedHardwareDevice = {
    id: editingDevice ? editingDevice.id : 'preview-dev',
    name: customName || selectedTemplate.model,
    category: selectedTemplate.category,
    brand: selectedTemplate.brand,
    model: selectedTemplate.model,
    generation: selectedGeneration,
    heightU: selectedTemplate.heightU,
    startU: targetU,
    networkCards,
    powerWatts,
    powerSupplyCount,
    pduOutletsCount: selectedTemplate.category === 'pdu' ? pduOutletsCount : undefined,
    pduOutletType: selectedTemplate.category === 'pdu' ? pduOutletType : undefined,
    pduAmperage: selectedTemplate.category === 'pdu' ? pduAmperage : undefined,
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRackId || currentCollision) return;

    let chosenDevId: string;
    if (editingDevice) {
      chosenDevId = editingDevice.id;
    } else if (sourceMode === 'inventory' && selectedInventoryDevice) {
      const baseId = selectedInventoryDevice.id.startsWith('hw-')
        ? selectedInventoryDevice.id
        : `hw-${selectedInventoryDevice.id}`;
      const targetRack = racks.find((r) => r.id === targetRackId);
      const alreadyHas = (targetRack?.devices || []).some((d) => d.id === baseId);
      chosenDevId = alreadyHas ? `${baseId}-${Date.now()}` : baseId;
    } else {
      // Catalog device: ALWAYS unique ID!
      chosenDevId = `hw-cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    const deviceToSave: MountedHardwareDevice = {
      id: chosenDevId,
      name: customName.trim() || `${selectedTemplate.brand} ${selectedTemplate.model}`,
      category: selectedTemplate.category,
      brand: selectedTemplate.brand,
      model: selectedTemplate.model,
      generation: selectedGeneration,
      heightU: selectedTemplate.heightU,
      startU: Math.max(1, Math.min(targetU, (currentRack?.units || 44) - selectedTemplate.heightU + 1)),
      networkCards,
      powerWatts,
      powerSupplyCount,
      ip: sourceMode === 'inventory' ? selectedInventoryDevice?.ip : editingDevice?.ip,
      pduOutletsCount: selectedTemplate.category === 'pdu' ? pduOutletsCount : undefined,
      pduOutletType: selectedTemplate.category === 'pdu' ? pduOutletType : undefined,
      pduAmperage: selectedTemplate.category === 'pdu' ? pduAmperage : undefined,
    };

    onSaveHardware(targetRackId, deviceToSave);
    onClose();
  };

  const handleSaveRack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rackName.trim() || isDuplicateRackName) return;
    if (onAddRack) {
      onAddRack({
        name: rackName.trim(),
        units: rackUnits,
        depth: rackDepth,
        viewMode: 'front',
        color: rackColor,
      });
    }
    onClose();
  };

  const handleSaveTower = (e: React.FormEvent) => {
    e.preventDefault();
    if (!towerName.trim()) return;
    if (onAddTower) {
      onAddTower({
        name: towerName.trim(),
        type: towerType,
        heightMeters: Number(towerHeight),
        color: towerColor,
      });
    }
    onClose();
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    if (activeCategory === 'server_rack') {
      handleSaveRack(e);
    } else if (activeCategory === 'telecom_tower') {
      handleSaveTower(e);
    } else {
      handleSave(e);
    }
  };

  return createPortal(
    <div
      className={`fixed top-0 left-0 right-0 bottom-8 z-[1100] flex items-center justify-center backdrop-blur-md animate-fade-in ${
        isFullscreen ? 'p-0' : 'p-3 sm:p-5 md:py-8'
      } ${
        isLightMode ? 'bg-slate-900/40 theme-light' : 'bg-black/85'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`border shadow-2xl overflow-hidden flex flex-col my-auto transition-all ${
          isFullscreen
            ? 'w-full h-full max-h-full rounded-none border-none'
            : 'w-full max-w-4xl max-h-[85vh] rounded-3xl'
        } ${
          isLightMode
            ? 'bg-white border-slate-200 text-slate-800 shadow-slate-300/60'
            : 'bg-slate-900 border-slate-700/80 text-slate-100 shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-6 py-3.5 border-b flex items-center justify-between shrink-0 ${
            isLightMode
              ? 'bg-slate-50/90 border-slate-200'
              : 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                activeCategory === 'server_rack'
                  ? isLightMode
                    ? 'bg-blue-50 border border-blue-200 text-blue-700'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : activeCategory === 'telecom_tower'
                  ? isLightMode
                    ? 'bg-amber-50 border border-amber-200 text-amber-700'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : isLightMode
                  ? 'bg-cyan-50 border border-cyan-200 text-cyan-700'
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              }`}
            >
              {activeCategory === 'server_rack' ? (
                <Box className="w-5 h-5" />
              ) : activeCategory === 'telecom_tower' ? (
                <Radio className="w-5 h-5" />
              ) : (
                <Server className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className={`text-base font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                {editingDevice
                  ? isEn
                    ? 'Edit Hardware Specifications & Network Cards'
                    : 'ویرایش و تنظیم کارت‌های شبکه تجهیز'
                  : activeCategory === 'server_rack'
                  ? isEn
                    ? 'Add Server Rack Cabinet'
                    : 'افزودن رک سرور استاندارد'
                  : activeCategory === 'telecom_tower'
                  ? isEn
                    ? 'Add Telecom Tower / Mast'
                    : 'افزودن دکل مخابراتی'
                  : isEn
                  ? 'Add Hardware Device to Rack'
                  : 'افزودن تجهیز سخت‌افزاری به رک'}
              </h3>
              <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {activeCategory === 'server_rack'
                  ? isEn
                    ? 'Configure 19" EIA-310 standard rack dimensions, depth, and placement'
                    : 'پیکربندی ابعاد، عمق و ظرفیت یونیت‌های رک استاندارد ۱۹ اینچ'
                  : activeCategory === 'telecom_tower'
                  ? isEn
                    ? 'Configure telecommunications tower structure, height, and site placement'
                    : 'پیکربندی سازه، ارتفاع و مشخصات دکل مخابراتی'
                  : isEn
                  ? 'Select from inventory equipment or catalog templates to mount into rack'
                  : 'انتخاب از تجهیزات انبار شبکه یا کاتالوگ استاندارد جهت جانمایی و نصب در رک'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-1.5 rounded transition cursor-pointer ${
                isLightMode
                  ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isFullscreen ? (isEn ? 'Exit Fullscreen' : 'حالت پنجره') : (isEn ? 'Fullscreen' : 'تمام صفحه')}
              aria-label={isFullscreen ? (isEn ? 'Exit Fullscreen' : 'حالت پنجره') : (isEn ? 'Fullscreen' : 'تمام صفحه')}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {onMinimize && (
              <button
                type="button"
                onClick={onMinimize}
                className={`p-1.5 rounded transition cursor-pointer ${
                  isLightMode
                    ? 'text-slate-500 hover:text-cyan-700 hover:bg-slate-200'
                    : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800'
                }`}
                title={isEn ? 'Minimize to bottom dock' : 'مینیمایز به نوار پایین'}
                aria-label={isEn ? 'Minimize' : 'مینیمایز'}
              >
                <Minus className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded transition cursor-pointer ${
                isLightMode
                  ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                  : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
              }`}
              title={isEn ? 'Close' : 'بستن'}
              aria-label={isEn ? 'Close' : 'بستن'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Hardware Source Toggle (Inventory vs Catalog) */}
          {!editingDevice && (
            <div
              className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Boxes className={`w-4 h-4 ${isLightMode ? 'text-cyan-700' : 'text-cyan-400'}`} />
                <span className={`text-xs font-bold ${isLightMode ? 'text-slate-700' : 'text-slate-200'}`}>
                  {isEn ? 'Hardware Source Selection:' : 'منبع انتخاب تجهیز سخت‌افزاری:'}
                </span>
              </div>

              <div
                className={`flex items-center gap-1.5 p-1 rounded-xl border ${
                  isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSourceMode('inventory');
                    if (!selectedInventoryDeviceId && inventoryDevices.length > 0) {
                      const firstAvail =
                        inventoryDevices.find((d) => !checkDeviceIsAlreadyMounted(d).isAlreadyAdded) ||
                        inventoryDevices[0];
                      handleSelectInventoryDevice(firstAvail);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    sourceMode === 'inventory'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs'
                      : isLightMode
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>
                    {isEn
                      ? `Inventory Equipment (${inventoryDevices.length})`
                      : `تجهیزات انبار شبکه (${inventoryDevices.length})`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSourceMode('catalog');
                    setSelectedInventoryDeviceId(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    sourceMode === 'catalog'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
                      : isLightMode
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Hardware Catalog' : 'کاتالوگ مدل‌های استاندارد'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Source Mode 1: Network Equipment Inventory Selection */}
          {!editingDevice && sourceMode === 'inventory' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className={`text-xs font-bold flex items-center gap-1.5 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                  <Boxes className={`w-3.5 h-3.5 ${isLightMode ? 'text-cyan-700' : 'text-cyan-400'}`} />
                  <span>
                    {isEn
                      ? 'Select Equipment from Inventory to Mount in Rack:'
                      : 'انتخاب تجهیز از انبار جهت جانمایی و نصب در رک:'}
                  </span>
                </label>
                <div className="relative min-w-[200px]">
                  <input
                    type="text"
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    placeholder={isEn ? 'Filter by name, IP, model...' : 'فیلتر نام، آی‌پی، مدل...'}
                    className={`w-full px-3 py-1.5 pl-8 text-xs rounded-xl border focus:outline-none ${
                      isLightMode
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-600'
                        : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-500'
                    }`}
                  />
                  <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${isLightMode ? 'text-slate-400' : 'text-slate-400'}`} />
                </div>
              </div>

              {filteredInventoryDevices.length === 0 ? (
                <div className={`p-8 text-center text-xs rounded-2xl border ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-950/40 border-slate-800 text-slate-400'}`}>
                  {isEn
                    ? 'No inventory equipment found matching filter.'
                    : 'هیچ تجهیزی مطابق با جستجو در انبار یافت نشد.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1 scrollbar-thin">
                  {filteredInventoryDevices.map((dev) => {
                    const isSelected = selectedInventoryDeviceId === dev.id;
                    const hw = convertNodeToHardwareDevice(dev as unknown as TopologyNode);
                    const devStatus = checkDeviceIsAlreadyMounted(dev);
                    const isAlreadyAdded = devStatus.isAlreadyAdded;

                    return (
                      <div
                        key={dev.id}
                        onClick={() => {
                          if (!isAlreadyAdded) {
                            handleSelectInventoryDevice(dev);
                          }
                        }}
                        className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                          isAlreadyAdded
                            ? `opacity-40 cursor-not-allowed select-none ${isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/40 border-slate-800/80'}`
                            : isSelected
                            ? isLightMode
                              ? 'bg-cyan-50 border-cyan-500 ring-2 ring-cyan-500/30 shadow-md cursor-pointer'
                              : 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-950/50 cursor-pointer'
                            : isLightMode
                            ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer shadow-xs'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900 cursor-pointer'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`font-mono font-bold text-xs truncate max-w-[130px] ${isLightMode ? 'text-slate-900' : 'text-white'}`} title={dev.name}>
                              {dev.name}
                            </span>
                            <div className="flex items-center gap-1">
                              {isAlreadyAdded && (
                                <span
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1"
                                  title={
                                    devStatus.isMounted
                                      ? isEn
                                        ? `Device is already installed in rack: ${devStatus.rackName}`
                                        : `این تجهیز قبلاً در رک «${devStatus.rackName}» نصب شده است`
                                      : isEn
                                      ? 'Device is already deployed'
                                      : 'این تجهیز قبلاً مستقر شده است'
                                  }
                                >
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                  <span className="truncate max-w-[75px]">
                                    {devStatus.isMounted
                                      ? devStatus.rackName || (isEn ? 'Mounted' : 'نصب شده')
                                      : (isEn ? 'Mounted' : 'نصب شده')}
                                  </span>
                                </span>
                              )}
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${isLightMode ? 'bg-cyan-50 text-cyan-800 border-cyan-200 font-semibold' : 'bg-cyan-950 text-cyan-300 border-cyan-700/50'}`}>
                                {hw.heightU}U
                              </span>
                            </div>
                          </div>

                          <div className={`text-[11px] font-mono font-semibold ${isLightMode ? 'text-indigo-600' : 'text-indigo-300'}`}>
                            {dev.ip}
                          </div>

                          <div className={`text-[10px] font-mono mt-0.5 truncate ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {hw.brand} • {hw.model}
                          </div>

                          {dev.building && (
                            <div className={`flex items-center gap-1 text-[9px] mt-1 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              <Building2 className="w-2.5 h-2.5 text-slate-400" />
                              <span>{dev.building} {dev.floor ? `(${dev.floor})` : ''}</span>
                            </div>
                          )}
                        </div>

                        {/* Mini preview */}
                        <div className={`p-1 rounded-lg border overflow-hidden ${isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                          <HardwareSvgRenderer
                            device={hw}
                            viewMode="front"
                            width={220}
                            height={hw.heightU * 18}
                          />
                        </div>

                        {isSelected && !isAlreadyAdded && (
                          <div className={`flex items-center gap-1 text-[10px] font-bold justify-end ${isLightMode ? 'text-cyan-700' : 'text-cyan-300'}`}>
                            <Check className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Selected for Rack' : 'انتخاب شده جهت نصب'}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Source Mode 2: Catalog Categories & Templates */}
          {!editingDevice && sourceMode === 'catalog' && (
            <>
              {/* Hardware Catalog Search Box & Category Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <label className={`text-xs font-bold flex items-center gap-1.5 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                    <Layers className={`w-3.5 h-3.5 ${isLightMode ? 'text-cyan-700' : 'text-cyan-400'}`} />
                    <span>{isEn ? 'Hardware Catalog Selection:' : 'انتخاب از کاتالوگ سخت‌افزاری:'}</span>
                  </label>

                  {/* Search Box */}
                  <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder={
                        isEn
                          ? 'Search model, brand (e.g. Patch Panel, FortiGate, DL380, Cisco)...'
                          : 'جستجو در کاتالوگ (پچ پنل، فورتی‌گیت، سیسکو، سرور HP)...'
                      }
                      className={`w-full px-3 py-1.5 pl-8 pr-8 text-xs rounded-xl border focus:outline-none ${
                        isLightMode
                          ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-600'
                          : 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-500'
                      }`}
                    />
                    <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${isLightMode ? 'text-slate-400' : 'text-slate-400'}`} />
                    {catalogSearch && (
                      <button
                        type="button"
                        onClick={() => setCatalogSearch('')}
                        className={`absolute right-2.5 top-2 p-0.5 rounded cursor-pointer ${isLightMode ? 'text-slate-400 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category Selector Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                  {catalogSearch && (
                    <button
                      type="button"
                      onClick={() => setCatalogSearch('')}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 border cursor-pointer ${
                        isLightMode
                          ? 'bg-cyan-50 border-cyan-300 text-cyan-800 hover:bg-cyan-100'
                          : 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/60'
                      }`}
                    >
                      <X className="w-3 h-3" />
                      <span>{isEn ? 'Clear Search' : 'پاک کردن فیلتر'}</span>
                    </button>
                  )}
                  {rackAvailableCategories.map((cat) => {
                    const isSelected = !catalogSearch && activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCatalogSearch('');
                          handleCategoryChange(cat.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 border cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-md shadow-cyan-600/20'
                            : isLightMode
                            ? 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <span>{isEn ? cat.label_en : cat.label_fa}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Model & Generation Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-bold block ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                    {catalogSearch
                      ? isEn
                        ? `Search Results (${filteredCatalogTemplates.length} models found):`
                        : `نتایج جستجو (${filteredCatalogTemplates.length} مدل پیدا شد):`
                      : isEn
                      ? 'Select Hardware Model:'
                      : 'انتخاب مدل تجهیز:'}
                  </label>
                  {filteredCatalogTemplates.length === 0 && (
                    <span className="text-xs text-amber-500 font-medium">
                      {isEn ? 'No models match your search.' : 'موردی با این مشخصات یافت نشد.'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1 scrollbar-thin">
                  {filteredCatalogTemplates.map((tpl) => {
                    const isSelected = selectedTemplate.id === tpl.id;
                    const catInfo = HARDWARE_CATEGORIES.find((c) => c.id === tpl.category);
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          setActiveCategory(tpl.category);
                          handleTemplateChange(tpl);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? isLightMode
                              ? 'bg-cyan-50/90 border-cyan-500 ring-1 ring-cyan-500/40 shadow-sm'
                              : 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-500/40 shadow-md'
                            : isLightMode
                            ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-bold text-xs truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`} title={tpl.model}>{tpl.model}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 border ${isLightMode ? 'bg-slate-100 text-cyan-800 border-slate-200 font-semibold' : 'bg-slate-800 text-cyan-400 border-transparent'}`}>
                            {tpl.heightU}U
                          </span>
                        </div>
                        {catalogSearch && catInfo && (
                          <div className={`text-[9.5px] font-medium mt-0.5 truncate ${isLightMode ? 'text-cyan-700' : 'text-cyan-400/80'}`}>
                            {isEn ? catInfo.label_en : catInfo.label_fa}
                          </div>
                        )}
                        <p className={`text-[10.5px] mt-1 line-clamp-2 leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {isEn ? tpl.description_en : tpl.description_fa}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* CATEGORY 1: SERVER RACK CABINET CONFIGURATION & PREVIEW */}
          {!editingDevice && activeCategory === 'server_rack' && (
            <div className="space-y-6">
              <div className={`p-4 rounded-2xl border space-y-4 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'}`}>
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-bold flex items-center gap-2 ${isLightMode ? 'text-blue-800' : 'text-blue-400'}`}>
                    <Box className="w-4 h-4" />
                    <span>{isEn ? 'Server Rack Specifications & Dimensions' : 'مشخصات فیزیکی و ابعاد رک سرور'}</span>
                  </h4>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                    isLightMode ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-950 text-blue-300 border-blue-800'
                  }`}>
                    {rackUnits}U • {rackDepth} cm
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Rack Name */}
                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold block ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {isEn ? 'Rack Cabinet Name / ID:' : 'نام / شناسه رک:'}
                    </label>
                    <input
                      type="text"
                      value={rackName}
                      onChange={(e) => setRackName(e.target.value)}
                      placeholder={isEn ? 'e.g. Rack-01 (Datacenter A)' : 'مثال: رک-01 (اتاق سرور اصلی)'}
                      className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none ${
                        isDuplicateRackName
                          ? isLightMode
                            ? 'border-rose-500 bg-rose-50 text-rose-800'
                            : 'border-rose-500 bg-rose-950/50 text-rose-300'
                          : isLightMode
                          ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600'
                          : 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                      }`}
                      required
                    />
                    {isDuplicateRackName && (
                      <p className="text-[11px] text-rose-500 font-medium">
                        {isEn ? 'A rack with this name already exists!' : 'رکی با این نام از قبل در نقشه وجود دارد!'}
                      </p>
                    )}
                  </div>

                  {/* Rack Units (U) */}
                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold block ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {isEn ? 'Rack Unit Capacity (U):' : 'ظرفیت یونیت رک (U):'}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {RACK_SIZES.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setRackUnits(sz)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition border cursor-pointer ${
                            rackUnits === sz
                              ? isLightMode
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-blue-600 text-white border-blue-500 shadow-xs'
                              : isLightMode
                              ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          {sz}U
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rack Depth */}
                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold block ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {isEn ? 'Rack Depth:' : 'عمق رک:'}
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {RACK_DEPTHS.map((dp) => (
                        <button
                          key={dp}
                          type="button"
                          onClick={() => setRackDepth(dp)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-mono font-bold transition border text-center cursor-pointer ${
                            rackDepth === dp
                              ? isLightMode
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-blue-600 text-white border-blue-500 shadow-xs'
                              : isLightMode
                              ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          {dp}cm
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rack Frame Color */}
                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold block ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {isEn ? 'Chassis & Frame Color:' : 'رنگ بدنه و شاسی رک:'}
                    </label>
                    <div className="flex items-center gap-2">
                      {RACK_COLORS.map((col) => (
                        <button
                          key={col.color}
                          type="button"
                          onClick={() => setRackColor(col.color)}
                          className={`w-7 h-7 rounded-xl border-2 transition transform active:scale-95 flex items-center justify-center cursor-pointer ${
                            rackColor === col.color
                              ? 'border-cyan-400 scale-110 shadow-md'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: col.color }}
                          title={isEn ? col.label_en : col.label_fa}
                        >
                          {rackColor === col.color && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Photorealistic Vector SVG Rack Preview */}
              <div className={`p-4 rounded-2xl border space-y-2 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/90 border-slate-800'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                    {isEn ? 'Live 19" Server Rack Cabinet Vector Preview:' : 'پیش‌نمایش زنده وکتور رک سرور ۱۹ اینچ استاندارد:'}
                  </span>
                  <span className={`text-[11px] font-mono ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    19" EIA-310-E Standard
                  </span>
                </div>
                <div className={`p-4 rounded-xl flex items-center justify-center overflow-x-auto border ${
                  isLightMode ? 'bg-slate-100 border-slate-300 shadow-inner' : 'bg-slate-950 border-slate-800/80'
                }`}>
                  <RackSvgPreview units={rackUnits} depth={rackDepth} color={rackColor} isLightMode={!!isLightMode} />
                </div>
              </div>
            </div>
          )}

          {/* CATEGORY 2: TELECOM TOWER CONFIGURATION & PREVIEW */}
          {!editingDevice && activeCategory === 'telecom_tower' && (
            <div className="space-y-6">
              <div className={`p-4 rounded-2xl border space-y-4 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'}`}>
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-bold flex items-center gap-2 ${isLightMode ? 'text-amber-800' : 'text-amber-400'}`}>
                    <Radio className="w-4 h-4" />
                    <span>{isEn ? 'Telecommunications Tower Specifications' : 'مشخصات فنی و سازه دکل مخابراتی'}</span>
                  </h4>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                    isLightMode ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}>
                    {towerHeight}m • {TOWER_TYPE_OPTIONS.find((t) => t.type === towerType)?.[isEn ? 'title_en' : 'title_fa']}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tower Name */}
                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold block ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {isEn ? 'Tower Name / Site Label:' : 'نام دکل / برچسب سایت:'}
                    </label>
                    <input
                      type="text"
                      value={towerName}
                      onChange={(e) => setTowerName(e.target.value)}
                      placeholder={isEn ? 'e.g. Site Central Guyed Mast' : 'مثال: دکل مهاری سایت مرکزی'}
                      className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none ${
                        isLightMode
                          ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-600'
                          : 'bg-slate-900 border-slate-700 text-white focus:border-amber-500'
                      }`}
                      required
                    />
                  </div>

                  {/* Tower Height */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-bold block ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                        {isEn ? 'Structure Height (Meters):' : 'ارتفاع سازه (متر):'}
                      </label>
                      <span className={`font-mono text-xs font-bold ${isLightMode ? 'text-amber-800' : 'text-amber-400'}`}>
                        {towerHeight} {isEn ? 'meters' : 'متر'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={6}
                        max={120}
                        step={3}
                        value={towerHeight}
                        onChange={(e) => setTowerHeight(parseInt(e.target.value, 10))}
                        className="flex-1 accent-amber-500"
                      />
                      <input
                        type="number"
                        min={6}
                        max={120}
                        value={towerHeight}
                        onChange={(e) => setTowerHeight(Math.max(6, Math.min(120, parseInt(e.target.value, 10) || 6)))}
                        className={`w-16 px-2 py-1.5 rounded-lg border text-xs font-mono text-center focus:outline-none ${
                          isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Tower Type Selector */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className={`text-xs font-bold block ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {isEn ? 'Structural Mast Type:' : 'نوع سازه و استراکچر دکل:'}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {TOWER_TYPE_OPTIONS.map((opt) => (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => {
                            setTowerType(opt.type);
                            setTowerHeight(opt.defaultHeight);
                            setTowerName(isEn ? `${opt.title_en} (${opt.defaultHeight}m)` : `${opt.title_fa} (${opt.defaultHeight} متر)`);
                          }}
                          className={`p-2.5 rounded-xl border text-start transition cursor-pointer ${
                            towerType === opt.type
                              ? isLightMode
                                ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500'
                                : 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500'
                              : isLightMode
                              ? 'bg-white border-slate-200 hover:bg-slate-100'
                              : 'bg-slate-900 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          <div className={`text-xs font-bold ${towerType === opt.type ? 'text-amber-500' : isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>
                            {isEn ? opt.title_en : opt.title_fa}
                          </div>
                          <div className={`text-[10px] mt-1 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {isEn ? opt.desc_en : opt.desc_fa}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tower Color Selection */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className={`text-xs font-bold block ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {isEn ? 'Warning Coating & Galvanized Color:' : 'رنگ‌آمیزی هشدار / گالوانیزه دکل:'}
                    </label>
                    <div className="flex items-center gap-2">
                      {TOWER_COLORS.map((col) => (
                        <button
                          key={col.color}
                          type="button"
                          onClick={() => setTowerColor(col.color)}
                          className={`w-7 h-7 rounded-xl border-2 transition transform active:scale-95 flex items-center justify-center cursor-pointer ${
                            towerColor === col.color
                              ? 'border-amber-400 scale-110 shadow-md'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: col.color }}
                          title={isEn ? col.label_en : col.label_fa}
                        >
                          {towerColor === col.color && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Photorealistic Vector SVG Tower Preview */}
              <div className={`p-4 rounded-2xl border space-y-2 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/90 border-slate-800'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                    {isEn ? 'Live Structural Tower Vector Preview:' : 'پیش‌نمایش زنده استراکچر وکتور دکل مخابراتی:'}
                  </span>
                  <span className={`text-[11px] font-mono ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {towerHeight}m ICAO Standard
                  </span>
                </div>
                <div className={`p-4 rounded-xl flex items-center justify-center overflow-x-auto border ${
                  isLightMode ? 'bg-slate-100 border-slate-300 shadow-inner' : 'bg-slate-950 border-slate-800/80'
                }`}>
                  <TowerSvgPreview type={towerType} heightMeters={towerHeight} color={towerColor} isLightMode={!!isLightMode} />
                </div>
              </div>
            </div>
          )}

          {/* STANDARD HARDWARE DEVICE MOUNTING (when not adding a rack or tower) */}
          {(editingDevice || (activeCategory !== 'server_rack' && activeCategory !== 'telecom_tower')) && (
            <>
              {/* Model Generations Dropdown (if available) & Custom Device Label */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold block ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                    {isEn ? 'Device Name / Custom Label:' : 'برچسب / نام دلخواه تجهیز:'}
                  </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={isEn ? 'e.g. HPE DL380 Core Virtualization Node' : 'مثال: HPE DL380 Core Virtualization Node'}
                className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none ${
                  isLightMode
                    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-600'
                    : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-500'
                }`}
              />
            </div>

            {selectedTemplate.generations && selectedTemplate.generations.length > 0 && (
              <div className="space-y-1.5">
                <label className={`text-xs font-bold block ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                  {isEn ? 'Hardware Generation:' : 'نسل سخت‌افزار (Generation):'}
                </label>
                <select
                  value={selectedGeneration}
                  onChange={(e) => setSelectedGeneration(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none ${
                    isLightMode
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-600'
                      : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-500'
                  }`}
                >
                  {selectedTemplate.generations.map((gen) => (
                    <option key={gen} value={gen}>
                      {gen}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Step 3: Rack Placement & Unit Selection with COLLISION DETECTION */}
          <div className={`p-4 rounded-2xl border space-y-3 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'}`}>
            <div className="flex items-center justify-between">
              <h4 className={`text-xs font-bold flex items-center gap-2 ${isLightMode ? 'text-cyan-800' : 'text-cyan-400'}`}>
                <Layers className="w-4 h-4" />
                <span>{isEn ? 'Rack Slot Placement & Position' : 'موقعیت و جاگذاری در رک سرور'}</span>
              </h4>
              <span className={`text-xs font-mono ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn ? `Height: ${selectedTemplate.heightU}U` : `ارتفاع: ${selectedTemplate.heightU}U`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={`text-[11px] block ${isLightMode ? 'text-slate-600 font-semibold' : 'text-slate-300'}`}>
                  {isEn ? 'Target Rack Cabinet:' : 'انتخاب رک مقصد:'}
                </label>
                <select
                  value={targetRackId}
                  onChange={(e) => setTargetRackId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                    isLightMode
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-600'
                      : 'bg-slate-900 border-slate-700 text-white focus:border-cyan-500'
                  }`}
                >
                  {racks.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.units}U • {isEn ? `depth ${r.depth}cm` : `عمق ${r.depth}cm`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={`text-[11px] block ${isLightMode ? 'text-slate-600 font-semibold' : 'text-slate-300'}`}>
                    {isEn ? 'Starting Unit (Start U):' : 'یونیت شروع در رک (Starting Unit):'}
                  </label>
                  {currentCollision && (
                    <button
                      type="button"
                      onClick={handleAutoFindSlot}
                      className={`text-[11px] flex items-center gap-1 font-bold underline cursor-pointer ${
                        isLightMode ? 'text-cyan-700 hover:text-cyan-800' : 'text-cyan-400 hover:text-cyan-300'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isEn ? 'Find Free Slot' : 'یافتن یونیت آزاد'}</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={(currentRack?.units || 44) - selectedTemplate.heightU + 1}
                    value={targetU}
                    onChange={(e) => setTargetU(parseInt(e.target.value) || 1)}
                    className={`w-24 px-3 py-2 rounded-xl border font-mono text-xs text-center focus:outline-none ${
                      currentCollision
                        ? isLightMode
                          ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50 text-rose-800'
                          : 'border-rose-500 ring-1 ring-rose-500 bg-slate-900 text-rose-300'
                        : isLightMode
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-600'
                        : 'bg-slate-900 border-slate-700 text-white focus:border-cyan-500'
                    }`}
                  />
                  <span className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {isEn
                      ? `Occupies U${targetU} to U${targetU + selectedTemplate.heightU - 1}`
                      : `اشغال از U${targetU} تا U${targetU + selectedTemplate.heightU - 1}`}
                  </span>
                </div>
              </div>
            </div>

            {/* COLLISION WARNING BANNER */}
            {currentCollision && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-3 animate-pulse ${
                  isLightMode
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-rose-950/70 border-rose-500/80 text-rose-200'
                }`}
              >
                <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isLightMode ? 'text-rose-600' : 'text-rose-400'}`} />
                <div className="flex-1 text-xs space-y-1">
                  <div className={`font-bold ${isLightMode ? 'text-rose-900' : 'text-rose-300'}`}>{currentCollision.message}</div>
                  <p className={`text-[11px] ${isLightMode ? 'text-rose-700' : 'text-rose-400'}`}>
                    {isEn
                      ? 'Two devices cannot occupy the same rack slot. Please select a different starting U or click "Find Free Slot".'
                      : 'دو تجهیز نمی‌توانند هم‌زمان روی یک یونیت رک قرار گیرند. لطفاً یونیت شروع را تغییر دهید یا روی «یافتن یونیت آزاد» کلیک کنید.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoFindSlot}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0 transition cursor-pointer"
                >
                  {isEn ? 'Find Free' : 'یافتن خودکار'}
                </button>
              </div>
            )}
          </div>

          {/* Step 4: Power Supplies & Electrical Consumption (Watts / kVA) */}
          <div className={`p-4 rounded-2xl border space-y-4 ${isLightMode ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-950/70 border-amber-500/30'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`text-xs font-bold flex items-center gap-2 ${isLightMode ? 'text-amber-900' : 'text-amber-400'}`}>
                  <Zap className={`w-4 h-4 ${isLightMode ? 'text-amber-600' : 'text-amber-400'}`} />
                  <span>{isEn ? 'Power Supplies & Electrical Consumption' : 'منبع تغذیه (PSU) و توان مصرفی برق'}</span>
                </h4>
                <p className={`text-[11px] mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {isEn
                    ? 'Configure number of power supplies (redundancy) and active power load (Watts) for rack capacity calculation'
                    : 'تنظیم تعداد پاورهای دستگاه (ریداندنت) و توان مصرفی اکتیو (وات) جهت محاسبه اتوماتیک بار الکتریکی کل رک'}
                </p>
              </div>
              <div className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold ${
                isLightMode ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}>
                ⚡ {powerWatts}W • {(powerWatts / 850).toFixed(2)} kVA
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Number of Power Supplies */}
              <div className="space-y-1.5">
                <label className={`text-[11px] font-bold block ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                  {isEn ? 'Number of Power Supplies (PSU):' : 'تعداد پاورهای دستگاه (PSU):'}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { count: 0, label: isEn ? '0 (Passive)' : '۰ (پسیو)' },
                    { count: 1, label: isEn ? '1 (Single)' : '۱ (تک پاور)' },
                    { count: 2, label: isEn ? '2 (1+1 Redundant)' : '۲ (ریداندنت)' },
                    { count: 4, label: isEn ? '4 (2+2 N+N)' : '۴ (چهار پاور)' },
                  ].map((p) => (
                    <button
                      key={p.count}
                      type="button"
                      onClick={() => setPowerSupplyCount(p.count)}
                      className={`px-2 py-1.5 rounded-xl text-[11px] font-medium transition border text-center cursor-pointer ${
                        powerSupplyCount === p.count
                          ? isLightMode
                            ? 'bg-amber-100 border-amber-500 text-amber-900 font-bold shadow-xs'
                            : 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                          : isLightMode
                          ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Power Watts Consumption */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className={`text-[11px] font-bold block ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                    {isEn ? 'Rated Power Consumption (Watts):' : 'توان مصرفی برآوردشده (بر حسب وات):'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setPowerWatts(selectedTemplate.defaultPowerWatts)}
                    className={`text-[10px] hover:underline font-mono cursor-pointer ${isLightMode ? 'text-amber-700 font-semibold' : 'text-amber-400'}`}
                  >
                    {isEn ? `Default: ${selectedTemplate.defaultPowerWatts}W` : `پیش‌فرض: ${selectedTemplate.defaultPowerWatts} وات`}
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPowerWatts((w) => Math.max(0, w - 50))}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono transition cursor-pointer ${
                      isLightMode ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    -50W
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      step={10}
                      value={powerWatts}
                      onChange={(e) => setPowerWatts(Math.max(0, parseInt(e.target.value) || 0))}
                      className={`w-full px-3 py-1.5 rounded-xl border font-mono text-xs font-bold text-center focus:outline-none ${
                        isLightMode
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-600'
                          : 'bg-slate-900 border-slate-700 text-white focus:border-amber-500'
                      }`}
                    />
                    <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono pointer-events-none ${
                      isLightMode ? 'text-amber-700 font-bold' : 'text-amber-400/80'
                    }`}>
                      W
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPowerWatts((w) => w + 50)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono transition cursor-pointer ${
                      isLightMode ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    +50W
                  </button>
                  <button
                    type="button"
                    onClick={() => setPowerWatts((w) => w + 100)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono transition cursor-pointer ${
                      isLightMode ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    +100W
                  </button>
                </div>
              </div>
            </div>

            {/* Electrical load conversion info */}
            <div className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-[11px] ${
              isLightMode ? 'bg-white border-amber-200 text-slate-600 shadow-xs' : 'bg-slate-900/90 border-slate-800 text-slate-400'
            }`}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>{isEn ? 'Load Conversion:' : 'معادل توان الکتریکی:'}</span>
                <strong className={`font-mono ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{(powerWatts / 1000).toFixed(2)} kW</strong>
                <span>•</span>
                <strong className={`font-mono ${isLightMode ? 'text-amber-800' : 'text-amber-300'}`}>{(powerWatts / 850).toFixed(2)} kVA</strong>
                <span>(PF 0.85)</span>
              </span>
              <span className={`font-mono font-semibold ${isLightMode ? 'text-cyan-800' : 'text-cyan-400'}`}>
                ~{(powerWatts / (230 * 0.85)).toFixed(1)}A @ 230V AC
              </span>
            </div>

            {/* If Category is PDU: Show PDU Outlets Configuration */}
            {selectedTemplate.category === 'pdu' && (
              <div className={`mt-3 p-3 rounded-xl border space-y-3 ${isLightMode ? 'bg-cyan-50/70 border-cyan-200' : 'bg-cyan-950/20 border-cyan-500/30'}`}>
                <div className="flex items-center justify-between">
                  <h5 className={`text-xs font-bold flex items-center gap-1.5 ${isLightMode ? 'text-cyan-900' : 'text-cyan-300'}`}>
                    <BatteryCharging className="w-3.5 h-3.5" />
                    <span>{isEn ? 'PDU Sockets & Outlet Configuration' : 'پیکربندی پریزها و خروجی‌های پاور ماژول (PDU Outlets)'}</span>
                  </h5>
                  <span className={`text-[11px] font-mono font-semibold ${isLightMode ? 'text-cyan-800' : 'text-cyan-400'}`}>
                    {pduOutletsCount} {isEn ? 'Outlets' : 'پریز خروجی'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Outlet Count */}
                  <div className="space-y-1">
                    <label className={`text-[11px] block font-semibold ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {isEn ? 'Total Outlets Count:' : 'تعداد پریزهای برق:'}
                    </label>
                    <select
                      value={pduOutletsCount}
                      onChange={(e) => setPduOutletsCount(parseInt(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none ${
                        isLightMode ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-600' : 'bg-slate-900 border-slate-700 text-white focus:border-cyan-500'
                      }`}
                    >
                      {[6, 8, 10, 12, 16, 20, 24].map((cnt) => (
                        <option key={cnt} value={cnt}>
                          {cnt} {isEn ? 'Outlets' : 'پریز'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Socket Type */}
                  <div className="space-y-1">
                    <label className={`text-[11px] block font-semibold ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {isEn ? 'Socket Standard:' : 'استاندارد سوکت خروجی:'}
                    </label>
                    <select
                      value={pduOutletType}
                      onChange={(e) => setPduOutletType(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                        isLightMode ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-600' : 'bg-slate-900 border-slate-700 text-white focus:border-cyan-500'
                      }`}
                    >
                      <option value="IEC C13">IEC C13 (10A Server Standard)</option>
                      <option value="IEC C19">IEC C19 (16A High-Power Blade)</option>
                      <option value="Schuko / Standard">{isEn ? 'Schuko / Standard (CEE 7/4)' : 'Schuko (استاندارد دوشاخه ارت‌دار)'}</option>
                      <option value="Mixed C13/C19">{isEn ? 'Mixed C13 / C19' : 'Mixed (ترکیبی C13 + C19)'}</option>
                    </select>
                  </div>

                  {/* Rated Current */}
                  <div className="space-y-1">
                    <label className={`text-[11px] block font-semibold ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {isEn ? 'Max Amperage (Current):' : 'حداکثر جریان نامی:'}
                    </label>
                    <select
                      value={pduAmperage}
                      onChange={(e) => setPduAmperage(parseInt(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none ${
                        isLightMode ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-600' : 'bg-slate-900 border-slate-700 text-white focus:border-cyan-500'
                      }`}
                    >
                      <option value={16}>{isEn ? '16A (3680 Watts Single Phase)' : '16A (۳۶۸۰ وات تک فاز)'}</option>
                      <option value={32}>{isEn ? '32A (7360 Watts High Load)' : '32A (۷۳۶۰ وات بار بالا)'}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 5: Network Interface Cards (NICs) & Ports Configuration */}
          <div className={`p-4 rounded-2xl border space-y-4 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`text-xs font-bold flex items-center gap-2 ${isLightMode ? 'text-cyan-900' : 'text-cyan-300'}`}>
                  <Network className="w-4 h-4" />
                  <span>{isEn ? 'Network Cards & Ports Configuration' : 'پیکربندی کارت‌های شبکه و پورت‌ها (Network Cards & Ports)'}</span>
                </h4>
                <p className={`text-[11px] mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {isEn
                    ? 'Define number of NICs, port counts per card, and port medium (RJ45, SFP+, QSFP, and FC)'
                    : 'تعریف تعداد کارت‌های شبکه، تعداد پورت در هر کارت و نوع پورت‌ها (RJ45، SFP+، QSFP و FC)'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddNic}
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isEn ? 'Add Network Card' : 'افزودن کارت شبکه'}</span>
              </button>
            </div>

            {/* List of Network Cards */}
            {networkCards.length === 0 ? (
              <div className={`p-4 rounded-xl border border-dashed text-center text-xs ${isLightMode ? 'border-slate-300 text-slate-500 bg-white' : 'border-slate-800 text-slate-500'}`}>
                {isEn
                  ? 'No network cards configured for this device yet. Click above to add a NIC.'
                  : 'هیچ کارت شبکه‌ای برای این ماژول تنظیم نشده است. با دکمه بالا کارت جدید اضافه کنید.'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {networkCards.map((card, idx) => (
                  <div
                    key={card.id || idx}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
                      isLightMode ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`w-6 h-6 rounded-lg font-mono text-xs flex items-center justify-center font-bold ${
                        isLightMode ? 'bg-cyan-100 text-cyan-800 border border-cyan-200' : 'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={card.name}
                        onChange={(e) => handleUpdateNic(card.id, 'name', e.target.value)}
                        placeholder={isEn ? 'NIC Name (e.g. Onboard LOM)' : 'نام کارت (مثال: Onboard LOM)'}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none w-36 ${
                          isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-600 focus:bg-white' : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-500'
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className={`text-[11px] font-semibold ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>{isEn ? 'Ports:' : 'تعداد پورت:'}</span>
                        <select
                          value={card.portCount}
                          onChange={(e) => handleUpdateNic(card.id, 'portCount', parseInt(e.target.value))}
                          className={`px-2 py-1 rounded-lg border text-xs font-mono focus:outline-none ${
                            isLightMode ? 'bg-slate-50 border-slate-300 text-cyan-800 font-bold focus:bg-white' : 'bg-slate-950 border-slate-700 text-cyan-300'
                          }`}
                        >
                          {[1, 2, 4, 8, 16, 24, 48].map((num) => (
                            <option key={num} value={num}>
                              {num} {isEn ? 'Ports' : 'پورت'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className={`text-[11px] font-semibold ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>{isEn ? 'Port Type:' : 'نوع پورت:'}</span>
                        <select
                          value={card.portType}
                          onChange={(e) => handleUpdateNic(card.id, 'portType', e.target.value as NetworkPortType)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-mono focus:outline-none ${
                            isLightMode ? 'bg-slate-50 border-slate-300 text-emerald-800 font-bold focus:bg-white' : 'bg-slate-950 border-slate-700 text-emerald-300'
                          }`}
                        >
                          {PORT_TYPES.map((pt) => (
                            <option key={pt} value={pt}>
                              {pt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveNic(card.id)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          isLightMode
                            ? 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700'
                            : 'bg-red-950/60 text-red-400 hover:bg-red-800 hover:text-white'
                        }`}
                        title={isEn ? 'Remove NIC' : 'حذف کارت'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 5: Live Vector SVG Preview */}
          <div className={`p-4 rounded-2xl border space-y-2 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/90 border-slate-800'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                {isEn ? 'Live Photorealistic Vector Preview:' : 'پیش‌نمایش زنده SVG تجهیز (طراحی واقعی):'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewViewMode(previewViewMode === 'front' ? 'rear' : 'front')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer border ${
                    isLightMode
                      ? 'bg-white border-slate-200 text-cyan-800 hover:bg-slate-100'
                      : 'bg-slate-800 border-transparent text-cyan-300 hover:bg-slate-700'
                  }`}
                >
                  {previewViewMode === 'front' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>{previewViewMode === 'front' ? (isEn ? 'Front View' : 'مشاهده نمای جلو (Front)') : (isEn ? 'Rear View' : 'مشاهده نمای پشت (Rear)')}</span>
                </button>
              </div>
            </div>

            <div className={`p-3 rounded-xl flex items-center justify-center overflow-x-auto border ${
              isLightMode ? 'bg-slate-100 border-slate-300 shadow-inner' : 'bg-slate-950 border-slate-800/80'
            }`}>
              <HardwareSvgRenderer
                device={previewDevice}
                viewMode={previewViewMode}
                width={520}
                height={previewDevice.heightU * 36}
              />
            </div>
          </div>
          </>
          )}

          {/* Submit / Cancel Buttons */}
          <div className={`pt-4 border-t flex items-center justify-end gap-3 ${isLightMode ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                isLightMode
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isEn ? 'Cancel' : 'انصراف'}
            </button>
            <button
              type="submit"
              disabled={
                activeCategory === 'server_rack'
                  ? !rackName.trim() || isDuplicateRackName
                  : activeCategory === 'telecom_tower'
                  ? !towerName.trim()
                  : (!targetRackId || !!currentCollision || racks.length === 0)
              }
              className={`px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg transition active:scale-95 flex items-center gap-2 cursor-pointer ${
                (activeCategory === 'server_rack' && (!rackName.trim() || isDuplicateRackName)) ||
                (activeCategory === 'telecom_tower' && !towerName.trim()) ||
                (activeCategory !== 'server_rack' && activeCategory !== 'telecom_tower' && (!targetRackId || !!currentCollision || racks.length === 0))
                  ? isLightMode
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : activeCategory === 'server_rack'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30'
                  : activeCategory === 'telecom_tower'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-600/30'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/30'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {editingDevice
                  ? isEn
                    ? 'Save Device Changes'
                    : 'ذخیره تغییرات تجهیز'
                  : activeCategory === 'server_rack'
                  ? isEn
                    ? 'Add Server Rack Cabinet'
                    : 'افزودن رک سرور استاندارد'
                  : activeCategory === 'telecom_tower'
                  ? isEn
                    ? 'Add Telecom Tower'
                    : 'افزودن دکل مخابراتی'
                  : isEn
                  ? 'Install Hardware in Rack'
                  : 'نصب تجهیز در رک'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
