import React, { useState, useRef, useLayoutEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Layers, CheckCircle2, AlertCircle, Shield, Cable, RefreshCw } from 'lucide-react';
import { Device, SwitchPort } from '../../types';
import { NetworkPortSvg } from '../NetworkPortSvg';
import { MikroTikPortSvg } from '../MikroTikPortSvg';
import { WinBoxLauncherModal } from './WinBoxLauncherModal';
import { useLanguage } from '../../i18n/LanguageContext';

export interface CompactTerminalFaceplateProps {
  device: Device;
  ports: SwitchPort[];
  isMikroTik?: boolean;
  isLightMode?: boolean;
  onPortClick?: (port: SwitchPort, e: React.MouseEvent) => void;
  selectedPortId?: string | null;
  selectedPortIds?: string[];
  defaultExpanded?: boolean;
  onSyncPorts?: () => void;
  isSyncing?: boolean;
}

export const CompactTerminalFaceplate: React.FC<CompactTerminalFaceplateProps> = ({
  device,
  ports,
  isMikroTik = false,
  isLightMode = false,
  onPortClick,
  selectedPortId,
  selectedPortIds,
  defaultExpanded = true,
  onSyncPorts,
  isSyncing = false,
}) => {
  const { isEn } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isWinBoxModalOpen, setIsWinBoxModalOpen] = useState(false);
  const [activeHoverPort, setActiveHoverPort] = useState<SwitchPort | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

  const isActuallyMikroTik = Boolean(
    isMikroTik ||
    (device?.vendor && device.vendor.toLowerCase().includes('mikrotik')) ||
    (device?.role && device.role.toLowerCase().includes('mikrotik')) ||
    (device?.model && device.model.toLowerCase().includes('mikrotik')) ||
    ((device as any)?.device_type && String((device as any).device_type).toLowerCase().includes('mikrotik')) ||
    ((device as any)?.os_type && String((device as any).os_type).toLowerCase().includes('routeros'))
  );

  const handleOpenWinBox = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetHost = (device.ssh_host || device.ip || '').trim();
    const username = (device.ssh_username || 'admin').trim();
    const password = device.ssh_password || '';
    const winboxPort = (device as any).winbox_port || 8291;

    // Immediately trigger winbox:// protocol in background
    if (targetHost) {
      const uri = password
        ? `winbox://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${targetHost}:${winboxPort}`
        : `winbox://${encodeURIComponent(username)}@${targetHost}:${winboxPort}`;

      try {
        const a = document.createElement('a');
        a.href = uri;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) {
            document.body.removeChild(a);
          }
        }, 300);
      } catch (err) {
        console.warn('WinBox protocol launch error:', err);
      }
    }

    // Open helper modal for user convenience & fallback options
    setIsWinBoxModalOpen(true);
  };

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number; arrowLeft: number } | null>(null);

  useLayoutEffect(() => {
    if (!activeHoverPort || !hoverCoords) {
      setTooltipPos(null);
      return;
    }

    const portCenterX = hoverCoords.x;
    const portBottomY = hoverCoords.y;
    const padding = 12;
    const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const tooltipWidth = tooltipRef.current?.offsetWidth || 320;

    let left = portCenterX - tooltipWidth / 2;
    if (left < padding) {
      left = padding;
    } else if (left + tooltipWidth > winWidth - padding) {
      left = Math.max(padding, winWidth - padding - tooltipWidth);
    }

    const arrowLeft = Math.max(14, Math.min(portCenterX - left, tooltipWidth - 14));

    setTooltipPos({ left, top: portBottomY, arrowLeft });
  }, [activeHoverPort, hoverCoords]);

  if (!ports || ports.length === 0) {
    return null;
  }

  const isPortUp = (p: SwitchPort) => {
    const s = String(p.status || '').toLowerCase().trim();
    const a = String(p.admin_status || '').toLowerCase().trim();
    const isDis = a === 'disabled' || a === 'shutdown' || s === 'disabled' || s === 'err-disabled' || s === 'administratively down';
    return !isDis && (s === 'up' || s === 'connected' || s === 'active' || s === 'running');
  };
  const isPortDisabled = (p: SwitchPort) => {
    const s = String(p.status || '').toLowerCase().trim();
    const a = String(p.admin_status || '').toLowerCase().trim();
    return a === 'disabled' || a === 'shutdown' || s === 'disabled' || s === 'err-disabled' || s === 'administratively down';
  };

  const upCount = ports.filter(isPortUp).length;
  const disabledCount = ports.filter(isPortDisabled).length;
  const downCount = ports.filter((p) => !isPortUp(p) && !isPortDisabled(p)).length;
  const trunkCount = ports.filter((p) => String(p.mode || '').toLowerCase().trim() === 'trunk').length;

  const currentSelectedPort = selectedPortId
    ? ports.find((p) => (p.port_id || (p as any).port || p.name) === selectedPortId)
    : undefined;
  const displayPort = activeHoverPort || currentSelectedPort;
  const multiSelectedCount = Array.isArray(selectedPortIds) ? selectedPortIds.length : 0;

  const portRows = useMemo(() => {
    const rows: SwitchPort[][] = [];
    for (let i = 0; i < ports.length; i += 24) {
      rows.push(ports.slice(i, i + 24));
    }
    return rows;
  }, [ports]);

  return (
    <div
      className={`border-b shrink-0 transition-colors select-none ${
        isLightMode
          ? 'bg-slate-100 border-slate-300 text-slate-800'
          : 'bg-slate-950/90 border-slate-800 text-slate-200'
      }`}
    >
      {/* Faceplate Header Strip - Strict fixed height to eliminate jitter / layout shift */}
      <div className="flex items-center justify-between px-3 h-9 text-xs flex-nowrap gap-2 overflow-hidden">
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 font-bold hover:text-indigo-400 transition cursor-pointer shrink-0"
            title={isExpanded ? (isEn ? 'Collapse Faceplate' : 'بستن نمای پورت‌ها') : (isEn ? 'Expand Faceplate' : 'باز کردن نمای پورت‌ها')}
          >
            <Layers className={`w-3.5 h-3.5 ${isMikroTik ? 'text-cyan-400' : 'text-indigo-400'}`} />
            <span className="font-mono text-[11px] whitespace-nowrap">
              {isEn ? 'Hardware Port Faceplate' : 'پورت‌های گرافیکی دیوایس'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 opacity-60" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            )}
          </button>

          {/* Interactive Port Count & Resync Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!isSyncing && onSyncPorts) {
                onSyncPorts();
              }
            }}
            disabled={isSyncing}
            className={`group/sync flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded transition-all shadow-xs border shrink-0 ${
              isSyncing
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40 cursor-wait'
                : 'bg-slate-800 hover:bg-indigo-600 text-white border-slate-700 hover:border-indigo-400 active:scale-95 cursor-pointer'
            }`}
            title={
              isEn
                ? 'Click to sync & verify interface statuses via SSH tunnel'
                : 'کلیک جهت بررسی و همگام‌سازی وضعیت پورت‌ها از طریق تانل SSH'
            }
          >
            <RefreshCw
              className={`w-3 h-3 ${
                isSyncing
                  ? 'animate-spin text-cyan-400'
                  : 'text-slate-400 group-hover/sync:text-white transition-transform group-hover/sync:rotate-180'
              }`}
            />
            <span style={{ color: '#ffffff', fontWeight: 'bold' }}>
              {ports.length} {isEn ? 'Ports' : 'پورت'}
            </span>
            <span className="text-[9px] text-cyan-300/90 font-sans border-l border-slate-600 pl-1 group-hover/sync:text-white">
              {isSyncing ? (isEn ? 'Syncing...' : 'بررسی...') : (isEn ? 'Sync' : 'بررسی')}
            </span>
          </button>

          {/* WinBox Native App Launcher Button (Strictly for MikroTik only) */}
          {isActuallyMikroTik && (
            <button
              type="button"
              id="faceplate-winbox-btn"
              onClick={handleOpenWinBox}
              className={`group/wb flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded transition-all shadow-xs border shrink-0 cursor-pointer ${
                isLightMode
                  ? 'bg-sky-50 hover:bg-sky-600 text-sky-800 hover:text-white border-sky-300 hover:border-sky-500 shadow-sky-100'
                  : 'bg-sky-950/80 hover:bg-sky-600 text-sky-200 hover:text-white border-sky-600/50 hover:border-sky-400'
              } active:scale-95`}
              title={
                isEn
                  ? `Launch WinBox on your PC for ${device.name || device.ip} (${device.ip || 'No IP'})`
                  : `اجرای نرم‌افزار WinBox نصب شده روی سیستم شما برای ${device.name || device.ip} (${device.ip || 'بدون IP'})`
              }
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 group-hover/wb:scale-110 transition-transform" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="4" fill="#0284c7" />
                <path d="M6 7h3l2 7 2-5 2 5 2-7h3l-3.5 11h-2.5l-2-5-2 5H9L6 7z" fill="white" />
              </svg>
              <span className="font-bold">WinBox</span>
            </button>
          )}

          {/* Status Counts */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono shrink-0">
            <span className={`flex items-center gap-1 font-semibold ${isLightMode ? 'text-emerald-700' : 'text-emerald-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLightMode ? 'bg-emerald-600' : 'bg-emerald-400 shadow-xs shadow-emerald-400'}`}></span>
              {upCount} UP
            </span>
            <span className={isLightMode ? 'text-slate-400' : 'text-slate-500'}>•</span>
            <span className={`flex items-center gap-1 font-semibold ${isLightMode ? 'text-rose-700' : 'text-rose-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLightMode ? 'bg-rose-600' : 'bg-rose-400'}`}></span>
              {downCount} DOWN
            </span>
            {trunkCount > 0 && (
              <>
                <span className={isLightMode ? 'text-slate-400' : 'text-slate-500'}>•</span>
                <span className={`font-bold ${isLightMode ? 'text-purple-700' : 'text-purple-400'}`}>{trunkCount} TRUNK</span>
              </>
            )}
          </div>
        </div>

        {/* Center: Active / Hovered / Selected Port Detail Pill - High Contrast & Light Theme Compatible */}
        <div className="flex-1 min-w-0 flex items-center justify-center px-1 overflow-hidden pointer-events-none">
          {multiSelectedCount > 1 && !activeHoverPort ? (
            <div
              className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-mono shrink-0 shadow-xs border transition-all ${
                isLightMode
                  ? 'bg-white border-indigo-300 text-indigo-950 shadow-slate-200'
                  : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isLightMode ? 'bg-indigo-600' : 'bg-cyan-400'} animate-pulse`} />
              <span className={`font-bold ${isLightMode ? 'text-indigo-950' : 'text-white'}`}>
                {isEn ? `${multiSelectedCount} Ports Selected (Range)` : `${multiSelectedCount} پورت در رنج انتخابی`}
              </span>
            </div>
          ) : displayPort ? (
            <div
              className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-mono shrink-0 shadow-xs border transition-all ${
                isLightMode
                  ? 'bg-white border-slate-300 text-slate-900 shadow-slate-200/80'
                  : 'bg-slate-900/95 border-slate-700/80 text-slate-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  displayPort.status === 'up'
                    ? 'bg-emerald-500 shadow-xs shadow-emerald-500'
                    : 'bg-rose-500'
                }`}
              />
              <span className={`font-bold ${isLightMode ? 'text-slate-950' : 'text-white'}`}>
                {displayPort.port_id}
              </span>
              <span className={isLightMode ? 'text-slate-300' : 'text-slate-600'}>•</span>
              <span
                className={`font-bold ${
                  (displayPort.status || '').toLowerCase() === 'up'
                    ? isLightMode
                      ? 'text-emerald-700'
                      : 'text-emerald-400'
                    : isLightMode
                    ? 'text-rose-700'
                    : 'text-rose-400'
                }`}
              >
                {(displayPort.status || 'down').toUpperCase()}
              </span>
              <span className={isLightMode ? 'text-slate-300' : 'text-slate-600'}>•</span>
              <span className={`font-semibold ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                VLAN {displayPort.vlan ?? 1} ({((displayPort.mode || 'access')).toUpperCase()})
              </span>
              {displayPort.connected_device && displayPort.connected_device !== 'Disconnected' && (
                <>
                  <span className={isLightMode ? 'text-slate-300' : 'text-slate-600'}>•</span>
                  <span
                    className={`truncate max-w-[130px] font-bold ${
                      isLightMode ? 'text-indigo-700' : 'text-cyan-300'
                    }`}
                    title={displayPort.connected_device}
                  >
                    {displayPort.connected_device}
                  </span>
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-400 hidden lg:inline">
            {isEn ? 'Click port to insert • Ctrl+Click for range' : 'کلیک جهت درج • Ctrl+کلیک برای رنج'}
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title={isExpanded ? (isEn ? 'Collapse' : 'بستن') : (isEn ? 'Expand' : 'باز کردن')}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Faceplate Chassis Container with 50% scale ports */}
      {isExpanded && (
        <div className="px-3 pb-2 pt-0.5">
          <div
            onScroll={() => {
              if (activeHoverPort) {
                setActiveHoverPort(null);
                setHoverCoords(null);
              }
            }}
            className={`rounded-lg p-2 border shadow-inner overflow-x-auto custom-scrollbar ${
              isLightMode
                ? 'bg-slate-200/90 border-slate-300'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <div className="flex flex-col gap-2 min-w-max py-0.5">
              {portRows.map((row, rowIdx) => (
                <div key={rowIdx} className="flex items-center gap-1.5">
                  {row.map((port, pIdx) => {
                    const globalIdx = rowIdx * 24 + pIdx;
                    const pId = port.port_id || (port as any).port || port.name || `port-${globalIdx + 1}`;
                    const isSelected = Boolean(
                      pId && (
                        (selectedPortId && selectedPortId === pId) ||
                        (Array.isArray(selectedPortIds) && selectedPortIds.length > 0 && selectedPortIds.includes(pId))
                      )
                    );
                    const isHovered = Boolean(
                      activeHoverPort &&
                      (activeHoverPort.port_id || (activeHoverPort as any).port || activeHoverPort.name) === pId
                    );

                    return (
                      <div
                        key={pId}
                        onClick={(e) => onPortClick?.(port, e)}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoverCoords({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
                          setActiveHoverPort(port);
                        }}
                        onMouseLeave={() => {
                          setActiveHoverPort((cur) => {
                            if (!cur) return null;
                            const curId = cur.port_id || (cur as any).port || cur.name;
                            return curId === pId ? null : cur;
                          });
                          setHoverCoords(null);
                        }}
                        className={`cursor-pointer shrink-0 rounded transition-shadow ${
                          isSelected
                            ? isMikroTik
                              ? 'ring-2 ring-cyan-400 z-20 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                              : 'ring-2 ring-indigo-400 z-20 shadow-[0_0_8px_rgba(129,140,248,0.6)]'
                            : isHovered
                            ? 'ring-2 ring-slate-400/80 z-10'
                            : 'hover:ring-1 hover:ring-slate-500/60'
                        }`}
                        style={{
                          width: isMikroTik ? '64px' : '56px',
                          height: isMikroTik ? '84px' : '80px',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            transform: 'scale(1)',
                            transformOrigin: 'top left',
                            width: isMikroTik ? '64px' : '56px',
                            pointerEvents: 'none',
                          }}
                        >
                          {isMikroTik ? (
                            <MikroTikPortSvg
                              port={port}
                              isSelected={isSelected}
                              isLightMode={isLightMode}
                            />
                          ) : (
                            <NetworkPortSvg
                              port={port}
                              isSelected={isSelected}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Completely unclipped, high-z-index floating tooltip positioned below the hovered port */}
      {activeHoverPort && hoverCoords && (() => {
        const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
        const defaultLeft = Math.max(12, Math.min(hoverCoords.x - 160, winWidth - 340));
        const currentLeft = tooltipPos ? tooltipPos.left : defaultLeft;
        const currentTop = tooltipPos ? tooltipPos.top : hoverCoords.y;
        const currentArrowLeft = tooltipPos ? tooltipPos.arrowLeft : Math.max(14, Math.min(hoverCoords.x - defaultLeft, 306));

        return (
          <div
            ref={tooltipRef}
            className="pointer-events-none fixed z-[99999] px-3 py-1.5 rounded-lg bg-slate-900/95 border border-cyan-500/60 shadow-2xl text-[11px] font-mono text-white whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: `${currentLeft}px`,
              top: `${currentTop}px`,
              filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.8))',
            }}
          >
            {/* Arrow pointing up towards port */}
            <div
              className="absolute -top-1.5 -translate-x-1/2 w-3 h-3 rotate-45 bg-slate-900 border-t border-l border-cyan-500/60"
              style={{ left: `${currentArrowLeft}px` }}
            />

            <div className="relative z-10 flex items-center gap-2 font-bold">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  (activeHoverPort.status || '').toLowerCase() === 'up'
                    ? 'bg-emerald-400 shadow-xs shadow-emerald-400'
                    : 'bg-rose-400'
                }`}
              />
              <span className="text-cyan-300 font-bold">{activeHoverPort.port_id || activeHoverPort.name || 'Port'}</span>
              {activeHoverPort.name && activeHoverPort.name !== activeHoverPort.port_id && (
                <span className="text-slate-400 text-[10px]">({activeHoverPort.name})</span>
              )}
              <span className="opacity-40">•</span>
              <span className={(activeHoverPort.status || '').toLowerCase() === 'up' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {(activeHoverPort.status || 'down').toUpperCase()}
              </span>
              <span className="opacity-40">•</span>
              <span className="text-amber-300">VLAN {activeHoverPort.vlan ?? 1}</span>
              <span className="opacity-40">•</span>
              <span className="text-purple-300">{(activeHoverPort.mode || 'access').toUpperCase()}</span>
            </div>

            {activeHoverPort.connected_device && activeHoverPort.connected_device !== 'Disconnected' && (
              <div className="relative z-10 text-[10px] text-slate-300 mt-1 flex items-center gap-1.5 border-t border-slate-800 pt-1">
                <Cable className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="text-slate-400">{isEn ? 'Connected:' : 'متصل به:'}</span>
                <span className="text-white font-semibold truncate max-w-[220px]">{activeHoverPort.connected_device}</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* WinBox Launcher & Configuration Helper Modal (Strictly for MikroTik only) */}
      {isActuallyMikroTik && isWinBoxModalOpen && (
        <WinBoxLauncherModal
          device={device}
          isOpen={isWinBoxModalOpen}
          onClose={() => setIsWinBoxModalOpen(false)}
          isLightMode={isLightMode}
        />
      )}
    </div>
  );
};
