import React, { useState, useEffect, useRef } from 'react';
import {
  Radar,
  X,
  Minus,
  Play,
  StopCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Network,
  Server,
  Layers,
  ArrowRightLeft,
  Cable,
  Check,
  RotateCcw,
  Zap,
  Globe,
  Radio,
  Sliders,
  ChevronDown,
  ChevronUp,
  Plus,
  Info,
  ShieldAlert,
  Cpu,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Device, CustomTopologyMap, CustomTopologyLink } from '../types';

export interface TopologyDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  devices: Device[];
  customMaps?: CustomTopologyMap[];
  activeMapId?: string;
  onApplyToMap?: (
    links: CustomTopologyLink[],
    newDevices: { id: string; name: string; ip: string; model: string; type: string }[],
    targetMapId: string
  ) => void;
  isLightMode?: boolean;
}

export type DiscoveryMode = 'inventory' | 'device' | 'range' | 'local';

export interface DiscoveredLinkItem {
  id: string;
  sourceDeviceId: string;
  sourceDeviceName: string;
  sourceDeviceIp: string;
  sourcePort: string;
  targetDeviceId: string;
  targetDeviceName: string;
  targetDeviceIp: string;
  targetPort: string;
  protocol: 'CDP' | 'LLDP' | 'MNDP' | 'CDP/LLDP';
  cableType: 'copper' | 'fiber';
  speed: string;
  sourceMode: 'trunk' | 'access';
  targetMode: 'trunk' | 'access';
  status: 'active';
  verification: 'bidirectional' | 'unidirectional';
  confidence: 'high' | 'medium';
  checked: boolean;
}

export interface DiscoveredUnmanagedDeviceItem {
  id: string;
  name: string;
  ip: string;
  model: string;
  platform: string;
  capabilities: string;
  discoveredViaDeviceId: string;
  discoveredViaDeviceName: string;
  localPort: string;
  remotePort: string;
  protocol: string;
  deviceType: 'switch' | 'router' | 'ap' | 'server' | 'firewall' | 'other';
  checked: boolean;
  alreadyInInventory: boolean;
  alreadyOnCanvas: boolean;
}

export interface DeviceLogItem {
  deviceId?: string;
  deviceName: string;
  ip: string;
  status: 'pending' | 'connecting' | 'success' | 'warning' | 'error';
  protocol?: string;
  neighborsFound: number;
  error?: string;
  durationMs?: number;
  timestamp: string;
}

export const TopologyDiscoveryModal: React.FC<TopologyDiscoveryModalProps> = ({
  isOpen,
  onClose,
  onMinimize,
  devices,
  customMaps = [],
  activeMapId = 'default',
  onApplyToMap,
  isLightMode = false,
}) => {
  const { isEn, isRtl } = useLanguage();

  // Active Discovery Mode
  const [mode, setMode] = useState<DiscoveryMode>('inventory');

  // Mode Options
  const [selectedInventoryDeviceIds, setSelectedInventoryDeviceIds] = useState<string[]>([]);
  const [targetSingleDeviceId, setTargetSingleDeviceId] = useState<string>('');
  const [ipRange, setIpRange] = useState<string>('172.22.100.0/24');
  const [sshPort, setSshPort] = useState<number>(22);
  const [sshUsername, setSshUsername] = useState<string>('admin');
  const [sshPassword, setSshPassword] = useState<string>('admin');
  const [enablePassword, setEnablePassword] = useState<string>('');
  const [allowSimulatorFallback, setAllowSimulatorFallback] = useState<boolean>(true);
  const [concurrency, setConcurrency] = useState<number>(4);

  // Target Map to Apply
  const [targetMapId, setTargetMapId] = useState<string>(activeMapId);

  // Job Execution State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [currentStepEn, setCurrentStepEn] = useState<string>('');
  const [logs, setLogs] = useState<DeviceLogItem[]>([]);

  // Results State
  const [discoveredLinks, setDiscoveredLinks] = useState<DiscoveredLinkItem[]>([]);
  const [unmanagedDevices, setUnmanagedDevices] = useState<DiscoveredUnmanagedDeviceItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [activeResultTab, setActiveResultTab] = useState<'links' | 'devices' | 'logs'>('links');
  const [showLogsAccordion, setShowLogsAccordion] = useState<boolean>(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<any>(null);

  // Filter switches & routers from registered inventory
  const switchDevices = devices.filter(
    (d) => d.type === 'switch' || d.type === 'router' || d.role?.toLowerCase().includes('switch')
  );

  // Initialize selected devices when opened
  useEffect(() => {
    if (switchDevices.length > 0) {
      if (selectedInventoryDeviceIds.length === 0) {
        setSelectedInventoryDeviceIds(switchDevices.map((d) => d.id));
      }
      if (!targetSingleDeviceId) {
        setTargetSingleDeviceId(switchDevices[0].id);
      }
    }
  }, [devices]);

  useEffect(() => {
    setTargetMapId(activeMapId);
  }, [activeMapId]);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Start Discovery Job
  const handleStartDiscovery = async () => {
    setIsScanning(true);
    setProgress(5);
    setLogs([]);
    setDiscoveredLinks([]);
    setUnmanagedDevices([]);
    setSummary(null);

    const payload: any = {
      mode,
      allowSimulatorFallback,
      concurrency,
      timeoutSeconds: 8,
    };

    if (mode === 'inventory') {
      payload.deviceIds = selectedInventoryDeviceIds;
    } else if (mode === 'device') {
      payload.targetDeviceId = targetSingleDeviceId;
    } else if (mode === 'range') {
      payload.ipRange = ipRange;
      payload.sshPort = sshPort;
      payload.username = sshUsername;
      payload.password = sshPassword;
      payload.enablePassword = enablePassword;
    }

    try {
      const resp = await fetch('/api/topology/discovery/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize discovery job');
      }

      const jobId = data.jobId;
      setActiveJobId(jobId);

      // Start Polling
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => {
        pollJobStatus(jobId);
      }, 750);
    } catch (err: any) {
      setIsScanning(false);
      alert(isEn ? `Failed to start discovery: ${err.message}` : `خطا در شروع فرآیند کشف: ${err.message}`);
    }
  };

  // Poll Job Status
  const pollJobStatus = async (jobId: string) => {
    try {
      const res = await fetch(`/api/topology/discovery/status/${jobId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !data.job) return;

      const job = data.job;
      setProgress(job.progress || 0);
      setCurrentStep(job.currentStep || '');
      setCurrentStepEn(job.currentStepEn || '');
      if (job.deviceLogs) setLogs(job.deviceLogs);

      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setIsScanning(false);
        setActiveJobId(null);

        if (job.status === 'completed') {
          setDiscoveredLinks((job.links || []).map((l: any) => ({ ...l, checked: true })));
          setUnmanagedDevices((job.unmanagedDevices || []).map((d: any) => ({ ...d, checked: true })));
          setSummary(job.summary || null);
        }
      }
    } catch {
      // transient network error, continue polling
    }
  };

  // Cancel Job
  const handleCancelDiscovery = async () => {
    if (!activeJobId) return;
    try {
      await fetch(`/api/topology/discovery/cancel/${activeJobId}`, { method: 'POST' });
    } catch {}
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsScanning(false);
    setActiveJobId(null);
  };

  // Toggle All Links Selection
  const handleToggleAllLinks = (checked: boolean) => {
    setDiscoveredLinks((prev) => prev.map((l) => ({ ...l, checked })));
  };

  // Toggle Single Link Selection
  const handleToggleLink = (id: string) => {
    setDiscoveredLinks((prev) => prev.map((l) => (l.id === id ? { ...l, checked: !l.checked } : l)));
  };

  // Toggle Single Unmanaged Device
  const handleToggleDevice = (id: string) => {
    setUnmanagedDevices((prev) => prev.map((d) => (d.id === id ? { ...d, checked: !d.checked } : d)));
  };

  // Apply Results to Map
  const handleApplyResults = async () => {
    const selectedLinks = discoveredLinks.filter((l) => l.checked);
    const selectedDevs = unmanagedDevices.filter((d) => d.checked);

    if (selectedLinks.length === 0 && selectedDevs.length === 0) {
      alert(
        isEn
          ? 'Please select at least one link or device to apply.'
          : 'لطفاً حداقل یک لینک یا تجهیز را جهت اعمال بر روی نقشه انتخاب کنید.'
      );
      return;
    }

    try {
      // Backend application
      const resp = await fetch('/api/topology/discovery/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetMapId,
          selectedLinkIds: selectedLinks.map((l) => l.id),
          links: selectedLinks,
          selectedDeviceIds: selectedDevs.map((d) => d.id),
          unmanagedDevices: selectedDevs,
        }),
      });

      const data = await resp.json();

      // Notify parent component
      if (onApplyToMap) {
        const customLinks: CustomTopologyLink[] = selectedLinks.map((l) => ({
          id: l.id,
          sourceDeviceId: l.sourceDeviceId,
          targetDeviceId: l.targetDeviceId,
          sourcePort: l.sourcePort,
          targetPort: l.targetPort,
          sourceMode: l.sourceMode,
          targetMode: l.targetMode,
          cableType: l.cableType,
          speed: l.speed,
          status: 'active',
        }));

        const newDevicesList = selectedDevs.map((d) => ({
          id: d.id,
          name: d.name,
          ip: d.ip,
          model: d.model,
          type: d.deviceType,
        }));

        onApplyToMap(customLinks, newDevicesList, targetMapId);
      }

      alert(
        isEn
          ? data.message_en || `Successfully applied ${selectedLinks.length} links to the topology!`
          : data.message || `تعداد ${selectedLinks.length} لینک با موفقیت روی نقشه اعمال گردید.`
      );
      onClose();
    } catch (err: any) {
      alert(isEn ? `Failed to apply results: ${err.message}` : `خطا در اعمال تغییرات: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 bottom-8 z-50 flex items-center justify-center ${
      isFullscreen ? 'p-0' : 'p-3 sm:p-4'
    } bg-slate-950/80 backdrop-blur-md animate-fadeIn`}>
      <div
        className={`relative w-full ${
          isFullscreen
            ? 'h-full max-h-full max-w-none rounded-none border-none'
            : 'max-w-5xl max-h-[92vh] rounded-2xl border'
        } flex flex-col shadow-2xl transition-all overflow-hidden ${
          isLightMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-white/10 text-white'
        }`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* ============================================================== */}
        {/* Modal Header with Title, Badges, Minimize & Close Controls    */}
        {/* ============================================================== */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/20">
              <Radar className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold">
                  {isEn ? 'CDP & LLDP Topology Discovery' : 'کشف هوشمند توپولوژی با پروتکل‌های CDP و LLDP'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  L2/L3 Auto-Map
                </span>
              </div>
              <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn
                  ? 'Inspect neighbor switch tables via SSH CLI & correlate physical links automatically'
                  : 'استخراج جداول همسایگی سوییچ‌ها از طریق SSH و ترسیم خودکار کابل‌ها و لینک‌های فیزیکی'}
              </p>
            </div>
          </div>

          {/* Minimize & Close Controls (Adhering strictly to Universal Modal Minimization Rule) */}
          <div className="flex items-center gap-1.5">
            {onMinimize && (
              <button
                type="button"
                onClick={onMinimize}
                className={`p-2 rounded-xl transition cursor-pointer ${
                  isLightMode
                    ? 'text-slate-500 hover:text-cyan-600 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-cyan-400 hover:bg-white/5'
                }`}
                title={isEn ? 'Minimize to bottom dock' : 'مینیمایز به نوار داک پایین'}
                aria-label={isEn ? 'Minimize' : 'مینیمایز'}
              >
                <Minus className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isLightMode
                  ? 'text-slate-500 hover:text-cyan-600 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-cyan-400 hover:bg-white/5'
              }`}
              title={isFullscreen ? (isEn ? 'Exit Fullscreen' : 'خروج از حالت تمام‌صفحه') : (isEn ? 'Fullscreen' : 'تمام‌صفحه')}
              aria-label={isFullscreen ? (isEn ? 'Exit Fullscreen' : 'خروج از حالت تمام‌صفحه') : (isEn ? 'Fullscreen' : 'تمام‌صفحه')}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isLightMode
                  ? 'text-slate-500 hover:text-rose-600 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-rose-400 hover:bg-white/5'
              }`}
              title={isEn ? 'Close' : 'بستن'}
              aria-label={isEn ? 'Close' : 'بستن'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* Modal Body                                                     */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Discovery Mode Selector Tabs */}
          <div>
            <label className={`block text-xs font-semibold mb-2.5 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
              {isEn ? 'Select Discovery Method:' : 'روش کشف توپولوژی را انتخاب کنید:'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Mode 1: Inventory */}
              <button
                type="button"
                disabled={isScanning}
                onClick={() => setMode('inventory')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                  mode === 'inventory'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                    : isLightMode
                    ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    : 'border-white/10 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300">
                    {isEn ? 'Recommended' : 'پیشنهادی'}
                  </span>
                </div>
                <div>
                  <div className="font-bold text-xs sm:text-sm">
                    {isEn ? 'From Inventory' : 'از تجهیزات ثبت‌شده'}
                  </div>
                  <div className={`text-[11px] mt-0.5 leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {isEn
                      ? `Probe all ${switchDevices.length} registered switches`
                      : `استخراج و تطبیق از تمامی ${switchDevices.length} سوییچ ثبت‌شده`}
                  </div>
                </div>
              </button>

              {/* Mode 2: Specific Switch */}
              <button
                type="button"
                disabled={isScanning}
                onClick={() => setMode('device')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                  mode === 'device'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                    : isLightMode
                    ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    : 'border-white/10 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <div className="font-bold text-xs sm:text-sm">
                    {isEn ? 'Specific Switch' : 'سوییچ انتخابی'}
                  </div>
                  <div className={`text-[11px] mt-0.5 leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {isEn ? 'Query single switch CLI' : 'کشف همسایگان متصل به یک سوییچ خاص'}
                  </div>
                </div>
              </button>

              {/* Mode 3: Custom IP Range */}
              <button
                type="button"
                disabled={isScanning}
                onClick={() => setMode('range')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                  mode === 'range'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                    : isLightMode
                    ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    : 'border-white/10 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="font-bold text-xs sm:text-sm">
                    {isEn ? 'Custom IP Range' : 'محدوده آی‌پی دلخواه'}
                  </div>
                  <div className={`text-[11px] mt-0.5 leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {isEn ? 'Subnet sweep (e.g. /24)' : 'اسکن ساب‌نت و ارتباط SSH با رنج IP'}
                  </div>
                </div>
              </button>

              {/* Mode 4: Local Network */}
              <button
                type="button"
                disabled={isScanning}
                onClick={() => setMode('local')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                  mode === 'local'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                    : isLightMode
                    ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    : 'border-white/10 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Radio className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="font-bold text-xs sm:text-sm">
                    {isEn ? 'Local Server Net' : 'شبکه محلی سرور'}
                  </div>
                  <div className={`text-[11px] mt-0.5 leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {isEn ? 'Gateway & ARP / MNDP sweep' : 'کشف همسایگان مستقیم متصل به سرور'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Mode Configuration Form */}
          <div
            className={`p-4 rounded-xl border ${
              isLightMode ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-800/40 border-white/10'
            }`}
          >
            {/* Mode 1 Configuration: Inventory Switches Filter */}
            {mode === 'inventory' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">
                    {isEn
                      ? `Select Switches to Query (${selectedInventoryDeviceIds.length} of ${switchDevices.length} selected):`
                      : `سوییچ‌های مورد نظر جهت استخراج اطلاعات (${selectedInventoryDeviceIds.length} از ${switchDevices.length} انتخاب شده):`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={() => setSelectedInventoryDeviceIds(switchDevices.map((d) => d.id))}
                      className="text-xs text-cyan-400 hover:underline cursor-pointer"
                    >
                      {isEn ? 'Select All' : 'انتخاب همه'}
                    </button>
                    <span className="text-slate-500">|</span>
                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={() => setSelectedInventoryDeviceIds([])}
                      className="text-xs text-slate-400 hover:underline cursor-pointer"
                    >
                      {isEn ? 'Deselect All' : 'عدم انتخاب'}
                    </button>
                  </div>
                </div>

                <div className="max-h-44 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pr-1">
                  {switchDevices.map((dev) => {
                    const isChecked = selectedInventoryDeviceIds.includes(dev.id);
                    return (
                      <label
                        key={dev.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition ${
                          isChecked
                            ? isLightMode
                              ? 'bg-cyan-50 border-cyan-300 text-cyan-900'
                              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                            : isLightMode
                            ? 'bg-white border-slate-200 text-slate-600'
                            : 'bg-slate-900/60 border-white/5 text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={isScanning}
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedInventoryDeviceIds((prev) => [...prev, dev.id]);
                            } else {
                              setSelectedInventoryDeviceIds((prev) => prev.filter((id) => id !== dev.id));
                            }
                          }}
                          className="rounded border-slate-600 text-cyan-600 focus:ring-cyan-500"
                        />
                        <div className="truncate">
                          <div className="font-semibold truncate">{dev.name}</div>
                          <div className="text-[10px] opacity-75">{dev.ip || 'No IP'}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode 2 Configuration: Specific Switch Selector */}
            {mode === 'device' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold">
                  {isEn ? 'Choose Target Switch / Router:' : 'سوییچ یا روتر مورد نظر را انتخاب کنید:'}
                </label>
                <select
                  disabled={isScanning}
                  value={targetSingleDeviceId}
                  onChange={(e) => setTargetSingleDeviceId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs font-mono transition focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                    isLightMode
                      ? 'bg-white border-slate-300 text-slate-900'
                      : 'bg-slate-900 border-white/10 text-white'
                  }`}
                >
                  {switchDevices.map((dev) => (
                    <option key={dev.id} value={dev.id}>
                      {dev.name} — {dev.ip} ({dev.model || 'Switch'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mode 3 Configuration: IP Range & SSH Credentials */}
            {mode === 'range' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold mb-1">
                    {isEn ? 'Target Subnet / Range (CIDR or Range):' : 'محدوده یا ساب‌نت هدف (CIDR یا رنج):'}
                  </label>
                  <input
                    type="text"
                    disabled={isScanning}
                    value={ipRange}
                    onChange={(e) => setIpRange(e.target.value)}
                    placeholder="172.22.100.0/24 or 192.168.1.1-50"
                    className={`w-full p-2 rounded-lg border text-xs font-mono transition focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                      isLightMode
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-900 border-white/10 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    {isEn ? 'SSH Port:' : 'پورت SSH:'}
                  </label>
                  <input
                    type="number"
                    disabled={isScanning}
                    value={sshPort}
                    onChange={(e) => setSshPort(parseInt(e.target.value, 10) || 22)}
                    className={`w-full p-2 rounded-lg border text-xs font-mono transition focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                      isLightMode
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-900 border-white/10 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    {isEn ? 'SSH Username:' : 'نام کاربری SSH:'}
                  </label>
                  <input
                    type="text"
                    disabled={isScanning}
                    value={sshUsername}
                    onChange={(e) => setSshUsername(e.target.value)}
                    className={`w-full p-2 rounded-lg border text-xs font-mono transition focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                      isLightMode
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-900 border-white/10 text-white'
                    }`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold mb-1">
                    {isEn ? 'SSH Password:' : 'رمز عبور SSH:'}
                  </label>
                  <input
                    type="password"
                    disabled={isScanning}
                    value={sshPassword}
                    onChange={(e) => setSshPassword(e.target.value)}
                    className={`w-full p-2 rounded-lg border text-xs font-mono transition focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                      isLightMode
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-900 border-white/10 text-white'
                    }`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold mb-1">
                    {isEn ? 'Enable Secret (Cisco privileged mode):' : 'رمز Enable (اختیاری):'}
                  </label>
                  <input
                    type="password"
                    disabled={isScanning}
                    value={enablePassword}
                    onChange={(e) => setEnablePassword(e.target.value)}
                    placeholder={isEn ? 'Optional enable password' : 'رمز عبور سطح دسترسی Enable'}
                    className={`w-full p-2 rounded-lg border text-xs font-mono transition focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                      isLightMode
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-900 border-white/10 text-white'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Mode 4 Configuration: Local Network Info */}
            {mode === 'local' && (
              <div className="flex items-start gap-3 text-xs">
                <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">
                    {isEn
                      ? 'Local Subnet Discovery Active'
                      : 'کشف از طریق اینترفیس‌های محلی سرور فعال است'}
                  </div>
                  <div className={`mt-0.5 leading-relaxed ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                    {isEn
                      ? 'The server will inspect local default gateway tables, ARP neighbor caches, and broadcast UDP MNDP / LLDP packets to detect immediate upstream switches.'
                      : 'سرور با بررسی جدول گیت‌وی پیش‌فرض، جدول کش ARP اینترفیس‌های فعال و ارسال بسته‌های کشف همسایگی MNDP/LLDP، سوییچ بالادستی متصل به سرور را شناسایی می‌کند.'}
                  </div>
                </div>
              </div>
            )}

            {/* Common Options */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isScanning}
                  checked={allowSimulatorFallback}
                  onChange={(e) => setAllowSimulatorFallback(e.target.checked)}
                  className="rounded border-slate-600 text-cyan-600 focus:ring-cyan-500"
                />
                <span className={isLightMode ? 'text-slate-700' : 'text-slate-300'}>
                  {isEn
                    ? 'Allow Lab / Simulator fallback if hardware is offline'
                    : 'استفاده از شبیه‌ساز آزمایشگاه در صورت عدم دسترسی به سخت‌افزار واقعی'}
                </span>
              </label>

              <div className="flex items-center gap-2">
                <span className={isLightMode ? 'text-slate-600' : 'text-slate-400'}>
                  {isEn ? 'Parallel Workers:' : 'تعداد فرآیندهای همزمان:'}
                </span>
                <select
                  disabled={isScanning}
                  value={concurrency}
                  onChange={(e) => setConcurrency(parseInt(e.target.value, 10) || 4)}
                  className={`p-1 px-2 rounded-lg border text-xs transition ${
                    isLightMode
                      ? 'bg-white border-slate-300 text-slate-900'
                      : 'bg-slate-900 border-white/10 text-white'
                  }`}
                >
                  <option value={2}>2 Threads</option>
                  <option value={4}>4 Threads</option>
                  <option value={6}>6 Threads</option>
                  <option value={8}>8 Threads</option>
                </select>
              </div>
            </div>
          </div>

          {/* Start / Cancel Action Button Banner */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isScanning || (mode === 'inventory' && selectedInventoryDeviceIds.length === 0)}
                onClick={handleStartDiscovery}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isEn ? 'Start Topology Discovery' : 'شروع کشف هوشمند توپولوژی'}</span>
              </button>

              {isScanning && (
                <button
                  type="button"
                  onClick={handleCancelDiscovery}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/30 transition cursor-pointer"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>{isEn ? 'Stop Scan' : 'توقف'}</span>
                </button>
              )}
            </div>

            {/* Scan Progress Indicator */}
            {isScanning && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-cyan-400">{progress}%</span>
                <div className="w-32 sm:w-44 h-2 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Current Step Status Banner during scan */}
          {isScanning && (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-2.5 text-xs text-cyan-300 animate-pulse">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="truncate">{isEn ? currentStepEn || currentStep : currentStep}</span>
            </div>
          )}

          {/* Live Device Log Terminal (Collapsible or Shown during scan) */}
          {(isScanning || logs.length > 0) && (
            <div
              className={`rounded-xl border overflow-hidden ${
                isLightMode ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-slate-950 border-white/10'
              }`}
            >
              <div
                onClick={() => setShowLogsAccordion(!showLogsAccordion)}
                className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-white/10 cursor-pointer select-none text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-bold text-slate-300">
                    {isEn ? 'Discovery Execution Logs' : 'لاگ‌های اجرایی کشف سوییچ‌ها'}
                  </span>
                  <span className="text-slate-500">({logs.length} events)</span>
                </div>
                {showLogsAccordion ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>

              {showLogsAccordion && (
                <div className="p-3 max-h-48 overflow-y-auto font-mono text-[11px] space-y-1.5 leading-relaxed">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                      {log.status === 'success' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      {log.status === 'warning' && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      {log.status === 'error' && (
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      {log.status === 'connecting' && (
                        <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5 animate-spin" />
                      )}
                      <div className="flex-1">
                        <span className="font-bold text-white">{log.deviceName}</span>{' '}
                        <span className="text-slate-400">({log.ip}):</span>{' '}
                        {log.status === 'success' && (
                          <span className="text-emerald-300">
                            {isEn
                              ? `Connected via ${log.protocol} -> ${log.neighborsFound} neighbors discovered`
                              : `اتصال برقرار شد (${log.protocol}) -> ${log.neighborsFound} همسایه شناسایی گردید`}
                          </span>
                        )}
                        {log.status === 'warning' && (
                          <span className="text-amber-300">{log.error || 'Simulated fallback'}</span>
                        )}
                        {log.status === 'error' && (
                          <span className="text-rose-400">{log.error || 'Connection failed'}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* Results Preview Section (Summary Cards & Tables)              */}
          {/* ============================================================== */}
          {summary && (
            <div className="space-y-4 pt-2 border-t border-white/10 animate-fadeIn">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                  className={`p-3 rounded-xl border ${
                    isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-white/10'
                  }`}
                >
                  <div className="text-[11px] text-slate-400">{isEn ? 'Switches Scanned' : 'تجهیزات اسکن شده'}</div>
                  <div className="text-lg font-bold text-cyan-400 mt-1">
                    {summary.successfulScanned} / {summary.totalScanned}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-white/10'
                  }`}
                >
                  <div className="text-[11px] text-slate-400">{isEn ? 'Discovered Links' : 'لینک‌های کشف شده'}</div>
                  <div className="text-lg font-bold text-indigo-400 mt-1">{discoveredLinks.length}</div>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-white/10'
                  }`}
                >
                  <div className="text-[11px] text-slate-400">{isEn ? 'Two-Way Verified' : 'تایید دوطرفه'}</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    {summary.bidirectionalCount}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-white/10'
                  }`}
                >
                  <div className="text-[11px] text-slate-400">{isEn ? 'New / Unregistered' : 'تجهیزات ناشناخته'}</div>
                  <div className="text-lg font-bold text-amber-400 mt-1">{unmanagedDevices.length}</div>
                </div>
              </div>

              {/* Result Tabs Navigation */}
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveResultTab('links')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeResultTab === 'links'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Cable className="w-3.5 h-3.5" />
                  <span>{isEn ? `Discovered Links (${discoveredLinks.length})` : `لینک‌های کشف‌شده (${discoveredLinks.length})`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveResultTab('devices')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeResultTab === 'devices'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>{isEn ? `New Devices (${unmanagedDevices.length})` : `تجهیزات جدید (${unmanagedDevices.length})`}</span>
                </button>
              </div>

              {/* Tab 1: Discovered Physical Links Table */}
              {activeResultTab === 'links' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {isEn
                        ? 'Confirm the detected switch-to-switch physical connections:'
                        : 'اتصالات فیزیکی بین سوییچ‌ها را جهت افزودن به نقشه تایید کنید:'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAllLinks(true)}
                        className="text-cyan-400 hover:underline cursor-pointer"
                      >
                        {isEn ? 'Select All' : 'انتخاب همه'}
                      </button>
                      <span className="text-slate-500">|</span>
                      <button
                        type="button"
                        onClick={() => handleToggleAllLinks(false)}
                        className="text-slate-400 hover:underline cursor-pointer"
                      >
                        {isEn ? 'Deselect All' : 'عدم انتخاب'}
                      </button>
                    </div>
                  </div>

                  {discoveredLinks.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      {isEn ? 'No inter-switch links detected.' : 'هیچ لینکی بین تجهیزات شناسایی نشد.'}
                    </div>
                  ) : (
                    <div
                      className={`max-h-64 overflow-y-auto rounded-xl border ${
                        isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-white/10'
                      }`}
                    >
                      <table className="w-full text-left text-xs font-mono">
                        <thead className={`border-b sticky top-0 ${isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-white/10'}`}>
                          <tr>
                            <th className="p-2.5 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={discoveredLinks.every((l) => l.checked)}
                                onChange={(e) => handleToggleAllLinks(e.target.checked)}
                                className="rounded border-slate-600 text-cyan-600 focus:ring-cyan-500"
                              />
                            </th>
                            <th className="p-2.5">{isEn ? 'Device A & Port' : 'دستگاه اول و پورت'}</th>
                            <th className="p-2.5 text-center">{isEn ? 'Link' : 'اتصال'}</th>
                            <th className="p-2.5">{isEn ? 'Device B & Port' : 'دستگاه دوم و پورت'}</th>
                            <th className="p-2.5">{isEn ? 'Protocol' : 'پروتکل'}</th>
                            <th className="p-2.5">{isEn ? 'Speed / Type' : 'سرعت / نوع کابل'}</th>
                            <th className="p-2.5">{isEn ? 'Verification' : 'اعتبارسنجی'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {discoveredLinks.map((link) => (
                            <tr
                              key={link.id}
                              onClick={() => handleToggleLink(link.id)}
                              className={`transition cursor-pointer ${
                                link.checked
                                  ? isLightMode
                                    ? 'bg-cyan-50/50 hover:bg-cyan-50'
                                    : 'bg-cyan-500/5 hover:bg-cyan-500/10'
                                  : isLightMode
                                  ? 'hover:bg-slate-50 opacity-60'
                                  : 'hover:bg-white/5 opacity-60'
                              }`}
                            >
                              <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={link.checked}
                                  onChange={() => handleToggleLink(link.id)}
                                  className="rounded border-slate-600 text-cyan-600 focus:ring-cyan-500"
                                />
                              </td>
                              <td className="p-2.5">
                                <div className="font-bold text-cyan-400">{link.sourceDeviceName}</div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                  <span>Port:</span> <strong className="text-white">{link.sourcePort}</strong>
                                </div>
                              </td>
                              <td className="p-2.5 text-center text-slate-500">
                                <ArrowRightLeft className="w-3.5 h-3.5 mx-auto text-indigo-400" />
                              </td>
                              <td className="p-2.5">
                                <div className="font-bold text-indigo-400">{link.targetDeviceName}</div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                  <span>Port:</span> <strong className="text-white">{link.targetPort}</strong>
                                </div>
                              </td>
                              <td className="p-2.5">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                  {link.protocol}
                                </span>
                              </td>
                              <td className="p-2.5">
                                <span className="text-[11px] text-slate-300">
                                  {link.speed} {link.cableType === 'fiber' ? '⚡ Fiber' : '🔌 Copper'}
                                </span>
                              </td>
                              <td className="p-2.5">
                                {link.verification === 'bidirectional' ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    {isEn ? 'Two-Way Verified' : 'تایید دوطرفه'}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    {isEn ? 'One-Way Seen' : 'تایید یک‌طرفه'}
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

              {/* Tab 2: Discovered Unmanaged / New Devices */}
              {activeResultTab === 'devices' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400">
                    {isEn
                      ? 'The following devices were discovered via CDP/LLDP neighbors but are not yet registered on your canvas. Select to add them with one click:'
                      : 'تجهیزات زیر در جداول CDP/LLDP شناسایی شده‌اند اما هنوز در نقشه وجود ندارند. می‌توانید آنها را مستقیماً به بوم اضافه کنید:'}
                  </div>

                  {unmanagedDevices.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      {isEn ? 'All discovered devices are already on the map!' : 'تمامی تجهیزات شناسایی شده قبلاً در نقشه وجود دارند.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                      {unmanagedDevices.map((dev) => (
                        <div
                          key={dev.id}
                          className={`p-3 rounded-xl border transition flex items-start justify-between ${
                            dev.checked
                              ? isLightMode
                                ? 'bg-amber-50/50 border-amber-300'
                                : 'bg-amber-500/10 border-amber-500/30'
                              : isLightMode
                              ? 'bg-white border-slate-200 opacity-60'
                              : 'bg-slate-900 border-white/5 opacity-60'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={dev.checked}
                              onChange={() => handleToggleDevice(dev.id)}
                              className="mt-1 rounded border-slate-600 text-amber-500 focus:ring-amber-400"
                            />
                            <div>
                              <div className="font-bold text-xs text-white">{dev.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                IP: {dev.ip}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1">
                                {isEn ? 'Discovered via:' : 'شناسایی از طریق:'}{' '}
                                <strong className="text-cyan-400">{dev.discoveredViaDeviceName}</strong> (
                                {dev.localPort} ↔ {dev.remotePort})
                              </div>
                            </div>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                            {dev.protocol}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* Modal Footer: Target Map Selector & Apply Button               */}
        {/* ============================================================== */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t ${
            isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-white/10'
          }`}
        >
          {/* Target Map Selector */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
              {isEn ? 'Apply to Map:' : 'اعمال بر روی نقشه:'}
            </span>
            <select
              value={targetMapId}
              onChange={(e) => setTargetMapId(e.target.value)}
              className={`p-1.5 px-2.5 rounded-lg border text-xs font-medium transition ${
                isLightMode
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-slate-800 border-white/10 text-white'
              }`}
            >
              <option value="default">{isEn ? 'Default Topology Map' : 'نقشه پیش‌فرض توپولوژی'}</option>
              {customMaps.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.deviceIds?.length || 0} dev, {m.links?.length || 0} links)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                isLightMode
                  ? 'text-slate-600 hover:bg-slate-200'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              {isEn ? 'Close' : 'بستن'}
            </button>

            {discoveredLinks.length > 0 && (
              <button
                type="button"
                onClick={handleApplyResults}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-500/20 transition cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isEn
                    ? `Apply Selected (${discoveredLinks.filter((l) => l.checked).length} links)`
                    : `تایید و اعمال بر روی نقشه (${discoveredLinks.filter((l) => l.checked).length} لینک)`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
