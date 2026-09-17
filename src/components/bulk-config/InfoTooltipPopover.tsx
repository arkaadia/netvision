import React, { useState, useRef, useEffect } from 'react';
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

export const InfoTooltipPopover: React.FC<InfoTooltipPopoverProps> = ({
  title,
  what,
  why,
  example,
  isEn,
  size = 'sm',
  align = 'right',
  placement = 'bottom',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={toggleOpen}
        title={isEn ? 'Click for explanation & examples' : 'مشاهده توضیحات، کاربرد و مثال'}
        className={`inline-flex items-center justify-center rounded-full transition-all focus:outline-none ${
          isOpen
            ? 'bg-cyan-500/30 text-cyan-300 ring-2 ring-cyan-500/40 shadow-sm shadow-cyan-500/20'
            : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10'
        } ${size === 'sm' ? 'w-4 h-4 p-0.5' : 'w-5 h-5 p-1'}`}
        aria-label={isEn ? 'Information' : 'اطلاعات و راهنما'}
      >
        <Info className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute z-50 w-72 sm:w-80 p-3.5 rounded-xl bg-slate-900/95 border border-cyan-500/30 shadow-2xl backdrop-blur-md text-xs font-sans text-slate-200 transition-all duration-200 animate-in fade-in zoom-in-95 ${
            placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${
            align === 'left'
              ? 'left-0'
              : align === 'right'
              ? 'right-0'
              : 'left-1/2 -translate-x-1/2'
          }`}
          style={{ maxWidth: 'calc(100vw - 32px)' }}
          dir={isEn ? 'ltr' : 'rtl'}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs">
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="line-clamp-1">{title || (isEn ? 'Help & Field Guide' : 'راهنما و اطلاعات پارامتر')}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-0.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body Sections */}
          <div className="space-y-2.5">
            {/* 1. What it is */}
            {what && (
              <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-cyan-300">
                  <span>💡</span>
                  <span>{isEn ? 'What is this?' : 'این قسمت چیست؟'}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                  {what}
                </p>
              </div>
            )}

            {/* 2. Why it is needed */}
            {why && (
              <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                  <span>🎯</span>
                  <span>{isEn ? 'Why is it needed?' : 'چرا نیاز است و چه اثری دارد؟'}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                  {why}
                </p>
              </div>
            )}

            {/* 3. Example */}
            {example && (
              <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20 space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{isEn ? 'Practical Example:' : 'مثال کاربردی و نمونه:'}</span>
                </div>
                <div className="text-[11px] font-mono text-emerald-200/90 break-words bg-black/40 px-2 py-1 rounded border border-emerald-500/20 select-all">
                  {example}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
