import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Search,
  Plus,
  Server,
  Router as RouterIcon,
  Wifi,
  MapPin,
  Check,
  CreditCard,
  Box,
} from 'lucide-react';
import { Device, CustomTopologyRack, DeviceCanvasDisplayMode } from '../types';
import { useLanguage } from '../i18n';
import { convertNodeToHardwareDevice } from './rack/PhysicalNodeOnCanvas';
import { HardwareSvgRenderer } from './rack/HardwareSvgRenderer';

interface CustomMapAddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  availableDevices: Device[];
  existingDeviceIds: string[];
  racks?: CustomTopologyRack[];
  initialDisplayMode?: DeviceCanvasDisplayMode;
  onAddDevice: (device: Device, mode: DeviceCanvasDisplayMode, targetRackId?: string) => void;
  isLightMode?: boolean;
}

export const CustomMapAddDeviceModal: React.FC<CustomMapAddDeviceModalProps> = ({
  isOpen,
  onClose,
  onMinimize,
  availableDevices,
  existingDeviceIds,
  racks = [],
  initialDisplayMode,
  onAddDevice,
  isLightMode,
}) => {
  const { isEn, isRtl } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'switch' | 'router' | 'access_point'>('all');
  const [selectedDisplayMode, setSelectedDisplayMode] = useState<DeviceCanvasDisplayMode>(
    initialDisplayMode || 'card'
  );
  const [perDeviceTargetRack, setPerDeviceTargetRack] = useState<Record<string, string>>({});

  const isLight = isLightMode ?? (typeof document !== 'undefined' && document.documentElement.classList.contains('light'));

  if (!isOpen) return null;

  const filteredDevices = availableDevices.filter((dev) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      dev.name.toLowerCase().includes(q) ||
      dev.ip.toLowerCase().includes(q) ||
      (dev.model && dev.model.toLowerCase().includes(q)) ||
      (dev.building && dev.building.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (typeFilter !== 'all' && dev.type !== typeFilter) return false;
    return true;
  });

  return createPortal(
    <div
      className={`fixed top-0 left-0 right-0 bottom-8 z-[100000] flex items-center justify-center ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4'
      } modal-backdrop-blur overflow-y-auto ${
        isLight ? 'bg-slate-900/40 theme-light' : 'bg-black/85'
      }`}
      data-modal-backdrop="true"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`border rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-150 ${
          isFullscreen
            ? 'w-full h-full max-h-full rounded-none border-none'
            : 'w-full max-w-4xl my-auto max-h-[88vh]'
        } ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300/60'
            : 'bg-slate-900 border-slate-700/80 text-slate-100 shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-4 sm:px-6 py-3.5 border-b flex items-center justify-between shrink-0 ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isLight
                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-600'
                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              }`}
            >
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isEn ? 'Add Device to Custom Topology Map' : 'افزودن تجهیز به نقشه سفارشی توپولوژی'}
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn
                  ? 'Choose how you want to place the device: as an interactive card for cabling, or physical rackmount hardware.'
                  : 'نحوه قرارگیری تجهیز را مشخص کنید: به شکل کارت جهت کابل‌کشی بین پورت‌ها، یا شاسی فیزیکی جهت جانمایی در رک.'}
              </p>
            </div>
          </div>

          {/* Window Controls: Fullscreen, Minimize, Close (matching CiscoTerminalModal exactly) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-1.5 rounded transition cursor-pointer ${
                isLight
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
                  isLight
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
                isLight
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

        {/* Representation Mode Switcher Banner - Only shown when in Physical view mode or mode is not predetermined */}
        {initialDisplayMode !== 'card' && (
          <div
            className={`px-4 sm:px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${
              isLight
                ? 'bg-indigo-50/70 border-indigo-100'
                : 'bg-slate-950/80 border-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                {isEn ? 'Default Representation:' : 'حالت نمایش پیش‌فرض تجهیز:'}
              </span>
            </div>

            <div
              className={`flex items-center gap-1.5 p-1 rounded-xl border shadow-xs ${
                isLight
                  ? 'bg-white border-indigo-200'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedDisplayMode('card')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  selectedDisplayMode === 'card'
                    ? 'bg-purple-600 text-white shadow-xs font-semibold'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{isEn ? 'Card View (Cabling & Ports)' : 'نمای کارت (کابل‌کشی و ارتباط پورت‌ها)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDisplayMode('physical')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  selectedDisplayMode === 'physical'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>{isEn ? 'Physical Chassis (Rackmount)' : 'نمای فیزیکی شاسی (رکمونت و جانمایی در رک)'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div
          className={`p-4 border-b flex flex-wrap items-center justify-between gap-2.5 shrink-0 ${
            isLight
              ? 'bg-slate-50/50 border-slate-200'
              : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder={isEn ? 'Search devices by name, IP, model...' : 'جستجوی نام، آی‌پی یا مدل تجهیز...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-3 py-2 ${isRtl ? 'pr-8' : 'pl-8'} rounded-xl border text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  : 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500'
              }`}
            />
            <Search className={`w-3.5 h-3.5 text-slate-400 absolute ${isRtl ? 'right-2.5' : 'left-2.5'} top-3`} />
          </div>

          <div
            className={`flex items-center gap-1 rounded-xl p-1 text-xs ${
              isLight
                ? 'bg-slate-200/70 border border-slate-300/50'
                : 'bg-slate-950/80 border border-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] cursor-pointer ${
                typeFilter === 'all'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'bg-slate-800 text-white shadow-xs font-semibold'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isEn ? 'All Devices' : 'همه تجهیزات'}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('switch')}
              className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] cursor-pointer ${
                typeFilter === 'switch'
                  ? isLight
                    ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                    : 'bg-slate-800 text-indigo-400 shadow-xs font-semibold'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isEn ? 'Switches' : 'سوئیچ‌ها'}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('router')}
              className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] cursor-pointer ${
                typeFilter === 'router'
                  ? isLight
                    ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                    : 'bg-slate-800 text-emerald-400 shadow-xs font-semibold'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isEn ? 'Routers' : 'روترها'}
            </button>
          </div>
        </div>

        {/* Device List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredDevices.length === 0 ? (
            <div className={`py-12 text-center text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
              {isEn ? 'No devices found matching your criteria.' : 'تجهیزی مطابق با فیلتر یافت نشد.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredDevices.map((device) => {
                const mountedRack = racks.find((r) =>
                  (r.devices || []).some(
                    (d) =>
                      d.id === device.id ||
                      d.id === `hw-${device.id}` ||
                      (d.name && d.name === device.name) ||
                      (d.label && d.label === device.name)
                  )
                );
                const mountedDev = (mountedRack?.devices || []).find(
                  (d) =>
                    d.id === device.id ||
                    d.id === `hw-${device.id}` ||
                    (d.name && d.name === device.name) ||
                    (d.label && d.label === device.name)
                );
                const isAlreadyOnMap =
                  existingDeviceIds.includes(device.id) ||
                  existingDeviceIds.includes(`hw-${device.id}`) ||
                  !!mountedRack;
                const targetRackId = perDeviceTargetRack[device.id] || racks[0]?.id;
                const hwPreview = convertNodeToHardwareDevice(device);

                return (
                  <div
                    key={device.id}
                    className={`p-3.5 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                      mountedRack
                        ? isLight
                          ? 'bg-cyan-50/70 border-cyan-300 shadow-xs'
                          : 'bg-slate-950/90 border-cyan-500/40 shadow-sm'
                        : isAlreadyOnMap
                        ? isLight
                          ? 'bg-slate-50 border-slate-200 opacity-80'
                          : 'bg-slate-950/40 border-slate-800/70 opacity-75'
                        : isLight
                        ? 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md'
                        : 'bg-slate-950/70 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/90 hover:shadow-lg'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`p-2 rounded-xl flex-shrink-0 ${
                            device.type === 'switch'
                              ? isLight
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/40'
                              : device.type === 'router'
                              ? isLight
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              : isLight
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-purple-950/60 text-purple-400 border border-purple-800/40'
                          }`}
                        >
                          {device.type === 'switch' ? (
                            <Server className="w-4 h-4" />
                          ) : device.type === 'router' ? (
                            <RouterIcon className="w-4 h-4" />
                          ) : (
                            <Wifi className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className={`text-xs font-bold truncate font-mono flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            <span>{device.name}</span>
                            {mountedRack && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono">
                                {mountedRack.name} U{mountedDev?.startU}
                              </span>
                            )}
                          </div>
                          <div className={`text-[11px] font-mono font-bold flex items-center gap-1.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                            <span>{device.ip}</span>
                            <span className={`text-[10px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              ({hwPreview.brand} {hwPreview.model})
                            </span>
                          </div>
                          <div className={`text-[10px] truncate flex items-center gap-1 mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            <MapPin className="w-2.5 h-2.5" />
                            <span>
                              {device.building || 'Main'} • {device.floor || 'Floor 1'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0 border ${
                        isLight
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {hwPreview.heightU}U
                      </span>
                    </div>

                    {/* Mini SVG Faceplate Preview in Physical Mode */}
                    {selectedDisplayMode === 'physical' && (
                      <div className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shadow-inner">
                        <HardwareSvgRenderer
                          device={hwPreview}
                          viewMode="front"
                          width={260}
                          height={hwPreview.heightU * 22}
                        />
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className={`pt-2 border-t flex flex-wrap items-center justify-between gap-2 ${
                      isLight ? 'border-slate-100' : 'border-slate-800/80'
                    }`}>
                      <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                        {device.total_ports || 24} {isEn ? 'Ports' : 'پورت'}
                      </span>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Rack selector if physical mode and racks exist and not already in this rack */}
                        {selectedDisplayMode === 'physical' && racks.length > 1 && !mountedRack && (
                          <select
                            value={targetRackId}
                            onChange={(e) =>
                              setPerDeviceTargetRack((prev) => ({
                                ...prev,
                                [device.id]: e.target.value,
                              }))
                            }
                            className={`text-[10px] py-1 px-2 rounded-lg border ${
                              isLight
                                ? 'bg-white border-slate-300 text-slate-800'
                                : 'bg-slate-900 border-slate-700 text-slate-200'
                            }`}
                          >
                            {racks.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Mount into rack button */}
                        {selectedDisplayMode === 'physical' && racks.length > 0 && !mountedRack && (
                          <button
                            type="button"
                            onClick={() => {
                              onAddDevice(device, 'physical', targetRackId);
                              onClose();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-medium shadow-sm transition active:scale-95 cursor-pointer"
                            title={
                              isEn
                                ? `Mount into ${racks.find((r) => r.id === targetRackId)?.name || 'Rack'}`
                                : `نصب فیزیکی در ${racks.find((r) => r.id === targetRackId)?.name || 'رک'}`
                            }
                          >
                            <Box className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Mount in Rack' : 'نصب در رک'}</span>
                          </button>
                        )}

                        {/* Already mounted badge */}
                        {mountedRack && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-cyan-400 bg-cyan-950/60 px-2 py-1 rounded-xl border border-cyan-700/50">
                            <Check className="w-3 h-3" />
                            <span>
                              {isEn
                                ? `Mounted in ${mountedRack.name}`
                                : `نصب‌شده در ${mountedRack.name}`}
                            </span>
                          </span>
                        )}

                        {/* Already on map badge */}
                        {isAlreadyOnMap && !mountedRack && (
                          <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-xl border ${
                            isLight
                              ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                              : 'text-emerald-400 bg-emerald-950/50 border-emerald-800'
                          }`}>
                            <Check className="w-3 h-3" />
                            <span>{isEn ? 'On Canvas' : 'روی بوم'}</span>
                          </span>
                        )}

                        {/* Add to Canvas as standalone node */}
                        {!isAlreadyOnMap && (
                          <button
                            type="button"
                            onClick={() => {
                              onAddDevice(device, selectedDisplayMode);
                              onClose();
                            }}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-white text-xs font-medium shadow-xs transition active:scale-95 cursor-pointer ${
                              selectedDisplayMode === 'card'
                                ? 'bg-purple-600 hover:bg-purple-500'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>
                              {selectedDisplayMode === 'card'
                                ? isEn
                                  ? 'Add as Card'
                                  : 'افزودن کارت'
                                : isEn
                                ? 'Add to Canvas'
                                : 'افزودن به بوم'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-3.5 border-t flex items-center justify-between shrink-0 ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-slate-950 border-slate-800'
          }`}
        >
          <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {isEn
              ? 'Tip: You can install devices directly into racks or drop them onto the canvas.'
              : 'نکته: تجهیزات را می‌توانید مستقیماً درون رک‌های فعال نصب کرده یا روی بوم قرار دهید.'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
              isLight
                ? 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {isEn ? 'Close' : 'بستن'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
