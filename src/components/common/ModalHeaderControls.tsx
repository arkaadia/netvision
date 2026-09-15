import React, { ReactNode } from 'react';
import { Minus, X, Maximize2 } from 'lucide-react';

export interface ModalHeaderControlsProps {
  onMinimize?: () => void;
  onClose: () => void;
  onMaximizeToggle?: () => void;
  isMaximized?: boolean;
  isLightMode?: boolean;
  isEn?: boolean;
  extraActions?: ReactNode;
  minimizeTooltip?: string;
  closeTooltip?: string;
}

/**
 * Standard reusable controls component for Modal headers.
 * Provides consistent Minimize (-), Fullscreen/Maximize (if supported), and Close (X) buttons.
 */
export const ModalHeaderControls: React.FC<ModalHeaderControlsProps> = ({
  onMinimize,
  onClose,
  onMaximizeToggle,
  isMaximized = false,
  isLightMode = false,
  isEn = true,
  extraActions,
  minimizeTooltip,
  closeTooltip,
}) => {
  const minTip = minimizeTooltip || (isEn ? 'Minimize to bottom dock' : 'مینیمایز به نوار ابزار پایین');
  const closeTip = closeTooltip || (isEn ? 'Close' : 'بستن');
  const maxTip = isMaximized
    ? (isEn ? 'Exit Fullscreen' : 'خروج از حالت تمام صفحه')
    : (isEn ? 'Fullscreen' : 'تمام صفحه');

  return (
    <div className="flex items-center gap-1 shrink-0" data-role="modal-header-controls">
      {extraActions}

      {/* Optional Maximize/Fullscreen Toggle */}
      {onMaximizeToggle && (
        <button
          type="button"
          onClick={onMaximizeToggle}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isLightMode
              ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
              : 'hover:bg-slate-800 text-slate-400 hover:text-cyan-300'
          }`}
          title={maxTip}
          aria-label={maxTip}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      )}

      {/* Minimize Button */}
      {onMinimize && (
        <button
          type="button"
          onClick={onMinimize}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isLightMode
              ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
              : 'hover:bg-slate-800 text-slate-400 hover:text-cyan-300'
          }`}
          title={minTip}
          aria-label={minTip}
        >
          <Minus className="w-4 h-4" />
        </button>
      )}

      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          isLightMode
            ? 'hover:bg-rose-50 text-slate-400 hover:text-rose-600'
            : 'hover:bg-slate-800 text-slate-400 hover:text-rose-400'
        }`}
        title={closeTip}
        aria-label={closeTip}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
