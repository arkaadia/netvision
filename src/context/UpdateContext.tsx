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

interface UpdateContextType {
  updateInfo: UpdateInfo | null;
  checking: boolean;
  updating: boolean;
  updateSuccess: boolean;
  updateLogs: string[];
  error: string | null;
  countdown: number | null;
  checkUpdate: (simulate?: boolean) => Promise<void>;
  performUpdate: () => Promise<boolean>;
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

  const checkUpdate = useCallback(async (simulate: boolean = false) => {
    setChecking(true);
    setError(null);
    try {
      const url = `/api/system/check-update${simulate ? '?simulate=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data: UpdateInfo = await res.json();
      setUpdateInfo(data);
      if (simulate) {
        setIsSimulated(true);
        setIsAlertDismissed(false);
      } else {
        setIsSimulated(false);
      }
    } catch (err: any) {
      console.warn('[UpdateContext] Failed to check for updates:', err.message);
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }, []);

  const performUpdate = useCallback(async (): Promise<boolean> => {
    setUpdating(true);
    setError(null);
    setUpdateSuccess(false);
    const currentLang = typeof window !== 'undefined' ? localStorage.getItem('nettopology_lang') || 'en' : 'en';
    const isPersian = currentLang === 'fa';

    setUpdateLogs([
      isPersian
        ? 'در حال اتصال به سرور و مخزن گیت‌هاب (Net-Management)...'
        : 'Connecting to server and GitHub repository (Net-Management)...'
    ]);

    try {
      // If in simulated test mode, simulate real steps for demonstration
      if (isSimulated) {
        await new Promise((r) => setTimeout(r, 800));
        setUpdateLogs((prev) => [
          ...prev,
          isPersian
            ? 'همگام‌سازی فایل‌های سیستمی با برنچ master...'
            : 'Synchronizing system files with master branch...'
        ]);
        await new Promise((r) => setTimeout(r, 1000));
        setUpdateLogs((prev) => [
          ...prev,
          isPersian
            ? 'بررسی پکیج‌ها و بازسازی فایل‌های باندلینگ...'
            : 'Verifying dependencies and compiling production bundles...'
        ]);
        await new Promise((r) => setTimeout(r, 900));
        setUpdateLogs((prev) => [
          ...prev,
          isPersian
            ? 'به‌روزرسانی با موفقیت به اتمام رسید!'
            : 'Update completed successfully!'
        ]);
        setUpdateSuccess(true);
        setUpdating(false);
        setCountdown(3);
        return true;
      }

      const res = await fetch('/api/system/perform-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isPersian ? 'عملیات در سرور با خطا مواجه شد' : 'Operation failed on server'));
      }

      setUpdateLogs(data.logs || ['Update completed successfully.']);
      setUpdateSuccess(true);
      setCountdown(3);
      return true;
    } catch (err: any) {
      console.error('[UpdateContext] Update error:', err);
      setError(err.message || (isPersian ? 'خطا در ارتقای نرم‌افزار' : 'Software update failed'));
      return false;
    } finally {
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
    checkUpdate(false);
    // Periodically re-check every 15 minutes
    const interval = setInterval(() => {
      checkUpdate(false);
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
