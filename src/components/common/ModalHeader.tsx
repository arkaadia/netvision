import React, { ReactNode } from 'react';
import { ModalHeaderControls } from './ModalHeaderControls';

export interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  onMinimize?: () => void;
  onClose: () => void;
  onMaximizeToggle?: () => void;
  isMaximized?: boolean;
  isLightMode?: boolean;
  isEn?: boolean;
  extraActions?: ReactNode;
  className?: string;
}

/**
 * Standard reusable ModalHeader layout.
 * Ensures identical padding, typography, icon presentation, and header controls.
 */
export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  icon,
  badge,
  onMinimize,
  onClose,
  onMaximizeToggle,
  isMaximized,
  isLightMode = false,
  isEn = true,
  extraActions,
  className = '',
}) => {
  return (
    <div
      className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 transition-colors ${
        isLightMode
          ? 'bg-slate-50 border-slate-200 text-slate-900'
          : 'bg-slate-950 border-slate-800 text-white'
      } ${className}`}
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && <div className="shrink-0">{icon}</div>}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold truncate leading-tight tracking-wide">
              {title}
            </h3>
            {badge}
          </div>
          {subtitle && (
            <p className={`text-[11px] truncate mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <ModalHeaderControls
        onMinimize={onMinimize}
        onClose={onClose}
        onMaximizeToggle={onMaximizeToggle}
        isMaximized={isMaximized}
        isLightMode={isLightMode}
        isEn={isEn}
        extraActions={extraActions}
      />
    </div>
  );
};
