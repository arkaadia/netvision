import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Server,
  Router as RouterIcon,
  Wifi,
  MapPin,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  Cable,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  Terminal,
  AlertTriangle,
  Save,
  FileCode2,
  MoreVertical,
  Edit3,
  StickyNote,
  Sliders,
  HardDrive,
  Maximize2,
  X,
} from 'lucide-react';
import { Device, DeviceType, CustomTopologyStickyNote } from '../types';
import { useLanguage } from '../i18n';
import { updateDevice } from '../services/api';
import { syncDeviceNotesFromDatabase } from '../services/settingsStorage';
import { EditDeviceModal } from './EditDeviceModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { DeviceStickyNoteModal } from './DeviceStickyNoteModal';
import { CiscoWriteConfirmModal } from './CiscoWriteConfirmModal';

interface DeviceListViewProps {
  devices: Device[];
  onOpenAddModal: () => void;
  onPingDevice: (id: string) => Promise<void>;
  onDeleteDevice: (id: string) => Promise<void>;
  onInspectPorts: (device: Device) => void;
  onConnectTerminal?: (device: Device) => void;
  onApplyTemplate?: (device: Device) => void;
  onWriteMemory?: (deviceId: string) => Promise<void>;
  onRefreshAll: () => void;
  isRefreshing: boolean;
  onEditDevice?: (device: Device) => void;
  onOpenBulkConfig?: (devices: Device[]) => void;
}

export const DeviceListView: React.FC<DeviceListViewProps> = ({
  devices,
  onOpenAddModal,
  onPingDevice,
  onDeleteDevice,
  onInspectPorts,
  onConnectTerminal,
  onApplyTemplate,
  onWriteMemory,
  onRefreshAll,
  isRefreshing,
  onEditDevice,
  onOpenBulkConfig,
}) => {
  const { t, isRtl, isEn } = useLanguage();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | DeviceType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'unsaved'>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [writingId, setWritingId] = useState<string | null>(null);
  const [confirmWriteDevice, setConfirmWriteDevice] = useState<Device | null>(null);
  const [minimizedWriteDevice, setMinimizedWriteDevice] = useState<Device | null>(null);
  const [internalEditingDevice, setInternalEditingDevice] = useState<Device | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [deviceNotes, setDeviceNotes] = useState<Record<string, CustomTopologyStickyNote>>({});
  const [selectedNoteDevice, setSelectedNoteDevice] = useState<Device | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{
    id: string;
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    device: Device;
  } | null>(null);

  // Synchronize and load device-linked sticky notes
  const loadDeviceNotes = useCallback(async () => {
    const notesMap: Record<string, CustomTopologyStickyNote> = {};
    try {
      // 1. Read from dedicated device sticky notes cache
      const raw = localStorage.getItem('nettopology_device_sticky_notes_v1');
      if (raw) {
        const list: CustomTopologyStickyNote[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach((n) => {
            if (n.linkedDeviceId) {
              notesMap[n.linkedDeviceId] = n;
              notesMap[n.linkedDeviceId.replace(/^hw-/, '')] = n;
              notesMap['hw-' + n.linkedDeviceId.replace(/^hw-/, '')] = n;
            }
          });
        }
      }
      // 2. Scan custom maps for notes linked to devices
      ['nettopology_custom_maps_v2', 'net_topology_custom_maps_v2'].forEach((key) => {
        const rawMaps = localStorage.getItem(key);
        if (rawMaps) {
          const maps = JSON.parse(rawMaps);
          if (Array.isArray(maps)) {
            maps.forEach((m) => {
              if (Array.isArray(m.stickyNotes)) {
                m.stickyNotes.forEach((sn: CustomTopologyStickyNote) => {
                  if (sn.linkedDeviceId && !notesMap[sn.linkedDeviceId]) {
                    notesMap[sn.linkedDeviceId] = sn;
                    notesMap[sn.linkedDeviceId.replace(/^hw-/, '')] = sn;
                    notesMap['hw-' + sn.linkedDeviceId.replace(/^hw-/, '')] = sn;
                  }
                });
              }
            });
          }
        }
      });
    } catch (e) {}

    setDeviceNotes(notesMap);

    // 3. Background sync from database
    try {
      const dbNotes = await syncDeviceNotesFromDatabase();
      if (Array.isArray(dbNotes)) {
        const freshDbMap: Record<string, CustomTopologyStickyNote> = {};
        dbNotes.forEach((n) => {
          if (n && n.linkedDeviceId) {
            freshDbMap[n.linkedDeviceId] = n;
            freshDbMap[n.linkedDeviceId.replace(/^hw-/, '')] = n;
            freshDbMap['hw-' + n.linkedDeviceId.replace(/^hw-/, '')] = n;
          }
        });
        setDeviceNotes(freshDbMap);
      }
    } catch (e) {}
  }, []);

  const getNoteForDevice = useCallback(
    (id: string): CustomTopologyStickyNote | undefined => {
      if (!id) return undefined;
      return deviceNotes[id] || deviceNotes[id.replace(/^hw-/, '')] || deviceNotes['hw-' + id.replace(/^hw-/, '')];
    },
    [deviceNotes]
  );

  useEffect(() => {
    loadDeviceNotes();
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail) {
        setDeviceNotes((current) => {
          const next = { ...current };
          if (detail.previousDeviceId) {
            const prevId = detail.previousDeviceId;
            const cleanPrev = prevId.replace(/^hw-/, '');
            delete next[prevId];
            delete next[cleanPrev];
            delete next['hw-' + cleanPrev];
          }
          if (detail.newDeviceId && detail.note) {
            const newId = detail.newDeviceId;
            const cleanNew = newId.replace(/^hw-/, '');
            next[newId] = detail.note;
            next[cleanNew] = detail.note;
            next['hw-' + cleanNew] = detail.note;
          }
          return next;
        });
      }
      loadDeviceNotes();
    };
    window.addEventListener('nettopology_device_notes_updated', handleUpdate);
    return () => {
      window.removeEventListener('nettopology_device_notes_updated', handleUpdate);
    };
  }, [loadDeviceNotes]);

  const handleOpenDeviceNote = (dev: Device) => {
    setSelectedNoteDevice(dev);
    setIsNoteModalOpen(true);
  };

  // Close 3-dots action menu on outside scroll or window resize
  useEffect(() => {
    if (!menuAnchor) return;
    const handleClose = () => setMenuAnchor(null);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    return () => {
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, [menuAnchor]);

  const handleToggleActionMenu = (e: React.MouseEvent<HTMLButtonElement>, dev: Device) => {
    e.stopPropagation();
    if (menuAnchor?.id === dev.id) {
      setMenuAnchor(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuEstimatedHeight = 330;
    const menuWidth = 256;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < menuEstimatedHeight && rect.top > menuEstimatedHeight;

    const pos: {
      id: string;
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
      device: Device;
    } = {
      id: dev.id,
      device: dev,
    };

    if (openUpwards) {
      pos.bottom = window.innerHeight - rect.top + 6;
    } else {
      pos.top = rect.bottom + 6;
    }

    if (isRtl) {
      // In RTL, align left side of dropdown with left side of button, bounded
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - menuWidth - 12));
      pos.left = left;
    } else {
      // In LTR, align right side of dropdown with right side of button, bounded
      const right = Math.max(12, Math.min(window.innerWidth - rect.right, window.innerWidth - menuWidth - 12));
      pos.right = right;
    }

    setMenuAnchor(pos);
  };

  const buildings = Array.from(new Set(devices.map((d) => d.building).filter(Boolean)));
  const unsavedCount = devices.filter((d) => d.has_unsaved_changes).length;

  const filteredDevices = devices.filter((d) => {
    if (typeFilter !== 'all' && d.type !== typeFilter) return false;
    if (statusFilter === 'online' && !d.is_online) return false;
    if (statusFilter === 'offline' && d.is_online) return false;
    if (statusFilter === 'unsaved' && !d.has_unsaved_changes) return false;
    if (buildingFilter !== 'all' && d.building !== buildingFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.ip.toLowerCase().includes(q) ||
        d.model.toLowerCase().includes(q) ||
        d.building.toLowerCase().includes(q) ||
        d.floor.toLowerCase().includes(q) ||
        d.unit.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handlePing = async (id: string) => {
    try {
      setPingingId(id);
      await onPingDevice(id);
    } finally {
      setPingingId(null);
    }
  };

  const handleWriteMem = async (id: string) => {
    if (!onWriteMemory) return;
    try {
      setWritingId(id);
      await onWriteMemory(id);
    } finally {
      setWritingId(null);
    }
  };

  const onlineCount = devices.filter((d) => d.is_online).length;
  const offlineCount = devices.filter((d) => !d.is_online).length;

  return (
    <div className={`p-4 sm:p-6 space-y-4 max-w-7xl mx-auto ${isRtl ? 'text-right' : 'text-left'} text-slate-100`}>
      {/* Page Header (Sticky header so Register New Device remains fixed on scroll) */}
      <div className="sticky top-0 z-20 -mt-2 pt-2 pb-2 bg-slate-950/85 backdrop-blur-xl border-b border-white/5 -mx-4 sm:-mx-6 px-4 sm:px-6 transition-all">
        <div className="flex flex-wrap items-center justify-between gap-3 spatial-glass p-4 sm:p-5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-white glow-text-cyan">
                {t('devicelist_title')}
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                {t('status_devices_count', { count: devices.length })}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {t('devicelist_subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenBulkConfig && (
              <button
                id="btn-bulk-configure"
                onClick={() => {
                  const selected = devices.filter((d) => selectedDeviceIds.has(d.id));
                  if (selected.length > 0) {
                    onOpenBulkConfig(selected);
                  }
                }}
                disabled={selectedDeviceIds.size === 0}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium border transition active:scale-95 cursor-pointer ${
                  selectedDeviceIds.size > 0
                    ? 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                    : 'bg-white/5 text-slate-500 border-white/5 cursor-not-allowed opacity-60'
                }`}
                title={isEn ? 'Execute common configuration across selected hardware' : 'پیکربندی همزمان دستورات روی تجهیزات انتخاب شده'}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>
                  {isEn
                    ? selectedDeviceIds.size > 0
                      ? `Bulk Configure (${selectedDeviceIds.size})`
                      : 'Bulk Configure'
                    : selectedDeviceIds.size > 0
                    ? `پیکربندی گروهی (${selectedDeviceIds.size})`
                    : 'پیکربندی گروهی'}
                </span>
              </button>
            )}

            <button
              onClick={onRefreshAll}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium shadow-xs transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{t('devicelist_btn_ping_all')}</span>
            </button>

            <button
              id="btn-sticky-register-device"
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-medium shadow-[0_0_15px_rgba(99,102,241,0.35)] transition border border-white/10 active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('devicelist_btn_add_device')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              {t('dashboard_card_switches')}
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-1 glow-text-cyan">
              {devices.filter((d) => d.type === 'switch').length}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Server className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              {t('dashboard_card_routers')}
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-1">
              {devices.filter((d) => d.type === 'router').length}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <RouterIcon className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              {t('dashboard_card_aps')}
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-1">
              {devices.filter((d) => d.type === 'access_point').length}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Wifi className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              {isEn ? 'Reachability Status' : 'وضعیت آنلاین / آفلاین'}
            </div>
            <div className="text-2xl font-bold font-mono mt-1">
              <span className="text-emerald-400">{onlineCount}</span> /{' '}
              <span className="text-rose-400">{offlineCount}</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 text-slate-300 border border-white/10">
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl spatial-glass border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs backdrop-blur-xl">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder={isEn ? 'Search by name, IP, model, building or unit...' : 'جستجوی نام، آدرس IP، مدل، ساختمان یا واحد...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full px-3.5 py-2 ${isRtl ? 'pr-9 pl-3.5' : 'pl-9 pr-3.5'} rounded-xl bg-slate-900/70 border border-white/15 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 shadow-inner`}
          />
          <Search className={`w-4 h-4 text-slate-400 absolute ${isRtl ? 'right-3' : 'left-3'} top-2.5`} />
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-900/70 border border-white/15 text-slate-200 text-xs focus:outline-none focus:border-indigo-400 cursor-pointer"
          >
            <option value="all">{isEn ? 'All Equipment Types' : 'همه انواع تجهیزات'}</option>
            <option value="switch">{isEn ? 'Switches Only' : 'فقط سوئیچ‌ها (Switches)'}</option>
            <option value="router">{isEn ? 'Routers Only' : 'فقط روترها (Routers)'}</option>
            <option value="access_point">{isEn ? 'Access Points Only' : 'فقط اکسس‌پوینت‌ها (APs)'}</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-900/70 border border-white/15 text-slate-200 text-xs focus:outline-none focus:border-indigo-400 cursor-pointer"
          >
            <option value="all">{isEn ? 'All Statuses' : 'همه وضعیت‌ها'}</option>
            <option value="online">{isEn ? 'Online (Reachable)' : 'آنلاین (Online)'}</option>
            <option value="offline">{isEn ? 'Offline (Critical)' : 'آفلاین (Offline)'}</option>
            <option value="unsaved">
              {isEn ? `Unsaved Changes (${unsavedCount})` : `⚠️ تغییرات رایت‌نشده (${unsavedCount})`}
            </option>
          </select>

          {/* Building Filter */}
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900/70 border border-white/15 text-slate-200 text-xs focus:outline-none focus:border-indigo-400 cursor-pointer"
          >
            <option value="all">{isEn ? 'All Buildings' : 'همه ساختمان‌ها'}</option>
            {buildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Multi-Device Selection Action Bar */}
      {selectedDeviceIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 shadow-lg text-xs font-mono animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
              <Sliders className="w-3.5 h-3.5" />
              <span>
                {isEn
                  ? `${selectedDeviceIds.size} of ${devices.length} devices selected`
                  : `${selectedDeviceIds.size} از ${devices.length} تجهیز انتخاب شده است`}
              </span>
            </span>

            {/* Quick Filter Selection Shortcuts */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  const ciscoIds = devices.filter((d) => d.platform?.includes('cisco')).map((d) => d.id);
                  setSelectedDeviceIds(new Set(ciscoIds));
                }}
                className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 cursor-pointer"
              >
                {isEn ? 'Only Cisco' : 'فقط سیسکو'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const mtikIds = devices.filter((d) => d.platform?.includes('mikrotik')).map((d) => d.id);
                  setSelectedDeviceIds(new Set(mtikIds));
                }}
                className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 cursor-pointer"
              >
                {isEn ? 'Only MikroTik' : 'فقط میکروتیک'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const onlineIds = devices.filter((d) => d.is_online).map((d) => d.id);
                  setSelectedDeviceIds(new Set(onlineIds));
                }}
                className="px-2 py-0.5 rounded bg-white/10 text-slate-300 hover:bg-white/20 border border-white/10 cursor-pointer"
              >
                {isEn ? 'Only Online' : 'فقط آنلاین'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDeviceIds(new Set())}
              className="px-2.5 py-1 text-slate-400 hover:text-white transition cursor-pointer"
            >
              {isEn ? 'Clear Selection' : 'لغو انتخاب‌ها'}
            </button>

            {onOpenBulkConfig && (
              <button
                type="button"
                onClick={() => {
                  const selected = devices.filter((d) => selectedDeviceIds.has(d.id));
                  if (selected.length > 0) onOpenBulkConfig(selected);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold shadow-md shadow-cyan-500/20 cursor-pointer active:scale-95 transition"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isEn ? 'Launch Bulk Configure' : 'اجرای پیکربندی گروهی'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Devices List Table */}
      <div className="spatial-glass border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto min-h-[380px]">
          <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs device-table`}>
            <thead>
              <tr className="bg-slate-950/80 text-slate-300 border-b-2 border-white/15 text-[11px] font-bold uppercase tracking-wider font-mono">
                <th className={`p-3.5 ${isRtl ? 'border-l' : 'border-r'} border-white/15 w-10 text-center`}>
                  <input
                    type="checkbox"
                    checked={filteredDevices.length > 0 && selectedDeviceIds.size === filteredDevices.length}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate =
                          selectedDeviceIds.size > 0 && selectedDeviceIds.size < filteredDevices.length;
                      }
                    }}
                    onChange={() => {
                      if (selectedDeviceIds.size === filteredDevices.length && filteredDevices.length > 0) {
                        setSelectedDeviceIds(new Set());
                      } else {
                        setSelectedDeviceIds(new Set(filteredDevices.map((d) => d.id)));
                      }
                    }}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-white/20 focus:ring-cyan-500 accent-cyan-500 cursor-pointer"
                    title={isEn ? 'Select all filtered devices' : 'انتخاب تمام تجهیزات'}
                  />
                </th>
                <th className={`p-3.5 ${isRtl ? 'border-l' : 'border-r'} border-white/15`}>
                  {isEn ? 'Device Name & ID' : 'نام و شناسه تجهیز'}
                </th>
                <th className={`p-3.5 ${isRtl ? 'border-l' : 'border-r'} border-white/15`}>
                  {isEn ? 'Role & Model' : 'نوع و مدل'}
                </th>
                <th className={`p-3.5 ${isRtl ? 'border-l' : 'border-r'} border-white/15`}>
                  {isEn ? 'IP Address' : 'آدرس IP'}
                </th>
                <th className={`p-3.5 ${isRtl ? 'border-l' : 'border-r'} border-white/15`}>
                  {isEn ? 'Location (Rack / Room)' : 'محل استقرار (ساختمان / طبقه / واحد)'}
                </th>
                <th className={`p-3.5 ${isRtl ? 'border-l' : 'border-r'} border-white/15`}>
                  {isEn ? 'Live Status' : 'وضعیت لحظه‌ای'}
                </th>
                <th className={`p-3.5 ${isRtl ? 'border-l' : 'border-r'} border-white/15`}>
                  {isEn ? 'Discovery' : 'پروتکل همسایگی'}
                </th>
                <th className={`p-3.5 ${isRtl ? 'border-l' : 'border-r'} border-white/15 text-center`}>
                  {isEn ? 'Ports & VLAN' : 'پورت‌ها و ویلن'}
                </th>
                <th className="p-3.5 text-center">
                  {isEn ? 'Actions' : 'عملیات'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400">
                    {t('devicelist_no_devices')}
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev) => {
                  const isPinging = pingingId === dev.id;
                  const devNote = getNoteForDevice(dev.id);
                  return (
                    <tr key={dev.id} className="border-b border-white/10 hover:bg-white/5 transition-colors group">
                      {/* Selection Checkbox */}
                      <td className={`p-3.5 ${isRtl ? 'border-l' : 'border-r'} border-white/10 text-center`}>
                        <input
                          type="checkbox"
                          checked={selectedDeviceIds.has(dev.id)}
                          onChange={() => {
                            setSelectedDeviceIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(dev.id)) next.delete(dev.id);
                              else next.add(dev.id);
                              return next;
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-white/20 focus:ring-cyan-500 accent-cyan-500 cursor-pointer"
                          aria-label={`Select ${dev.name}`}
                        />
                      </td>
                      {/* Name & Role */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl ${
                              dev.type === 'switch'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : dev.type === 'router'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {dev.type === 'switch' ? (
                              <Server className="w-4 h-4" />
                            ) : dev.type === 'router' ? (
                              <RouterIcon className="w-4 h-4" />
                            ) : (
                              <Wifi className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white font-mono text-xs">{dev.name}</span>

                              {/* Sticky Note Badge / Indicator Button */}
                              {devNote ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDeviceNote(dev);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 text-[10px] font-medium shadow-xs transition active:scale-95 cursor-pointer"
                                  title={isEn ? `Sticky Note: "${devNote.title || 'Device Note'}" - Click to view or edit` : `یادداشت چسبان: «${devNote.title || 'یادداشت تجهیز'}» - کلیک جهت مشاهده یا ویرایش`}
                                >
                                  <StickyNote className="w-2.5 h-2.5 text-amber-400 fill-amber-400/40 shrink-0" />
                                  <span className="max-w-[110px] truncate">{devNote.title || (isEn ? 'Note' : 'یادداشت')}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDeviceNote(dev);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 border border-white/10 hover:border-amber-500/30 text-[10px] transition cursor-pointer"
                                  title={isEn ? 'Add sticky note for this device' : 'افزودن یادداشت استیکی برای این تجهیز'}
                                >
                                  <StickyNote className="w-2.5 h-2.5 shrink-0" />
                                  <span>{isEn ? '+ Note' : '+ یادداشت'}</span>
                                </button>
                              )}

                              {dev.has_unsaved_changes && onWriteMemory && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmWriteDevice(dev);
                                  }}
                                  disabled={writingId === dev.id}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 border border-amber-500/50 font-bold text-[10px] transition shadow-sm cursor-pointer"
                                  title={isEn ? 'Review changes & write running-config to NVRAM' : 'مشاهده تغییرات و ذخیره دائم در NVRAM'}
                                >
                                  <Save className="w-2.5 h-2.5" />
                                  <span>{writingId === dev.id ? (isEn ? 'Writing...' : 'در حال رایت...') : 'Write Memory'}</span>
                                </button>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">{dev.role}</div>
                          </div>
                        </div>
                      </td>

                      {/* Model */}
                      <td className="p-3.5">
                        <div className="font-mono text-slate-200 text-xs">{dev.model}</div>
                        <div className="text-[10px] text-slate-400 font-mono">MAC: {dev.mac}</div>
                      </td>

                      {/* IP */}
                      <td className="p-3.5 font-mono font-bold text-indigo-400 text-xs">
                        <div>{dev.ip}</div>
                        {dev.ssh_host && dev.ssh_host !== dev.ip && (
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5" title={isEn ? "SSH Target Host" : "آدرس اتصال SSH"}>
                            SSH: {dev.ssh_host}:{dev.ssh_port || 22}
                          </div>
                        )}
                      </td>

                      {/* Location (Building, Floor, Unit, Rack) */}
                      <td className="p-3.5">
                        <div className="text-slate-200 font-medium text-xs">
                          {dev.building}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-indigo-400" />
                          <span>{dev.floor} • {dev.unit}</span>
                        </div>
                        {dev.rack && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {isEn ? 'Rack:' : 'رک:'} {dev.rack}
                          </div>
                        )}
                      </td>

                      {/* Online/Offline Status */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              dev.is_online
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                dev.is_online ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-rose-500'
                              }`}
                            ></span>
                            <span>{dev.is_online ? (isEn ? 'Online' : 'آنلاین') : (isEn ? 'Offline' : 'آفلاین')}</span>
                          </span>

                          <button
                            onClick={() => handlePing(dev.id)}
                            disabled={isPinging}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition border border-white/10 cursor-pointer"
                            title={isEn ? 'Ping device now' : 'پینگ مجدد لحظه‌ای'}
                          >
                            <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin text-indigo-400' : ''}`} />
                          </button>
                        </div>
                        {dev.is_online && dev.latency_ms !== null && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {isEn ? 'Latency:' : 'تأخیر:'} {dev.latency_ms} ms
                          </div>
                        )}
                      </td>

                      {/* Protocols */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono">
                          {dev.cdp_enabled && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                              CDP
                            </span>
                          )}
                          {dev.lldp_enabled && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                              LLDP
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ports & VLAN Trigger */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => onInspectPorts(dev)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-indigo-600/30 hover:text-white hover:border-indigo-400/50 text-slate-300 border border-white/10 transition text-xs shadow-xs cursor-pointer"
                        >
                          <Cable className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{dev.total_ports || 24} {isEn ? 'Ports' : 'پورت'}</span>
                        </button>
                      </td>

                      {/* Actions with Note & 3-Dots Menu */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Dedicated Sticky Note direct button */}
                          <button
                            onClick={() => handleOpenDeviceNote(dev)}
                            className={`p-1.5 sm:p-2 rounded-xl border transition active:scale-95 shadow-xs cursor-pointer ${
                              devNote
                                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                                : 'bg-white/5 hover:bg-amber-500/15 text-slate-300 hover:text-amber-300 border-white/10 hover:border-amber-500/30'
                            }`}
                            title={
                              devNote
                                ? (isEn ? `Sticky Note: "${devNote.title || 'Device Note'}" (Click to view or edit)` : `یادداشت چسبان: «${devNote.title || 'یادداشت تجهیز'}» (جهت مشاهده یا ویرایش کلیک کنید)`)
                                : (isEn ? 'Add Sticky Note for this device' : 'افزودن یادداشت استیکی برای این تجهیز')
                            }
                          >
                            <StickyNote className={`w-4 h-4 ${devNote ? 'text-amber-400 fill-amber-400/40' : ''}`} />
                          </button>

                          {/* 3-Dots Menu Trigger */}
                          <button
                            onClick={(e) => handleToggleActionMenu(e, dev)}
                            className={`p-1.5 sm:p-2 rounded-xl border transition active:scale-95 shadow-xs cursor-pointer ${
                              menuAnchor?.id === dev.id
                                ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                                : 'bg-white/5 hover:bg-white/15 text-slate-300 border-white/10 hover:text-white'
                            }`}
                            title={isEn ? 'Actions & Options' : 'عملیات و گزینه‌ها'}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating 3-Dots Action Dropdown Menu (Portal) */}
      {menuAnchor &&
        createPortal(
          <>
            {/* Transparent backdrop */}
            <div
              className="fixed inset-0 z-50 bg-black/5"
              onClick={(e) => {
                e.stopPropagation();
                setMenuAnchor(null);
              }}
            />

            <div
              style={{
                position: 'fixed',
                top: menuAnchor.top !== undefined ? `${menuAnchor.top}px` : undefined,
                bottom: menuAnchor.bottom !== undefined ? `${menuAnchor.bottom}px` : undefined,
                left: menuAnchor.left !== undefined ? `${menuAnchor.left}px` : undefined,
                right: menuAnchor.right !== undefined ? `${menuAnchor.right}px` : undefined,
              }}
              className={`w-64 z-50 rounded-2xl shadow-2xl p-1.5 border border-white/15 backdrop-blur-2xl bg-slate-950/95 font-sans device-action-dropdown animate-fadeIn ${
                isRtl ? 'text-right' : 'text-left'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold text-white truncate max-w-[120px]">{menuAnchor.device.name}</span>
                <span className="text-indigo-400 font-semibold">{menuAnchor.device.ip}</span>
              </div>

              <div className="py-1 space-y-0.5">
                {/* Cisco CLI Connect */}
                {(menuAnchor.device.type === 'switch' || menuAnchor.device.type === 'router') && onConnectTerminal && (
                  <button
                    onClick={() => {
                      const dev = menuAnchor.device;
                      setMenuAnchor(null);
                      onConnectTerminal(dev);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-emerald-300 hover:bg-emerald-500/15 hover:text-emerald-200 transition ${
                      isRtl ? 'text-right' : 'text-left'
                    } group/item cursor-pointer`}
                  >
                    <Terminal className="w-4 h-4 text-emerald-400 group-hover/item:scale-110 transition shrink-0" />
                    <div className="flex flex-col">
                      <span>{isEn ? 'SSH Console Direct' : 'کانکت به ترمینال سیسکو'}</span>
                      <span className="text-[10px] text-emerald-500/80 font-mono">CLI Terminal</span>
                    </div>
                  </button>
                )}

                {/* Apply Template */}
                {onApplyTemplate && (
                  <button
                    onClick={() => {
                      const dev = menuAnchor.device;
                      setMenuAnchor(null);
                      onApplyTemplate(dev);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-cyan-300 hover:bg-cyan-500/15 hover:text-cyan-200 transition ${
                      isRtl ? 'text-right' : 'text-left'
                    } group/item cursor-pointer`}
                  >
                    <FileCode2 className="w-4 h-4 text-cyan-400 group-hover/item:scale-110 transition shrink-0" />
                    <div className="flex flex-col">
                      <span>{isEn ? 'Apply Config Template' : 'اعمال تمپلیت کانفیگ'}</span>
                      <span className="text-[10px] text-cyan-400/70">{isEn ? 'Variables & Deploy' : 'تکمیل متغیرها و اجرا'}</span>
                    </div>
                  </button>
                )}

                {/* Device Sticky Note */}
                <button
                  onClick={() => {
                    const dev = menuAnchor.device;
                    setMenuAnchor(null);
                    handleOpenDeviceNote(dev);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-300 hover:bg-amber-500/15 hover:text-amber-200 transition ${
                    isRtl ? 'text-right' : 'text-left'
                  } group/item cursor-pointer`}
                >
                  <StickyNote className="w-4 h-4 text-amber-400 group-hover/item:scale-110 transition shrink-0" />
                  <div className="flex flex-col">
                    <span>
                      {getNoteForDevice(menuAnchor.device.id)
                        ? (isEn ? 'View / Edit Sticky Note' : 'مشاهده و ویرایش یادداشت چسبان')
                        : (isEn ? 'Add Sticky Note' : 'افزودن یادداشت چسبان')}
                    </span>
                    <span className="text-[10px] text-amber-400/80 font-mono">
                      {getNoteForDevice(menuAnchor.device.id)
                        ? (getNoteForDevice(menuAnchor.device.id)?.title || 'Note')
                        : (isEn ? 'Attach note to device' : 'پیوست یادداشت به تجهیز')}
                    </span>
                  </div>
                </button>

                {/* Edit Device Properties */}
                <button
                  onClick={() => {
                    const dev = menuAnchor.device;
                    setMenuAnchor(null);
                    if (onEditDevice) {
                      onEditDevice(dev);
                    } else {
                      setInternalEditingDevice(dev);
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-300 hover:bg-amber-500/15 hover:text-amber-200 transition ${
                    isRtl ? 'text-right' : 'text-left'
                  } group/item cursor-pointer`}
                >
                  <Edit3 className="w-4 h-4 text-amber-400 group-hover/item:scale-110 transition shrink-0" />
                  <div className="flex flex-col">
                    <span>{isEn ? 'Edit Device Properties' : 'ویرایش مشخصات تجهیز'}</span>
                    <span className="text-[10px] text-amber-400/80 font-mono">Hostname, IP, Role & Location</span>
                  </div>
                </button>

                {/* Quick Ping */}
                <button
                  onClick={() => {
                    const devId = menuAnchor.device.id;
                    setMenuAnchor(null);
                    handlePing(devId);
                  }}
                  disabled={pingingId === menuAnchor.device.id}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/10 transition ${
                    isRtl ? 'text-right' : 'text-left'
                  } cursor-pointer`}
                >
                  <RefreshCw className={`w-4 h-4 text-indigo-400 shrink-0 ${pingingId === menuAnchor.device.id ? 'animate-spin' : ''}`} />
                  <div className="flex flex-col">
                    <span>{isEn ? 'Ping & Keepalive Telemetry' : 'تست پینگ و تاخیر لحظه‌ای'}</span>
                    <span className="text-[10px] text-slate-400 font-mono">ICMP Keepalive Check</span>
                  </div>
                </button>

                {/* Ports Inspector */}
                <button
                  onClick={() => {
                    const dev = menuAnchor.device;
                    setMenuAnchor(null);
                    onInspectPorts(dev);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/10 transition ${
                    isRtl ? 'text-right' : 'text-left'
                  } cursor-pointer`}
                >
                  <Cable className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="flex flex-col">
                    <span>{isEn ? 'Inspect Interfaces & VLANs' : 'مشاهده وضعیت پورت‌ها و VLAN'}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{menuAnchor.device.total_ports || 24} Interfaces</span>
                  </div>
                </button>

                {/* Write Memory */}
                {menuAnchor.device.has_unsaved_changes && onWriteMemory && (
                  <button
                    onClick={() => {
                      const dev = menuAnchor.device;
                      setMenuAnchor(null);
                      setConfirmWriteDevice(dev);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-300 hover:bg-amber-500/15 transition ${
                      isRtl ? 'text-right' : 'text-left'
                    } cursor-pointer`}
                  >
                    <Save className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="flex flex-col">
                      <span>{isEn ? 'Save to NVRAM (Write Memory)' : 'ذخیره در NVRAM (Write Memory)'}</span>
                      <span className="text-[10px] text-amber-400/80 font-mono">Running &gt; Startup Config</span>
                    </div>
                  </button>
                )}

                <div className="my-1 border-t border-white/10" />

                {/* Delete Device */}
                <button
                  onClick={() => {
                    const dev = menuAnchor.device;
                    setMenuAnchor(null);
                    setDeviceToDelete(dev);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition ${
                    isRtl ? 'text-right' : 'text-left'
                  } cursor-pointer`}
                >
                  <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{isEn ? 'Delete Device from System' : 'حذف تجهیز از سیستم'}</span>
                </button>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Internal Edit Device Modal fallback */}
      {internalEditingDevice && (
        <EditDeviceModal
          isOpen={!!internalEditingDevice}
          device={internalEditingDevice}
          onClose={() => setInternalEditingDevice(null)}
          onSave={async (deviceId, updates) => {
            await updateDevice(deviceId, updates);
            onRefreshAll();
            setInternalEditingDevice(null);
          }}
        />
      )}

      {/* Safe Deletion Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deviceToDelete}
        onClose={() => setDeviceToDelete(null)}
        target={
          deviceToDelete
            ? {
                type: 'device',
                id: deviceToDelete.id,
                name: deviceToDelete.name,
                ip: deviceToDelete.ip,
                role: deviceToDelete.role,
                model: deviceToDelete.model,
              }
            : null
        }
        onConfirmDeleteDevice={async (id) => {
          await onDeleteDevice(id);
          setDeviceToDelete(null);
        }}
      />

      {/* Device Sticky Note Modal */}
      {isNoteModalOpen && selectedNoteDevice && (
        <DeviceStickyNoteModal
          isOpen={isNoteModalOpen}
          device={selectedNoteDevice}
          existingNote={getNoteForDevice(selectedNoteDevice.id)}
          onClose={() => {
            setIsNoteModalOpen(false);
            setSelectedNoteDevice(null);
          }}
          onSaved={(savedNote) => {
            const rawId = selectedNoteDevice.id;
            const cleanId = rawId.replace(/^hw-/, '');
            setDeviceNotes((prev) => ({
              ...prev,
              [rawId]: savedNote,
              [cleanId]: savedNote,
              ['hw-' + cleanId]: savedNote,
            }));
            setIsNoteModalOpen(false);
            setSelectedNoteDevice(null);
          }}
          onDeleted={(deletedId) => {
            const rawId = selectedNoteDevice.id;
            const cleanId = rawId.replace(/^hw-/, '');
            setDeviceNotes((prev) => {
              const copy = { ...prev };
              delete copy[rawId];
              delete copy[cleanId];
              delete copy['hw-' + cleanId];
              return copy;
            });
            setIsNoteModalOpen(false);
            setSelectedNoteDevice(null);
          }}
        />
      )}

      {/* Cisco Write Memory Confirmation Modal */}
      {confirmWriteDevice && (
        <CiscoWriteConfirmModal
          isOpen={!!confirmWriteDevice}
          onClose={() => setConfirmWriteDevice(null)}
          onMinimize={() => {
            setMinimizedWriteDevice(confirmWriteDevice);
            setConfirmWriteDevice(null);
          }}
          onConfirm={async () => {
            const devId = confirmWriteDevice.id;
            await handleWriteMem(devId);
            setConfirmWriteDevice(null);
            setMinimizedWriteDevice(null);
          }}
          device={confirmWriteDevice}
          isWriting={writingId === confirmWriteDevice.id}
        />
      )}

      {/* Minimized Write Confirmation Dock Tab (Rule 5 Compliance) */}
      {minimizedWriteDevice && (
        <div
          dir={isEn ? 'ltr' : 'rtl'}
          className={`fixed bottom-10 z-[1100] ${
            isRtl ? 'right-6' : 'left-6'
          } flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/95 border border-amber-500/60 shadow-2xl shadow-amber-500/20 text-xs backdrop-blur-xl animate-in slide-in-from-bottom-2 text-slate-100`}
        >
          <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
            <HardDrive className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-amber-300 text-xs">
                {isEn ? 'Pending NVRAM Write:' : 'در انتظار رایت در NVRAM:'}
              </span>
              <span className="font-mono text-slate-100 text-xs font-bold truncate max-w-[140px]">
                {minimizedWriteDevice.name}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {minimizedWriteDevice.ip}
            </span>
          </div>

          <div className="flex items-center gap-1 ml-2 rtl:mr-2 rtl:ml-0 border-l rtl:border-r rtl:border-l-0 border-slate-700/80 pl-2 rtl:pr-2 rtl:pl-0 shrink-0">
            <button
              type="button"
              onClick={() => {
                setConfirmWriteDevice(minimizedWriteDevice);
                setMinimizedWriteDevice(null);
              }}
              className="p-1.5 rounded-lg hover:bg-amber-500/25 text-amber-300 hover:text-white transition cursor-pointer"
              title={isEn ? 'Restore Confirmation Modal' : 'بازگردانی پنجره تایید رایت'}
              aria-label={isEn ? 'Restore' : 'بازگردانی'}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMinimizedWriteDevice(null)}
              className="p-1.5 rounded-lg hover:bg-red-500/25 text-slate-400 hover:text-red-300 transition cursor-pointer"
              title={isEn ? 'Dismiss' : 'بستن'}
              aria-label={isEn ? 'Close' : 'بستن'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
