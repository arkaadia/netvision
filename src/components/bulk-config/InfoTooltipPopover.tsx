import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info, X, HelpCircle, CheckCircle2 } from 'lucide-react';

interface InfoTooltipPopoverProps {
  title?: string;
  what: string;
  why: string;
  example: string;
  isEn: boolean;
  size?: 'sm' | 'md';
  align?: 'left' | 'right' | 'center';
  placement?: 'top' | 'bottom';
  className?: string;
}

interface Coords {
  top: number;
  left: number;
  width: number;
  isFlipped: boolean;
}

export const InfoTooltipPopover: React.FC<InfoTooltipPopoverProps> = ({
  title,
  what,
  why,
  example,
  isEn,
  size = 'sm',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  // Synchronously calculate position directly under mouse click or trigger button
  const computePosition = useCallback(
    (mousePoint?: { x: number; y: number } | null): Coords => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const targetWidth = Math.min(320, viewportWidth - 24);

      let anchorX: number;
      let anchorY: number;

      if (mousePoint && mousePoint.x > 0 && mousePoint.y > 0) {
        anchorX = mousePoint.x;
        anchorY = mousePoint.y;
      } else if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        anchorX = rect.left + rect.width / 2;
        anchorY = rect.bottom;
      } else {
        anchorX = viewportWidth / 2;
        anchorY = viewportHeight / 2;
      }

      // Center horizontally directly under the cursor / trigger
      let left = Math.round(anchorX - targetWidth / 2);

      // Clamp within viewport margins
      if (left + targetWidth > viewportWidth - 12) {
        left = viewportWidth - targetWidth - 12;
      }
      if (left < 12) {
        left = 12;
      }

      // Vertical placement directly under click
      const estimatedHeight = 260;
      const spaceBelow = viewportHeight - anchorY;
      const spaceAbove = anchorY;

      let top: number;
      let isFlipped = false;

      if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
        // Position directly above cursor
        top = Math.max(12, Math.round(anchorY - estimatedHeight - 10));
        isFlipped = true;
      } else {
        // Position directly below cursor
        top = Math.min(viewportHeight - estimatedHeight - 12, Math.round(anchorY + 10));
        if (top < 12) top = 12;
      }

      return { top, left, width: targetWidth, isFlipped };
    },
    []
  );

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isOpen) {
      setIsOpen(false);
      lastMouseRef.current = null;
    } else {
      const mouse = { x: e.clientX, y: e.clientY };
      lastMouseRef.current = mouse;
      const calculated = computePosition(mouse);
      setCoords(calculated);
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setCoords(computePosition(lastMouseRef.current));
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
  }, [isOpen, computePosition]);

  return (
    <div className={`inline-flex items-center shrink-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        title={isEn ? 'Click for explanation & examples' : 'مشاهده توضیحات، کاربرد و مثال'}
        className={`inline-flex items-center justify-center rounded-full transition-all focus:outline-none shrink-0 ${
          isOpen
            ? 'bg-cyan-500/30 text-cyan-300 ring-2 ring-cyan-500/40 shadow-sm shadow-cyan-500/20'
            : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10'
        } ${size === 'sm' ? 'w-4 h-4 p-0.5' : 'w-5 h-5 p-1'}`}
        aria-label={isEn ? 'Information' : 'اطلاعات و راهنما'}
      >
        <Info className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      </button>

      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxWidth: 'calc(100vw - 24px)',
              maxHeight: 'calc(100vh - 32px)',
              zIndex: 99999,
            }}
            className="p-3 rounded-xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl text-xs font-sans text-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col overflow-hidden"
            dir={isEn ? 'ltr' : 'rtl'}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs">
                <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="line-clamp-1">{title || (isEn ? 'Help & Field Guide' : 'راهنما و اطلاعات پارامتر')}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrollable Body if needed on small screens */}
            <div className="space-y-2 overflow-y-auto max-h-[60vh] pr-1 pl-1 scrollbar-thin scrollbar-thumb-white/10">
              {/* 1. What it is */}
              {what && (
                <div className="p-2 rounded-lg bg-slate-950/70 border border-white/5 space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-cyan-300">
                    <span>💡</span>
                    <span>{isEn ? 'What is this?' : 'این قسمت چیست؟'}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-normal break-words">
                    {what}
                  </p>
                </div>
              )}

              {/* 2. Why it is needed */}
              {why && (
                <div className="p-2 rounded-lg bg-slate-950/70 border border-white/5 space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                    <span>🎯</span>
                    <span>{isEn ? 'Why is it needed?' : 'چرا نیاز است و چه اثری دارد؟'}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-normal break-words">
                    {why}
                  </p>
                </div>
              )}

              {/* 3. Example */}
              {example && (
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/25 space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{isEn ? 'Practical Example:' : 'مثال کاربردی و نمونه:'}</span>
                  </div>
                  <div className="text-[11px] font-mono text-emerald-200/90 break-all bg-black/50 px-2 py-1.5 rounded border border-emerald-500/20 select-all">
                    {example}
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
