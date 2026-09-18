import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  StickyNote,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Edit2,
  Check,
  X,
  Minus,
  Sparkles,
  MapPin,
  Clock,
} from 'lucide-react';
import { Device, StickyNoteColor } from '../../types';
import { useLanguage } from '../../i18n';
import {
  getNotesForDevice,
  addNoteToDevice,
  updateNoteForDevice,
  deleteNoteForDevice,
  getCustomMaps,
  DeviceNoteData,
} from '../../utils/deviceNotesStorage';
import { ModalHeaderControls } from './ModalHeaderControls';

interface DeviceNotesModalProps {
  isOpen: boolean;
  device: Device | null;
  onClose: () => void;
  onMinimize?: () => void;
  isLightMode?: boolean;
  onNavigateToMap?: (mapId: string) => void;
}

const COLOR_PALETTES: Record<
  StickyNoteColor,
  {
    bg: string;
    border: string;
    badge: string;
    badgeText: string;
    nameFa: string;
    nameEn: string;
    dot: string;
  }
> = {
  yellow: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-300 dark:border-amber-600/40',
    badge: 'bg-amber-200/80 dark:bg-amber-900/60',
    badgeText: 'text-amber-900 dark:text-amber-200',
    nameFa: 'زرد',
    nameEn: 'Yellow',
    dot: 'bg-amber-400',
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    border: 'border-cyan-300 dark:border-cyan-600/40',
    badge: 'bg-cyan-200/80 dark:bg-cyan-900/60',
    badgeText: 'text-cyan-900 dark:text-cyan-200',
    nameFa: 'فیروزه‌ای',
    nameEn: 'Cyan',
    dot: 'bg-cyan-400',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-300 dark:border-emerald-600/40',
    badge: 'bg-emerald-200/80 dark:bg-emerald-900/60',
    badgeText: 'text-emerald-900 dark:text-emerald-200',
    nameFa: 'زمردی',
    nameEn: 'Emerald',
    dot: 'bg-emerald-400',
  },
  amber: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-300 dark:border-orange-600/40',
    badge: 'bg-orange-200/80 dark:bg-orange-900/60',
    badgeText: 'text-orange-900 dark:text-orange-200',
    nameFa: 'نارنجی',
    nameEn: 'Orange',
    dot: 'bg-orange-400',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-300 dark:border-rose-600/40',
    badge: 'bg-rose-200/80 dark:bg-rose-900/60',
    badgeText: 'text-rose-900 dark:text-rose-200',
    nameFa: 'سرخ',
    nameEn: 'Rose',
    dot: 'bg-rose-400',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-300 dark:border-purple-600/40',
    badge: 'bg-purple-200/80 dark:bg-purple-900/60',
    badgeText: 'text-purple-900 dark:text-purple-200',
    nameFa: 'بنفش',
    nameEn: 'Purple',
    dot: 'bg-purple-400',
  },
  slate: {
    bg: 'bg-slate-100 dark:bg-slate-900/60',
    border: 'border-slate-300 dark:border-slate-700',
    badge: 'bg-slate-200 dark:bg-slate-800',
    badgeText: 'text-slate-800 dark:text-slate-200',
    nameFa: 'طوسی',
    nameEn: 'Slate',
    dot: 'bg-slate-400',
  },
};

export const DeviceNotesModal: React.FC<DeviceNotesModalProps> = ({
  isOpen,
  device,
  onClose,
  onMinimize,
  isLightMode = false,
  onNavigateToMap,
}) => {
  const { isRtl, isEn } = useLanguage();
  const [notes, setNotes] = useState<DeviceNoteData[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState<StickyNoteColor>('yellow');
  const [selectedMapId, setSelectedMapId] = useState<string>('');

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState<StickyNoteColor>('yellow');

  // Load notes for device
  const refreshNotes = () => {
    if (!device) {
      setNotes([]);
      return;
    }
    const currentNotes = getNotesForDevice(device.id);
    setNotes(currentNotes);
  };

  useEffect(() => {
    if (isOpen && device) {
      refreshNotes();
      const maps = getCustomMaps();
      setSelectedMapId(maps[0]?.id || 'default');
      setIsCreating(false);
      setEditingNoteId(null);
    }
  }, [isOpen, device]);

  // Listen to external sticky note updates
  useEffect(() => {
    const handleStickyUpdate = () => {
      if (device) refreshNotes();
    };
    window.addEventListener('nettopology_sticky_notes_updated', handleStickyUpdate);
    return () => {
      window.removeEventListener('nettopology_sticky_notes_updated', handleStickyUpdate);
    };
  }, [device]);

  if (!isOpen || !device) return null;

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    addNoteToDevice(device.id, {
      title: newTitle.trim(),
      content: newContent.trim(),
      color: newColor,
      targetMapId: selectedMapId,
    });

    setNewTitle('');
    setNewContent('');
    setNewColor('yellow');
    setIsCreating(false);
    refreshNotes();
  };

  const handleStartEdit = (note: DeviceNoteData) => {
    setEditingNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditColor(note.color);
  };

  const handleSaveEdit = (note: DeviceNoteData) => {
    if (!editContent.trim()) return;
    updateNoteForDevice(note.id, note.mapId, {
      title: editTitle.trim(),
      content: editContent.trim(),
      color: editColor,
    });
    setEditingNoteId(null);
    refreshNotes();
  };

  const handleDelete = (note: DeviceNoteData) => {
    deleteNoteForDevice(note.id, note.mapId);
    refreshNotes();
  };

  const maps = getCustomMaps();

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <div
        className={`w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden transition-all ${
          isLightMode
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${
            isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-xs shrink-0">
              <StickyNote className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white truncate">
                  {isEn ? `Sticky Notes — ${device.name}` : `یادداشت‌های استیکی — ${device.name}`}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {device.ip}
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {notes.length} {isEn ? (notes.length === 1 ? 'Note' : 'Notes') : 'یادداشت'}
                </span>
              </div>
              <p className={`text-xs truncate mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn
                  ? 'Synchronized with Schematic Topology Map sticky notes and canvas links.'
                  : 'همگام‌سازی مستقیم با یادداشت‌های استیکی نقشه شماتیک و اتصالات بوم.'}
              </p>
            </div>
          </div>

          <ModalHeaderControls
            onMinimize={onMinimize}
            onClose={onClose}
            isLightMode={isLightMode}
            isEn={isEn}
            minimizeTooltip={isEn ? 'Minimize to bottom dock' : 'مینیمایز به نوار ابزار پایین'}
            closeTooltip={isEn ? 'Close' : 'بستن'}
          />
        </div>

        {/* Action bar to add new note */}
        <div
          className={`px-5 py-3 border-b flex items-center justify-between gap-3 shrink-0 ${
            isLightMode ? 'bg-slate-100/70 border-slate-200' : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="text-xs font-medium text-slate-400">
            {notes.length > 0
              ? isEn
                ? 'These notes will appear attached to this device when placed on the topology map.'
                : 'این یادداشت‌ها هنگام قرارگیری تجهیز بر روی نقشه توپولوژی، متصل به آن نمایش داده می‌شوند.'
              : isEn
              ? 'No sticky notes created for this device yet.'
              : 'هنوز یادداشتی برای این تجهیز ثبت نشده است.'}
          </div>

          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md transition active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isEn ? 'Add Device Note' : 'افزودن یادداشت جدید'}</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Create Note Inline Form */}
          {isCreating && (
            <form
              onSubmit={handleCreateNote}
              className={`p-4 rounded-2xl border shadow-lg space-y-3 transition-all animate-fadeIn ${
                isLightMode
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-amber-950/20 border-amber-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <h4 className="text-xs font-bold text-amber-300">
                    {isEn ? 'New Sticky Note for Device' : 'ثبت یادداشت استیکی جدید برای تجهیز'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Target Map Selection */}
              {maps.length > 1 && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    {isEn ? 'Attach to Topology Map:' : 'اتصال به نقشه توپولوژی:'}
                  </label>
                  <select
                    value={selectedMapId}
                    onChange={(e) => setSelectedMapId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {maps.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || (m.id === 'default' ? 'Default Topology' : m.id)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <input
                  type="text"
                  placeholder={isEn ? 'Note Title (Optional)...' : 'عنوان یادداشت (اختیاری)...'}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Content */}
              <div>
                <textarea
                  rows={3}
                  required
                  placeholder={
                    isEn
                      ? 'Write deployment instructions, VLAN notes, maintenance logs, or hardware specs...'
                      : 'دستورالعمل‌های استقرار، یادداشت‌های ویلن، لاگ نگهداری یا نکات سخت‌افزاری را بنویسید...'
                  }
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-y"
                />
              </div>

              {/* Color Picker & Submit */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium mr-1">
                    {isEn ? 'Color:' : 'رنگ:'}
                  </span>
                  {(['yellow', 'cyan', 'emerald', 'amber', 'rose', 'purple', 'slate'] as StickyNoteColor[]).map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        className={`w-6 h-6 rounded-full ${COLOR_PALETTES[c].dot} transition-all cursor-pointer flex items-center justify-center ${
                          newColor === c
                            ? 'ring-2 ring-white scale-110 shadow-md'
                            : 'opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                        title={isEn ? COLOR_PALETTES[c].nameEn : COLOR_PALETTES[c].nameFa}
                      >
                        {newColor === c && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                      </button>
                    )
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition cursor-pointer"
                  >
                    {isEn ? 'Cancel' : 'انصراف'}
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Save Note' : 'ذخیره یادداشت'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Notes List */}
          {notes.length === 0 && !isCreating ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <StickyNote className="w-8 h-8 opacity-80" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                {isEn ? 'No Sticky Notes for this Device' : 'هیچ یادداشتی برای این تجهیز ثبت نشده است'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mb-4 leading-relaxed">
                {isEn
                  ? 'Add notes containing port mappings, configuration tips, or maintenance warnings. When this device is added to the topology map, these notes will automatically appear linked to it.'
                  : 'می‌توانید نکاتی شامل دیاگرام پورت‌ها، هشدارها یا راهنمای کانفیگ اضافه کنید. هر زمان که این تجهیز به نقشه توپولوژی اضافه شود، این یادداشت‌ها خودبه‌خود متصل به آن نمایش می‌یابند.'}
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isEn ? 'Add First Sticky Note' : 'افزودن اولین یادداشت استیکی'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => {
                const palette = COLOR_PALETTES[note.color] || COLOR_PALETTES.yellow;
                const isEditing = editingNoteId === note.id;

                if (isEditing) {
                  return (
                    <div
                      key={note.id}
                      className={`p-4 rounded-2xl border shadow-lg space-y-3 ${
                        isLightMode
                          ? 'bg-slate-50 border-slate-300'
                          : 'bg-slate-950 border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400">
                          {isEn ? 'Edit Sticky Note' : 'ویرایش یادداشت استیکی'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder={isEn ? 'Note Title (Optional)...' : 'عنوان یادداشت (اختیاری)...'}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-slate-100 focus:outline-none focus:border-indigo-400"
                      />

                      <textarea
                        rows={3}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-slate-100 focus:outline-none focus:border-indigo-400 resize-y"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-1.5">
                          {(['yellow', 'cyan', 'emerald', 'amber', 'rose', 'purple', 'slate'] as StickyNoteColor[]).map(
                            (c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setEditColor(c)}
                                className={`w-5 h-5 rounded-full ${COLOR_PALETTES[c].dot} transition-all cursor-pointer flex items-center justify-center ${
                                  editColor === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                                }`}
                              >
                                {editColor === c && <Check className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />}
                              </button>
                            )
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingNoteId(null)}
                            className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs cursor-pointer"
                          >
                            {isEn ? 'Cancel' : 'انصراف'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(note)}
                            className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm cursor-pointer"
                          >
                            {isEn ? 'Save Changes' : 'ذخیره تغییرات'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={note.id}
                    className={`p-4 rounded-2xl border transition-all ${palette.bg} ${palette.border} relative group shadow-sm hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {note.title ? (
                          <h4 className="text-sm font-bold text-white tracking-wide">
                            {note.title}
                          </h4>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 italic">
                            {isEn ? 'Untitled Note' : 'یادداشت بدون عنوان'}
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${palette.badge} ${palette.badgeText}`}
                        >
                          {isEn ? palette.nameEn : palette.nameFa}
                        </span>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-cyan-400" />
                          <span>{note.mapName}</span>
                        </span>
                      </div>

                      {/* Note Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEdit(note)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
                          title={isEn ? 'Edit note' : 'ویرایش یادداشت'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(note)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 transition cursor-pointer"
                          title={isEn ? 'Delete note' : 'حذف یادداشت'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="mt-2.5 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </div>

                    {/* Footer Info */}
                    <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>
                          {new Date(note.updatedAt).toLocaleDateString(isEn ? 'en-US' : 'fa-IR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>

                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>{isEn ? 'Linked to Device' : 'متصل به تجهیز'}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between shrink-0 ${
            isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}
        >
          <span className="text-[11px] text-slate-400">
            {isEn
              ? 'Changes are automatically saved and immediately available on the topology canvas.'
              : 'تغییرات به صورت آنی ذخیره شده و روی نقشه توپولوژی در دسترس هستند.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer"
          >
            {isEn ? 'Close' : 'بستن'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
