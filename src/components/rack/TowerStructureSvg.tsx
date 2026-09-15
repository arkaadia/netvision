import React, { useState } from 'react';
import { CustomTopologyTower, MountedTowerDevice } from '../../types';
import {
  Radio,
  Wifi,
  Compass,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  ArrowUpRight,
  Shield,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface TowerStructureSvgProps {
  tower: CustomTopologyTower;
  onAddRadio?: (towerId: string) => void;
  onMountRadio?: (tower: CustomTopologyTower) => void;
  onEditTower?: (tower: CustomTopologyTower) => void;
  onDeleteTower?: (towerId: string) => void;
  onEditRadio?: (tower: any, device: MountedTowerDevice) => void;
  onDeleteRadio?: (tower: any, deviceId: string) => void;
  isHighlighted?: boolean;
}

export const TowerStructureSvg: React.FC<TowerStructureSvgProps> = ({
  tower,
  onAddRadio,
  onMountRadio,
  onEditTower,
  onDeleteTower,
  onEditRadio,
  onDeleteRadio,
  isHighlighted = false,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const handleAddRadioClick = () => {
    if (onAddRadio) {
      onAddRadio(tower.id);
    } else if (onMountRadio) {
      onMountRadio(tower);
    }
  };

  const handleEditTowerClick = () => {
    if (onEditTower) {
      onEditTower(tower);
    }
  };

  const handleDeleteTowerClick = () => {
    if (onDeleteTower) {
      onDeleteTower(tower.id);
    }
  };

  const handleEditRadioClick = (dev: MountedTowerDevice) => {
    if (onEditRadio) {
      onEditRadio(tower, dev);
    }
  };

  const handleDeleteRadioClick = (devId: string) => {
    if (onDeleteRadio) {
      onDeleteRadio(tower, devId);
    }
  };

  const [hoveredDeviceId, setHoveredDeviceId] = useState<string | null>(null);

  // Height scaling: 1 meter = 16 pixels
  const meterScale = 16;
  const mastHeight = tower.heightMeters * meterScale;
  const headerHeight = 65;
  const groundPadHeight = 40;
  const totalSvgHeight = headerHeight + mastHeight + groundPadHeight;
  const svgWidth = 420;
  const mastCenterX = svgWidth / 2;
  const mastTopY = headerHeight + 20;
  const mastBottomY = mastTopY + mastHeight;

  // Mast profile widths
  const isSelfSupporting =
    tower.type === 'self_supporting_3leg' || tower.type === 'self_supporting_4leg';
  const isGuyed = tower.type === 'guyed_g35' || tower.type === 'guyed_g45';
  const isMonopole = tower.type === 'monopole';

  const topWidth = isMonopole ? 16 : isGuyed ? (tower.type === 'guyed_g45' ? 36 : 28) : 32;
  const bottomWidth = isMonopole ? 24 : isSelfSupporting ? 88 : isGuyed ? (tower.type === 'guyed_g45' ? 36 : 28) : 40;

  // Step sections for trusses (every 3 meters = 48px)
  const sectionMeters = 3;
  const totalSections = Math.round(tower.heightMeters / sectionMeters);

  return (
    <div
      className={`relative rounded-3xl bg-slate-950/95 border transition-all duration-300 shadow-2xl backdrop-blur-md overflow-visible ${
        isHighlighted
          ? 'border-amber-400 ring-4 ring-amber-500/40 shadow-amber-500/20 shadow-2xl'
          : 'border-slate-800 hover:border-slate-700'
      }`}
      style={{ width: `${svgWidth}px` }}
    >
      {/* Top Header Controls Bar */}
      <div className="p-3 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800 rounded-t-3xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="p-2 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
            style={{ backgroundColor: `${tower.color || '#f59e0b'}20`, color: tower.color || '#f59e0b' }}
          >
            <Radio className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-white truncate max-w-[140px]" title={tower.name}>
                {tower.name}
              </span>
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold border"
                style={{
                  backgroundColor: `${tower.color || '#f59e0b'}15`,
                  color: tower.color || '#f59e0b',
                  borderColor: `${tower.color || '#f59e0b'}30`,
                }}
              >
                {tower.heightMeters}m
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
              <span>
                {tower.type === 'guyed_g35'
                  ? 'G35 Guyed Mast'
                  : tower.type === 'guyed_g45'
                  ? 'G45 Heavy Guyed'
                  : tower.type === 'self_supporting_3leg'
                  ? '3-Leg Lattice'
                  : tower.type === 'self_supporting_4leg'
                  ? '4-Leg Heavy Lattice'
                  : 'Monopole Mast'}
              </span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">
                {tower.devices?.length || 0} {isEn ? 'Radios' : 'رادیو/دیش'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions Header */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAddRadioClick();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-[11px] font-bold shadow-xs transition active:scale-95 cursor-pointer"
            title={isEn ? 'Mount Radio / Dish onto Tower' : 'نصب رادیو یا دیش روی دکل'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isEn ? 'Add Radio' : 'نصب رادیو'}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleEditTowerClick();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={isEn ? 'Edit Tower Settings' : 'ویرایش مشخصات دکل'}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTowerClick();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
            title={isEn ? 'Delete Tower' : 'حذف دکل'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Canvas for Tower Lattice & Radios */}
      <svg
        width={svgWidth}
        height={totalSvgHeight - headerHeight}
        viewBox={`0 0 ${svgWidth} ${totalSvgHeight - headerHeight}`}
        className="overflow-visible select-none"
      >
        <defs>
          <filter id={`glow-${tower.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Height Elevation Scale Tick Marks along Left Side */}
        <g transform="translate(14, 20)">
          {Array.from({ length: totalSections + 1 }).map((_, i) => {
            const meter = i * sectionMeters;
            const yPos = mastHeight - i * sectionMeters * meterScale;
            return (
              <g key={`tick-${i}`} transform={`translate(0, ${yPos})`}>
                <line x1="0" y1="0" x2="16" y2="0" stroke="#475569" strokeWidth="0.8" />
                <text
                  x="20"
                  y="3"
                  fill={meter === tower.heightMeters ? '#f59e0b' : '#64748b'}
                  fontSize="8.5"
                  fontWeight={meter === tower.heightMeters ? 'bold' : 'normal'}
                  fontFamily="monospace"
                >
                  {meter}m
                </text>
              </g>
            );
          })}
        </g>

        {/* Guy Wires (if Guyed Mast G35 / G45) */}
        {isGuyed && (
          <g opacity="0.6">
            {/* Upper Guy Wires */}
            <line
              x1={mastCenterX - topWidth / 2}
              y1={20 + mastHeight * 0.15}
              x2={40}
              y2={mastHeight + 15}
              stroke="#64748b"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
            <line
              x1={mastCenterX + topWidth / 2}
              y1={20 + mastHeight * 0.15}
              x2={svgWidth - 40}
              y2={mastHeight + 15}
              stroke="#64748b"
              strokeWidth="1"
              strokeDasharray="4 2"
            />

            {/* Mid Guy Wires */}
            <line
              x1={mastCenterX - topWidth / 2}
              y1={20 + mastHeight * 0.5}
              x2={50}
              y2={mastHeight + 15}
              stroke="#64748b"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
            <line
              x1={mastCenterX + topWidth / 2}
              y1={20 + mastHeight * 0.5}
              x2={svgWidth - 50}
              y2={mastHeight + 15}
              stroke="#64748b"
              strokeWidth="1"
              strokeDasharray="4 2"
            />

            {/* Ground Turnbuckles / Anchors */}
            <circle cx={40} cy={mastHeight + 15} r="3" fill="#cbd5e1" stroke="#334155" strokeWidth="1" />
            <circle cx={svgWidth - 40} cy={mastHeight + 15} r="3" fill="#cbd5e1" stroke="#334155" strokeWidth="1" />
          </g>
        )}

        {/* Concrete Pad / Foundation at bottom */}
        <g transform={`translate(${mastCenterX - bottomWidth / 2 - 20}, ${mastHeight + 15})`}>
          <rect
            x="0"
            y="0"
            width={bottomWidth + 40}
            height="18"
            rx="3"
            fill="#1e293b"
            stroke="#475569"
            strokeWidth="1.2"
          />
          <text
            x={(bottomWidth + 40) / 2}
            y="12"
            fill="#64748b"
            fontSize="7"
            fontFamily="monospace"
            textAnchor="middle"
          >
            FOUNDATION 0.0m
          </text>
        </g>

        {/* Main Mast Structure */}
        <g id={`mast-${tower.id}`}>
          {/* Alternating Red / White Aviation Obstacle Sections */}
          {Array.from({ length: totalSections }).map((_, idx) => {
            const secIndexFromTop = idx;
            const isRedBand = secIndexFromTop % 2 === 0;
            const sectionH = sectionMeters * meterScale;
            const secTopY = 20 + idx * sectionH;
            const secBottomY = secTopY + sectionH;

            // Compute widths at top and bottom of section (for tapered towers)
            const tRatio = idx / totalSections;
            const bRatio = (idx + 1) / totalSections;
            const secTopW = topWidth + (bottomWidth - topWidth) * tRatio;
            const secBottomW = topWidth + (bottomWidth - topWidth) * bRatio;

            const xTopLeft = mastCenterX - secTopW / 2;
            const xTopRight = mastCenterX + secTopW / 2;
            const xBottomLeft = mastCenterX - secBottomW / 2;
            const xBottomRight = mastCenterX + secBottomW / 2;

            return (
              <g key={`sec-${idx}`}>
                {/* Section Background Plate */}
                <polygon
                  points={`${xTopLeft},${secTopY} ${xTopRight},${secTopY} ${xBottomRight},${secBottomY} ${xBottomLeft},${secBottomY}`}
                  fill={isRedBand ? '#dc2626' : '#f8fafc'}
                  opacity={isMonopole ? 0.9 : 0.12}
                />

                {/* Left & Right Structural Steel Angle Legs */}
                <line
                  x1={xTopLeft}
                  y1={secTopY}
                  x2={xBottomLeft}
                  y2={secBottomY}
                  stroke={isRedBand ? '#ef4444' : '#cbd5e1'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <line
                  x1={xTopRight}
                  y1={secTopY}
                  x2={xBottomRight}
                  y2={secBottomY}
                  stroke={isRedBand ? '#ef4444' : '#cbd5e1'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Horizontal Tie Struts */}
                <line
                  x1={xTopLeft}
                  y1={secTopY}
                  x2={xTopRight}
                  y2={secTopY}
                  stroke={isRedBand ? '#ef4444' : '#94a3b8'}
                  strokeWidth="1.2"
                />

                {/* Diagonal Truss Cross-Braces (X pattern) */}
                {!isMonopole && (
                  <>
                    <line
                      x1={xTopLeft}
                      y1={secTopY}
                      x2={xBottomRight}
                      y2={secBottomY}
                      stroke={isRedBand ? '#f87171' : '#64748b'}
                      strokeWidth="0.9"
                    />
                    <line
                      x1={xTopRight}
                      y1={secTopY}
                      x2={xBottomLeft}
                      y2={secBottomY}
                      stroke={isRedBand ? '#f87171' : '#64748b'}
                      strokeWidth="0.9"
                    />
                  </>
                )}
              </g>
            );
          })}

          {/* Top Obstacle Warning Beacon Light */}
          <g transform={`translate(${mastCenterX}, 12)`}>
            <circle cx="0" cy="0" r="4.5" fill="#ef4444" filter={`url(#glow-${tower.id})`} />
            <circle cx="0" cy="0" r="2.5" fill="#fef2f2" />
            <line x1="0" y1="4" x2="0" y2="8" stroke="#cbd5e1" strokeWidth="1.5" />
            <line x1="-5" y1="8" x2="5" y2="8" stroke="#cbd5e1" strokeWidth="1.5" />
          </g>
        </g>

        {/* Mounted Devices & Antennas on the Tower */}
        {(tower.devices || []).map((dev) => {
          // Calculate Y position based on height in meters
          const elevationRatio = Math.max(0, Math.min(1, dev.heightMeters / tower.heightMeters));
          const devY = 20 + mastHeight * (1 - elevationRatio);
          const isHovered = hoveredDeviceId === dev.id;

          // Azimuth orientation: 0°-180° points Right, 181°-359° points Left
          const isFacingRight =
            dev.azimuthDegrees === undefined ||
            dev.azimuthDegrees <= 90 ||
            dev.azimuthDegrees >= 270;
          const mountX = isFacingRight
            ? mastCenterX + topWidth / 2 + 10
            : mastCenterX - topWidth / 2 - 10;

          return (
            <g
              key={dev.id}
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoveredDeviceId(dev.id)}
              onMouseLeave={() => setHoveredDeviceId(null)}
              onClick={() => onEditRadio(tower.id, dev)}
            >
              {/* Bracket Mounting Arm */}
              <line
                x1={mastCenterX}
                y1={devY}
                x2={mountX}
                y2={devY}
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Antenna Reflector Graphic */}
              {dev.category === 'dish_antenna' ? (
                // Parabolic Dish Graphic
                <g transform={`translate(${mountX}, ${devY})`}>
                  {/* Dish Parabolic Arc Reflector */}
                  <path
                    d={
                      isFacingRight
                        ? 'M -2 -14 Q 8 0 -2 14'
                        : 'M 2 -14 Q -8 0 2 14'
                    }
                    fill="none"
                    stroke="#f8fafc"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Sub-Reflector Feed Horn */}
                  <line
                    x1={0}
                    y1={0}
                    x2={isFacingRight ? 12 : -12}
                    y2={0}
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={isFacingRight ? 12 : -12}
                    cy={0}
                    r="2.5"
                    fill="#f59e0b"
                  />
                </g>
              ) : (
                // Integrated Radio / Sector Graphic
                <g transform={`translate(${mountX}, ${devY})`}>
                  <rect
                    x={isFacingRight ? 0 : -14}
                    y={-10}
                    width={14}
                    height={20}
                    rx={2}
                    fill="#0f172a"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={isFacingRight ? 7 : -7}
                    cy={-4}
                    r="1.5"
                    fill="#22c55e"
                  />
                  <circle
                    cx={isFacingRight ? 7 : -7}
                    cy={4}
                    r="1.5"
                    fill="#0284c7"
                  />
                </g>
              )}

              {/* Azimuth Heading Arrow Vector */}
              <g transform={`translate(${mountX + (isFacingRight ? 16 : -16)}, ${devY})`}>
                <line
                  x1={0}
                  y1={0}
                  x2={isFacingRight ? 14 : -14}
                  y2={0}
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                />
                <circle cx={isFacingRight ? 14 : -14} cy={0} r="2" fill="#38bdf8" />
              </g>

              {/* Floating Device Info Badge & Controls */}
              <foreignObject
                x={isFacingRight ? mountX + 32 : mountX - 160}
                y={devY - 24}
                width={130}
                height={48}
                className="overflow-visible"
              >
                <div
                  className={`tower-device-hover-card p-1.5 rounded-xl border transition-all text-left shadow-lg ${
                    isHovered
                      ? 'bg-amber-950/90 border-amber-400 ring-2 ring-amber-500/50 scale-105'
                      : 'bg-slate-900/90 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-white truncate max-w-[85px]">
                      {dev.name}
                    </span>
                    <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                      {dev.heightMeters}m
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-cyan-300 mt-0.5">
                    <span>🧭 {dev.azimuthDegrees ?? 0}°</span>
                    {dev.frequency && (
                      <span className="truncate max-w-[50px] text-slate-400">
                        {dev.frequency.split(' ')[0]}
                      </span>
                    )}
                  </div>

                  {/* Actions on hover */}
                  <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-slate-800/80">
                    <span className="text-[8px] text-slate-400 truncate max-w-[70px]">
                      {dev.ip || dev.model}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditRadioClick(dev);
                        }}
                        className="p-0.5 text-slate-400 hover:text-white rounded"
                        title={isEn ? 'Edit Radio' : 'ویرایش رادیو'}
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRadioClick(dev.id);
                        }}
                        className="p-0.5 text-slate-400 hover:text-rose-400 rounded"
                        title={isEn ? 'Remove from Tower' : 'حذف از دکل'}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
