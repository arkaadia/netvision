import React, { useState, useRef, useEffect } from 'react';
import { CustomTopologyRack, MountedHardwareDevice, RackViewMode } from '../../types';
import { HardwareSvgRenderer } from './HardwareSvgRenderer';
import {
  Eye,
  EyeOff,
  Plus,
  Maximize2,
  Trash2,
  Edit3,
  Network,
  Zap,
  GripVertical,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Sliders,
  Terminal,
  Layers,
  ArrowRightLeft,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export interface RackNeonHighlightData {
  targetAliases: string[];
  colorHex: string;
  colorRgb: string;
  targetName?: string;
  targetIp?: string;
}

interface RackCabinetSvgProps {
  rack: CustomTopologyRack;
  onToggleViewMode: (rackId: string, newMode: RackViewMode) => void;
  onOpenAddHardware: (rackId: string, targetU?: number) => void;
  onInspectRack: (rack: CustomTopologyRack) => void;
  onEditRack?: (rack: CustomTopologyRack) => void;
  onDeleteRack: (rackId: string) => void;
  onSelectDevice?: (device: MountedHardwareDevice, rack: CustomTopologyRack) => void;
  onViewInCardMode?: (device: MountedHardwareDevice, rack: CustomTopologyRack) => void;
  onEditDeviceNic?: (device: MountedHardwareDevice, rack: CustomTopologyRack) => void;
  onEditSpecs?: (device: MountedHardwareDevice, rack: CustomTopologyRack) => void;
  onEditDeviceProperties?: (device: MountedHardwareDevice, rack: CustomTopologyRack) => void;
  onConnectTerminal?: (device: MountedHardwareDevice, rack: CustomTopologyRack) => void;
  onInspectPorts?: (device: MountedHardwareDevice, rack: CustomTopologyRack) => void;
  onPromptRemoveDevice?: (device: MountedHardwareDevice, rack: CustomTopologyRack) => void;
  onTransferDevice?: (device: MountedHardwareDevice, rack: CustomTopologyRack) => void;
  onMoveDevice?: (rackId: string, deviceId: string, newStartU: number) => void;
  onRemoveDevice?: (rackId: string, deviceId: string) => void;
  selectedDeviceId?: string | null;
  neonHighlight?: RackNeonHighlightData | null;
  interactive?: boolean;
}

export const RackCabinetSvg: React.FC<RackCabinetSvgProps> = ({
  rack,
  onToggleViewMode,
  onOpenAddHardware,
  onInspectRack,
  onEditRack,
  onDeleteRack,
  onSelectDevice,
  onViewInCardMode,
  onEditDeviceNic,
  onEditSpecs,
  onEditDeviceProperties,
  onConnectTerminal,
  onInspectPorts,
  onPromptRemoveDevice,
  onTransferDevice,
  onMoveDevice,
  onRemoveDevice,
  selectedDeviceId,
  neonHighlight,
  interactive = true,
}) => {
  const { isEn, isRtl } = useLanguage();
  const [hoveredU, setHoveredU] = useState<number | null>(null);

  // Drag-and-drop state for devices within the rack
  const [draggingDevice, setDraggingDevice] = useState<MountedHardwareDevice | null>(null);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragTargetU, setDragTargetU] = useState<number | null>(null);
  const [dragCollision, setDragCollision] = useState<{ isBlocked: boolean; reason?: string } | null>(null);
  const rackSvgRef = useRef<SVGSVGElement | null>(null);
  const dragGrabOffsetURef = useRef<number>(0);

  // High-z-index elevated hover overlay state (prevents clipping behind devices below)
  const [hoveredMountedDev, setHoveredMountedDev] = useState<{ dev: MountedHardwareDevice; yPos: number; uNumber: number } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [localConfirmDeleteDev, setLocalConfirmDeleteDev] = useState<MountedHardwareDevice | null>(null);
  // Configurable move step for quick move (e.g. 1U, 2U, 3U, 4U, 5U)
  const [moveStepUnits, setMoveStepUnits] = useState<number>(1);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const U_HEIGHT = 28; // pixels per rack unit
  const RACK_WIDTH = 380;
  const RAIL_WIDTH = 26;

  // Safe devices array
  const safeDevices = Array.isArray(rack.devices) ? rack.devices : [];

  // Occupancy map
  const uOccupancyMap = new Map<number, MountedHardwareDevice>();
  const topDeviceForU = new Map<number, MountedHardwareDevice>();

  safeDevices.forEach((dev) => {
    for (let u = dev.startU; u < dev.startU + dev.heightU; u++) {
      uOccupancyMap.set(u, dev);
    }
    topDeviceForU.set(dev.startU + dev.heightU - 1, dev);
  });

  const totalWatts = safeDevices.reduce((acc, d) => acc + (d.powerWatts || 0), 0);
  const usedUnits = safeDevices.reduce((acc, d) => acc + d.heightU, 0);
  const totalKva = totalWatts > 0 ? (totalWatts / 850).toFixed(2) : '0.00';
  const totalKw = (totalWatts / 1000).toFixed(2);
  const totalAmps = totalWatts > 0 ? (totalWatts / (230 * 0.85)).toFixed(1) : '0.0';

  // Helper to check collision for target U
  const checkCollision = (dev: MountedHardwareDevice, candidateU: number) => {
    const endU = candidateU + dev.heightU - 1;
    if (candidateU < 1 || endU > rack.units) {
      return {
        isBlocked: true,
        reason: isEn ? `Out of bounds (1-${rack.units}U)` : `خارج از محدوده ۱ تا ${rack.units}`,
      };
    }
    for (const other of safeDevices) {
      if (other.id === dev.id) continue;
      const oStart = other.startU;
      const oEnd = other.startU + other.heightU - 1;
      if (Math.max(candidateU, oStart) <= Math.min(endU, oEnd)) {
        return {
          isBlocked: true,
          reason: isEn ? `Collides with ${other.name}` : `تداخل با «${other.name}»`,
        };
      }
    }
    return { isBlocked: false };
  };

  // Start dragging a device
  const handleStartDrag = (e: React.MouseEvent, dev: MountedHardwareDevice) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredU(null);
    setHoveredMountedDev(null);
    setDraggingDevice(dev);
    setDragStartY(e.clientY);
    setDragTargetU(dev.startU);
    setDragCollision(null);

    // Calculate grab offset relative to mouse U inside the rack
    if (rackSvgRef.current) {
      const rect = rackSvgRef.current.getBoundingClientRect();
      const scaleY = rect.height / (rack.units * U_HEIGHT + 16);
      const yInSvg = (e.clientY - rect.top) / scaleY;
      const unitIndex = Math.floor((yInSvg - 8) / U_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(rack.units - 1, unitIndex));
      const mouseU = rack.units - clampedIndex;
      dragGrabOffsetURef.current = Math.max(0, Math.min(dev.heightU - 1, mouseU - dev.startU));
    } else {
      dragGrabOffsetURef.current = 0;
    }
  };

  // Drag mouse listeners
  useEffect(() => {
    if (!draggingDevice) return;

    const handleMouseMove = (e: MouseEvent) => {
      let candidateU: number;
      if (rackSvgRef.current) {
        const rect = rackSvgRef.current.getBoundingClientRect();
        const scaleY = rect.height / (rack.units * U_HEIGHT + 16);
        const yInSvg = (e.clientY - rect.top) / scaleY;
        const unitIndex = Math.floor((yInSvg - 8) / U_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(rack.units - 1, unitIndex));
        const mouseU = rack.units - clampedIndex;
        candidateU = Math.max(
          1,
          Math.min(mouseU - dragGrabOffsetURef.current, rack.units - draggingDevice.heightU + 1)
        );
      } else {
        const deltaY = e.clientY - dragStartY;
        const deltaUnits = -Math.round(deltaY / U_HEIGHT);
        candidateU = Math.max(
          1,
          Math.min(draggingDevice.startU + deltaUnits, rack.units - draggingDevice.heightU + 1)
        );
      }

      setDragTargetU(candidateU);
      const col = checkCollision(draggingDevice, candidateU);
      setDragCollision(col);
    };

    const handleMouseUp = () => {
      if (draggingDevice && dragTargetU !== null) {
        const col = checkCollision(draggingDevice, dragTargetU);
        if (!col.isBlocked && dragTargetU !== draggingDevice.startU && onMoveDevice) {
          onMoveDevice(rack.id, draggingDevice.id, dragTargetU);
        }
      }
      setDraggingDevice(null);
      setDragTargetU(null);
      setDragCollision(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingDevice, dragStartY, dragTargetU, rack]);

  // Quick move Up/Down actions with configurable step units (e.g. 1U, 2U, 3U...)
  const handleQuickMove = (e: React.MouseEvent, dev: MountedHardwareDevice, direction: 'up' | 'down', stepCount: number = moveStepUnits) => {
    e.stopPropagation();
    if (!onMoveDevice) return;
    const step = direction === 'up' ? stepCount : -stepCount;
    const newU = dev.startU + step;
    const col = checkCollision(dev, newU);
    if (!col.isBlocked) {
      onMoveDevice(rack.id, dev.id, newU);
      // Immediately update hoveredMountedDev position so highlight overlay moves with device
      setHoveredMountedDev((prev) => {
        if (!prev || prev.dev.id !== dev.id) return prev;
        const newYPos = 8 + (rack.units - (newU + dev.heightU - 1)) * U_HEIGHT;
        return {
          ...prev,
          dev: { ...prev.dev, startU: newU },
          yPos: newYPos,
          uNumber: newU + dev.heightU - 1,
        };
      });
    }
  };

  return (
    <div
      className="flex flex-col rounded-2xl bg-slate-950/90 border border-slate-700/80 shadow-2xl backdrop-blur-xl overflow-hidden select-none transition-all hover:border-cyan-500/50"
      style={{ width: RACK_WIDTH + 24 }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Top Control Bar with Front/Rear Toggle and Quick Actions */}
      <div className="px-3 py-2 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-700/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0 shadow-[0_0_8px_#22d3ee]" />
          <div className="truncate">
            <span
              className="rack-title-text text-xs font-bold text-white tracking-wide truncate block"
              style={{ color: '#ffffff' }}
            >
              {rack.name}
            </span>
            <span
              className="rack-subtitle-text text-[10px] font-mono"
              style={{ color: '#cbd5e1' }}
            >
              {rack.units}U • {isEn ? `depth ${rack.depth}cm` : `عمق ${rack.depth}cm`}
            </span>
          </div>
        </div>

        {/* View Toggle Button: FRONT / REAR */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            title={
              rack.viewMode === 'front'
                ? isEn
                  ? 'Switch to Rear View'
                  : 'مشاهده نمای پشت (Rear)'
                : isEn
                ? 'Switch to Front View'
                : 'مشاهده نمای جلو (Front)'
            }
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleViewMode(rack.id, rack.viewMode === 'front' ? 'rear' : 'front');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-sm ${
              rack.viewMode === 'front'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 ring-1 ring-cyan-400/40'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 ring-1 ring-purple-400/40'
            }`}
          >
            {rack.viewMode === 'front' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>
              {rack.viewMode === 'front'
                ? isEn
                  ? 'Front View'
                  : 'نمای جلو'
                : isEn
                ? 'Rear View'
                : 'نمای پشت'}
            </span>
          </button>

          {/* Inspect / Fullscreen Elevation Studio */}
          <button
            type="button"
            title={isEn ? 'Inspect Rack Elevation Studio' : 'بزرگ‌نمایی و بازرسی کامل رک'}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onInspectRack(rack);
            }}
            className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-700 transition cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 pointer-events-none" />
          </button>

          {/* Edit Rack Properties & Units */}
          {onEditRack && (
            <button
              type="button"
              title={isEn ? 'Edit Rack Properties & Units' : 'ویرایش مشخصات و تعداد یونیت‌های رک'}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onEditRack(rack);
              }}
              className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-amber-300 hover:bg-slate-700 transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Add Hardware Button */}
          <button
            type="button"
            title={isEn ? 'Install Hardware Device' : 'افزودن تجهیز سخت‌افزاری به رک'}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onOpenAddHardware(rack.id);
            }}
            className="p-1 rounded-lg bg-emerald-600/80 text-white hover:bg-emerald-500 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Delete Rack Button */}
          <button
            type="button"
            title={isEn ? 'Delete Rack' : 'حذف رک'}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRack(rack.id);
            }}
            className="p-1 rounded-lg bg-red-950/60 text-red-400 hover:bg-red-800 hover:text-white transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Rack Power & Capacity Header Banner */}
      <div
        className="px-3 py-2 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-b border-slate-800/90 text-xs flex flex-col gap-1 select-none"
        title={
          isEn
            ? `Total Active Load: ${totalWatts}W (${totalKw} kW)\nApparent Power: ${totalKva} kVA (Power Factor: 0.85)\nEstimated Current: ~${totalAmps}A @ 230V AC\nRecommended Circuit Breaker: ${
                Number(totalAmps) > 16 ? '32A (C32)' : '16A/20A (C16/C20)'
              }\nInstalled Hardware: ${safeDevices.length} devices occupying ${usedUnits} of ${rack.units}U`
            : `مجموع توان مصرفی اکتیو: ${totalWatts} وات (${totalKw} کیلووات)\nتوان ظاهری کل رک: ${totalKva} کیلوولت‌آمپر (کاوا - ضریب توان ۰.۸۵)\nجریان مصرفی تقریبی: ~${totalAmps} آمپر در ولتاژ ۲۳۰ ولت\nفیوز و کلید مینیاتوری پیشنهادی: ${
                Number(totalAmps) > 16 ? 'فیوز ۳۲ آمپر (C32)' : 'فیوز ۱۶ یا ۲۰ آمپر (C16/C20)'
              }\nتجهیزات نصب‌شده: ${safeDevices.length} تجهیز با اشغال ${usedUnits} از ${rack.units} یونیت`
        }
      >
        {/* Main Power Metric Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div className={`p-1 rounded-md flex items-center justify-center ${
              totalWatts > 3000
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                : totalWatts > 1500
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            }`}>
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span
                className="rack-power-watts text-white font-bold text-xs tracking-wide"
                style={{ color: '#ffffff' }}
              >
                {totalWatts >= 1000 ? `${totalKw} kW` : `${totalWatts} W`}
              </span>
              <span className="text-amber-400 font-semibold text-[11px]">
                ({totalKva} kVA)
              </span>
              <span
                className="rack-power-amps text-slate-400 text-[10px] font-normal"
                style={{ color: '#cbd5e1' }}
              >
                ~{totalAmps}A
              </span>
            </div>
          </div>

          {/* Occupancy & Dev Count Badge */}
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span
              className="rack-occupancy-badge text-slate-300 bg-slate-800/90 px-1.5 py-0.5 rounded border border-white/10"
              style={{ color: '#cbd5e1' }}
            >
              {usedUnits}/{rack.units}U ({Math.round((usedUnits / rack.units) * 100)}%)
            </span>
            <span className="text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30 font-bold">
              {safeDevices.length} {isEn ? 'Dev' : 'دستگاه'}
            </span>
          </div>
        </div>

        {/* Informative Label */}
        <div className="rack-power-label-row flex items-center justify-between text-[10px] text-slate-400 font-sans">
          <span
            className="rack-power-label"
            style={{ color: '#cbd5e1' }}
          >
            {isEn ? 'Total Rack Power Load' : 'توان مصرفی کل تجهیزات رک'}
          </span>
          <span
            className="rack-power-spec text-[9px] text-slate-400 font-mono"
            style={{ color: '#cbd5e1' }}
          >
            230V AC • PF 0.85
          </span>
        </div>
      </div>

      {/* Dragging Active Overlay Feedback */}
      {draggingDevice && dragTargetU !== null && (
        <div
          className={`px-3 py-1 text-xs font-bold flex items-center justify-between transition-all ${
            dragCollision?.isBlocked
              ? 'bg-rose-950/90 text-rose-300 border-b border-rose-500/80 animate-pulse'
              : 'bg-emerald-950/90 text-emerald-300 border-b border-emerald-500/80'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {dragCollision?.isBlocked ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            ) : (
              <GripVertical className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span className="truncate">
              {draggingDevice.name}: U{dragTargetU}-U{dragTargetU + draggingDevice.heightU - 1}
            </span>
          </div>
          <span className="text-[10px] shrink-0 font-mono">
            {dragCollision?.isBlocked
              ? dragCollision.reason
              : isEn
              ? 'Release to drop'
              : 'رها کنید تا قرار گیرد'}
          </span>
        </div>
      )}

      {/* Main 19-Inch SVG Rack Cabinet */}
      <div className="relative p-2 bg-slate-950/60 flex justify-center">
        <div className="relative" style={{ width: RACK_WIDTH, height: rack.units * U_HEIGHT + 16 }}>
          <svg
            ref={rackSvgRef}
            width={RACK_WIDTH}
            height={rack.units * U_HEIGHT + 16}
            viewBox={`0 0 ${RACK_WIDTH} ${rack.units * U_HEIGHT + 16}`}
            className="overflow-visible"
          >
          <defs>
            <linearGradient id={`rail-grad-${rack.id}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <pattern id={`vent-pattern-${rack.id}`} width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.8" fill="#1e293b" />
            </pattern>
          </defs>

          {/* Outer Steel Cabinet Enclosure */}
          <rect
            x="0"
            y="0"
            width={RACK_WIDTH}
            height={rack.units * U_HEIGHT + 16}
            rx="4"
            fill="#090d16"
            stroke="#334155"
            strokeWidth="1.5"
          />

          {/* Left Vertical Mounting Rail (with U numbers) */}
          <rect
            x="4"
            y="8"
            width={RAIL_WIDTH}
            height={rack.units * U_HEIGHT}
            fill={`url(#rail-grad-${rack.id})`}
            stroke="#475569"
            strokeWidth="0.8"
          />
          {/* Right Vertical Mounting Rail */}
          <rect
            x={RACK_WIDTH - 4 - RAIL_WIDTH}
            y="8"
            width={RAIL_WIDTH}
            height={rack.units * U_HEIGHT}
            fill={`url(#rail-grad-${rack.id})`}
            stroke="#475569"
            strokeWidth="0.8"
          />

          {/* Loop from top unit (units) down to bottom unit (1) */}
          {Array.from({ length: rack.units }).map((_, idx) => {
            const uNumber = rack.units - idx; // U1 is bottom, U44 is top
            const yPos = 8 + idx * U_HEIGHT;
            const occupiedDevice = uOccupancyMap.get(uNumber);
            const isTopOccupied = topDeviceForU.get(uNumber);
            const isHovered = hoveredU === uNumber;

            return (
              <g key={`unit-slot-${uNumber}`} transform={`translate(0, ${yPos})`}>
                {/* Left Rail Mounting Holes & U Label */}
                <circle cx="10" cy={U_HEIGHT / 2 - 6} r="1.4" fill="#020617" stroke="#64748b" strokeWidth="0.5" />
                <circle cx="10" cy={U_HEIGHT / 2} r="1.4" fill="#020617" stroke="#64748b" strokeWidth="0.5" />
                <circle cx="10" cy={U_HEIGHT / 2 + 6} r="1.4" fill="#020617" stroke="#64748b" strokeWidth="0.5" />
                <text
                  x="20"
                  y={U_HEIGHT / 2 + 3}
                  fill={isHovered ? '#38bdf8' : '#94a3b8'}
                  fontSize="7"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {uNumber}
                </text>

                {/* Right Rail Mounting Holes & U Label */}
                <circle
                  cx={RACK_WIDTH - 10}
                  cy={U_HEIGHT / 2 - 6}
                  r="1.4"
                  fill="#020617"
                  stroke="#64748b"
                  strokeWidth="0.5"
                />
                <circle
                  cx={RACK_WIDTH - 10}
                  cy={U_HEIGHT / 2}
                  r="1.4"
                  fill="#020617"
                  stroke="#64748b"
                  strokeWidth="0.5"
                />
                <circle
                  cx={RACK_WIDTH - 10}
                  cy={U_HEIGHT / 2 + 6}
                  r="1.4"
                  fill="#020617"
                  stroke="#64748b"
                  strokeWidth="0.5"
                />
                <text
                  x={RACK_WIDTH - 20}
                  y={U_HEIGHT / 2 + 3}
                  fill={isHovered ? '#38bdf8' : '#94a3b8'}
                  fontSize="7"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {uNumber}
                </text>

                {/* Empty Slot Area: dashed boundary and hover action */}
                {!occupiedDevice && (
                  <g
                    className={!draggingDevice ? "cursor-pointer group" : "pointer-events-none"}
                    onMouseEnter={() => {
                      if (!draggingDevice) setHoveredU(uNumber);
                    }}
                    onMouseLeave={() => {
                      if (!draggingDevice) setHoveredU(null);
                    }}
                    onClick={(e) => {
                      if (draggingDevice) return;
                      e.stopPropagation();
                      onOpenAddHardware(rack.id, uNumber);
                    }}
                  >
                    <rect
                      x={4 + RAIL_WIDTH}
                      y="1"
                      width={RACK_WIDTH - 8 - RAIL_WIDTH * 2}
                      height={U_HEIGHT - 2}
                      fill={!draggingDevice && isHovered ? '#082f49' : '#040711'}
                      stroke={!draggingDevice && isHovered ? '#0ea5e9' : '#1e293b'}
                      strokeWidth={!draggingDevice && isHovered ? '1' : '0.5'}
                      strokeDasharray={!draggingDevice && isHovered ? undefined : '2 2'}
                    />
                    {!draggingDevice && isHovered && (
                      <g transform={`translate(${RACK_WIDTH / 2}, ${U_HEIGHT / 2 + 3})`}>
                        <text
                          fill="#38bdf8"
                          fontSize="8.5"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="sans-serif"
                        >
                          {isEn ? `+ Add Device to U${uNumber}` : `+ افزودن تجهیز به یونیت U${uNumber}`}
                        </text>
                      </g>
                    )}
                  </g>
                )}

                {/* If this U is the TOP of a mounted device, render the device covering heightU * U_HEIGHT */}
                {isTopOccupied && (
                  <g
                    transform={`translate(${4 + RAIL_WIDTH - 12}, 0)`}
                    className="cursor-pointer"
                    onMouseEnter={() => {
                      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                      if (!draggingDevice) {
                        setHoveredMountedDev({ dev: isTopOccupied, yPos, uNumber });
                      }
                    }}
                    onMouseLeave={() => {
                      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = setTimeout(() => {
                        setHoveredMountedDev(null);
                      }, 250);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectDevice) onSelectDevice(isTopOccupied, rack);
                    }}
                  >
                    {(() => {
                      const cleanOccupiedId = isTopOccupied.id.replace(/^hw-/, '');
                      const isDevNeonHighlighted =
                        Boolean(neonHighlight) &&
                        Boolean(
                          neonHighlight!.targetAliases.includes(isTopOccupied.id) ||
                          neonHighlight!.targetAliases.includes(cleanOccupiedId) ||
                          neonHighlight!.targetAliases.includes(`hw-${cleanOccupiedId}`) ||
                          (neonHighlight!.targetName && isTopOccupied.name && isTopOccupied.name.trim().toLowerCase() === neonHighlight!.targetName) ||
                          (neonHighlight!.targetIp && isTopOccupied.ip && isTopOccupied.ip.trim() === neonHighlight!.targetIp)
                        );

                      return (
                        <foreignObject
                          x="0"
                          y="0"
                          width={RACK_WIDTH - 8 - RAIL_WIDTH * 2 + 24}
                          height={isTopOccupied.heightU * U_HEIGHT}
                          className="overflow-visible"
                        >
                          <div
                            className={`relative ${
                              draggingDevice?.id === isTopOccupied.id ? 'opacity-40 filter grayscale' : ''
                            } ${isDevNeonHighlighted ? 'z-50 scale-[1.02] transition-transform' : ''}`}
                          >
                            <HardwareSvgRenderer
                              device={isTopOccupied}
                              viewMode={rack.viewMode}
                              width={RACK_WIDTH - 8 - RAIL_WIDTH * 2 + 24}
                              height={isTopOccupied.heightU * U_HEIGHT}
                              isHighlighted={isDevNeonHighlighted || selectedDeviceId === isTopOccupied.id || hoveredMountedDev?.dev.id === isTopOccupied.id}
                            />

                            {/* Rotating Neon Border Beam travelling cleanly around the hardware slot */}
                            {isDevNeonHighlighted && (
                              <>
                                <div className="absolute -inset-[3px] pointer-events-none rounded-[6px] overflow-hidden z-40">
                                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                    <defs>
                                      <filter id={`neon-rack-beam-glow-${isTopOccupied.id}`} x="-30%" y="-30%" width="160%" height="160%">
                                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                                        <feMerge>
                                          <feMergeNode in="blur" />
                                          <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                      </filter>
                                    </defs>
                                    <rect
                                      x="1.5"
                                      y="1.5"
                                      width="calc(100% - 3px)"
                                      height="calc(100% - 3px)"
                                      rx="5"
                                      fill="none"
                                      stroke={neonHighlight!.colorHex}
                                      strokeOpacity="0.3"
                                      strokeWidth="1.5"
                                    />
                                    <rect
                                      x="1.5"
                                      y="1.5"
                                      width="calc(100% - 3px)"
                                      height="calc(100% - 3px)"
                                      rx="5"
                                      fill="none"
                                      stroke={neonHighlight!.colorHex}
                                      strokeWidth="3.5"
                                      pathLength="100"
                                      strokeDasharray="25 75"
                                      strokeLinecap="round"
                                      className="neon-border-beam-anim"
                                      filter={`url(#neon-rack-beam-glow-${isTopOccupied.id})`}
                                    />
                                    <rect
                                      x="1.5"
                                      y="1.5"
                                      width="calc(100% - 3px)"
                                      height="calc(100% - 3px)"
                                      rx="5"
                                      fill="none"
                                      stroke="#ffffff"
                                      strokeWidth="2"
                                      pathLength="100"
                                      strokeDasharray="12 88"
                                      strokeLinecap="round"
                                      className="neon-border-beam-anim"
                                    />
                                  </svg>
                                </div>
                                <div
                                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold font-mono flex items-center gap-1 shadow-2xl pointer-events-none z-50 whitespace-nowrap border border-white/60"
                                  style={{
                                    backgroundColor: neonHighlight!.colorHex,
                                    color: ['#ffff00', '#ffee00', '#39ff14', '#00ffd5'].includes(neonHighlight!.colorHex) ? '#020617' : '#ffffff',
                                    boxShadow: `0 0 12px ${neonHighlight!.colorHex}`,
                                  }}
                                >
                                  <Sparkles className="w-2.5 h-2.5 animate-spin" />
                                  <span>{isEn ? 'Target Hardware' : 'تجهیز هدف'}</span>
                                  <span className="text-[8px] opacity-90 px-1 rounded bg-black/40 font-mono">U{isTopOccupied.startU}</span>
                                  <span className="text-[8px] opacity-85 px-0.5 rounded bg-black/40 font-mono">3s</span>
                                </div>
                              </>
                            )}
                          </div>
                        </foreignObject>
                      );
                    })()}
                  </g>
                )}
              </g>
            );
          })}

          {/* Render Drag Ghost Preview when actively dragging */}
          {draggingDevice && dragTargetU !== null && (
            <g
              transform={`translate(${4 + RAIL_WIDTH - 12}, ${
                8 + (rack.units - (dragTargetU + draggingDevice.heightU - 1)) * U_HEIGHT
              })`}
              className="pointer-events-none"
            >
              <rect
                x="0"
                y="0"
                width={RACK_WIDTH - 8 - RAIL_WIDTH * 2 + 24}
                height={draggingDevice.heightU * U_HEIGHT}
                rx="2"
                fill={dragCollision?.isBlocked ? 'rgba(244, 63, 94, 0.35)' : 'rgba(34, 211, 238, 0.35)'}
                stroke={dragCollision?.isBlocked ? '#f43f5e' : '#22d3ee'}
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              <text
                x={(RACK_WIDTH - 8 - RAIL_WIDTH * 2 + 24) / 2}
                y={(draggingDevice.heightU * U_HEIGHT) / 2 + 4}
                fill="#ffffff"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="sans-serif"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}
              >
                {dragCollision?.isBlocked
                  ? `🚫 ${dragCollision.reason}`
                  : `✓ U${dragTargetU} - U${dragTargetU + draggingDevice.heightU - 1}`}
              </text>
            </g>
          )}
        </svg>

        {/* Exact-size Device Highlight Outline directly on the device */}
        {hoveredMountedDev && !draggingDevice && (
          <div
            style={{
              position: 'absolute',
              top: `${hoveredMountedDev.yPos}px`,
              left: `${4 + RAIL_WIDTH - 12}px`,
              width: `${RACK_WIDTH - 8 - RAIL_WIDTH * 2 + 24}px`,
              height: `${hoveredMountedDev.dev.heightU * U_HEIGHT}px`,
              pointerEvents: 'none',
              zIndex: 45,
            }}
            className="rack-device-hover-highlight rounded border-2 border-cyan-400 bg-cyan-400/5 shadow-[0_0_15px_rgba(34,211,238,0.35)] transition-all"
          />
        )}

        {/* Elevated Floating Quick Actions Menu with high z-index (renders ABOVE all units, never clipped) */}
        {hoveredMountedDev && !draggingDevice && (
          <div
            style={{
              position: 'absolute',
              top: `${
                hoveredMountedDev.yPos <= 65
                  ? hoveredMountedDev.yPos + hoveredMountedDev.dev.heightU * U_HEIGHT + 4
                  : hoveredMountedDev.yPos - 66
              }px`,
              left: '8px',
              width: `${RACK_WIDTH - 16}px`,
              zIndex: 50,
            }}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            }}
            onMouseLeave={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = setTimeout(() => {
                setHoveredMountedDev(null);
              }, 200);
            }}
            className="pointer-events-auto animate-fade-in"
          >
            <div className="rack-device-hover-card w-full bg-slate-900/98 border border-cyan-500/70 rounded-xl p-1.5 shadow-2xl backdrop-blur-md ring-1 ring-cyan-500/30 text-xs flex flex-col gap-1.5 box-border overflow-hidden">
              {/* Row 1: U Slot, Device identity, and Quick Move */}
              <div className="flex items-center justify-between gap-1 border-b border-slate-800/80 pb-1 px-0.5">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <div
                    onMouseDown={(e) => handleStartDrag(e, hoveredMountedDev.dev)}
                    className="rack-btn-drag p-1 rounded cursor-grab active:cursor-grabbing hover:bg-slate-800 text-cyan-400 hover:text-cyan-200 transition shrink-0"
                    title={isEn ? 'Drag to move in rack' : 'درگ برای جابه‌جایی در رک'}
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                  <span className="rack-dev-ubadge px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-700/50 shrink-0">
                    U{hoveredMountedDev.dev.startU}
                    {hoveredMountedDev.dev.heightU > 1
                      ? `-${hoveredMountedDev.dev.startU + hoveredMountedDev.dev.heightU - 1}`
                      : ''}
                  </span>
                  <span
                    className="rack-dev-title text-[11px] font-bold text-white truncate max-w-[140px]"
                    title={hoveredMountedDev.dev.name || hoveredMountedDev.dev.model}
                  >
                    {hoveredMountedDev.dev.name || hoveredMountedDev.dev.model}
                  </span>
                  {hoveredMountedDev.dev.model && hoveredMountedDev.dev.name !== hoveredMountedDev.dev.model && (
                    <span className="rack-dev-model text-[10px] text-slate-300 font-mono truncate max-w-[90px]">
                      {hoveredMountedDev.dev.model}
                    </span>
                  )}
                </div>

                {/* Move Up/Down with multi-unit selector */}
                <div className="flex items-center gap-0.5 shrink-0 bg-slate-950/80 border border-slate-800 rounded-md p-0.5">
                  <button
                    type="button"
                    onClick={(e) => handleQuickMove(e, hoveredMountedDev.dev, 'up', moveStepUnits)}
                    disabled={
                      !checkCollision(hoveredMountedDev.dev, hoveredMountedDev.dev.startU + moveStepUnits) ||
                      checkCollision(hoveredMountedDev.dev, hoveredMountedDev.dev.startU + moveStepUnits).isBlocked
                    }
                    className="rack-btn-chevron p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-300 disabled:opacity-20 disabled:cursor-not-allowed transition"
                    title={
                      isEn
                        ? `Move Up ${moveStepUnits}U (Click to move)`
                        : `انتقال ${moveStepUnits} یونیت به بالا`
                    }
                  >
                    <ChevronUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>

                  {/* Step unit selector (1U / 2U / 3U / 4U / 5U) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoveStepUnits((prev) => {
                        if (prev === 1) return 2;
                        if (prev === 2) return 3;
                        if (prev === 3) return 4;
                        if (prev === 4) return 5;
                        return 1;
                      });
                    }}
                    className="rack-btn-step px-1 py-0.5 text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/60 rounded transition select-none shrink-0 leading-none"
                    title={
                      isEn
                        ? `Move step: ${moveStepUnits}U (click to toggle 1U-5U)`
                        : `گام جابه‌جایی: ${moveStepUnits} یونیت (کلیک برای تغییر ۱ تا ۵ یونیت)`
                    }
                  >
                    {moveStepUnits}U
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleQuickMove(e, hoveredMountedDev.dev, 'down', moveStepUnits)}
                    disabled={
                      !checkCollision(hoveredMountedDev.dev, hoveredMountedDev.dev.startU - moveStepUnits) ||
                      checkCollision(hoveredMountedDev.dev, hoveredMountedDev.dev.startU - moveStepUnits).isBlocked
                    }
                    className="rack-btn-chevron p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-300 disabled:opacity-20 disabled:cursor-not-allowed transition"
                    title={
                      isEn
                        ? `Move Down ${moveStepUnits}U (Click to move)`
                        : `انتقال ${moveStepUnits} یونیت به پایین`
                    }
                  >
                    <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Row 2: Action Buttons - neatly fitted without overflowing! */}
              <div className="flex items-center justify-between gap-1 px-0.5 w-full">
                {/* 1. Properties */}
                {(onEditDeviceProperties || onEditSpecs) && (
                  <button
                    type="button"
                    title={isEn ? 'Edit Device Properties' : 'مشخصات دستگاه (Properties)'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onEditDeviceProperties) {
                        onEditDeviceProperties(hoveredMountedDev.dev, rack);
                      } else if (onEditSpecs) {
                        onEditSpecs(hoveredMountedDev.dev, rack);
                      }
                    }}
                    className="rack-btn-props h-6 px-1.5 rounded-md bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 hover:text-cyan-100 border border-cyan-700/60 flex items-center justify-center gap-1 text-[10px] font-medium transition cursor-pointer shrink-0 whitespace-nowrap leading-none"
                  >
                    <Edit3 className="w-3 h-3 shrink-0" />
                    <span>{isEn ? 'Props' : 'مشخصات'}</span>
                  </button>
                )}

                {/* 2. Config */}
                {onEditDeviceNic && (
                  <button
                    type="button"
                    title={isEn ? 'Configure Network Cards & Ports' : 'کانفیگ کارت‌های شبکه و پورت‌ها (Config)'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditDeviceNic(hoveredMountedDev.dev, rack);
                    }}
                    className="rack-btn-config h-6 px-1.5 rounded-md bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 hover:text-emerald-100 border border-emerald-700/60 flex items-center justify-center gap-1 text-[10px] font-medium transition cursor-pointer shrink-0 whitespace-nowrap leading-none"
                  >
                    <Network className="w-3 h-3 shrink-0" />
                    <span>{isEn ? 'Config' : 'کانفیگ'}</span>
                  </button>
                )}

                {/* 3. CLI */}
                {onConnectTerminal && (
                  <button
                    type="button"
                    title={isEn ? 'Open CLI Terminal' : 'ترمینال و خط فرمان (CLI)'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onConnectTerminal(hoveredMountedDev.dev, rack);
                    }}
                    className="rack-btn-cli h-6 px-1.5 rounded-md bg-purple-950/90 hover:bg-purple-900 text-purple-300 hover:text-purple-100 border border-purple-700/60 flex items-center justify-center gap-1 text-[10px] font-medium transition cursor-pointer shrink-0 whitespace-nowrap leading-none"
                  >
                    <Terminal className="w-3 h-3 shrink-0" />
                    <span>CLI</span>
                  </button>
                )}

                {/* 4. Port */}
                {onInspectPorts && (
                  <button
                    type="button"
                    title={isEn ? 'Inspect Physical Ports' : 'مشاهده و بررسی پورت‌ها (Port)'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectPorts(hoveredMountedDev.dev, rack);
                    }}
                    className="rack-btn-port h-6 px-1.5 rounded-md bg-amber-950/90 hover:bg-amber-900 text-amber-300 hover:text-amber-100 border border-amber-700/60 flex items-center justify-center gap-1 text-[10px] font-medium transition cursor-pointer shrink-0 whitespace-nowrap leading-none"
                  >
                    <Layers className="w-3 h-3 shrink-0" />
                    <span>{isEn ? 'Port' : 'پورت'}</span>
                  </button>
                )}

                <div className="h-4 w-px bg-slate-800 shrink-0 my-auto" />

                {/* Card View Switch with Neon Highlight */}
                {onViewInCardMode && (
                  <button
                    type="button"
                    title={isEn ? 'Switch to Card View & Highlight Device (Neon)' : 'مشاهده در نمای کارتی و هایلایت نئونی دیوایس'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewInCardMode(hoveredMountedDev.dev, rack);
                    }}
                    className="rack-btn-card h-6 px-1.5 rounded-md bg-purple-950/90 hover:bg-purple-900 text-purple-300 hover:text-purple-100 border border-purple-700/60 flex items-center justify-center gap-1 text-[10px] font-medium transition cursor-pointer shrink-0 whitespace-nowrap leading-none shadow-sm"
                  >
                    <CreditCard className="w-3 h-3 shrink-0" />
                    <span>{isEn ? 'Card' : 'کارت'}</span>
                  </button>
                )}

                {/* 5. Transfer Device */}
                {onTransferDevice && (
                  <button
                    type="button"
                    title={isEn ? 'Transfer to another Rack' : 'انتقال دیوایس به رک دیگر'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTransferDevice(hoveredMountedDev.dev, rack);
                    }}
                    className="rack-btn-transfer w-6 h-6 rounded-md bg-sky-950/80 hover:bg-sky-900 text-sky-300 hover:text-sky-100 border border-sky-700/60 flex items-center justify-center transition cursor-pointer shrink-0"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                  </button>
                )}

                {/* 6. Delete */}
                {(onPromptRemoveDevice || onRemoveDevice) && (
                  <button
                    type="button"
                    title={isEn ? 'Remove from Rack' : 'حذف از رک (Delete)'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onPromptRemoveDevice) {
                        onPromptRemoveDevice(hoveredMountedDev.dev, rack);
                      } else if (onRemoveDevice) {
                        setLocalConfirmDeleteDev(hoveredMountedDev.dev);
                      }
                    }}
                    className="rack-btn-delete w-6 h-6 rounded-md bg-rose-950/80 hover:bg-rose-900 text-rose-400 hover:text-rose-100 border border-rose-800/60 flex items-center justify-center transition cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Local fallback confirmation modal in case onPromptRemoveDevice wasn't passed */}
        {localConfirmDeleteDev && (
          <div
            className="absolute inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rack-delete-confirm-card bg-slate-900 border border-slate-700 rounded-xl p-4 max-w-xs shadow-2xl text-center space-y-3 animate-scale-up">
              <div className="w-9 h-9 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="rack-delete-confirm-title text-xs font-bold text-white">
                  {isEn ? 'Remove Device from Rack?' : 'حذف تجهیز از داخل رک؟'}
                </h4>
                <p className="rack-delete-confirm-desc text-[11px] text-slate-300 mt-1 leading-relaxed">
                  {isEn
                    ? `Are you sure you want to remove "${localConfirmDeleteDev.name}" from ${rack.name}?`
                    : `آیا از حذف تجهیز «${localConfirmDeleteDev.name}» از داخل رک «${rack.name}» اطمینان دارید؟`}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setLocalConfirmDeleteDev(null)}
                  className="rack-delete-cancel-btn px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'انصراف'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onRemoveDevice) {
                      onRemoveDevice(rack.id, localConfirmDeleteDev.id);
                    }
                    setLocalConfirmDeleteDev(null);
                    setHoveredMountedDev(null);
                  }}
                  className="rack-delete-confirm-btn px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg cursor-pointer"
                >
                  {isEn ? 'Confirm Remove' : 'تایید و حذف'}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Bottom Rack Plinth / Floor Stand */}
      <div className="px-4 py-2 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{isEn ? 'Standard Anti-Vibration Base & Earth Grounding' : 'پایه ضدلرزش و ارتینگ استاندارد'}</span>
        </div>
        <span className="font-mono text-slate-500">19" EIA-310-D</span>
      </div>
    </div>
  );
};
