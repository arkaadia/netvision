import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Minus,
  StickyNote,
  Save,
  Trash2,
  Server,
  Router as RouterIcon,
  Wifi,
  MapPin,
  Clock,
  Pin,
  Check,
  AlertCircle
} from 'lucide-react';
import { Device, CustomTopologyStickyNote, StickyNoteColor } from '../types';
import { useLanguage } from '../i18n';
import { persistDeviceNoteToDatabase, deleteDeviceNoteFromDatabase, STORAGE_KEYS } from '../services/settingsStorage';

interface DeviceStickyNoteModalProps {
  isOpen: boolean;
  device: Device | null;
  existingNote?: CustomTopologyStickyNote;
  onClose: () => void;
  onMinimize?: () => void;
  onSaved?: (note: CustomTopologyStickyNote) => void;
  onDeleted?: (noteId: string) => void;
}

const COLOR_OPTIONS: Array<{ id: StickyNoteColor; labelEn: string; labelFa: string; hex: string; bgClass: string }> = [
  { id: 'yellow', labelEn: 'Yellow', labelFa: 'زرد', hex: '#eab308', bgClass: 'bg-[#fef08a]' },
  { id: 'cyan', labelEn: 'Cyan', labelFa: 'فیروزه‌ای', hex: '#06b6d4', bgClass: 'bg-[#a5f3fc]' },
  { id: 'emerald', labelEn: 'Emerald', labelFa: 'زمردی', hex: '#10b981', bgClass: 'bg-[#a7f3d0]' },
  { id: 'amber', labelEn: 'Amber', labelFa: 'کهربایی', hex: '#f97316', bgClass: 'bg-[#fed7aa]' },
  { id: 'rose', labelEn: 'Rose', labelFa: 'رز', hex: '#f43f5e', bgClass: 'bg-[#fecdd3]' },
  { id: 'purple', labelEn: 'Purple', labelFa: 'بنفش', hex: '#a855f7', bgClass: 'bg-[#e9d5ff]' },
  { id: 'slate', labelEn: 'Slate', labelFa: 'خاکستری', hex: '#64748b', bgClass: 'bg-[#e2e8f0]' },
];

export const DeviceStickyNoteModal: React.FC<DeviceStickyNoteModalProps> = ({
  isOpen,
  device,
  existingNote,
  onClose,
  onMinimize,
  onSaved,
  onDeleted,
}) => {
  const { isEn, isRtl } = useLanguage();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<StickyNoteColor>('yellow');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent background re-renders or pollings from resetting user inputs while typing
  const isInitializedRef = useRef(false);
  const activeDeviceKeyRef = useRef<string | null>(null);
  const initialValuesRef = useRef({
    title: '',
    content: '',
    color: 'yellow' as StickyNoteColor,
    isNew: true,
  });

  useEffect(() => {
    if (!isOpen) {
      isInitializedRef.current = false;
      activeDeviceKeyRef.current = null;
      setShowUnsavedPrompt(false);
      return;
    }

    const deviceKey = `${device?.id}`;
    if (isOpen && device && (!isInitializedRef.current || activeDeviceKeyRef.current !== deviceKey)) {
      isInitializedRef.current = true;
      activeDeviceKeyRef.current = deviceKey;
      if (existingNote) {
        const t = existingNote.title || '';
        const c = existingNote.content || '';
        const col = existingNote.color || 'yellow';
        setTitle(t);
        setContent(c);
        setColor(col);
        initialValuesRef.current = { title: t, content: c, color: col, isNew: false };
      } else {
        const defaultTitle = isEn ? `Note: ${device.name}` : `یادداشت ${device.name}`;
        setTitle(defaultTitle);
        setContent('');
        setColor('yellow');
        initialValuesRef.current = { title: defaultTitle, content: '', color: 'yellow', isNew: true };
      }
      setConfirmDelete(false);
      setShowUnsavedPrompt(false);
      setError(null);
    }
  }, [isOpen, device?.id, isEn, existingNote]);

  const checkHasChanges = () => {
    const curTitle = title.trim();
    const curContent = content.trim();
    const curColor = color;

    if (initialValuesRef.current.isNew) {
      // If newly opened for device without existing note and content is empty:
      // No actual note content was entered, so treat as untouched
      return curContent.length > 0;
    }

    // For existing notes:
    const prevTitle = initialValuesRef.current.title.trim();
    const prevContent = initialValuesRef.current.content.trim();
    const prevColor = initialValuesRef.current.color;

    return curTitle !== prevTitle || curContent !== prevContent || curColor !== prevColor;
  };

  const handleRequestClose = () => {
    if (checkHasChanges()) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showUnsavedPrompt) {
          setShowUnsavedPrompt(false);
        } else {
          handleRequestClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showUnsavedPrompt, title, content, color]);

  if (!isOpen || !device) return null;

  const handleSave = async () => {
    if (!content.trim() && !title.trim()) {
      setError(isEn ? 'Note content or title cannot be empty' : 'عنوان یا متن یادداشت نمی‌تواند خالی باشد');
      return;
    }

    // If creating a new note, verify device does not already have an existing note
    if (!existingNote) {
      let alreadyHasNote = false;
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.DEVICE_STICKY_NOTES);
        if (raw) {
          const notes = JSON.parse(raw);
          if (Array.isArray(notes)) {
            const cleanId = device.id.replace(/^hw-/, '');
            alreadyHasNote = notes.some(
              (n: any) =>
                n &&
                n.linkedDeviceId &&
                (n.linkedDeviceId === device.id ||
                  n.linkedDeviceId === cleanId ||
                  n.linkedDeviceId === 'hw-' + cleanId)
            );
          }
        }
      } catch (e) {}

      if (alreadyHasNote) {
        setError(
          isEn
            ? `Device "${device.name || device.ip}" already has a note and you cannot add another note to it.`
            : `این دیوایس دارای یادداشت است و نمی‌توانید روی آن یادداشت اضافه کنید.`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const noteToSave: CustomTopologyStickyNote = {
        id: existingNote?.id || `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        x: existingNote?.x || 100,
        y: existingNote?.y || 100,
        width: existingNote?.width || 230,
        title: title.trim() || undefined,
        content: content.trim(),
        color,
        linkedDeviceId: device.id,
        createdAt: existingNote?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        viewMode: existingNote?.viewMode || 'card',
      };

      await persistDeviceNoteToDatabase(noteToSave);
      onSaved?.(noteToSave);
      onClose();
    } catch (err: any) {
      setError(err.message || (isEn ? 'Failed to save note' : 'خطا در ذخیره یادداشت'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingNote) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    try {
      setIsDeleting(true);
      await deleteDeviceNoteFromDatabase(existingNote.id, device.id);
      onDeleted?.(existingNote.id);
      onClose();
    } catch (err: any) {
      setError(err.message || (isEn ? 'Failed to delete note' : 'خطا در حذف یادداشت'));
    } finally {
      setIsDeleting(false);
    }
  };

  const activeColorObj = COLOR_OPTIONS.find((c) => c.id === color) || COLOR_OPTIONS[0];

  return createPortal(
    <div
      className="fixed top-0 left-0 right-0 bottom-8 z-[1200] flex items-center justify-center p-3 sm:p-5 modal-backdrop-blur overflow-y-auto"
      data-modal-backdrop="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleRequestClose();
      }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900/95 dark:bg-slate-950/95 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Unsaved Changes Confirmation Overlay */}
        {showUnsavedPrompt && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-sm rounded-2xl flex items-center justify-center p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-xl p-5 shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isEn ? 'Unsaved Changes' : 'تغییرات ذخیره‌نشده'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    {isEn
                      ? 'You have modified the note content. To keep your changes, you must save them before exiting.'
                      : 'متن یا محتوای یادداشت تغییر کرده است. برای حفظ تغییرات باید آن را ذخیره کنید.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowUnsavedPrompt(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition cursor-pointer"
                >
                  {isEn ? 'Keep Editing' : 'ادامه ویرایش'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnsavedPrompt(false);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
                >
                  {isEn ? 'Discard Changes' : 'خروج بدون ذخیره'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowUnsavedPrompt(false);
                    await handleSave();
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Save & Close' : 'ذخیره و بستن'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-amber-500/15 via-slate-800/80 to-slate-900 border-b border-amber-500/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-xs">
              <StickyNote className="w-5 h-5 fill-amber-400/20" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{isEn ? 'Device Sticky Note' : 'یادداشت تجهیز شبکه'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                  {device.name}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {isEn
                  ? 'Notes attached to this device will appear on the schematic map and inventory list.'
                  : 'یادداشت متصل به این تجهیز به صورت برچسب روی نقشه شماتیک و لیست تجهیزات نمایش می‌یابد.'}
              </p>
            </div>
          </div>

          {/* Action buttons: Minimize and Close (Universal Modal Rule) */}
          <div className="flex items-center gap-1.5">
            {onMinimize && (
              <button
                type="button"
                onClick={() => onMinimize()}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title={isEn ? 'Minimize to Dock' : 'کوچک‌سازی به داک'}
              >
                <Minus className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleRequestClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
              title={isEn ? 'Close' : 'بستن'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Device Information Banner */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-lg ${
                device.type === 'switch'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : device.type === 'router'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              }`}
            >
              {device.type === 'switch' ? (
                <Server className="w-4 h-4" />
              ) : device.type === 'router' ? (
                <RouterIcon className="w-4 h-4" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                <span>{device.name}</span>
                <span className="font-mono text-indigo-400 text-[11px] font-normal">({device.ip})</span>
              </div>
              <div className="text-[10px] text-slate-400">
                {device.model} • {device.role || device.type}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            {(device.building || device.floor) && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {device.building} {device.floor ? `• ${device.floor}` : ''} {device.rack ? `(Rack: ${device.rack})` : ''}
                </span>
              </div>
            )}
            {existingNote?.updatedAt && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>{new Date(existingNote.updatedAt).toLocaleDateString(isEn ? 'en-US' : 'fa-IR')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Color Palette Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              {isEn ? 'Note Color Theme' : 'رنگ و قالب یادداشت:'}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_OPTIONS.map((c) => {
                const isSelected = color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? 'border-white ring-2 ring-amber-400 text-white font-bold shadow-md scale-105'
                        : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    } ${c.bgClass} text-slate-900`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span>{isEn ? c.labelEn : c.labelFa}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-0.5 text-slate-900" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {isEn ? 'Title / Subject' : 'عنوان / موضوع یادداشت:'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isEn ? 'e.g. VLAN 50 Uplink, Pending Maintenance, Backup Switch' : 'مثال: آپلینک VLAN 50، نگهداری در انتظار، سوییچ پشتیبان'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
            />
          </div>

          {/* Content Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {isEn ? 'Note Content (Full Details)' : 'متن یادداشت (جزئیات کامل):'}
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                isEn
                  ? 'Enter technical descriptions, cable labels, port allocations, or maintenance records...'
                  : 'توضیحات فنی، برچسب‌های کابل، پورت‌های متصل یا سوابق نگهداری را وارد کنید...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition leading-relaxed resize-y"
            />
          </div>

          {/* Live Preview Card */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
              <span>{isEn ? 'Live Canvas Preview:' : 'پیش‌نمایش زنده روی نقشه:'}</span>
              <span className="text-[10px] text-amber-400/80">({activeColorObj.labelEn})</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 flex items-center justify-center">
              <div
                className={`w-[260px] rounded-xl border-2 p-3 shadow-lg select-none relative transition-all ${activeColorObj.bgClass} text-slate-950`}
                style={{ borderColor: activeColorObj.hex }}
              >
                {/* Pin Badge */}
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                  <div className="w-5 h-5 rounded-full bg-red-600 border border-white shadow-xs flex items-center justify-center">
                    <Pin className="w-2.5 h-2.5 text-white fill-white" />
                  </div>
                </div>

                <div className="pt-1 border-b border-black/15 pb-1.5 mb-2 flex items-center justify-between text-[11px] font-bold">
                  <span className="truncate">{title.trim() || (isEn ? 'Sticky Note' : 'یادداشت')}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/10 text-black/80 font-mono">
                    {device.name}
                  </span>
                </div>

                <p className="text-[11px] leading-relaxed whitespace-pre-wrap font-sans text-slate-900/90 break-words min-h-[40px]">
                  {content.trim() || (isEn ? 'Your note content will appear here...' : 'متن یادداشت در این بخش نمایش خواهد یافت...')}
                </p>

                <div className="mt-2 pt-1 border-t border-black/10 flex items-center justify-between text-[9px] text-black/60 font-mono">
                  <span>NET-TOPOLOGY</span>
                  <span>{new Date().toLocaleDateString(isEn ? 'en-US' : 'fa-IR')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950/80 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            {existingNote && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  confirmDelete
                    ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                    : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {confirmDelete
                    ? isEn
                      ? 'Confirm Delete?'
                      : 'تأیید حذف نهایی؟'
                    : isEn
                    ? 'Delete Note'
                    : 'حذف یادداشت'}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRequestClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition cursor-pointer"
            >
              {isEn ? 'Cancel' : 'انصراف'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || isDeleting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? isEn
                    ? 'Saving...'
                    : 'در حال ذخیره...'
                  : isEn
                  ? 'Save Note'
                  : 'ذخیره یادداشت'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
