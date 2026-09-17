import React from 'react';
import { Shield, RefreshCw, X, Minus, Lock, Network, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MikroTikVPNItem, VPNVerificationDetails } from '../../types';

export interface VPNInspectModalProps {
  isOpen: boolean;
  vpn: MikroTikVPNItem | null;
  inspectVerifyData: VPNVerificationDetails | null;
  isInspectLoading: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  isEn?: boolean;
  isLightMode?: boolean;
}

export const VPNInspectModal: React.FC<VPNInspectModalProps> = ({
  isOpen,
  vpn,
  inspectVerifyData,
  isInspectLoading,
  onClose,
  onMinimize,
  isEn = false,
  isLightMode = false,
}) => {
  if (!isOpen || !vpn) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bottom-8 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div
        className={`w-full max-w-xl rounded-xl p-6 shadow-2xl space-y-4 border ${
          isLightMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm">
              {isEn ? 'VPN Real-Time Inspection' : 'بررسی زنده وضعیت اینترفیس و نشست VPN'}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            {onMinimize && (
              <button
                type="button"
                onClick={onMinimize}
                title={isEn ? 'Minimize' : 'کوچک‌سازی'}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title={isEn ? 'Close' : 'بستن'}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2 font-mono">
            <div className={`p-2.5 rounded border ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <span className="text-[10px] text-slate-400 uppercase">{isEn ? 'Name' : 'نام اینترفیس'}</span>
              <p className="font-bold text-slate-200">{vpn.name}</p>
            </div>
            <div className={`p-2.5 rounded border ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <span className="text-[10px] text-slate-400 uppercase">{isEn ? 'Protocol' : 'پروتکل'}</span>
              <p className="font-bold text-cyan-400">{(vpn.type || 'VPN').toUpperCase()}</p>
            </div>
          </div>

          {isInspectLoading ? (
            <div className="py-8 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-cyan-400" />
              <span>{isEn ? 'Executing diagnostic query directly over router SSH...' : 'در حال استعلام مستقیم از جدول اینترفیس‌های روتر میکروتیک...'}</span>
            </div>
          ) : inspectVerifyData ? (
            <div className="space-y-2">
              <div className={`p-3 rounded border flex items-center justify-between ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                <span>{isEn ? 'Live Operational State:' : 'وضعیت زنده سخت‌افزاری:'}</span>
                <span className="font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {inspectVerifyData.operational_status}
                </span>
              </div>
              {inspectVerifyData.raw_server_output && (
                <div>
                  <span className="text-[10px] text-slate-400 font-mono block mb-1">
                    {isEn ? 'Direct Router CLI Output' : 'خروجی مستقیم CLI میکروتیک'}
                  </span>
                  <pre className="p-3 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto leading-relaxed">
                    {inspectVerifyData.raw_server_output}
                  </pre>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
          >
            {isEn ? 'Close' : 'بستن'}
          </button>
        </div>
      </div>
    </div>
  );
};
