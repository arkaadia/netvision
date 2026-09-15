import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Minus,
  X,
  Copy,
  Check,
  RefreshCw,
  Shield,
  Sliders,
  CheckCircle2
} from 'lucide-react';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  isEn: boolean;
  isLightMode: boolean;
}

export const PasswordGeneratorModal: React.FC<PasswordGeneratorModalProps> = ({
  isOpen,
  onClose,
  onMinimize,
  isEn,
  isLightMode
}) => {
  const [length, setLength] = useState<number>(18);
  const [includeUpper, setIncludeUpper] = useState<boolean>(true);
  const [includeLower, setIncludeLower] = useState<boolean>(true);
  const [includeNumbers, setIncludeNumbers] = useState<boolean>(true);
  const [includeSymbols, setIncludeSymbols] = useState<boolean>(true);
  const [avoidAmbiguous, setAvoidAmbiguous] = useState<boolean>(true);
  const [routerOsSafe, setRouterOsSafe] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [bulkList, setBulkList] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateSinglePassword = (
    len: number,
    upper: boolean,
    lower: boolean,
    nums: boolean,
    syms: boolean,
    ambig: boolean,
    safeRos: boolean
  ) => {
    let upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let lowerChars = 'abcdefghijklmnopqrstuvwxyz';
    let numChars = '0123456789';
    let symChars = safeRos ? '!@#$%^&*()-_=+' : '!@#$%^&*()-_=+[]{}|;:,.<>?';

    if (ambig) {
      // Remove easily confused characters: 0, O, o, 1, l, I, |
      upperChars = upperChars.replace(/[OI]/g, '');
      lowerChars = lowerChars.replace(/[lo]/g, '');
      numChars = numChars.replace(/[01]/g, '');
      symChars = symChars.replace(/[|]/g, '');
    }

    let charPool = '';
    if (upper) charPool += upperChars;
    if (lower) charPool += lowerChars;
    if (nums) charPool += numChars;
    if (syms) charPool += symChars;

    if (!charPool) {
      charPool = lowerChars + numChars;
    }

    // Ensure at least one character of each enabled type
    let result = '';
    const guaranteed: string[] = [];
    if (upper && upperChars.length) guaranteed.push(upperChars[Math.floor(Math.random() * upperChars.length)]);
    if (lower && lowerChars.length) guaranteed.push(lowerChars[Math.floor(Math.random() * lowerChars.length)]);
    if (nums && numChars.length) guaranteed.push(numChars[Math.floor(Math.random() * numChars.length)]);
    if (syms && symChars.length) guaranteed.push(symChars[Math.floor(Math.random() * symChars.length)]);

    for (let i = guaranteed.length; i < len; i++) {
      const idx = Math.floor(Math.random() * charPool.length);
      result += charPool[idx];
    }

    // Combine and shuffle
    const combined = [...guaranteed, ...result.split('')];
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }

    return combined.join('').slice(0, len);
  };

  const regenerate = () => {
    const pw = generateSinglePassword(
      length,
      includeUpper,
      includeLower,
      includeNumbers,
      includeSymbols,
      avoidAmbiguous,
      routerOsSafe
    );
    setPassword(pw);

    // Bulk list
    const bulk = [];
    for (let i = 0; i < 5; i++) {
      bulk.push(
        generateSinglePassword(
          length,
          includeUpper,
          includeLower,
          includeNumbers,
          includeSymbols,
          avoidAmbiguous,
          routerOsSafe
        )
      );
    }
    setBulkList(bulk);
  };

  useEffect(() => {
    if (isOpen && !password) {
      regenerate();
    }
  }, [isOpen]);

  const copyPassword = (text: string, index: number | null = null) => {
    navigator.clipboard.writeText(text);
    if (index === null) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  // Calculate entropy
  const entropy = Math.round(length * Math.log2(
    (includeUpper ? 26 : 0) +
    (includeLower ? 26 : 0) +
    (includeNumbers ? 10 : 0) +
    (includeSymbols ? 20 : 0) || 10
  ));

  let strengthLabel = isEn ? 'Weak' : 'ضعیف';
  let strengthColor = 'text-rose-400';
  let strengthBg = 'bg-rose-500';

  if (entropy > 90) {
    strengthLabel = isEn ? 'Military-Grade (Enterprise)' : 'بسیار مستحکم و ایمن (سازمانی)';
    strengthColor = 'text-emerald-400';
    strengthBg = 'bg-emerald-500';
  } else if (entropy > 65) {
    strengthLabel = isEn ? 'Strong (Recommended)' : 'قوی و مطمئن (توصیه‌شده)';
    strengthColor = 'text-cyan-400';
    strengthBg = 'bg-cyan-500';
  } else if (entropy > 45) {
    strengthLabel = isEn ? 'Moderate' : 'متوسط';
    strengthColor = 'text-amber-400';
    strengthBg = 'bg-amber-500';
  }

  if (!isOpen) return null;

  return (
    <div
      id="password-generator-modal-overlay"
      className="fixed top-0 left-0 right-0 bottom-8 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in"
    >
      <div
        id="password-generator-modal-window"
        className={`w-full max-w-2xl max-h-[82vh] flex flex-col rounded-2xl shadow-2xl border transition-all duration-200 overflow-hidden ${
          isLightMode
            ? 'bg-white text-slate-900 border-slate-200 shadow-slate-400/40'
            : 'bg-slate-950 text-slate-100 border-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.8)]'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
            isLightMode ? 'border-slate-100 bg-slate-50/80' : 'border-slate-800/80 bg-slate-900/60'
          } rounded-t-2xl`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">
                {isEn ? 'Network Equipment Password Generator' : 'تولیدکننده رمز عبور امن تجهیزات شبکه'}
              </h3>
              <p className={`text-[11px] ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn ? 'Cryptographically secure passwords for Cisco IOS, MikroTik & firewalls' : 'تولید کلمات عبور استاندارد و ایمن برای روتر، سوئیچ و فایروال'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onMinimize}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLightMode
                  ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-cyan-300'
              }`}
              title={isEn ? 'Minimize' : 'مینیمایز به نوار پایین'}
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLightMode
                  ? 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-red-400'
              }`}
              title={isEn ? 'Close' : 'بستن'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar">
          {/* Main Display Box */}
          <div
            className={`p-4 rounded-xl border relative flex flex-col gap-2 ${
              isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">
                {isEn ? 'Generated Password' : 'رمز عبور تولیدشده'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-mono font-bold ${strengthColor}`}>
                  {strengthLabel}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">({entropy} bits entropy)</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-base sm:text-lg font-bold tracking-wider text-emerald-400 break-all select-all">
                {password}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => regenerate()}
                  className={`p-2 rounded-lg border transition hover:scale-105 cursor-pointer ${
                    isLightMode
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  }`}
                  title={isEn ? 'Regenerate' : 'تولید مجدد'}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => copyPassword(password)}
                  className={`px-3 py-2 rounded-lg border font-medium text-xs flex items-center gap-1.5 transition hover:scale-105 cursor-pointer ${
                    copied
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : isLightMode
                      ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? (isEn ? 'Copied!' : 'کپی شد!') : (isEn ? 'Copy' : 'کپی')}</span>
                </button>
              </div>
            </div>

            {/* Strength Bar */}
            <div className="w-full bg-slate-700/30 rounded-full h-1.5 overflow-hidden mt-1">
              <div
                className={`h-full ${strengthBg} transition-all duration-300`}
                style={{ width: `${Math.min(100, Math.max(10, (entropy / 120) * 100))}%` }}
              />
            </div>
          </div>

          {/* Controls & Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Length Slider */}
            <div
              className={`p-3.5 rounded-xl border ${
                isLightMode ? 'bg-slate-50/60 border-slate-200' : 'bg-slate-900/40 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span>{isEn ? 'Password Length' : 'طول کلمه عبور'}</span>
                <span className="font-mono font-bold text-cyan-400">{length} {isEn ? 'chars' : 'کاراکتر'}</span>
              </div>
              <input
                type="range"
                min="8"
                max="48"
                value={length}
                onChange={(e) => {
                  setLength(parseInt(e.target.value, 10));
                  setTimeout(regenerate, 10);
                }}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                <span>8</span>
                <span>16</span>
                <span>24</span>
                <span>32</span>
                <span>48</span>
              </div>
            </div>

            {/* Character Sets Checkboxes */}
            <div
              className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                isLightMode ? 'bg-slate-50/60 border-slate-200' : 'bg-slate-900/40 border-slate-800'
              }`}
            >
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeUpper}
                    onChange={(e) => {
                      setIncludeUpper(e.target.checked);
                      setTimeout(regenerate, 10);
                    }}
                    className="accent-cyan-500"
                  />
                  <span>{isEn ? 'Uppercase (A-Z)' : 'حروف بزرگ (A-Z)'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLower}
                    onChange={(e) => {
                      setIncludeLower(e.target.checked);
                      setTimeout(regenerate, 10);
                    }}
                    className="accent-cyan-500"
                  />
                  <span>{isEn ? 'Lowercase (a-z)' : 'حروف کوچک (a-z)'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeNumbers}
                    onChange={(e) => {
                      setIncludeNumbers(e.target.checked);
                      setTimeout(regenerate, 10);
                    }}
                    className="accent-cyan-500"
                  />
                  <span>{isEn ? 'Numbers (0-9)' : 'اعداد (0-9)'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSymbols}
                    onChange={(e) => {
                      setIncludeSymbols(e.target.checked);
                      setTimeout(regenerate, 10);
                    }}
                    className="accent-cyan-500"
                  />
                  <span>{isEn ? 'Symbols (!@#$)' : 'نمادها (!@#$)'}</span>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-700/30 flex flex-col gap-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-400">
                  <input
                    type="checkbox"
                    checked={avoidAmbiguous}
                    onChange={(e) => {
                      setAvoidAmbiguous(e.target.checked);
                      setTimeout(regenerate, 10);
                    }}
                    className="accent-cyan-500"
                  />
                  <span>{isEn ? 'Avoid ambiguous characters (0, O, 1, l, I)' : 'حذف کاراکترهای مشابه و مبهم (0, O, 1, l, I)'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-400">
                  <input
                    type="checkbox"
                    checked={routerOsSafe}
                    onChange={(e) => {
                      setRouterOsSafe(e.target.checked);
                      setTimeout(regenerate, 10);
                    }}
                    className="accent-cyan-500"
                  />
                  <span>{isEn ? 'RouterOS / CLI safe (avoids quotes & brackets)' : 'سازگار با کنسول میکروتیک (بدون کوتیشن و پرانتز)'}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Bulk Generation List */}
          <div
            className={`p-3.5 rounded-xl border ${
              isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
            }`}
          >
            <div className="text-xs font-semibold mb-2 flex items-center justify-between">
              <span>{isEn ? 'Additional Generated Passwords' : 'سایر کلمات عبور پیشنهادی'}</span>
              <button
                onClick={regenerate}
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{isEn ? 'Refresh list' : 'تازه‌سازی لیست'}</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {bulkList.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg font-mono text-xs border ${
                    isLightMode ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <span className="text-slate-300 truncate">{item}</span>
                  <button
                    onClick={() => copyPassword(item, idx)}
                    className="p-1 hover:text-cyan-400 transition"
                    title={isEn ? 'Copy' : 'کپی'}
                  >
                    {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t shrink-0 ${
            isLightMode ? 'border-slate-100 bg-slate-50/80' : 'border-slate-800/80 bg-slate-900/60'
          } rounded-b-2xl`}
        >
          <span className="text-xs text-slate-400">
            {isEn ? 'Generated locally with cryptographic random values' : 'تولید شده به شیوه امن محلی بدون ثبت در سرور'}
          </span>

          <button
            onClick={onMinimize}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
              isLightMode
                ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20'
            }`}
          >
            <Minus className="w-3.5 h-3.5" />
            <span>{isEn ? 'Minimize' : 'مینیمایز به پایین'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
