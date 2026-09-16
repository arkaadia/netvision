import React from 'react';
import { SwitchPort } from '../types';

interface NetworkPortSvgProps {
  port: SwitchPort;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const NetworkPortSvg: React.FC<NetworkPortSvgProps> = ({
  port,
  isSelected = false,
  onClick,
  onContextMenu,
}) => {
  if (!port) return null;

  const rawStatus = String(port.status || '').toLowerCase().trim();
  const rawAdmin = String(port.admin_status || '').toLowerCase().trim();

  const isDisabled =
    rawAdmin === 'disabled' ||
    rawAdmin === 'shutdown' ||
    rawStatus === 'disabled' ||
    rawStatus === 'err-disabled' ||
    rawStatus === 'administratively down';

  const isUp =
    !isDisabled &&
    (rawStatus === 'up' || rawStatus === 'connected' || rawStatus === 'active' || rawStatus === 'running');

  const isTrunk = String(port.mode || 'access').toLowerCase().trim() === 'trunk';
  const rawPortId = port.port_id || port.name || 'Port';
  const shortName = rawPortId
    .replace('GigabitEthernet', 'Gi')
    .replace('TenGigabitEthernet', 'Te')
    .replace('FastEthernet', 'Fa')
    .replace('Ethernet', 'Eth')
    .replace('1/0/', '')
    .replace('0/', '');

  const formatSpeed = (s?: string, pId?: string) => {
    if (s && String(s).trim()) {
      const sTrim = String(s).trim();
      if (sTrim === '1000' || sTrim === 'a-1000') return '1 Gbps';
      if (sTrim === '10000' || sTrim === '10G' || sTrim === 'a-10000') return '10 Gbps';
      if (sTrim === '100' || sTrim === 'a-100') return '100 Mbps';
      if (sTrim === '10' || sTrim === 'a-10') return '10 Mbps';
      if (sTrim.toLowerCase().includes('bps')) return sTrim;
      return `${sTrim} Mbps`;
    }
    const idLower = (pId || '').toLowerCase();
    if (idLower.startsWith('te') || idLower.includes('tengigabit')) return '10 Gbps';
    if (idLower.startsWith('fa') || idLower.includes('fastethernet')) return '100 Mbps';
    return '1 Gbps';
  };

  const speedDisplay = formatSpeed(port.speed || (port as any).negotiated_speed || (port as any).max_speed, rawPortId);
  const statusDisplay = isDisabled ? 'DISABLED' : isUp ? 'UP' : 'DOWN';
  const modeDisplay = isTrunk ? 'TRUNK' : 'ACCESS';
  const vlanDisplay = port.vlan ?? 1;

  // LED color and glow
  const ledColor = isDisabled ? '#f59e0b' : isUp ? '#10b981' : '#334155';
  const ledGlow = isUp ? 'drop-shadow(0 0 3px #34d399)' : isDisabled ? 'drop-shadow(0 0 2px #f59e0b)' : 'none';

  let statusClasses = 'bg-slate-900/60 border border-slate-700/60 hover:border-slate-500 hover:bg-slate-800/60 opacity-80 hover:opacity-100'; // Down
  let bezelStroke = '#475569'; // Down

  if (isSelected) {
    statusClasses = 'bg-indigo-950/90 border-2 border-indigo-400 ring-2 ring-indigo-500/40 shadow-lg scale-105 z-10';
    bezelStroke = '#818cf8';
  } else if (isDisabled) {
    statusClasses = 'bg-amber-500/20 border border-amber-500/60 hover:border-amber-400 hover:bg-amber-500/30';
    bezelStroke = '#f59e0b';
  } else if (isUp && isTrunk) {
    statusClasses = 'bg-purple-950/60 border border-purple-500/70 hover:border-purple-400 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.2)]';
    bezelStroke = '#a855f7';
  } else if (isUp) {
    statusClasses = 'bg-slate-900/90 border border-emerald-500/60 hover:border-emerald-400 hover:bg-slate-800/90 shadow-[0_0_8px_rgba(16,185,129,0.15)]';
    bezelStroke = '#10b981';
  }

  return (
    <button
      type="button"
      onClick={(e) => onClick?.(e)}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e);
        }
      }}
      className={`group relative flex flex-col items-center p-1 rounded-lg transition-all select-none ${statusClasses}`}
      title={`${port.name || rawPortId} (${rawPortId}) - ${statusDisplay} - Speed: ${speedDisplay} - Mode: ${modeDisplay} - VLAN ${vlanDisplay}${port.connected_device ? ` - ${port.connected_device}` : ''}${port.description ? ` [Description: ${port.description}]` : ''}`}
      style={{ width: '56px' }}
    >
      {/* Interactive Hover Tooltip Popup with Speed and Specs */}
      <div className="opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 transform group-hover:-translate-y-1 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 px-2.5 py-1.5 bg-slate-900/95 text-slate-100 border border-slate-700/90 rounded-lg shadow-2xl whitespace-nowrap flex flex-col items-center gap-0.5 backdrop-blur-md text-[10px]">
        <div className="flex items-center gap-1.5 font-bold font-mono">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ledColor, filter: ledGlow }} />
          <span>{port.name || rawPortId}</span>
          <span className={`text-[8.5px] px-1 py-0.2 rounded font-semibold ${isUp ? 'bg-emerald-500/20 text-emerald-300' : isDisabled ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-400'}`}>
            {statusDisplay}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-slate-300">
          <span className="text-cyan-300 font-bold font-mono">{speedDisplay}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300">{isTrunk ? 'Trunk' : `VLAN ${vlanDisplay}`}</span>
        </div>
        {port.connected_device && port.connected_device !== 'Disconnected' && (
          <div className="text-[8.5px] text-slate-400 max-w-[150px] truncate">
            {port.connected_device}
          </div>
        )}
        <div className="w-2 h-2 bg-slate-900 border-r border-b border-slate-700/90 transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
      </div>
      {/* Top Header: Link Status LED & Mode Indicator */}
      <div className="flex items-center justify-between w-full px-1 mb-0.5">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            backgroundColor: ledColor,
            filter: ledGlow,
          }}
        />
        {isTrunk ? (
          <span
            className="text-[7px] font-mono font-bold bg-purple-600 text-white px-1 rounded-xs leading-tight"
            style={{ color: '#ffffff', fontWeight: 700 }}
          >
            TRK
          </span>
        ) : (
          <span className="text-[7px] font-mono text-slate-400 leading-tight">
            {shortName}
          </span>
        )}
      </div>

      {/* Realistic Network RJ45 Port Socket SVG */}
      <svg
        viewBox="0 0 42 36"
        className="w-10 h-8 shrink-0 drop-shadow-xs"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Metal Shield / Bezel with Screws */}
        <rect
          x="1"
          y="1"
          width="40"
          height="34"
          rx="3"
          fill="#1e293b"
          stroke={bezelStroke}
          strokeWidth="1.5"
        />
        
        {/* Metal casing chamfer line */}
        <rect
          x="3"
          y="3"
          width="36"
          height="30"
          rx="2"
          fill="#0f172a"
          stroke="#334155"
          strokeWidth="0.75"
        />

        {/* Dual LED Indicators embedded into top corners of RJ45 bezel */}
        <circle cx="5.5" cy="5.5" r="1.2" fill={ledColor} style={{ filter: ledGlow }} />
        <circle cx="36.5" cy="5.5" r="1.2" fill={isUp ? '#38bdf8' : '#334155'} />

        {/* RJ45 Receptacle Cavity Profile (Classic stepped Ethernet jack) */}
        {/* Top wide portion, stepped in at bottom for latch clip */}
        <path
          d="M 8 9 
             L 34 9 
             L 34 22 
             L 28 22 
             L 28 29 
             L 14 29 
             L 14 22 
             L 8 22 
             Z"
          fill="#020617"
          stroke="#475569"
          strokeWidth="1"
        />

        {/* 8 Golden Metallic Contact Pins */}
        <line x1="11" y1="10" x2="11" y2="15" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
        <line x1="13.5" y1="10" x2="13.5" y2="15" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
        <line x1="16" y1="10" x2="16" y2="15" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
        <line x1="18.5" y1="10" x2="18.5" y2="15" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
        <line x1="21" y1="10" x2="21" y2="15" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
        <line x1="23.5" y1="10" x2="23.5" y2="15" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
        <line x1="26" y1="10" x2="26" y2="15" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
        <line x1="28.5" y1="10" x2="28.5" y2="15" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />

        {/* Bottom Latch Retainer Tab Guide */}
        <path
          d="M 16 26 L 26 26 L 24 28 L 18 28 Z"
          fill="#334155"
        />
      </svg>

      {/* VLAN ID Badge - High Contrast (Always clear bold white text on purple) */}
      <div className="mt-1 flex items-center justify-center w-full">
        <span
          data-badge="vlan-tag"
          className={`font-mono text-[9px] font-bold px-1.5 py-0.2 rounded tracking-tight shadow-xs ${
            isTrunk
              ? 'bg-purple-600 text-white font-bold border border-purple-400'
              : vlanDisplay === 1
              ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40'
              : 'bg-indigo-900/90 text-amber-300 border border-amber-500/40'
          }`}
          style={isTrunk ? { color: '#ffffff', fontWeight: 700 } : undefined}
          title={`VLAN ${vlanDisplay}`}
        >
          v{vlanDisplay}
        </span>
      </div>
    </button>
  );
};
