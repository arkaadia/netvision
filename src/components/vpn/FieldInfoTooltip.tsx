import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export interface FieldInfoTooltipProps {
  title?: string;
  whatIsIt: string;
  whyNeeded: string;
  isEn?: boolean;
  isLightMode?: boolean;
}

interface Coords {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  isAbove: boolean;
}

export const FieldInfoTooltip: React.FC<FieldInfoTooltipProps> = ({
  title,
  whatIsIt,
  whyNeeded,
  isEn: propIsEn,
  isLightMode = false,
}) => {
  const { isEn: contextIsEn } = useLanguage();
  const isEn = propIsEn !== undefined ? propIsEn : contextIsEn;

  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  // Calculate coordinates ensuring the popover NEVER overflows ANY edge of the viewport
  const updatePosition = useCallback(() => {
    if (!buttonRef.current || typeof window === 'undefined') return;

    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Width clamp: max 320px, but at least 24px margin from viewport edges
    const targetWidth = Math.min(320, viewportWidth - 24);

    // Center horizontally on trigger button
    let left = Math.round(rect.left + rect.width / 2 - targetWidth / 2);

    // Strict horizontal clamping
    if (left + targetWidth > viewportWidth - 12) {
      left = viewportWidth - targetWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }

    // Vertical positioning & flipping
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = 220;

    const preferAbove = spaceBelow < estimatedHeight + 16 && spaceAbove > spaceBelow;

    let top: number;
    let maxHeight: number;
    let isAbove = false;

    if (preferAbove) {
      isAbove = true;
      maxHeight = Math.min(380, Math.max(140, spaceAbove - 20));
      top = Math.max(12, rect.top - estimatedHeight - 8);
    } else {
      isAbove = false;
      top = Math.min(viewportHeight - 100, rect.bottom + 8);
      maxHeight = Math.min(380, Math.max(140, viewportHeight - top - 12));
    }

    setCoords({
      top,
      left,
      width: targetWidth,
      maxHeight,
      isAbove,
    });
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close on outside click, window resize, escape key, and scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  return (
    <div className="inline-flex items-center relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        title={isEn ? 'Click for field explanation & engineering purpose' : 'مشاهده توضیحات و کاربرد مهندسی این فیلد'}
        className={`inline-flex items-center justify-center p-0.5 ml-1.5 mr-1.5 rounded-full transition-all cursor-pointer ${
          isOpen
            ? 'bg-cyan-500 text-white shadow-sm ring-2 ring-cyan-400/40'
            : isLightMode
            ? 'text-slate-400 hover:text-cyan-600 hover:bg-cyan-50'
            : 'text-slate-500 hover:text-cyan-400 hover:bg-cyan-950/40'
        }`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxHeight: `${coords.maxHeight}px`,
              zIndex: 99999,
            }}
            className={`p-3.5 rounded-xl border shadow-2xl text-xs backdrop-blur-md overflow-y-auto animate-in fade-in zoom-in-95 duration-150 select-text ${
              isLightMode
                ? 'bg-white/98 border-cyan-300 text-slate-800 shadow-slate-900/20 ring-1 ring-black/5'
                : 'bg-slate-900/98 border-cyan-500/50 text-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.8)] ring-1 ring-cyan-500/20'
            }`}
            dir={isEn ? 'ltr' : 'rtl'}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/20">
              <span className="font-semibold text-cyan-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                <Info className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">
                  {title || (isEn ? 'Field Guide & Engineering Purpose' : 'راهنمای فیلد و کاربرد مهندسی')}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                title={isEn ? 'Close' : 'بستن'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <span className="font-bold text-[11px] block text-cyan-400 mb-0.5">
                  {isEn ? 'What is this parameter?' : 'این پارامتر چیست؟'}
                </span>
                <p className="leading-relaxed text-[11px] text-slate-300">
                  {whatIsIt}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="font-bold text-[11px] block text-amber-400 mb-0.5">
                  {isEn ? 'Why is it needed?' : 'چرا در روتر میکروتیک به آن نیاز است؟'}
                </span>
                <p className="leading-relaxed text-[11px] text-slate-300">
                  {whyNeeded}
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
