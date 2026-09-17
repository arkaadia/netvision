import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
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
  maxHeight: number;
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

  // Calculate coordinates ensuring the popover NEVER overflows ANY side of the viewport
  const calculatePosition = useCallback(
    (mousePoint?: { x: number; y: number } | null, measuredHeight?: number): Coords => {
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

      // 1. Horizontal constraint (never overflow left or right)
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

      // Center horizontally on anchor point
      let left = Math.round(anchorX - targetWidth / 2);

      // Strict horizontal viewport clamp (min 12px margin on both sides)
      if (left + targetWidth > viewportWidth - 12) {
        left = viewportWidth - targetWidth - 12;
      }
      if (left < 12) {
        left = 12;
      }

      // 2. Vertical calculation & strict viewport boundary clamping
      const spaceBelow = viewportHeight - anchorY;
      const spaceAbove = anchorY;

      // Standard height of popover content is typically ~300-340px
      const assumedHeight = measuredHeight && measuredHeight > 50 ? measuredHeight : 320;

      // If space below is tighter than assumed height, and space above is larger, flip to top
      const preferAbove = spaceBelow < (assumedHeight + 20) && spaceAbove > spaceBelow;

      let top: number;
      let maxHeight: number;
      let isFlipped = false;

      if (preferAbove) {
        isFlipped = true;
        // Available space above the cursor
        maxHeight = Math.min(420, Math.max(160, spaceAbove - 20));
        const effectiveHeight = Math.min(assumedHeight, maxHeight);
        top = Math.round(anchorY - effectiveHeight - 8);
      } else {
        isFlipped = false;
        top = Math.round(anchorY + 8);
        // Maximum allowed height before touching viewport bottom margin
        maxHeight = Math.min(420, Math.max(160, viewportHeight - top - 12));
      }

      // Absolute safety clamp: popover top can never be < 12px
      if (top < 12) {
        top = 12;
        maxHeight = Math.min(maxHeight, viewportHeight - 24);
      }

      // Absolute safety clamp: popover bottom can NEVER exceed (viewportHeight - 12px)
      const currentHeight = measuredHeight ? Math.min(measuredHeight, maxHeight) : Math.min(assumedHeight, maxHeight);
      if (top + currentHeight > viewportHeight - 12) {
        top = Math.max(12, viewportHeight - currentHeight - 12);
        maxHeight = Math.min(maxHeight, viewportHeight - top - 12);
      }

      return {
        top,
        left,
        width: targetWidth,
        maxHeight,
        isFlipped,
      };
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
      const initialCoords = calculatePosition(mouse);
      setCoords(initialCoords);
      setIsOpen(true);
    }
  };

  // Re-measure after DOM render to ensure exact fit with real content height
  useLayoutEffect(() => {
    if (!isOpen || !popoverRef.current) return;
    const realHeight = popoverRef.current.offsetHeight;
    if (realHeight > 0) {
      setCoords((prev) => {
        const refined = calculatePosition(lastMouseRef.current, realHeight);
        // Only update if dimensions or position actually differ
        if (
          !prev ||
          Math.abs(prev.top - refined.top) > 1 ||
          Math.abs(prev.left - refined.left) > 1 ||
          prev.maxHeight !== refined.maxHeight
        ) {
          return refined;
        }
        return prev;
      });
    }
  }, [isOpen, calculatePosition]);

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
      const measured = popoverRef.current ? popoverRef.current.offsetHeight : undefined;
      setCoords(calculatePosition(lastMouseRef.current, measured));
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
  }, [isOpen, calculatePosition]);

  return (
    <div className={`inline-flex items-center shrink-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        title={isEn ? 'Click for explanation & examples' : 'مشاهده توضیحات، کاربرد و مثال'}
        className={`inline-flex items-center justify-center rounded-full transition-colors focus:outline-none shrink-0 ${
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
              maxHeight: `${coords.maxHeight}px`,
              zIndex: 99999,
            }}
            className="p-3 rounded-xl bg-slate-900/98 border border-cyan-500/40 shadow-2xl backdrop-blur-xl text-xs font-sans text-slate-200 animate-in fade-in zoom-in-95 duration-100 flex flex-col overflow-hidden select-text"
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

            {/* Scrollable Body: firmly constrained inside parent maxHeight */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 pl-1 scrollbar-thin scrollbar-thumb-white/15">
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
