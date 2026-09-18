import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { APP_VERSION, ReleaseNote } from '../version';

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseNote: ReleaseNote | null;
  repoUrl: string;
  checkedAt?: string;
}

export interface CheckUpdateResult {
  success: boolean;
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  releaseNote: ReleaseNote | null;
  error?: string;
}

export interface UpdateFeedback {
  type: 'checking' | 'latest' | 'update_available' | 'error';
  message: string;
  message_en: string;
  timestamp: number;
}

interface UpdateContextType {
  updateInfo: UpdateInfo | null;
  checking: boolean;
  updating: boolean;
  updateSuccess: boolean;
  updateLogs: string[];
  error: string | null;
  countdown: number | null;
  lastCheckedAt: string | null;
  checkFeedback: UpdateFeedback | null;
  dismissFeedback: () => void;
  checkUpdate: (simulate?: boolean, forceFresh?: boolean) => Promise<CheckUpdateResult>;
  performUpdate: (options?: { clean?: boolean }) => Promise<boolean>;
  toggleSimulatedUpdate: () => void;
  isSimulated: boolean;
  dismissUpdateAlert: () => void;
  isAlertDismissed: boolean;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

export const UpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);
  const [updateLogs, setUpdateLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [isAlertDismissed, setIsAlertDismissed] = useState<boolean>(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [checkFeedback, setCheckFeedback] = useState<UpdateFeedback | null>(null);

  const dismissFeedback = useCallback(() => {
    setCheckFeedback(null);
  }, []);

  const checkUpdate = useCallback(async (simulate: boolean = false, forceFresh: boolean = true): Promise<CheckUpdateResult> => {
    setChecking(true);
    setError(null);
    setCheckFeedback({
      type: 'checking',
      message: 'در حال استعلام بی‌درنگ از مخزن گیت‌هاب...',
      message_en: 'Checking GitHub repository in real-time...',
      timestamp: Date.now()
    });

    try {
      const sep = simulate ? '&' : '?';
      const cacheBuster = forceFresh ? `${sep}_t=${Date.now()}` : '';
      const url = `/api/system/check-update${simulate ? '?simulate=true' : ''}${cacheBuster}`;
      
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data: UpdateInfo = await res.json();
      setUpdateInfo(data);
      const nowIso = new Date().toISOString();
      setLastCheckedAt(nowIso);

      if (simulate) {
        setIsSimulated(true);
        setIsAlertDismissed(false);
      } else {
        setIsSimulated(false);
      }

      if (data.hasUpdate) {
        setCheckFeedback({
          type: 'update_available',
          message: `نگارش جدید v${data.latestVersion} آماده نصب است!`,
          message_en: `New release v${data.latestVersion} is ready to install!`,
          timestamp: Date.now()
        });
      } else {
        setCheckFeedback({
          type: 'latest',
          message: `سامانه شما کاملاً به‌روز است (v${data.currentVersion || APP_VERSION})`,
          message_en: `Your panel is running the latest version (v${data.currentVersion || APP_VERSION})`,
          timestamp: Date.now()
        });
      }

      return {
        success: true,
        hasUpdate: data.hasUpdate,
        latestVersion: data.latestVersion,
        currentVersion: data.currentVersion,
        releaseNote: data.releaseNote
      };
    } catch (err: any) {
      console.warn('[UpdateContext] Failed to check for updates:', err.message);
      setError(err.message);
      setCheckFeedback({
        type: 'error',
        message: `خطا در بررسی به‌روزرسانی: ${err.message}`,
        message_en: `Failed to check for updates: ${err.message}`,
        timestamp: Date.now()
      });
      return {
        success: false,
        hasUpdate: false,
        latestVersion: APP_VERSION,
        currentVersion: APP_VERSION,
        releaseNote: null,
        error: err.message
      };
    } finally {
      setChecking(false);
    }
  }, []);

  const performUpdate = useCallback(async (options?: { clean?: boolean }): Promise<boolean> => {
    setUpdating(true);
    setError(null);
    setUpdateSuccess(false);
    const isCleanMode = options?.clean === true;
    const currentLang = typeof window !== 'undefined' ? localStorage.getItem('nettopology_lang') || 'en' : 'en';
    const isPersian = currentLang === 'fa';

    setUpdateLogs([
      isPersian
        ? `[گام ۱/۶] شروع فرآیند به‌روزرسانی ${isCleanMode ? 'کامل و پاکسازی عمیق' : 'استاندارد'} پنل...`
        : `[Phase 1/6] Starting ${isCleanMode ? 'clean deep rebuild' : 'standard update'} pipeline...`
    ]);

    let progressInterval: any = null;

    try {
      // If in simulated test mode, simulate real steps for demonstration
      if (isSimulated) {
        await new Promise((r) => setTimeout(r, 700));
        setUpdateLogs((prev) => [
          ...prev,
          isPersian
            ? '[گام ۲/۶] همگام‌سازی کامل کدهای مخزن با گیت‌هاب (master)...'
            : '[Phase 2/6] Synchronizing repository files with GitHub (master)...'
        ]);
        await new Promise((r) => setTimeout(r, 700));
        setUpdateLogs((prev) => [
          ...prev,
          isPersian
            ? '[گام ۳/۶] بررسی و نصب تمام وابستگی‌های NPM و ماژول‌های سیستمی...'
            : '[Phase 3/6] Installing and verifying all NPM and system packages...'
        ]);
        await new Promise((r) => setTimeout(r, 700));
        setUpdateLogs((prev) => [
          ...prev,
          isPersian
            ? '[گام ۴/۶] بررسی و نصب پیش‌نیازهای پایتون (paramiko, cryptography, websockets)...'
            : '[Phase 4/6] Verifying Python backend requirements (paramiko, cryptography, websockets)...'
        ]);
        await new Promise((r) => setTimeout(r, 700));
        setUpdateLogs((prev) => [
          ...prev,
          isPersian
            ? '[گام ۵/۶] ساخت و کامپایل مجدد باندل اجرایی فرانت‌اند و بک‌اند...'
            : '[Phase 5/6] Compiling production frontend and backend bundles...'
        ]);
        await new Promise((r) => setTimeout(r, 700));
        setUpdateLogs((prev) => [
          ...prev,
          isPersian
            ? '[گام ۶/۶] به‌روزرسانی با موفقیت کامل انجام شد! راه‌اندازی مجدد در ۳ ثانیه...'
            : '[Phase 6/6] Full update completed successfully! Reloading in 3 seconds...'
        ]);
        setUpdateSuccess(true);
        setUpdating(false);
        setCountdown(3);
        return true;
      }

      // Provide live progressive UI logs during server operations
      const simulatedSteps = isPersian ? [
        '[گام ۲/۶] همگام‌سازی کدهای مخزن، پشتیبان‌گیری و ادغام پایدار دیتابیس و دیوایس‌ها...',
        '[گام ۳/۶] نصب و بازسازی پکیج‌های NPM و ابزارهای ساخت (Vite/TypeScript)...',
        '[گام ۴/۶] پاکسازی پروسه پایتون و بررسی ماژول‌های backend (paramiko, requests)...',
        '[گام ۵/۶] ساخت و کامپایل مجدد کدهای اجرایی پنل (Production Build)...',
        '[گام ۶/۶] نهایی‌سازی تنظیمات، آماده‌سازی سرویس و ری‌استارت نهایی...'
      ] : [
        '[Phase 2/6] Synchronizing repository, safeguarding and merging device inventory & database...',
        '[Phase 3/6] Installing & reconciling NPM packages and build tools (Vite/TypeScript)...',
        '[Phase 4/6] Clearing stale Python process & verifying backend packages (paramiko, requests)...',
        '[Phase 5/6] Compiling production frontend and backend bundles...',
        '[Phase 6/6] Finalizing configuration, preparing service restart...'
      ];

      let stepIdx = 0;
      progressInterval = setInterval(() => {
        if (stepIdx < simulatedSteps.length) {
          const nextText = simulatedSteps[stepIdx];
          setUpdateLogs((prev) => [...prev, nextText]);
          stepIdx++;
        }
      }, 5000);

      const res = await fetch('/api/system/perform-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clean: isCleanMode })
      });

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isPersian ? 'عملیات در سرور با خطا مواجه شد' : 'Operation failed on server'));
      }

      setUpdateLogs(data.logs || ['Update completed successfully.']);
      setUpdateSuccess(true);
      setCountdown(3);
      return true;
    } catch (err: any) {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      console.error('[UpdateContext] Update error:', err);
      setError(err.message || (isPersian ? 'خطا در ارتقای نرم‌افزار' : 'Software update failed'));
      return false;
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setUpdating(false);
    }
  }, [isSimulated]);

  const toggleSimulatedUpdate = useCallback(() => {
    if (isSimulated) {
      setIsSimulated(false);
      checkUpdate(false);
    } else {
      checkUpdate(true);
    }
  }, [isSimulated, checkUpdate]);

  const dismissUpdateAlert = useCallback(() => {
    setIsAlertDismissed(true);
  }, []);

  // Countdown timer when update completes to reload the page
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      window.location.reload();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Initial update check on application load
  useEffect(() => {
    checkUpdate(false, true);
    // Periodically re-check every 15 minutes
    const interval = setInterval(() => {
      checkUpdate(false, true);
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkUpdate]);

  return (
    <UpdateContext.Provider
      value={{
        updateInfo,
        checking,
        updating,
        updateSuccess,
        updateLogs,
        error,
        countdown,
        lastCheckedAt,
        checkFeedback,
        dismissFeedback,
        checkUpdate,
        performUpdate,
        toggleSimulatedUpdate,
        isSimulated,
        dismissUpdateAlert,
        isAlertDismissed,
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
};

export const useUpdate = (): UpdateContextType => {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useUpdate must be used within an UpdateProvider');
  }
  return context;
};

