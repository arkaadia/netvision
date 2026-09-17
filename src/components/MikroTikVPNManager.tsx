import React from 'react';
import { Shield, Minus, X } from 'lucide-react';
import { Device } from '../types';
import { MikroTikVPNSuite } from './vpn/MikroTikVPNSuite';
import { useLanguage } from '../i18n/LanguageContext';

export interface MikroTikVPNManagerProps {
  device?: Device | null;
  isOpen?: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
  userRole?: string;
  isLightMode?: boolean;
}

export const MikroTikVPNManager: React.FC<MikroTikVPNManagerProps> = ({
  device,
  isOpen = false,
  onClose = () => {},
  onMinimize,
  userRole = 'Super Admin',
  isLightMode = false,
}) => {
  const { isEn } = useLanguage();

  if (!isOpen || !device) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bottom-8 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div
        className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 border shadow-2xl transition-colors ${
          isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <span>{isEn ? 'MikroTik RouterOS VPN Suite' : 'مدیریت و پیکربندی VPN میکروتیک'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {device.name} • {device.ip}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onMinimize && (
              <button
                type="button"
                onClick={onMinimize}
                title={isEn ? 'Minimize' : 'کوچک‌سازی'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title={isEn ? 'Close' : 'بستن'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <MikroTikVPNSuite device={device} userRole={userRole} onMinimize={onMinimize} />
      </div>
    </div>
  );
};
