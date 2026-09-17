import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CustomTopologyStickyNote, StickyNoteColor, Device } from '../../types';
import { Trash2, GripHorizontal, Link2, Pin, Check, X, AlertTriangle } from 'lucide-react';

interface TopologyStickyNoteProps {
  note: CustomTopologyStickyNote;
  isEn: boolean;
  availableDevices: Device[];
  onUpdate: (note: CustomTopologyStickyNote) => void;
  onDelete: (noteId: string) => void;
  onStartDrag: (e: React.MouseEvent, noteId: string) => void;
  onFocusDevice?: (deviceId: string) => void;
}

const COLOR_PALETTES: Record<StickyNoteColor, {
  bg: string;
  text: string;
  border: string;
  header: string;
  accent: string;
  shadow: string;
}> = {
  yellow: {
    bg: 'bg-[#fef08a]',
    text: 'text-amber-950',
    border: 'border-yellow-400/80',
    header: 'bg-yellow-400/30',
    accent: '#eab308',
    shadow: 'shadow-[0_8px_20px_rgba(234,179,8,0.25)]',
  },
  cyan: {
    bg: 'bg-[#a5f3fc]',
    text: 'text-cyan-950',
    border: 'border-cyan-400/80',
    header: 'bg-cyan-400/30',
    accent: '#06b6d4',
    shadow: 'shadow-[0_8px_20px_rgba(6,182,212,0.25)]',
  },
  emerald: {
    bg: 'bg-[#a7f3d0]',
    text: 'text-emerald-950',
    border: 'border-emerald-400/80',
    header: 'bg-emerald-400/30',
    accent: '#10b981',
    shadow: 'shadow-[0_8px_20px_rgba(16,185,129,0.25)]',
  },
  amber: {
    bg: 'bg-[#fed7aa]',
    text: 'text-orange-950',
    border: 'border-orange-400/80',
    header: 'bg-orange-400/30',
    accent: '#f97316',
    shadow: 'shadow-[0_8px_20px_rgba(249,115,22,0.25)]',
  },
  rose: {
    bg: 'bg-[#fecdd3]',
    text: 'text-rose-950',
    border: 'border-rose-400/80',
    header: 'bg-rose-400/30',
    accent: '#f43f5e',
    shadow: 'shadow-[0_8px_20px_rgba(244,63,94,0.25)]',
  },
  purple: {
    bg: 'bg-[#e9d5ff]',
    text: 'text-purple-950',
    border: 'border-purple-400/80',
    header: 'bg-purple-400/30',
    accent: '#a855f7',
    shadow: 'shadow-[0_8px_20px_rgba(168,85,247,0.25)]',
  },
  slate: {
    bg: 'bg-[#e2e8f0]',
    text: 'text-slate-900',
    border: 'border-slate-400/80',
    header: 'bg-slate-300/60',
    accent: '#64748b',
    shadow: 'shadow-[0_8px_20px_rgba(100,116,139,0.25)]',
  },
};

export const TopologyStickyNote: React.FC<TopologyStickyNoteProps> = ({
  note,
  isEn,
  availableDevices,
  onUpdate,
  onDelete,
  onStartDrag,
  onFocusDevice,
}) => {
  const [isLinkingOpen, setIsLinkingOpen] = useState(false);
  const [pendingReassign, setPendingReassign] = useState<{
    targetDeviceId?: string;
    targetDeviceName: string;
    currentDeviceName: string;
  } | null>(null);
  const palette = COLOR_PALETTES[note.color] || COLOR_PALETTES.yellow;

  // Local state for title and content to prevent premature server sync and overwrites during typing
  const [localTitle, setLocalTitle] = useState(note.title || '');
  const [localContent, setLocalContent] = useState(note.content || '');
  const isFocusedRef = useRef(false);
  const isDeletingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const latestValuesRef = useRef({ title: localTitle, content: localContent });
  useEffect(() => {
    latestValuesRef.current = { title: localTitle, content: localContent };
  }, [localTitle, localContent]);

  // Sync from props only when note ID changes or when not actively editing
  useEffect(() => {
    if (!isFocusedRef.current && !isDeletingRef.current) {
      setLocalTitle(note.title || '');
      setLocalContent(note.content || '');
    }
  }, [note.id, note.title, note.content]);

  // Commit changes to parent only when user finishes typing or clicks outside
  const commitChanges = useCallback(() => {
    if (isDeletingRef.current) return;
    const currentTitle = latestValuesRef.current.title;
    const currentContent = latestValuesRef.current.content;
    const prevTitle = note.title || '';
    const prevContent = note.content || '';

    if (currentTitle !== prevTitle || currentContent !== prevContent) {
      onUpdate({
        ...note,
        title: currentTitle,
        content: currentContent,
        updatedAt: new Date().toISOString(),
      });
    }
  }, [note, onUpdate]);

  // Click outside listener: commit changes whenever user clicks anywhere outside this sticky note
  useEffect(() => {
    const handleDocumentMouseDown = (e: MouseEvent) => {
      if (isDeletingRef.current) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (isFocusedRef.current) {
          isFocusedRef.current = false;
          commitChanges();
        }
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown, true);
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown, true);
    };
  }, [commitChanges]);

  const handleBlur = (e: React.FocusEvent) => {
    if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    isFocusedRef.current = false;
    commitChanges();
  };

  const linkedDevice = note.linkedDeviceId
    ? availableDevices.find((d) => d.id === note.linkedDeviceId)
    : null;

  const handleColorChange = (c: StickyNoteColor) => {
    onUpdate({
      ...note,
      title: latestValuesRef.current.title,
      content: latestValuesRef.current.content,
      color: c,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleLinkDevice = (deviceId?: string, force = false) => {
    const cleanCurrent = note.linkedDeviceId?.replace(/^hw-/, '');
    const cleanTarget = deviceId?.replace(/^hw-/, '');

    // If note is already linked to a device and user is reassigning it to another device, ask for confirmation
    if (!force && cleanCurrent && cleanTarget && cleanCurrent !== cleanTarget) {
      const currentDev = availableDevices.find(
        (d) => d.id === note.linkedDeviceId || d.id === cleanCurrent || d.id === `hw-${cleanCurrent}`
      );
      const targetDev = availableDevices.find(
        (d) => d.id === deviceId || d.id === cleanTarget || d.id === `hw-${cleanTarget}`
      );
      setPendingReassign({
        targetDeviceId: deviceId,
        targetDeviceName: targetDev?.name || targetDev?.ip || deviceId,
        currentDeviceName: currentDev?.name || currentDev?.ip || note.linkedDeviceId || '',
      });
      return;
    }

    onUpdate({
      ...note,
      title: latestValuesRef.current.title,
      content: latestValuesRef.current.content,
      linkedDeviceId: deviceId,
      updatedAt: new Date().toISOString(),
    });
    setPendingReassign(null);
    setIsLinkingOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`w-[230px] rounded-xl border-2 ${palette.border} ${palette.bg} ${palette.text} ${palette.shadow} select-none transition-all flex flex-col relative group`}
      style={{ minHeight: '150px' }}
    >
      {/* Top Push-Pin Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="w-6 h-6 rounded-full bg-red-600/90 border border-white/80 shadow-md flex items-center justify-center">
          <Pin className="w-3 h-3 text-white fill-white" />
        </div>
      </div>

      {/* Drag & Header Bar */}
      <div
        onMouseDown={(e) => onStartDrag(e, note.id)}
        className={`px-2.5 pt-2.5 pb-1.5 flex items-center justify-between border-b border-black/10 cursor-grab active:cursor-grabbing rounded-t-lg ${palette.header}`}
      >
        <div className="flex items-center gap-1">
          <GripHorizontal className="w-3.5 h-3.5 opacity-60" />
          <span className="text-[10px] font-bold font-mono tracking-wider opacity-75">
            {isEn ? 'STICKY NOTE' : 'یادداشت'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
          {/* Link to Device button */}
          <button
            type="button"
            onClick={() => {
              setIsLinkingOpen(!isLinkingOpen);
              setPendingReassign(null);
            }}
            className={`p-1 rounded hover:bg-black/10 transition ${
              note.linkedDeviceId ? 'text-blue-700 font-bold' : 'opacity-70 hover:opacity-100'
            }`}
            title={
              linkedDevice
                ? isEn
                  ? `Linked to: ${linkedDevice.name}`
                  : `متصل به دیوایس: ${linkedDevice.name}`
                : isEn
                ? 'Link to Device'
                : 'اتصال به یک دیوایس'
            }
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>

          {/* Delete Button */}
          <button
            type="button"
            id={`delete-note-btn-${note.id}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              isDeletingRef.current = true;
              isFocusedRef.current = false;
              onDelete(note.id);
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              isDeletingRef.current = true;
              isFocusedRef.current = false;
            }}
            className="p-1 rounded hover:bg-rose-500/20 text-rose-800 hover:text-rose-950 transition opacity-70 hover:opacity-100 cursor-pointer"
            title={isEn ? 'Delete Note' : 'حذف یادداشت'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Device Linking Selector Dropdown */}
      {isLinkingOpen && (
        <div
          className="p-2 bg-slate-900 border border-white/20 rounded-lg shadow-2xl text-white text-[11px] m-1 z-30 space-y-1.5 animate-scale-up"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {pendingReassign ? (
            <div className="p-2.5 bg-amber-950/90 border border-amber-500/50 rounded-lg space-y-2 text-white">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{isEn ? 'Reassign Linked Device' : 'هشدار تغییر دیوایس متصل'}</span>
              </div>
              <p className="text-[10px] leading-relaxed text-amber-100/95 font-sans">
                {isEn ? (
                  <>
                    This note is already linked to <strong className="text-white underline">{pendingReassign.currentDeviceName}</strong>. Are you sure you want to reassign this note to <strong className="text-white underline">{pendingReassign.targetDeviceName}</strong>?
                  </>
                ) : (
                  <>
                    این یادداشت هم‌اکنون به دیوایس «<strong className="text-white underline">{pendingReassign.currentDeviceName}</strong>» متصل است. آیا مطمئن هستید که می‌خواهید آن را به دیوایس «<strong className="text-white underline">{pendingReassign.targetDeviceName}</strong>» نسبت دهید؟
                  </>
                )}
              </p>
              <div className="flex items-center gap-2 pt-1 border-t border-amber-500/30">
                <button
                  type="button"
                  id={`confirm-reassign-btn-${note.id}`}
                  onClick={() => handleLinkDevice(pendingReassign.targetDeviceId, true)}
                  className="flex-1 py-1 px-2 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 shadow cursor-pointer transition active:scale-95"
                >
                  <Check className="w-3 h-3" />
                  <span>{isEn ? 'Yes, Reassign' : 'تایید و تغییر انتساب'}</span>
                </button>
                <button
                  type="button"
                  id={`cancel-reassign-btn-${note.id}`}
                  onClick={() => setPendingReassign(null)}
                  className="py-1 px-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium cursor-pointer transition"
                >
                  <span>{isEn ? 'Cancel' : 'انصراف'}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between pb-1 border-b border-white/10 font-bold">
                <span>{isEn ? 'Attach Note to Device:' : 'اتصال یادداشت به دیوایس:'}</span>
                <button
                  onClick={() => {
                    setIsLinkingOpen(false);
                    setPendingReassign(null);
                  }}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {!note.linkedDeviceId && (
                  <button
                    type="button"
                    onClick={() => handleLinkDevice(undefined)}
                    className="w-full text-left px-2 py-1 rounded text-[10px] flex items-center justify-between bg-blue-600 text-white font-bold"
                  >
                    <span>{isEn ? '— None (Float Freely) —' : '— بدون اتصال (شناور آزاد) —'}</span>
                    <Check className="w-3 h-3" />
                  </button>
                )}
                {availableDevices.map((dev) => (
                  <button
                    key={dev.id}
                    type="button"
                    onClick={() => handleLinkDevice(dev.id)}
                    className={`w-full text-left px-2 py-1 rounded text-[10px] flex items-center justify-between ${
                      note.linkedDeviceId === dev.id
                        ? 'bg-blue-600 text-white font-bold'
                        : 'hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <div className="truncate pr-1">
                      <span className="font-semibold">{dev.name}</span>{' '}
                      <span className="text-[9px] opacity-70">({dev.ip})</span>
                    </div>
                    {note.linkedDeviceId === dev.id && <Check className="w-3 h-3 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Linked Device Badge (if linked) */}
      {linkedDevice && (
        <div
          className="mx-2 mt-1.5 px-2 py-0.5 rounded-md bg-black/10 flex items-center text-[9px] font-mono border border-black/15"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onFocusDevice && onFocusDevice(linkedDevice.id)}
            className="w-full flex items-center gap-1 font-bold truncate hover:underline cursor-pointer"
            title={isEn ? 'Focus Device on Canvas' : 'مشاهده دیوایس متصل'}
          >
            <Link2 className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">{linkedDevice.name}</span>
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="p-2 flex-1 flex flex-col gap-1.5" onMouseDown={(e) => e.stopPropagation()}>
        {/* Title Input */}
        <input
          type="text"
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onFocus={() => {
            isFocusedRef.current = true;
          }}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitChanges();
            }
          }}
          placeholder={isEn ? 'Note title...' : 'عنوان یادداشت...'}
          className="w-full bg-transparent font-bold text-xs border-b border-black/15 pb-0.5 outline-none placeholder:opacity-50"
        />

        {/* Text Area */}
        <textarea
          value={localContent}
          onChange={(e) => setLocalContent(e.target.value)}
          onFocus={() => {
            isFocusedRef.current = true;
          }}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              commitChanges();
              (e.target as HTMLTextAreaElement).blur();
            }
          }}
          placeholder={
            isEn
              ? 'Write notes, IP allocations, VLANs, maintenance reminders...'
              : 'یادداشت، رنج IP، کانفیگ VLAN یا نکات نگهداری...'
          }
          rows={3}
          className="w-full flex-1 bg-transparent text-[11px] leading-relaxed resize-none outline-none placeholder:opacity-50 font-sans"
        />
      </div>

      {/* Footer with Color Palette Dots */}
      <div
        className="px-2 pb-2 pt-1 border-t border-black/10 flex items-center justify-between"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Color Switcher */}
        <div className="flex items-center gap-1">
          {(['yellow', 'cyan', 'emerald', 'amber', 'rose', 'purple', 'slate'] as StickyNoteColor[]).map(
            (c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleColorChange(c)}
                className={`w-3.5 h-3.5 rounded-full border transition ${
                  COLOR_PALETTES[c].border
                } ${COLOR_PALETTES[c].bg} ${
                  note.color === c ? 'scale-125 ring-2 ring-black/40' : 'hover:scale-110'
                }`}
                title={c}
              />
            )
          )}
        </div>

        <span className="text-[8px] font-mono opacity-50">
          {new Date(note.updatedAt || note.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
};
