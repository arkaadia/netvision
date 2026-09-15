import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

export interface FieldInfoTooltipProps {
  title?: string;
  whatIsIt: string;
  whyNeeded: string;
  isEn?: boolean;
  isLightMode?: boolean;
}

export const FieldInfoTooltip: React.FC<FieldInfoTooltipProps> = ({
  title,
  whatIsIt,
  whyNeeded,
  isEn = false,
  isLightMode = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="inline-flex items-center relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
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

      {isOpen && (
        <div
          className={`absolute z-50 left-0 sm:left-auto sm:right-0 bottom-full mb-2 w-72 sm:w-80 p-3 rounded-xl border shadow-xl text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${
            isLightMode
              ? 'bg-white/95 border-cyan-200 text-slate-700 shadow-cyan-900/10'
              : 'bg-slate-900/95 border-cyan-800/60 text-slate-200 shadow-black/60'
          }`}
          dir={isEn ? 'ltr' : 'rtl'}
        >
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-cyan-500/20">
            <span className="font-semibold text-cyan-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
              <Info className="w-3 h-3 text-cyan-400" />
              {title || (isEn ? 'Field Guide & Engineering Purpose' : 'راهنمای فیلد و کاربرد مهندسی')}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <span className="font-bold text-[11px] block text-cyan-300 mb-0.5">
                {isEn ? 'What is this parameter?' : 'این پارامتر چیست؟'}
              </span>
              <p className="leading-relaxed text-[11px] text-slate-300">
                {whatIsIt}
              </p>
            </div>

            <div className="pt-1.5 border-t border-slate-800/60">
              <span className="font-bold text-[11px] block text-amber-300 mb-0.5">
                {isEn ? 'Why is it needed?' : 'چرا در روتر میکروتیک به آن نیاز است؟'}
              </span>
              <p className="leading-relaxed text-[11px] text-slate-300">
                {whyNeeded}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
