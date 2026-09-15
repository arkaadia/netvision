import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FileCode2,
  X,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Play,
  Terminal,
  Copy,
  Check,
  Download,
  Server,
  Router as RouterIcon,
  ShieldAlert,
  ArrowRight,
  Info,
  RefreshCw,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';
import { Device, ConfigTemplate, TemplateApplyResult, TemplateExecutionLog } from '../types';
import { fetchTemplates, applyTemplateToDevice } from '../services/api';
import { logDeviceCommand } from '../services/auditLogger';
import { useLanguage } from '../i18n/LanguageContext';

interface ApplyTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  targetDevice: Device | null;
  allDevices?: Device[];
  templates?: ConfigTemplate[];
  preselectedTemplateId?: string;
  onApplied?: (updatedDevice: Device) => void;
  isLightMode?: boolean;
}

export const ApplyTemplateModal: React.FC<ApplyTemplateModalProps> = ({
  isOpen,
  onClose,
  onMinimize,
  targetDevice: initialTargetDevice,
  allDevices = [],
  templates: propTemplates,
  preselectedTemplateId,
  onApplied,
  isLightMode: propIsLightMode,
}) => {
  const { t, isEn } = useLanguage();

  const isLightMode = propIsLightMode ?? (typeof document !== 'undefined' && (
    document.querySelector('.theme-light') !== null ||
    document.documentElement.classList.contains('light') ||
    localStorage.getItem('panel_theme') === 'light' ||
    localStorage.getItem('theme_mode') === 'light'
  ));
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(
    initialTargetDevice || (allDevices.length > 0 ? allDevices[0] : null)
  );
  const [templates, setTemplates] = useState<ConfigTemplate[]>(propTemplates || []);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(preselectedTemplateId || '');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [activeStep, setActiveStep] = useState<'variables' | 'preview' | 'executing' | 'done'>('variables');

  // Interactive Variables State
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [isIpConfirmed, setIsIpConfirmed] = useState<boolean>(true);
  const [copiedScript, setCopiedScript] = useState(false);

  // Execution state
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<TemplateApplyResult | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Update selected device if prop changes
  useEffect(() => {
    if (initialTargetDevice) {
      setSelectedDevice(initialTargetDevice);
    } else if (allDevices.length > 0 && !selectedDevice) {
      setSelectedDevice(allDevices[0]);
    }
  }, [initialTargetDevice, allDevices]);

  // Sync templates if passed via props
  useEffect(() => {
    if (propTemplates && propTemplates.length > 0) {
      setTemplates(propTemplates);
    }
  }, [propTemplates]);

  // Sync preselected template
  useEffect(() => {
    if (preselectedTemplateId) {
      setSelectedTemplateId(preselectedTemplateId);
    }
  }, [preselectedTemplateId]);

  // Load available templates if not provided via props
  useEffect(() => {
    if (!isOpen) return;

    if (propTemplates && propTemplates.length > 0) {
      setTemplates(propTemplates);
      if (preselectedTemplateId) {
        setSelectedTemplateId(preselectedTemplateId);
      } else if (!selectedTemplateId && propTemplates.length > 0) {
        setSelectedTemplateId(propTemplates[0].id);
      }
      return;
    }

    setLoadingTemplates(true);
    fetchTemplates()
      .then((res) => {
        setTemplates(res.templates);
        if (preselectedTemplateId) {
          setSelectedTemplateId(preselectedTemplateId);
        } else if (res.templates.length > 0) {
          // Smart match based on selected device type and model
          const dev = selectedDevice || (allDevices.length > 0 ? allDevices[0] : null);
          if (dev) {
            const isMikroTik = dev.model?.toLowerCase().includes('mikrotik') || dev.model?.toLowerCase().includes('routerboard') || dev.model?.toLowerCase().includes('crs');
            const matched = res.templates.find((t) => {
              const vendorMatch = isMikroTik ? t.vendor === 'mikrotik' : t.vendor === 'cisco';
              const typeMatch = t.target_type === dev.type || t.target_type === 'all';
              return vendorMatch && typeMatch;
            });
            setSelectedTemplateId(matched ? matched.id : res.templates[0].id);
          } else {
            setSelectedTemplateId(res.templates[0].id);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load templates:', err);
      })
      .finally(() => {
        setLoadingTemplates(false);
      });
  }, [isOpen, preselectedTemplateId, propTemplates]);

  const currentTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // Pre-fill variable values based on current device and template
  useEffect(() => {
    if (!currentTemplate || !selectedDevice) return;

    const initialVars: Record<string, string> = {};
    (currentTemplate.variables || []).forEach((v) => {
      let val = v.default_value || '';

      switch (v.name) {
        case 'DEVICE_NAME':
          val = selectedDevice.name || val;
          break;
        case 'IP_ADDRESS':
          val = selectedDevice.ip || val;
          break;
        case 'BUILDING':
          val = selectedDevice.building || val;
          break;
        case 'FLOOR':
          val = selectedDevice.floor || val;
          break;
        case 'UNIT':
          val = selectedDevice.unit || val;
          break;
        case 'RACK':
          val = selectedDevice.rack || val;
          break;
        case 'DEFAULT_GATEWAY':
          // Attempt to find gateway from IP or default
          if (selectedDevice.ip) {
            const parts = selectedDevice.ip.split('.');
            if (parts.length === 4) {
              val = `${parts[0]}.${parts[1]}.${parts[2]}.254`;
            }
          }
          break;
        case 'SUBNET_MASK':
          val = '255.255.255.0';
          break;
        case 'SUBNET_CIDR':
          val = '24';
          break;
        case 'MANAGEMENT_VLAN':
          val = '1';
          break;
        default:
          break;
      }

      initialVars[v.name] = val;
    });

    setVariableValues(initialVars);
    setIsIpConfirmed(true);
    setActiveStep('variables');
    setApplyResult(null);
    setApplyError(null);
  }, [currentTemplate, selectedDevice]);

  // Render script preview
  const renderedScript = useMemo(() => {
    if (!currentTemplate) return '';
    let script = currentTemplate.commands;
    Object.entries(variableValues).forEach(([k, v]) => {
      script = script.split(`{{${k}}}`).join(v || `[${k}]`);
    });
    return script;
  }, [currentTemplate, variableValues]);

  // Simple IPv4 format check
  const isIpValid = useMemo(() => {
    const ip = variableValues['IP_ADDRESS'];
    if (!ip) return false;
    const regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return regex.test(ip.trim());
  }, [variableValues]);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(renderedScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadScript = () => {
    const ext = currentTemplate?.vendor === 'mikrotik' ? 'rsc' : 'cfg';
    const blob = new Blob([renderedScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${variableValues['DEVICE_NAME'] || 'device-config'}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExecuteApply = async () => {
    if (!selectedDevice || !currentTemplate) return;

    if (!isIpConfirmed || !isIpValid) {
      alert('لطفاً صحت آدرس آی‌پی (IP Address) را بررسی و تایید نمایید.');
      return;
    }

    setIsApplying(true);
    setActiveStep('executing');
    setApplyError(null);

    try {
      const result = await applyTemplateToDevice({
        device_id: selectedDevice.id,
        template_id: currentTemplate.id,
        resolved_variables: variableValues,
      });

      setApplyResult(result);
      setActiveStep('done');

      // Audit Log template application
      try {
        logDeviceCommand({
          deviceId: selectedDevice.id,
          deviceName: selectedDevice.name,
          deviceIp: selectedDevice.ip,
          deviceVendor: selectedDevice.model.toLowerCase().includes('mikrotik') ? 'mikrotik' : 'cisco',
          deviceModel: selectedDevice.model,
          deviceLocation: [selectedDevice.building, selectedDevice.floor, selectedDevice.unit, selectedDevice.rack ? `رک ${selectedDevice.rack}` : ''].filter(Boolean).join(' > '),
          channel: 'template_push',
          command: result.rendered_script || currentTemplate.commands,
          riskLevel: 'medium',
          status: 'success',
          outputSummary: result.message,
          notes: `اعمال موفقیت‌آمیز قالب «${currentTemplate.name}»`,
        });
      } catch (logErr) {
        console.warn('Failed to audit template execution:', logErr);
      }

      if (onApplied) {
        onApplied(result.device);
      }
    } catch (err: any) {
      setApplyError(err.message || 'خطا در اعمال تمپلیت روی تجهیز');
      setActiveStep('preview');
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed top-0 left-0 right-0 bottom-8 z-50 flex items-center justify-center p-2 sm:p-4 modal-backdrop-blur animate-fadeIn overflow-y-auto"
      data-modal-backdrop="true"
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <div className={`w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] my-auto flex flex-col rounded-2xl overflow-hidden transition-all duration-200 ${
        isLightMode
          ? 'bg-white border border-slate-200 text-slate-900 shadow-2xl shadow-slate-900/15'
          : 'bg-slate-900/95 border border-white/10 text-slate-100 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl'
      }`}>
        {/* Modal Header (Pinned) */}
        <div className={`flex items-center justify-between p-4 sm:p-5 border-b shrink-0 transition ${
          isLightMode ? 'border-slate-200 bg-slate-50/90' : 'border-white/10 bg-slate-950/60'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isLightMode
                ? 'bg-cyan-50 border-cyan-200 text-cyan-600 shadow-xs'
                : 'bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
            }`}>
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold text-sm sm:text-base ${
                  isLightMode ? 'text-slate-900' : 'text-white glow-text-cyan'
                }`}>
                  {t('apply_modal_title')}
                </h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold transition-all shadow-sm ${
                    currentTemplate?.vendor === 'mikrotik'
                      ? 'vendor-badge-mikrotik'
                      : currentTemplate?.vendor === 'cisco'
                      ? 'vendor-badge-cisco'
                      : 'vendor-badge-generic'
                  }`}
                >
                  {currentTemplate?.vendor === 'mikrotik'
                    ? 'MikroTik RouterOS'
                    : currentTemplate?.vendor === 'cisco'
                    ? 'Cisco IOS-XE'
                    : 'Generic CLI'}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {t('apply_modal_subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {onMinimize && (
              <button
                type="button"
                onClick={onMinimize}
                className={`p-1.5 rounded-xl transition cursor-pointer ${
                  isLightMode ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-cyan-300 hover:bg-white/10'
                }`}
                title={isEn ? 'Minimize' : 'مینیمایز به نوار پایین'}
                aria-label={isEn ? 'Minimize' : 'مینیمایز'}
              >
                <Minus className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition cursor-pointer ${
                isLightMode ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              aria-label={t('action_close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workflow Steps Indicator */}
        <div className={`flex items-center justify-between px-4 sm:px-6 py-2.5 border-b text-xs shrink-0 transition ${
          isLightMode ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-950/40 border-white/5'
        }`}>
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1">
            <button
              onClick={() => setActiveStep('variables')}
              disabled={isApplying}
              className={`flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg transition cursor-pointer ${
                activeStep === 'variables'
                  ? isLightMode
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-300 font-bold shadow-xs'
                    : 'bg-indigo-600/30 text-cyan-300 border border-cyan-500/40'
                  : isLightMode
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isLightMode ? 'bg-indigo-200 text-indigo-800' : 'bg-cyan-500/20 border border-cyan-500/40'
              }`}>
                1
              </span>
              <span>{t('apply_step1')}</span>
            </button>

            <span className={isLightMode ? 'text-slate-400' : 'text-slate-600'}>→</span>

            <button
              onClick={() => setActiveStep('preview')}
              disabled={isApplying}
              className={`flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg transition cursor-pointer ${
                activeStep === 'preview'
                  ? isLightMode
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-300 font-bold shadow-xs'
                    : 'bg-indigo-600/30 text-cyan-300 border border-cyan-500/40'
                  : isLightMode
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isLightMode ? 'bg-indigo-200 text-indigo-800' : 'bg-cyan-500/20 border border-cyan-500/40'
              }`}>
                2
              </span>
              <span>{t('apply_step2')}</span>
            </button>

            <span className={isLightMode ? 'text-slate-400' : 'text-slate-600'}>→</span>

            <div
              className={`flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg ${
                activeStep === 'executing' || activeStep === 'done'
                  ? isLightMode
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold'
                    : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  : isLightMode
                  ? 'text-slate-400'
                  : 'text-slate-500'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isLightMode ? 'bg-emerald-200 text-emerald-800' : 'bg-emerald-500/20 border border-emerald-500/40'
              }`}>
                3
              </span>
              <span>{t('apply_step3')}</span>
            </div>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 ${isLightMode ? 'bg-white' : ''}`}>
          {/* Target Device & Template Selector Bar */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border transition ${
            isLightMode ? 'bg-slate-50/90 border-slate-200' : 'bg-white/5 border-white/10'
          }`}>
            {/* Target Device Selector */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${
                isLightMode ? 'text-slate-700' : 'text-slate-300'
              }`}>
                <Server className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('apply_target_device')}</span>
              </label>
              {allDevices.length > 0 ? (
                <select
                  value={selectedDevice?.id || ''}
                  onChange={(e) => {
                    const found = allDevices.find((d) => d.id === e.target.value);
                    if (found) setSelectedDevice(found);
                  }}
                  disabled={isApplying}
                  className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none font-mono transition ${
                    isLightMode
                      ? 'bg-white border border-slate-300 text-slate-900 focus:border-cyan-600 shadow-xs'
                      : 'bg-slate-950 border border-white/15 text-white focus:border-cyan-500'
                  }`}
                >
                  {allDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.ip}) - {d.model} [{d.role}]
                    </option>
                  ))}
                </select>
              ) : selectedDevice ? (
                <div className={`p-2.5 rounded-xl border font-mono text-xs flex items-center justify-between ${
                  isLightMode
                    ? 'bg-white border-slate-200 text-indigo-700'
                    : 'bg-slate-950/80 border-white/10 text-cyan-300'
                }`}>
                  <span>{selectedDevice.name}</span>
                  <span className={isLightMode ? 'text-slate-500' : 'text-slate-400'}>{selectedDevice.ip}</span>
                </div>
              ) : (
                <div className="text-xs text-rose-500">{isEn ? 'No device selected.' : 'هیچ تجهیزی انتخاب نشده است.'}</div>
              )}
            </div>

            {/* Template Selector */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${
                isLightMode ? 'text-slate-700' : 'text-slate-300'
              }`}>
                <FileCode2 className="w-3.5 h-3.5 text-cyan-500" />
                <span>{t('apply_template_label')}</span>
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={isApplying || loadingTemplates}
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none transition ${
                  isLightMode
                    ? 'bg-white border border-slate-300 text-slate-900 focus:border-cyan-600 shadow-xs'
                    : 'bg-slate-950 border border-white/15 text-white focus:border-cyan-500'
                }`}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.vendor.toUpperCase()}] {t.name} ({t.target_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error Banner if any */}
          {applyError && (
            <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{applyError}</span>
            </div>
          )}

          {/* STEP 1: Interactive Variables & IP Confirmation */}
          {activeStep === 'variables' && currentTemplate && (
            <div className="space-y-5 animate-fadeIn">
              {/* Interactive IP Confirmation Box (Crucial User Request) */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  isIpConfirmed && isIpValid
                    ? isLightMode
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs'
                      : 'bg-emerald-500/10 border-emerald-500/30'
                    : isLightMode
                    ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-xs'
                    : 'bg-amber-500/15 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl mt-0.5 ${
                        isIpConfirmed && isIpValid
                          ? isLightMode ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-300'
                          : isLightMode ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/20 text-amber-300 animate-pulse'
                      }`}
                    >
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold flex items-center gap-2 ${
                        isLightMode ? 'text-slate-900' : 'text-white'
                      }`}>
                        <span>{t('apply_ip_check_title')}</span>
                        {isIpValid ? (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                            isLightMode ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {t('apply_ip_valid')}
                          </span>
                        ) : (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                            isLightMode ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}>
                            {t('apply_ip_invalid')}
                          </span>
                        )}
                      </h4>
                      <p className={`text-xs mt-1 ${isLightMode ? 'text-slate-600' : 'text-slate-300'}`}>
                        {t('apply_ip_desc').replace('{ip}', selectedDevice?.ip || variableValues['IP_ADDRESS'] || '')}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsIpConfirmed(!isIpConfirmed)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-sm cursor-pointer ${
                      isIpConfirmed
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs'
                        : 'bg-amber-600 text-white hover:bg-amber-500'
                    }`}
                  >
                    {isIpConfirmed ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{t('apply_ip_confirmed_btn')}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{t('apply_ip_unconfirmed_btn')}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Direct IP input override */}
                <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t ${
                  isLightMode ? 'border-slate-200' : 'border-white/10'
                }`}>
                  <div>
                    <label className={`block text-[11px] font-medium mb-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {t('apply_ip_field')}
                    </label>
                    <input
                      type="text"
                      value={variableValues['IP_ADDRESS'] || ''}
                      onChange={(e) => {
                        setVariableValues({ ...variableValues, IP_ADDRESS: e.target.value });
                        setIsIpConfirmed(false);
                      }}
                      placeholder="192.168.1.1"
                      className={`w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none transition ${
                        isLightMode
                          ? isIpValid
                            ? 'bg-white border border-slate-300 text-slate-900 focus:border-cyan-600 shadow-xs'
                            : 'bg-white border border-rose-400 text-slate-900 focus:border-rose-500'
                          : isIpValid
                          ? 'bg-slate-950 border border-white/15 text-white focus:border-cyan-500'
                          : 'bg-slate-950 border border-rose-500 text-white focus:border-rose-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-medium mb-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {t('apply_subnet_field')}
                    </label>
                    <input
                      type="text"
                      value={
                        currentTemplate.vendor === 'mikrotik'
                          ? variableValues['SUBNET_CIDR'] || '24'
                          : variableValues['SUBNET_MASK'] || '255.255.255.0'
                      }
                      onChange={(e) => {
                        if (currentTemplate.vendor === 'mikrotik') {
                          setVariableValues({ ...variableValues, SUBNET_CIDR: e.target.value });
                        } else {
                          setVariableValues({ ...variableValues, SUBNET_MASK: e.target.value });
                        }
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none transition ${
                        isLightMode
                          ? 'bg-white border border-slate-300 text-slate-900 focus:border-cyan-600 shadow-xs'
                          : 'bg-slate-950 border border-white/15 text-white focus:border-cyan-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-medium mb-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {t('apply_gateway_field')}
                    </label>
                    <input
                      type="text"
                      value={variableValues['DEFAULT_GATEWAY'] || ''}
                      onChange={(e) =>
                        setVariableValues({ ...variableValues, DEFAULT_GATEWAY: e.target.value })
                      }
                      placeholder="192.168.1.254"
                      className={`w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none transition ${
                        isLightMode
                          ? 'bg-white border border-slate-300 text-slate-900 focus:border-cyan-600 shadow-xs'
                          : 'bg-slate-950 border border-white/15 text-white focus:border-cyan-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Other Template Variables Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-bold flex items-center gap-1.5 ${
                    isLightMode ? 'text-slate-800' : 'text-slate-300'
                  }`}>
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{t('apply_other_params')}</span>
                  </h4>
                  <span className={`text-[11px] ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {t('apply_other_params_desc')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(currentTemplate.variables || [])
                    .filter((v) => !['IP_ADDRESS', 'SUBNET_MASK', 'SUBNET_CIDR', 'DEFAULT_GATEWAY'].includes(v.name))
                    .map((variable) => (
                      <div
                        key={variable.name}
                        className={`p-3 rounded-xl border transition ${
                          isLightMode
                            ? 'bg-slate-50/90 border-slate-200 focus-within:border-cyan-600/60 shadow-xs'
                            : 'bg-white/5 border-white/10 focus-within:border-cyan-500/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <label className={`text-[11px] font-medium truncate ${
                            isLightMode ? 'text-slate-800' : 'text-slate-200'
                          }`}>
                            {variable.label}
                          </label>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                            isLightMode
                              ? 'text-cyan-700 bg-cyan-100/70 border-cyan-300'
                              : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                          }`}>
                            {`{{${variable.name}}}`}
                          </span>
                        </div>
                        <input
                          type={variable.type === 'password' ? 'password' : 'text'}
                          value={variableValues[variable.name] || ''}
                          onChange={(e) =>
                            setVariableValues({
                              ...variableValues,
                              [variable.name]: e.target.value,
                            })
                          }
                          placeholder={variable.default_value || ''}
                          className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono focus:outline-none transition ${
                            isLightMode
                              ? 'bg-white border border-slate-300 text-slate-900 focus:border-cyan-600 shadow-xs'
                              : 'bg-slate-950 border border-white/10 text-white focus:border-cyan-400'
                          }`}
                        />
                        {variable.description && (
                          <div className={`text-[10px] mt-1 truncate ${
                            isLightMode ? 'text-slate-500' : 'text-slate-400'
                          }`} title={variable.description}>
                            {variable.description}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Step 1 Footer Action */}
              <div className={`flex items-center justify-between pt-4 border-t ${
                isLightMode ? 'border-slate-200' : 'border-white/10'
              }`}>
                <div className="text-xs">
                  {isIpConfirmed && isIpValid ? (
                    <span className={`flex items-center gap-1 font-medium ${
                      isLightMode ? 'text-emerald-700' : 'text-emerald-400'
                    }`}>
                      <Check className="w-3.5 h-3.5" />
                      {t('apply_ready_to_preview')}
                    </span>
                  ) : (
                    <span className={`flex items-center gap-1 font-medium ${
                      isLightMode ? 'text-amber-700' : 'text-amber-400'
                    }`}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {t('apply_need_ip_confirm')}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStep('preview')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-md transition active:scale-95 cursor-pointer"
                >
                  <span>{t('apply_btn_preview')}</span>
                  <ArrowRight className={`w-4 h-4 ${isEn ? '' : 'rotate-180'}`} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Live Command Preview (Dry Run) */}
          {activeStep === 'preview' && currentTemplate && (
            <div className="space-y-4 animate-fadeIn">
              <div className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border text-xs transition ${
                isLightMode
                  ? 'bg-indigo-50/90 border-indigo-200 text-indigo-950 shadow-xs'
                  : 'bg-indigo-500/10 border-indigo-500/20 text-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-600" />
                  <span className={`font-medium ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>
                    {isEn ? 'Configuration commands ready for: ' : 'دستورات پیکربندی آماده اجرا روی '}
                    <b className={`font-mono ${isLightMode ? 'text-slate-950 font-bold' : 'text-white'}`}>
                      {variableValues['DEVICE_NAME'] || selectedDevice?.name}
                    </b>{' '}
                    ({isEn ? 'IP: ' : 'آدرس: '}
                    <b className={`font-mono ${isLightMode ? 'text-indigo-700 font-bold' : 'text-cyan-300'}`}>
                      {variableValues['IP_ADDRESS']}
                    </b>)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyScript}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                      isLightMode
                        ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-xs'
                        : 'bg-white/10 hover:bg-white/15 text-slate-200'
                    }`}
                  >
                    {copiedScript ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedScript ? t('apply_copied_script') : t('apply_copy_script')}</span>
                  </button>
                  <button
                    onClick={handleDownloadScript}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                      isLightMode
                        ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-xs'
                        : 'bg-white/10 hover:bg-white/15 text-slate-200'
                    }`}
                  >
                    <Download className="w-3 h-3" />
                    <span>{t('apply_download_script')}</span>
                  </button>
                </div>
              </div>

              {/* Terminal Code View */}
              <div className={`rounded-xl p-4 font-mono text-xs max-h-96 overflow-y-auto dir-ltr text-left selection:bg-cyan-500/30 border ${
                isLightMode
                  ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-inner'
                  : 'bg-slate-950 border-white/15 text-slate-200'
              }`}>
                <pre className="whitespace-pre font-mono leading-relaxed">{renderedScript}</pre>
              </div>

              {/* Step 2 Actions */}
              <div className={`flex items-center justify-between pt-4 border-t ${
                isLightMode ? 'border-slate-200' : 'border-white/10'
              }`}>
                <button
                  type="button"
                  onClick={() => setActiveStep('variables')}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                    isLightMode
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                      : 'bg-white/10 hover:bg-white/15 text-slate-300'
                  }`}
                >
                  {isEn ? '← Back to Variables' : '← بازگشت به ویرایش متغیرها'}
                </button>

                <button
                  type="button"
                  onClick={handleExecuteApply}
                  disabled={isApplying}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{t('apply_btn_execute')}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Live Terminal Execution Stream */}
          {(activeStep === 'executing' || activeStep === 'done') && (
            <div className="space-y-4 animate-fadeIn">
              {/* Execution Status Header */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between transition ${
                  activeStep === 'done'
                    ? isLightMode
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                    : isLightMode
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-950'
                    : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {activeStep === 'executing' ? (
                    <RefreshCw className="w-5 h-5 text-cyan-600 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  )}
                  <div>
                    <h4 className={`font-bold text-sm ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                      {activeStep === 'executing'
                        ? t('apply_executing_title')
                        : t('apply_success_title')}
                    </h4>
                    <p className={`text-xs mt-0.5 ${isLightMode ? 'text-slate-600' : 'text-slate-300'}`}>
                      {isEn ? 'Device: ' : 'تجهیز: '}<span className={`font-mono font-bold ${isLightMode ? 'text-slate-950' : 'text-white'}`}>{selectedDevice?.name}</span> | {isEn ? 'New IP: ' : 'آی‌پی جدید: '}{' '}
                      <span className={`font-mono font-bold ${isLightMode ? 'text-indigo-700' : 'text-cyan-300'}`}>{selectedDevice?.ip}</span> | {isEn ? 'Status: Synced with DB' : 'وضعیت: پایدار در دیتابیس'}
                    </p>
                  </div>
                </div>

                {activeStep === 'done' && (
                  <span className={`px-3 py-1 rounded-lg border text-xs font-bold ${
                    isLightMode
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    Running & Startup Synced
                  </span>
                )}
              </div>

              {/* Streaming Terminal Log Output */}
              <div className={`border rounded-xl p-4 font-mono text-xs max-h-96 overflow-y-auto dir-ltr text-left space-y-1.5 shadow-inner ${
                isLightMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-950 border-white/15 text-slate-300'
              }`}>
                {applyResult?.logs.map((log: TemplateExecutionLog, idx: number) => (
                  <div key={idx} className="leading-snug">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 select-none text-[10px] font-mono">[{log.timestamp}]</span>
                      <span className="text-cyan-400 font-bold select-none">{log.prompt}</span>
                      <span className="text-white font-medium">{log.command}</span>
                    </div>
                    {log.output && (
                      <div
                        className={`pl-4 select-text whitespace-pre-wrap ${
                          log.status === 'error'
                            ? 'text-rose-400'
                            : log.status === 'warn'
                            ? 'text-amber-400'
                            : 'text-emerald-400/90'
                        }`}
                      >
                        {log.output}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Done Modal Actions */}
              {activeStep === 'done' && (
                <div className={`flex items-center justify-between pt-4 border-t ${
                  isLightMode ? 'border-slate-200' : 'border-white/10'
                }`}>
                  <button
                    onClick={handleDownloadScript}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                      isLightMode
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                        : 'bg-white/10 hover:bg-white/15 text-slate-200'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span>{t('apply_download_backup')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <span>{t('apply_btn_finish')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
