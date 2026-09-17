import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Sliders,
  Play,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  RefreshCw,
  Download,
  Terminal,
  Shield,
  FileText,
  Copy,
  ChevronRight,
  ChevronDown,
  Layers,
  Search,
  Filter,
  Users,
  Network,
  Cpu,
  Power,
  Lock,
  GitFork,
  Trash2,
  ArrowRight,
  Database,
  Info,
  Check,
  Ban,
  Maximize2,
  Minimize2,
  ExternalLink
} from 'lucide-react';
import {
  Device,
  BulkConfigTemplate,
  BulkDevicePreviewItem,
  BulkJobStatus,
  BulkDeviceExecutionResult,
} from '../types';
import { useLanguage } from '../i18n';
import { ModalHeaderControls } from './common/ModalHeaderControls';
import {
  fetchBulkTemplates,
  generateBulkPreview,
  startBulkJob,
  fetchBulkJobStatus,
  cancelBulkJob,
  fetchBackupContent,
} from '../services/bulkConfigService';
import { InfoTooltipPopover } from './bulk-config/InfoTooltipPopover';
import { getTemplateGuide, getParameterGuide } from './bulk-config/templateInfoGuide';

export interface BulkDeviceConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  selectedDevices?: Device[];
  devices?: Device[];
  allDevices?: Device[];
  onDeviceUpdated?: () => void;
  isEn?: boolean;
  isLightMode?: boolean;
}

export const BulkDeviceConfigModal: React.FC<BulkDeviceConfigModalProps> = ({
  isOpen,
  onClose,
  onMinimize,
  selectedDevices,
  devices,
  allDevices,
  onDeviceUpdated,
  isLightMode = false,
}) => {
  const { isEn: contextIsEn, isRtl } = useLanguage();
  const isEn = contextIsEn;
  const initialSelectedDevices = selectedDevices || devices || [];

  // State
  const [templates, setTemplates] = useState<BulkConfigTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [templateSearch, setTemplateSearch] = useState<string>('');
  
  // Selected devices management
  const [targetDevices, setTargetDevices] = useState<Device[]>(initialSelectedDevices);
  const [removedDeviceIds, setRemovedDeviceIds] = useState<Set<string>>(new Set());

  // Form parameters
  const [formParams, setFormParams] = useState<Record<string, any>>({});
  const [dangerConfirmInput, setDangerConfirmInput] = useState('');
  const [showTemplateGuideDetails, setShowTemplateGuideDetails] = useState(false);

  // Options
  const [autoBackup, setAutoBackup] = useState(true);
  const [saveAfterApply, setSaveAfterApply] = useState(true);
  const [timeoutSec, setTimeoutSec] = useState(25);
  const [delayMs, setDelayMs] = useState(1500);

  // Workflow tabs: 'configure' | 'preview' | 'execution'
  const [activeStep, setActiveStep] = useState<'configure' | 'preview' | 'execution'>('configure');

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewItems, setPreviewItems] = useState<BulkDevicePreviewItem[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Job & Execution state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<BulkJobStatus | null>(null);
  const [startingJob, setStartingJob] = useState(false);
  const [cancellingJob, setCancellingJob] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  // Detail drawers
  const [viewingResult, setViewingResult] = useState<BulkDeviceExecutionResult | null>(null);
  const [viewingBackup, setViewingBackup] = useState<{
    deviceName: string;
    content: string;
    loading: boolean;
  } | null>(null);
  const [copiedLog, setCopiedLog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Polling ref
  const pollTimerRef = useRef<any>(null);

  // Sync incoming devices
  useEffect(() => {
    setTargetDevices(initialSelectedDevices);
    setRemovedDeviceIds(new Set());
  }, [initialSelectedDevices]);

  // Load templates on open
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoadingTemplates(true);
    fetchBulkTemplates()
      .then((data) => {
        if (!isMounted) return;
        setTemplates(data);
        if (data.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(data[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load templates:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingTemplates(false);
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Find active template
  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // Reset/Initialize form parameters when template changes
  useEffect(() => {
    if (!activeTemplate) return;
    const initialParams: Record<string, any> = {};
    activeTemplate.parameters.forEach((p) => {
      if (p.default !== undefined) {
        initialParams[p.name] = p.default;
      } else if (p.type === 'boolean') {
        initialParams[p.name] = false;
      } else {
        initialParams[p.name] = '';
      }
    });
    setFormParams(initialParams);
    setDangerConfirmInput('');
    setPreviewItems([]);
    setPreviewError(null);
    if (activeTemplate.default_timeout_sec) {
      setTimeoutSec(activeTemplate.default_timeout_sec);
    }
  }, [activeTemplate]);

  // Active target devices (excluding those toggled off)
  const effectiveDevices = useMemo(() => {
    return targetDevices.filter((d) => !removedDeviceIds.has(d.id));
  }, [targetDevices, removedDeviceIds]);

  // Check if form is valid
  const isFormValid = useMemo(() => {
    if (!activeTemplate || effectiveDevices.length === 0) return false;
    for (const p of activeTemplate.parameters) {
      if (p.required) {
        const val = formParams[p.name];
        if (val === undefined || val === null || String(val).trim() === '') {
          return false;
        }
      }
    }
    if (activeTemplate.is_dangerous) {
      const requiredWord = activeTemplate.confirmation_keyword || 'CONFIRM';
      if (dangerConfirmInput.trim().toUpperCase() !== requiredWord.toUpperCase()) {
        return false;
      }
    }
    return true;
  }, [activeTemplate, formParams, effectiveDevices, dangerConfirmInput]);

  // Generate Preview
  const handleGeneratePreview = async () => {
    if (!activeTemplate || effectiveDevices.length === 0) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const items = await generateBulkPreview(
        activeTemplate.id,
        formParams,
        effectiveDevices.map((d) => d.id)
      );
      setPreviewItems(items);
      setActiveStep('preview');
    } catch (err: any) {
      setPreviewError(err.message || (isEn ? 'Failed to generate preview' : 'خطا در ایجاد پیش‌نمایش دستورات'));
    } finally {
      setPreviewLoading(false);
    }
  };

  // Start Execution
  const handleStartExecution = async () => {
    if (!activeTemplate || effectiveDevices.length === 0) return;
    setStartingJob(true);
    try {
      const { jobId } = await startBulkJob({
        templateId: activeTemplate.id,
        parameters: formParams,
        deviceIds: effectiveDevices.map((d) => d.id),
        timeoutSec,
        delayMs,
        autoBackup,
        saveAfterApply,
        dangerConfirmation: dangerConfirmInput,
      });
      setActiveJobId(jobId);
      setActiveStep('execution');
      // Fetch immediate status
      const initialStatus = await fetchBulkJobStatus(jobId);
      setJobStatus(initialStatus);
    } catch (err: any) {
      alert(err.message || (isEn ? 'Failed to initiate execution' : 'خطا در آغاز فرآیند پیکربندی'));
    } finally {
      setStartingJob(false);
    }
  };

  // Status polling effect during execution
  useEffect(() => {
    if (!activeJobId || activeStep !== 'execution') return;

    const poll = async () => {
      try {
        const status = await fetchBulkJobStatus(activeJobId);
        setJobStatus(status);
        if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    // Immediate poll
    poll();
    pollTimerRef.current = setInterval(poll, 1500);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [activeJobId, activeStep]);

  // Cancel running job
  const handleCancelJob = async () => {
    if (!activeJobId) return;
    setCancellingJob(true);
    try {
      await cancelBulkJob(activeJobId);
      const status = await fetchBulkJobStatus(activeJobId);
      setJobStatus(status);
    } catch (err) {
      console.error('Cancel failed:', err);
    } finally {
      setCancellingJob(false);
    }
  };

  // View backup content
  const handleViewBackup = async (deviceName: string, backupId?: string) => {
    if (!backupId) return;
    setViewingBackup({ deviceName, content: '', loading: true });
    try {
      const content = await fetchBackupContent(backupId);
      setViewingBackup({ deviceName, content, loading: false });
    } catch (err: any) {
      setViewingBackup({
        deviceName,
        content: isEn ? `Error retrieving backup: ${err.message}` : `خطا در دریافت پشتیبان: ${err.message}`,
        loading: false,
      });
    }
  };

  // Template categories for filter
  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category));
    return ['all', ...Array.from(cats)];
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      if (categoryFilter !== 'all' && tpl.category !== categoryFilter) return false;
      if (templateSearch) {
        const q = templateSearch.toLowerCase();
        const titleMatch = (tpl.title || '').toLowerCase().includes(q) || (tpl.title_en || '').toLowerCase().includes(q);
        const descMatch = (tpl.description || '').toLowerCase().includes(q) || (tpl.description_en || '').toLowerCase().includes(q);
        return titleMatch || descMatch;
      }
      return true;
    });
  }, [templates, categoryFilter, templateSearch]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 bottom-8 z-50 flex items-center justify-center ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4'
      } bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        className={`relative w-full ${
          isFullscreen
            ? 'h-full max-h-full rounded-none border-none'
            : 'max-w-6xl max-h-[92vh] rounded-2xl border'
        } flex flex-col shadow-2xl ${
          isLightMode
            ? 'bg-slate-50 border-slate-300 text-slate-900'
            : 'bg-slate-900/95 border-cyan-500/30 text-slate-100'
        } overflow-hidden backdrop-blur-xl transition-all duration-200`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isLightMode ? 'border-slate-200 bg-slate-100/80' : 'border-white/10 bg-slate-950/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/40 text-cyan-300 shadow-md">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white font-mono tracking-tight">
                  {isEn ? 'Bulk Device Configuration' : 'پیکربندی گروهی تجهیزات شبکه'}
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {isEn ? `${effectiveDevices.length} Devices` : `${effectiveDevices.length} دستگاه`}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {isEn ? 'Real SSH Engine' : 'اتصال واقعی SSH'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEn
                  ? 'Apply standardized administration commands across physical Cisco and MikroTik nodes with rollback protection'
                  : 'اعمال دسته‌ای فرامین مدیریتی روی تجهیزات واقعی سیسکو و میکروتیک همراه با اعتبارسنجی و بکاپ خودکار'}
              </p>
            </div>
          </div>

          <ModalHeaderControls
            onMinimize={onMinimize}
            onClose={onClose}
            onMaximizeToggle={() => setIsFullscreen((prev) => !prev)}
            isMaximized={isFullscreen}
            isLightMode={isLightMode}
            isEn={isEn}
            minimizeTooltip={isEn ? 'Minimize to bottom dock' : 'مینیمایز به نوار داک'}
            closeTooltip={isEn ? 'Close modal' : 'بستن پنجره'}
          />
        </div>

        {/* Multi-step Navigation Bar */}
        <div
          className={`flex items-center justify-between px-6 py-2.5 border-b text-xs font-mono ${
            isLightMode ? 'bg-slate-200/50 border-slate-300' : 'bg-slate-950/40 border-white/5'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setActiveStep('configure')}
              disabled={activeStep === 'execution' && jobStatus?.status === 'running'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${
                activeStep === 'configure'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center bg-cyan-500/30 text-cyan-300 text-[10px]">
                1
              </span>
              <span>{isEn ? 'Template & Parameters' : 'قالب دستور و متغیرها'}</span>
            </button>

            <ChevronRight className={`w-3.5 h-3.5 text-slate-600 ${isRtl ? 'rotate-180' : ''}`} />

            <button
              onClick={() => {
                if (previewItems.length > 0) setActiveStep('preview');
                else handleGeneratePreview();
              }}
              disabled={!isFormValid || (activeStep === 'execution' && jobStatus?.status === 'running')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${
                activeStep === 'preview'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                  : isFormValid
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  : 'text-slate-600 cursor-not-allowed opacity-50'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white/10 text-[10px]">
                2
              </span>
              <span>{isEn ? 'Preview & Dry Run' : 'پیش‌نمایش و دستورات CLI'}</span>
            </button>

            <ChevronRight className={`w-3.5 h-3.5 text-slate-600 ${isRtl ? 'rotate-180' : ''}`} />

            <button
              onClick={() => {
                if (activeJobId) setActiveStep('execution');
              }}
              disabled={!activeJobId}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${
                activeStep === 'execution'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                  : activeJobId
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  : 'text-slate-600 cursor-not-allowed opacity-50'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white/10 text-[10px]">
                3
              </span>
              <span>{isEn ? 'Execution & Monitoring' : 'اجرا و مانیتورینگ'}</span>
            </button>
          </div>

          {/* Quick Hardware Platform Summary */}
          <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>
                Cisco:{' '}
                <strong className="text-slate-200 font-mono">
                  {effectiveDevices.filter((d) => d.platform?.includes('cisco')).length}
                </strong>
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>
                MikroTik:{' '}
                <strong className="text-slate-200 font-mono">
                  {effectiveDevices.filter((d) => d.platform?.includes('mikrotik')).length}
                </strong>
              </span>
            </span>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* STEP 1: CONFIGURE TEMPLATE & PARAMETERS */}
          {activeStep === 'configure' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Template Selection Catalog (5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isEn ? 'Select Command Template' : 'انتخاب الگوی پیکربندی'}</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {filteredTemplates.length} {isEn ? 'templates' : 'الگو'}
                  </span>
                </div>

                {/* Search & Category Tabs */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className={`w-3.5 h-3.5 text-slate-400 absolute top-2.5 ${isRtl ? 'right-3' : 'left-3'}`} />
                    <input
                      type="text"
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      placeholder={isEn ? 'Filter templates (e.g. user, ntp, dns, backup)...' : 'جستجوی الگو (کاربر، DNS، NTP، بکاپ)...'}
                      className={`w-full py-1.5 text-xs bg-slate-950/60 border border-white/10 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 ${
                        isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'
                      }`}
                    />
                  </div>

                  {/* Categories Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-none">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg border whitespace-nowrap transition cursor-pointer ${
                          categoryFilter === cat
                            ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-semibold'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat === 'all'
                          ? isEn ? 'All' : 'همه'
                          : cat === 'vlan_management'
                          ? isEn ? 'VLAN' : 'وی‌لن‌ها'
                          : cat === 'user_management' || cat === 'users'
                          ? isEn ? 'Users' : 'کاربران'
                          : cat === 'network_services'
                          ? isEn ? 'Services' : 'سرویس‌ها'
                          : cat === 'monitoring_logging'
                          ? isEn ? 'Monitoring' : 'مانیتورینگ'
                          : cat === 'system_security'
                          ? isEn ? 'Security' : 'امنیت'
                          : cat === 'maintenance_backup'
                          ? isEn ? 'Backup' : 'پشتیبان‌گیری'
                          : cat === 'system_lifecycle'
                          ? isEn ? 'System' : 'سیستم'
                          : cat === 'operations'
                          ? isEn ? 'Operations' : 'عملیاتی'
                          : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Templates List */}
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {loadingTemplates ? (
                    <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                      <span className="text-xs">{isEn ? 'Loading command registry...' : 'در حال بارگذاری الگوها...'}</span>
                    </div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 border border-dashed border-white/10 rounded-xl text-xs">
                      {isEn ? 'No matching templates found' : 'الگویی با این مشخصات یافت نشد'}
                    </div>
                  ) : (
                    filteredTemplates.map((tpl) => {
                      const isSelected = tpl.id === selectedTemplateId;
                      const tplGuide = getTemplateGuide(tpl.id, isEn, tpl);
                      return (
                        <div
                          key={tpl.id}
                          onClick={() => setSelectedTemplateId(tpl.id)}
                          className={`p-3 rounded-xl border transition cursor-pointer relative ${
                            isSelected
                              ? 'bg-gradient-to-r from-cyan-950/40 to-slate-900 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/30'
                              : 'bg-slate-950/40 border-white/5 hover:border-white/20 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div
                                className={`p-1.5 rounded-lg shrink-0 ${
                                  tpl.is_dangerous
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : isSelected
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                    : 'bg-white/5 text-slate-400'
                                }`}
                              >
                                {tpl.category === 'vlan_management' ? (
                                  tpl.id === 'delete_vlan' ? <Trash2 className="w-4 h-4" /> : <GitFork className="w-4 h-4" />
                                ) : tpl.category === 'users' || tpl.category === 'user_management' ? (
                                  <Users className="w-4 h-4" />
                                ) : tpl.category === 'network_services' ? (
                                  <Network className="w-4 h-4" />
                                ) : tpl.category === 'system_lifecycle' ? (
                                  <Power className="w-4 h-4" />
                                ) : (
                                  <Cpu className="w-4 h-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="text-xs font-bold text-white leading-tight truncate">
                                  {isEn ? tpl.title_en : tpl.title}
                                </h5>
                                <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                  {isEn ? tpl.description_en : tpl.description}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {tpl.is_dangerous && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0"
                                  title={isEn ? 'Dangerous command requiring confirmation' : 'دستور حساس نیازمند تاییدیه'}
                                >
                                  {isEn ? 'Critical' : 'حساس'}
                                </span>
                              )}
                              <InfoTooltipPopover
                                title={isEn ? tpl.title_en : tpl.title}
                                what={tplGuide.what}
                                why={tplGuide.why}
                                example={tplGuide.example}
                                isEn={isEn}
                                size="sm"
                                align={isEn ? 'left' : 'right'}
                                placement="bottom"
                              />
                            </div>
                          </div>

                          {/* Badges footer */}
                          <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-white/5 text-[10px] font-mono text-slate-500">
                            <span className="text-slate-400">
                              {isEn ? 'Cisco & MikroTik' : 'سازگار با سیسکو و میکروتیک'}
                            </span>
                            {tpl.supports_idempotency && (
                              <>
                                <span>•</span>
                                <span className="text-cyan-400/80">{isEn ? 'Idempotent' : 'بررسی تکرار'}</span>
                              </>
                            )}
                            {tpl.supports_backup && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-400/80">{isEn ? 'Auto-Backup' : 'بکاپ خودکار'}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Parameters Form & Execution Settings (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {activeTemplate ? (
                  <>
                    {/* Active Template Header Details */}
                    {(() => {
                      const activeTemplateGuide = getTemplateGuide(activeTemplate.id, isEn, activeTemplate);
                      return (
                        <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                                <span>{isEn ? activeTemplate.title_en : activeTemplate.title}</span>
                                <InfoTooltipPopover
                                  title={isEn ? activeTemplate.title_en : activeTemplate.title}
                                  what={activeTemplateGuide.what}
                                  why={activeTemplateGuide.why}
                                  example={activeTemplateGuide.example}
                                  isEn={isEn}
                                  size="md"
                                  align={isEn ? 'left' : 'right'}
                                  placement="bottom"
                                />
                              </h4>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                                ID: {activeTemplate.id}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowTemplateGuideDetails((prev) => !prev)}
                                className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 transition border font-medium ${
                                  showTemplateGuideDetails
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                                    : 'bg-white/5 text-slate-300 hover:text-cyan-300 hover:bg-white/10 border-white/10'
                                }`}
                                title={isEn ? 'Toggle complete guide & practical scenario' : 'نمایش / بستن راهنمای کاربردی و سناریوی نمونه'}
                              >
                                <Info className="w-3.5 h-3.5 text-cyan-400" />
                                <span>{isEn ? 'Guide & Example' : 'توضیحات و مثال'}</span>
                              </button>

                              {activeTemplate.is_dangerous && (
                                <span className="flex items-center gap-1 text-xs text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/30">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>{isEn ? 'Dangerous Operation' : 'عملیات با ریسک بالا'}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed">
                            {isEn ? activeTemplate.description_en : activeTemplate.description}
                          </p>

                          {/* Expanded Educational Guidance Banner */}
                          {showTemplateGuideDetails && (
                            <div className="pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-2.5 animate-in fade-in">
                              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-cyan-500/30 space-y-1">
                                <div className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                                  <span>💡</span>
                                  <span>{isEn ? 'What is this?' : 'این الگو چیست؟'}</span>
                                </div>
                                <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                                  {activeTemplateGuide.what}
                                </p>
                              </div>

                              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-amber-500/30 space-y-1">
                                <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                                  <span>🎯</span>
                                  <span>{isEn ? 'Why is it needed?' : 'چرا مورد نیاز است؟'}</span>
                                </div>
                                <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                                  {activeTemplateGuide.why}
                                </p>
                              </div>

                              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                                <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                  <span>{isEn ? 'Practical Example:' : 'مثال کاربردی سناریو:'}</span>
                                </div>
                                <p className="text-[11px] text-emerald-200/90 font-mono leading-relaxed bg-black/40 p-1.5 rounded border border-emerald-500/20 select-all break-words">
                                  {activeTemplateGuide.example}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Parameters Fields Form */}
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-3">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{isEn ? 'Command Parameters' : 'ورودی‌ها و متغیرهای دستور'}</span>
                      </h5>

                      {activeTemplate.parameters.length === 0 ? (
                        <div className="p-3 rounded-lg bg-white/5 text-xs text-slate-400 border border-white/5">
                          {isEn
                            ? 'This command template does not require additional input parameters.'
                            : 'این قالب دستور به هیچ ورودی یا پارامتر اضافه‌ای نیاز ندارد و مستقیماً روی تجهیزات اعمال می‌شود.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {activeTemplate.parameters.map((param) => {
                            const isRequired = param.required;
                            const isBoolean = param.type === 'boolean';
                            const isPassword = param.type === 'password';
                            const isSelect = param.type === 'select';
                            const isTextarea = param.type === 'textarea';
                            const paramGuide = getParameterGuide(activeTemplate.id, param, isEn);

                            return (
                              <div
                                key={param.name}
                                className={`space-y-1.5 ${isTextarea || isBoolean ? 'sm:col-span-2' : ''}`}
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                                    <span>{isEn ? param.labelEn : param.labelFa}</span>
                                    {isRequired && <span className="text-rose-400 font-bold">*</span>}
                                  </label>
                                  <InfoTooltipPopover
                                    title={isEn ? param.labelEn : param.labelFa}
                                    what={paramGuide.what}
                                    why={paramGuide.why}
                                    example={paramGuide.example}
                                    isEn={isEn}
                                    size="sm"
                                    align={isEn ? 'left' : 'right'}
                                    placement="bottom"
                                  />
                                </div>

                                {isBoolean ? (
                                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-white/10">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setFormParams((prev) => ({
                                          ...prev,
                                          [param.name]: !prev[param.name],
                                        }))
                                      }
                                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        formParams[param.name] ? 'bg-cyan-500' : 'bg-slate-700'
                                      }`}
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                          formParams[param.name] ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                      />
                                    </button>
                                    <span className="text-xs text-slate-300">
                                      {formParams[param.name]
                                        ? isEn ? 'Enabled (Active)' : 'فعال‌شده (تنظیم می‌شود)'
                                        : isEn ? 'Disabled (Skipped)' : 'غیرفعال (صرف‌نظر می‌شود)'}
                                    </span>
                                  </div>
                                ) : isSelect ? (
                                  <select
                                    value={formParams[param.name] ?? ''}
                                    onChange={(e) =>
                                      setFormParams((prev) => ({
                                        ...prev,
                                        [param.name]: e.target.value,
                                      }))
                                    }
                                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                                  >
                                    <option value="">{isEn ? 'Select...' : 'انتخاب کنید...'}</option>
                                    {param.options?.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {isEn ? opt.labelEn : opt.labelFa} ({opt.value})
                                      </option>
                                    ))}
                                  </select>
                                ) : isTextarea ? (
                                  <textarea
                                    rows={3}
                                    value={formParams[param.name] ?? ''}
                                    onChange={(e) =>
                                      setFormParams((prev) => ({
                                        ...prev,
                                        [param.name]: e.target.value,
                                      }))
                                    }
                                    placeholder={param.placeholder || ''}
                                    className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-white/10 rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                                  />
                                ) : (
                                  <input
                                    type={isPassword ? 'password' : param.type === 'number' ? 'number' : 'text'}
                                    value={formParams[param.name] ?? ''}
                                    onChange={(e) =>
                                      setFormParams((prev) => ({
                                        ...prev,
                                        [param.name]: e.target.value,
                                      }))
                                    }
                                    placeholder={param.placeholder || ''}
                                    className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-white/10 rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Dangerous Command Confirmation Safeguard */}
                    {activeTemplate.is_dangerous && (
                      <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2">
                        <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>{isEn ? 'Confirmation Required' : 'تاییدیه اجباری دستور حساس'}</span>
                        </div>
                        <p className="text-xs text-rose-200/90 leading-relaxed">
                          {isEn
                            ? `This operation modifies or resets critical hardware settings. Type "${activeTemplate.confirmation_keyword || 'CONFIRM'}" below to enable execution.`
                            : `این عملیات تنظیمات حیاتی یا وضعیت سخت‌افزار را تغییر می‌دهد. جهت تایید و فعال‌سازی اجرای دستور، کلمه «${activeTemplate.confirmation_keyword || 'CONFIRM'}» را در کادر زیر تایپ نمایید.`}
                        </p>
                        <input
                          type="text"
                          value={dangerConfirmInput}
                          onChange={(e) => setDangerConfirmInput(e.target.value)}
                          placeholder={activeTemplate.confirmation_keyword || 'CONFIRM'}
                          className="w-full px-3 py-2 text-xs font-mono font-bold uppercase bg-slate-950 border border-rose-500/40 rounded-xl text-rose-200 placeholder:text-rose-700/50 focus:outline-none focus:border-rose-400"
                        />
                      </div>
                    )}

                    {/* Execution Options & Guardrails */}
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-3 text-xs">
                      <h5 className="font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{isEn ? 'Safety & Execution Policies' : 'سیاست‌های امنیتی و پشتیبان‌گیری'}</span>
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Auto-Backup Toggle */}
                        <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="font-medium text-slate-200 flex items-center gap-1.5">
                              <span>{isEn ? 'Automatic Pre-Change Backup' : 'بکاپ خودکار قبل از اعمال'}</span>
                              <InfoTooltipPopover
                                title={isEn ? 'Pre-Change Backup' : 'بکاپ خودکار قبل از اعمال'}
                                what={isEn ? 'Downloads running-config / export from the device before applying any changes.' : 'دریافت و آرشیو کامل کانفیگ فعال قبل از اعمال دستورات.'}
                                why={isEn ? 'Provides instantaneous rollback capability in case of network disruptions.' : 'تضمین بازگشت سریع به کانفیگ سالم قبلی در صورت بروز خطا.'}
                                example={isEn ? 'Saved to system database archives' : 'ذخیره خودکار در مخزن بکاپ‌های پنل'}
                                isEn={isEn}
                                size="sm"
                              />
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {isEn ? 'Saves running-config / compact export' : 'ذخیره کامل کانفیگ برای امکان بازگشت'}
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={autoBackup}
                            onChange={(e) => setAutoBackup(e.target.checked)}
                            className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 accent-cyan-500 shrink-0"
                          />
                        </label>

                        {/* Save to Permanent Memory Toggle */}
                        <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="font-medium text-slate-200 flex items-center gap-1.5">
                              <span>{isEn ? 'Write to Permanent Memory' : 'ذخیره دائمی (Write Memory)'}</span>
                              <InfoTooltipPopover
                                title={isEn ? 'Write Memory' : 'ذخیره دائمی (Write Memory)'}
                                what={isEn ? 'Executes copy running-config startup-config on Cisco and saves system backup on MikroTik.' : 'همگام‌سازی Running-Config با حافظه دائمی NVRAM در سیسکو و بک‌آپ محلی در میکروتیک.'}
                                why={isEn ? 'Ensures changes survive hardware power reboots or outages.' : 'جلوگیری از پاک شدن تنظیمات در صورت قطع برق یا ریبوت تجهیز.'}
                                example={isEn ? 'copy run start / write memory' : 'write memory'}
                                isEn={isEn}
                                size="sm"
                              />
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {isEn ? 'write memory / system backup' : 'انتقال تغییرات به Startup-Config'}
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={saveAfterApply}
                            onChange={(e) => setSaveAfterApply(e.target.checked)}
                            className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 accent-cyan-500 shrink-0"
                          />
                        </label>
                      </div>

                      {/* Timeouts and Delays */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                            <label>{isEn ? 'Per-Device Timeout (seconds)' : 'مهلت زمانی هر دستگاه (ثانیه)'}</label>
                            <InfoTooltipPopover
                              title={isEn ? 'Timeout' : 'مهلت زمانی'}
                              what={isEn ? 'Maximum wait time for SSH command response per device.' : 'حداکثر زمان انتظار برای دریافت خروجی از هر دستگاه.'}
                              why={isEn ? 'Prevents unreachable or unresponsive targets from blocking the entire batch.' : 'جلوگیری از قفل شدن فرآیند در دستگاه‌های قطع یا کند.'}
                              example={isEn ? '25s' : '۲۵ ثانیه'}
                              isEn={isEn}
                              size="sm"
                            />
                          </div>
                          <input
                            type="number"
                            min={5}
                            max={120}
                            value={timeoutSec}
                            onChange={(e) => setTimeoutSec(Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-xs font-mono bg-slate-900 border border-white/10 rounded-lg text-slate-200"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                            <label>{isEn ? 'Delay Between Devices (ms)' : 'وقفه بین اجرای تجهیزات (میلی‌ثانیه)'}</label>
                            <InfoTooltipPopover
                              title={isEn ? 'Inter-Device Delay' : 'تاخیر بین دستگاه‌ها'}
                              what={isEn ? 'Staggered cooldown delay between sequential device executions.' : 'مکث کوتاه پیش از اتصال به دستگاه بعدی.'}
                              why={isEn ? 'Reduces concurrent network bandwidth spikes and CPU load.' : 'کاهش بار پردازشی و کنترل جریان ترافیک شبکه.'}
                              example={isEn ? '1500ms' : '۱۵۰۰ میلی‌ثانیه'}
                              isEn={isEn}
                              size="sm"
                            />
                          </div>
                          <input
                            type="number"
                            min={0}
                            max={10000}
                            step={500}
                            value={delayMs}
                            onChange={(e) => setDelayMs(Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-xs font-mono bg-slate-900 border border-white/10 rounded-lg text-slate-200"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Target Devices Quick Toggle List */}
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 font-mono">
                          {isEn ? 'Target Devices Selection' : 'فهرست تجهیزات هدف'} (
                          {effectiveDevices.length} / {targetDevices.length})
                        </span>
                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setRemovedDeviceIds(new Set())}
                            className="text-cyan-400 hover:underline cursor-pointer"
                          >
                            {isEn ? 'Select All' : 'انتخاب همه'}
                          </button>
                          <span>|</span>
                          <button
                            type="button"
                            onClick={() => setRemovedDeviceIds(new Set(targetDevices.map((d) => d.id)))}
                            className="text-slate-400 hover:underline cursor-pointer"
                          >
                            {isEn ? 'Clear' : 'پاک کردن'}
                          </button>
                        </div>
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {targetDevices.map((dev) => {
                          const isExcluded = removedDeviceIds.has(dev.id);
                          return (
                            <div
                              key={dev.id}
                              onClick={() => {
                                setRemovedDeviceIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(dev.id)) next.delete(dev.id);
                                  else next.add(dev.id);
                                  return next;
                                });
                              }}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                                !isExcluded
                                  ? 'bg-white/5 border-white/10 text-slate-200'
                                  : 'bg-black/20 border-white/5 text-slate-500 opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={!isExcluded}
                                  onChange={() => {}}
                                  className="w-3.5 h-3.5 rounded text-cyan-500 accent-cyan-500"
                                />
                                <span className="font-bold font-mono">{dev.name}</span>
                                <span className="text-[11px] font-mono text-slate-400">({dev.ip})</span>
                              </div>

                              <div className="flex items-center gap-2 text-[10px] font-mono">
                                <span
                                  className={`px-1.5 py-0.5 rounded ${
                                    dev.platform?.includes('cisco')
                                      ? 'bg-indigo-500/20 text-indigo-300'
                                      : 'bg-emerald-500/20 text-emerald-300'
                                  }`}
                                >
                                  {dev.platform?.includes('cisco') ? 'Cisco' : 'MikroTik'}
                                </span>
                                <span className="text-slate-500">{dev.model}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-12 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl">
                    {isEn ? 'Select a command template on the left to configure parameters' : 'لطفاً یک الگو را از ستون سمت چپ انتخاب کنید'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & DRY-RUN */}
          {activeStep === 'preview' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-950/60 border border-white/10">
                <div>
                  <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span>{isEn ? 'Configuration Preview & Command Translation' : 'پیش‌نمایش فرامین CLI به تفکیک سیستم‌عامل'}</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {isEn
                      ? 'Review the exact CLI commands generated for each device before initiating live changes on hardware.'
                      : 'فرامین ترجمه‌شده بر اساس سیستم‌عامل هر دستگاه را قبل از اعمال نهایی روی سخت‌افزار بررسی کنید.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGeneratePreview}
                    disabled={previewLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-mono transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${previewLoading ? 'animate-spin text-cyan-400' : ''}`} />
                    <span>{isEn ? 'Regenerate Preview' : 'بروزرسانی پیش‌نمایش'}</span>
                  </button>
                </div>
              </div>

              {previewError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{previewError}</span>
                </div>
              )}

              {previewLoading ? (
                <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                  <span className="text-xs font-mono">{isEn ? 'Generating device-specific syntax...' : 'در حال تولید فرامین بر اساس OS هر دستگاه...'}</span>
                </div>
              ) : previewItems.length === 0 ? (
                <div className="p-12 text-center text-slate-500 border border-dashed border-white/10 rounded-xl text-xs">
                  {isEn ? 'No preview generated yet. Click Regenerate Preview.' : 'پیش‌نمایشی ایجاد نشده است. دکمه بروزرسانی را بزنید.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {previewItems.map((item) => {
                    const isCisco = item.platform?.includes('cisco');
                    return (
                      <div
                        key={item.deviceId}
                        className="rounded-xl border border-white/10 bg-slate-950/60 overflow-hidden shadow-md"
                      >
                        {/* Device Header */}
                        <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-white/5 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono">{item.deviceName}</span>
                            <span className="text-slate-400 font-mono">({item.deviceIp})</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                                isCisco
                                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {item.mapperName}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                            <span>{item.steps.length} {isEn ? 'command steps' : 'مرحله دستوری'}</span>
                            <span>•</span>
                            <span>~{item.estimatedTimeoutSec}s {isEn ? 'est.' : 'تخمینی'}</span>
                          </div>
                        </div>

                        {/* Commands details */}
                        <div className="p-4 space-y-3 text-xs font-mono">
                          {/* Pre-check idempotency */}
                          {item.preCheckCommand && (
                            <div>
                              <div className="text-[11px] text-cyan-400 font-semibold mb-1 flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5" />
                                <span>{isEn ? 'Step 0: Idempotency Check (Read-Only)' : 'مرحله صفر: بررسی تکراری نبودن (فقط‌خواندنی)'}</span>
                              </div>
                              <pre className="p-2.5 rounded-lg bg-black/60 border border-cyan-500/20 text-cyan-300 text-[11px] overflow-x-auto">
                                <code>{item.preCheckCommand}</code>
                              </pre>
                            </div>
                          )}

                          {/* Pre-change Backup Command */}
                          {autoBackup && item.backupCommand && (
                            <div>
                              <div className="text-[11px] text-emerald-400 font-semibold mb-1 flex items-center gap-1.5">
                                <Database className="w-3.5 h-3.5" />
                                <span>{isEn ? 'Pre-Change Backup Command' : 'فرمان ایجاد بکاپ قبل از تغییر'}</span>
                              </div>
                              <pre className="p-2.5 rounded-lg bg-black/60 border border-emerald-500/20 text-emerald-300 text-[11px] overflow-x-auto">
                                <code>{item.backupCommand}</code>
                              </pre>
                            </div>
                          )}

                          {/* Steps to execute */}
                          <div>
                            <div className="text-[11px] text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{isEn ? 'Execution Steps' : 'فرامین اجرایی'}</span>
                            </div>
                            <div className="space-y-1.5">
                              {item.steps.map((step, idx) => (
                                <div key={idx} className="p-2.5 rounded-lg bg-black/70 border border-white/10">
                                  <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                                    <span>
                                      Step {idx + 1}: {isEn ? step.descriptionEn : step.descriptionFa}
                                    </span>
                                    <span className="text-slate-500 font-mono">[{step.mode}]</span>
                                  </div>
                                  <pre className="text-slate-100 text-[11px] overflow-x-auto font-mono">
                                    <code>{step.command}</code>
                                  </pre>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Save Command */}
                          {saveAfterApply && item.saveCommand && (
                            <div>
                              <div className="text-[11px] text-amber-400 font-semibold mb-1 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5" />
                                <span>{isEn ? 'Post-Execution Save' : 'ذخیره نهایی در حافظه دائم'}</span>
                              </div>
                              <pre className="p-2.5 rounded-lg bg-black/60 border border-amber-500/20 text-amber-300 text-[11px] overflow-x-auto">
                                <code>{item.saveCommand}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: EXECUTION & REAL-TIME MONITORING */}
          {activeStep === 'execution' && (
            <div className="space-y-4">
              {jobStatus ? (
                <>
                  {/* Job Overview Status Banner */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white font-mono">
                            {isEn ? jobStatus.templateTitleEn : jobStatus.templateTitle}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              jobStatus.status === 'running'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
                                : jobStatus.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : jobStatus.status === 'failed'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                            }`}
                          >
                            {jobStatus.status === 'running'
                              ? isEn ? 'Executing...' : 'در حال اجرا...'
                              : jobStatus.status === 'completed'
                              ? isEn ? 'Completed' : 'تکمیل شد'
                              : jobStatus.status === 'failed'
                              ? isEn ? 'Failed' : 'خطا در اجرا'
                              : jobStatus.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-1">
                          Job ID: {jobStatus.jobId} • {isEn ? 'Started' : 'شروع'}: {new Date(jobStatus.createdAt * 1000).toLocaleTimeString()}
                        </div>
                      </div>

                      {/* Actions during execution */}
                      <div className="flex items-center gap-2">
                        {jobStatus.status === 'running' && (
                          <button
                            onClick={handleCancelJob}
                            disabled={cancellingJob}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-mono transition cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>{cancellingJob ? (isEn ? 'Cancelling...' : 'در حال لغو...') : (isEn ? 'Stop Job' : 'توقف عملیات')}</span>
                          </button>
                        )}

                        {(jobStatus.status === 'completed' || jobStatus.status === 'failed' || jobStatus.status === 'cancelled') && (
                          <a
                            href={`/api/bulk-config/jobs/${jobStatus.jobId}/export?format=csv`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-mono transition cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Export CSV' : 'خروجی اکسل / CSV'}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar & Counters */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-300">
                          {jobStatus.status === 'running' && jobStatus.currentDeviceName ? (
                            <span className="flex items-center gap-1.5 text-cyan-300">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>
                                {isEn ? 'Processing' : 'پردازش'}: {jobStatus.currentDeviceName} ({jobStatus.currentStepName || 'Connecting...'})
                              </span>
                            </span>
                          ) : (
                            <span>{isEn ? 'Overall Progress' : 'پیشرفت کلی عملیات'}</span>
                          )}
                        </span>
                        <span className="font-bold text-white">{jobStatus.percentage}%</span>
                      </div>

                      {/* Bar */}
                      <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                          style={{ width: `${jobStatus.percentage}%` }}
                        />
                      </div>

                      {/* Stat pills */}
                      <div className="flex items-center gap-4 text-xs font-mono pt-1 text-slate-400">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{isEn ? 'Success' : 'موفق'}: <strong className="text-white">{jobStatus.successCount}</strong></span>
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isEn ? 'Partial' : 'ناقص'}: <strong className="text-white">{jobStatus.partialCount}</strong></span>
                        </span>
                        <span className="flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>{isEn ? 'Failed' : 'ناموفق'}: <strong className="text-white">{jobStatus.failedCount}</strong></span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{isEn ? 'Total' : 'کل'}: <strong className="text-white">{jobStatus.totalDevices}</strong></span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Device-by-Device Execution Results Table */}
                  <div className="rounded-xl border border-white/10 bg-slate-950/60 overflow-hidden shadow-md">
                    <div className="px-4 py-2.5 bg-slate-900/80 border-b border-white/5 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300 font-mono">
                        {isEn ? 'Device Execution Status' : 'وضعیت اجرای هر تجهیز'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {jobStatus.completedDevices} / {jobStatus.totalDevices} {isEn ? 'completed' : 'انجام شد'}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left divide-y divide-white/5" dir={isRtl ? 'rtl' : 'ltr'}>
                        <thead className="bg-slate-950/80 text-slate-400 text-[11px] font-mono uppercase">
                          <tr>
                            <th className="p-3">{isEn ? 'Device' : 'تجهیز'}</th>
                            <th className="p-3">{isEn ? 'Platform' : 'سیستم‌عامل'}</th>
                            <th className="p-3">{isEn ? 'Status' : 'وضعیت'}</th>
                            <th className="p-3">{isEn ? 'Steps' : 'مراحل'}</th>
                            <th className="p-3">{isEn ? 'Backup' : 'پشتیبان'}</th>
                            <th className="p-3">{isEn ? 'Duration' : 'زمان'}</th>
                            <th className="p-3 text-center">{isEn ? 'Actions' : 'عملیات'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                          {Object.values(jobStatus.results).map((res) => {
                            const isRunning =
                              jobStatus.status === 'running' && jobStatus.currentDeviceName === res.deviceName;

                            return (
                              <tr key={res.deviceId} className="hover:bg-white/5 transition">
                                <td className="p-3">
                                  <div className="font-bold text-white">{res.deviceName}</div>
                                  <div className="text-[10px] text-slate-400">{res.deviceIp}</div>
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                                      res.platform?.includes('cisco')
                                        ? 'bg-indigo-500/20 text-indigo-300'
                                        : 'bg-emerald-500/20 text-emerald-300'
                                    }`}
                                  >
                                    {res.platform?.includes('cisco') ? 'Cisco IOS' : 'RouterOS'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {isRunning ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                      <span>{isEn ? 'Running' : 'در حال اجرا'}</span>
                                    </span>
                                  ) : res.status === 'success' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>{isEn ? 'Success' : 'موفق'}</span>
                                    </span>
                                  ) : res.status === 'partial' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>{isEn ? 'Partial' : 'ناقص'}</span>
                                    </span>
                                  ) : res.status === 'failed' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                      <XCircle className="w-3 h-3" />
                                      <span>{isEn ? 'Failed' : 'خطا'}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-500/20 text-slate-400 border border-slate-500/30">
                                      <Clock className="w-3 h-3" />
                                      <span>{isEn ? 'Queued' : 'در صف'}</span>
                                    </span>
                                  )}

                                  {res.errorMessageFa && res.status === 'failed' && (
                                    <div className="text-[10px] text-rose-300 line-clamp-1 mt-0.5 max-w-xs">
                                      {isEn ? res.errorMessageEn || res.errorMessageFa : res.errorMessageFa}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-slate-300">
                                  {res.stepsCompleted} / {res.stepsTotal}
                                </td>
                                <td className="p-3">
                                  {res.backupId ? (
                                    <button
                                      type="button"
                                      onClick={() => handleViewBackup(res.deviceName, res.backupId)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition cursor-pointer"
                                      title={isEn ? 'View pre-change configuration backup snapshot' : 'مشاهده فایل پشتیبان تهیه شده'}
                                    >
                                      <Database className="w-3 h-3" />
                                      <span>{isEn ? 'View Backup' : 'مشاهده بکاپ'}</span>
                                    </button>
                                  ) : (
                                    <span className="text-slate-600 text-[10px]">-</span>
                                  )}
                                </td>
                                <td className="p-3 text-slate-400 text-[11px]">
                                  {res.durationMs ? `${(res.durationMs / 1000).toFixed(1)}s` : '-'}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setViewingResult(res)}
                                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-200 text-[11px] border border-white/10 transition cursor-pointer"
                                  >
                                    {isEn ? 'CLI Logs' : 'لاگ دستورات'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Real-Time Streaming Logs Feed */}
                  <div className="rounded-xl border border-white/10 bg-slate-950/80 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{isEn ? 'Live System Audit & Execution Stream' : 'گزارش زنده رویدادهای سیستم'}</span>
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {jobStatus.logs.length} {isEn ? 'entries' : 'رکورد'}
                      </span>
                    </div>

                    <div className="bg-black/80 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1 font-mono text-[11px] border border-white/5">
                      {jobStatus.logs.length === 0 ? (
                        <div className="text-slate-600 text-center py-4">
                          {isEn ? 'Awaiting execution events...' : 'در انتظار دریافت پیام‌های سیستمی...'}
                        </div>
                      ) : (
                        jobStatus.logs.map((log, idx) => (
                          <div
                            key={idx}
                            className={`flex items-start gap-2 ${
                              log.level === 'error'
                                ? 'text-rose-300'
                                : log.level === 'warning'
                                ? 'text-amber-300'
                                : log.level === 'success'
                                ? 'text-emerald-300'
                                : 'text-slate-300'
                            }`}
                          >
                            <span className="text-slate-600 shrink-0">[{log.timeStr}]</span>
                            <span className="shrink-0 font-bold uppercase text-[9px] px-1 rounded bg-white/5">
                              {log.level}
                            </span>
                            <span>{isEn ? log.messageEn : log.messageFa}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                  <span className="text-xs font-mono">{isEn ? 'Connecting to job engine...' : 'در حال اتصال به موتور پردازش...'}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-t ${
            isLightMode ? 'border-slate-200 bg-slate-100/90' : 'border-white/10 bg-slate-950/80'
          }`}
        >
          <div className="text-xs text-slate-400 font-mono">
            {activeStep === 'configure' && (
              <span>
                {isEn ? 'Targeting:' : 'تجهیزات هدف:'}{' '}
                <strong className="text-white">{effectiveDevices.length}</strong>{' '}
                {isEn ? 'active devices' : 'دستگاه فعال'}
              </span>
            )}
            {activeStep === 'preview' && (
              <span>
                {isEn ? 'Reviewing:' : 'تعداد فرامین:'}{' '}
                <strong className="text-white">{previewItems.length}</strong>{' '}
                {isEn ? 'hardware targets' : 'تجهیز آماده اجرا'}
              </span>
            )}
            {activeStep === 'execution' && (
              <span>
                {isEn ? 'Status:' : 'وضعیت:'}{' '}
                <strong className="text-cyan-300">{jobStatus?.status || 'Active'}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeStep === 'preview' && (
              <button
                type="button"
                onClick={() => setActiveStep('configure')}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono transition cursor-pointer"
              >
                {isEn ? 'Back to Config' : 'بازگشت به تنظیمات'}
              </button>
            )}

            {activeStep === 'configure' && (
              <button
                type="button"
                onClick={handleGeneratePreview}
                disabled={!isFormValid || previewLoading}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold font-mono transition active:scale-95 cursor-pointer ${
                  isFormValid && !previewLoading
                    ? 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-lg shadow-cyan-500/20'
                    : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>{previewLoading ? (isEn ? 'Generating...' : 'در حال پردازش...') : (isEn ? 'Preview & Dry-Run' : 'پیش‌نمایش دستورات')}</span>
              </button>
            )}

            {(activeStep === 'preview' || activeStep === 'configure') && (
              <button
                type="button"
                onClick={handleStartExecution}
                disabled={!isFormValid || startingJob}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold font-mono transition active:scale-95 cursor-pointer ${
                  isFormValid && !startingJob
                    ? activeTemplate?.is_dangerous
                      ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-lg shadow-rose-500/25'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4" />
                <span>
                  {startingJob
                    ? isEn ? 'Starting...' : 'در حال آغاز...'
                    : activeTemplate?.is_dangerous
                    ? isEn ? 'Confirm & Execute Now' : 'تایید و اجرای دستور حساس'
                    : isEn ? 'Execute on Real Hardware' : 'اجرا روی تجهیزات واقعی'}
                </span>
              </button>
            )}

            {activeStep === 'execution' && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-mono transition cursor-pointer"
              >
                {isEn ? 'Close Window' : 'بستن پنجره'}
              </button>
            )}
          </div>
        </div>

        {/* SUB-MODAL: Individual Device Raw CLI Output & Logs Viewer */}
        {viewingResult && (
          <div className="fixed top-0 left-0 right-0 bottom-8 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-slate-950 border border-white/20 shadow-2xl overflow-hidden font-mono">
              <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white">{viewingResult.deviceName}</span>
                  <span className="text-slate-400">({viewingResult.deviceIp})</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                      viewingResult.status === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {viewingResult.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingResult(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
                {/* Steps Details */}
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                    {isEn ? 'Step-by-Step CLI Transactions' : 'گزارش مرحله‌ای فرامین'}
                  </div>
                  {viewingResult.stepsDetail.map((step) => (
                    <div
                      key={step.stepIndex}
                      className="p-3 rounded-xl bg-black/70 border border-white/10 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-cyan-300">
                          {isEn ? step.descriptionEn : step.descriptionFa}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            step.status === 'success' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {step.status} {step.durationMs ? `(${step.durationMs}ms)` : ''}
                        </span>
                      </div>
                      <pre className="text-slate-300 text-[10px] overflow-x-auto p-1.5 rounded bg-slate-900/60">
                        <code>$ {step.command}</code>
                      </pre>
                      {step.output && (
                        <div className="mt-1">
                          <div className="text-[9px] text-slate-500 uppercase">{isEn ? 'Device Response:' : 'پاسخ دستگاه:'}</div>
                          <pre className="text-slate-400 text-[10px] overflow-x-auto p-2 rounded bg-black/90 max-h-32">
                            <code>{step.output}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Raw Full Output Stream */}
                {viewingResult.rawOutput && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                        {isEn ? 'Complete Terminal Session Transcript' : 'متن کامل نشست ترمینال SSH'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(viewingResult.rawOutput || '');
                          setCopiedLog(true);
                          setTimeout(() => setCopiedLog(false), 2000);
                        }}
                        className="flex items-center gap-1 text-[10px] text-cyan-400 hover:underline cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedLog ? (isEn ? 'Copied!' : 'کپی شد') : (isEn ? 'Copy' : 'کپی متن')}</span>
                      </button>
                    </div>
                    <pre className="p-3 rounded-xl bg-black border border-white/10 text-slate-300 text-[10px] overflow-x-auto max-h-60">
                      <code>{viewingResult.rawOutput}</code>
                    </pre>
                  </div>
                )}
              </div>

              <div className="px-5 py-3 bg-slate-900 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingResult(null)}
                  className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs transition cursor-pointer"
                >
                  {isEn ? 'Close' : 'بستن'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUB-MODAL: Backup Viewer */}
        {viewingBackup && (
          <div className="fixed top-0 left-0 right-0 bottom-8 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl bg-slate-950 border border-white/20 shadow-2xl overflow-hidden font-mono">
              <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">
                    {isEn ? 'Pre-Change Backup Snapshot:' : 'پشتیبان کانفیگ قبل از اعمال:'}{' '}
                    {viewingBackup.deviceName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingBackup(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 text-xs">
                {viewingBackup.loading ? (
                  <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                    <span>{isEn ? 'Loading backup file...' : 'در حال بارگذاری فایل پشتیبان...'}</span>
                  </div>
                ) : (
                  <pre className="p-4 rounded-xl bg-black border border-white/10 text-emerald-300 text-[11px] overflow-x-auto leading-relaxed max-h-[60vh]">
                    <code>{viewingBackup.content}</code>
                  </pre>
                )}
              </div>

              <div className="px-5 py-3 bg-slate-900 border-t border-white/10 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([viewingBackup.content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${viewingBackup.deviceName}_backup.cfg`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  disabled={viewingBackup.loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Download Snapshot (.cfg)' : 'دانلود فایل کانفیگ'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingBackup(null)}
                  className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition cursor-pointer"
                >
                  {isEn ? 'Close' : 'بستن'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
