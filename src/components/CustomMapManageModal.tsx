import React, { useState, useEffect } from 'react';
import {
  X,
  Minus,
  Plus,
  Edit2,
  Trash2,
  Check,
  Globe,
  Lock,
  Users,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import { CustomTopologyMap, MapVisibility } from '../types';
import { useLanguage } from '../i18n';

interface CustomMapManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'delete';
  currentMap?: CustomTopologyMap | null;
  onCreateMap: (
    name: string,
    description?: string,
    visibility?: MapVisibility,
    allowedUsers?: string[]
  ) => void;
  onUpdateMap: (
    id: string,
    name: string,
    description?: string,
    visibility?: MapVisibility,
    allowedUsers?: string[]
  ) => void;
  onDeleteMap: (id: string) => void;
  onMinimize?: () => void;
  isLightMode?: boolean;
}

export const CustomMapManageModal: React.FC<CustomMapManageModalProps> = ({
  isOpen,
  onClose,
  mode,
  currentMap,
  onCreateMap,
  onUpdateMap,
  onDeleteMap,
  onMinimize,
  isLightMode: propIsLightMode,
}) => {
  const { isEn, isRtl } = useLanguage();
  const [name, setName] = useState(currentMap?.name || '');
  const [description, setDescription] = useState(currentMap?.description || '');
  const [visibility, setVisibility] = useState<MapVisibility>(currentMap?.visibility || 'public');
  const [allowedUsers, setAllowedUsers] = useState<string[]>(currentMap?.allowedUsers || []);
  const [customUserCandidate, setCustomUserCandidate] = useState('');
  const [availableSystemUsers, setAvailableSystemUsers] = useState<string[]>([
    'admin',
    'helpdesk_user',
    'noc_operator',
  ]);

  const isLightMode = propIsLightMode ?? (typeof document !== 'undefined' && (
    document.querySelector('.theme-light') !== null ||
    localStorage.getItem('panel_theme') === 'light' ||
    localStorage.getItem('theme_mode') === 'light'
  ));

  // Load registered users from backend for quick picking in restricted mode
  useEffect(() => {
    fetch('/api/settings/users')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.users) && data.users.length > 0) {
          const names = data.users.map((u: any) => u.username).filter(Boolean);
          setAvailableSystemUsers((prev) => Array.from(new Set([...prev, ...names])));
        }
      })
      .catch(() => {});
  }, []);

  // Sync state when currentMap changes
  useEffect(() => {
    if (currentMap) {
      setName(currentMap.name || '');
      setDescription(currentMap.description || '');
      setVisibility(currentMap.visibility || 'public');
      setAllowedUsers(currentMap.allowedUsers || []);
    } else {
      setName('');
      setDescription('');
      setVisibility('public');
      setAllowedUsers([]);
    }
  }, [currentMap, mode]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    if (mode === 'create') {
      onCreateMap(trimmed, description.trim() || undefined, visibility, allowedUsers);
    } else if (mode === 'edit' && currentMap) {
      onUpdateMap(currentMap.id, trimmed, description.trim() || undefined, visibility, allowedUsers);
    }
    onClose();
  };

  const handleDeleteConfirm = () => {
    if (currentMap) {
      onDeleteMap(currentMap.id);
      onClose();
    }
  };

  const handleToggleUser = (user: string) => {
    const clean = user.trim().toLowerCase();
    if (!clean) return;
    setAllowedUsers((prev) =>
      prev.includes(clean) ? prev.filter((u) => u !== clean) : [...prev, clean]
    );
  };

  const handleAddCandidateUser = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const clean = customUserCandidate.trim().toLowerCase();
    if (clean && !allowedUsers.includes(clean)) {
      setAllowedUsers((prev) => [...prev, clean]);
      setCustomUserCandidate('');
    }
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-8 z-[100000] flex items-center justify-center p-4 modal-backdrop-blur"
      data-modal-backdrop="true"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        className={`rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 border ${
          isLightMode
            ? 'bg-white border-slate-200 text-slate-800 shadow-slate-300/60'
            : 'bg-slate-900 border-slate-750 text-slate-100 shadow-slate-950/90'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:px-6 border-b flex items-center justify-between ${
            isLightMode
              ? 'bg-slate-50 border-slate-200'
              : 'bg-slate-950/90 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                mode === 'delete'
                  ? isLightMode
                    ? 'bg-rose-50 border border-rose-200 text-rose-600'
                    : 'bg-rose-950/50 border border-rose-900 text-rose-400'
                  : isLightMode
                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-600'
                  : 'bg-indigo-950/50 border border-indigo-800 text-indigo-400'
              }`}
            >
              {mode === 'delete' ? (
                <Trash2 className="w-5 h-5" />
              ) : mode === 'edit' ? (
                <Edit2 className="w-5 h-5" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className={`text-base font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                {mode === 'create'
                  ? (isEn ? 'Create New Topology Map' : 'ایجاد نقشه توپولوژی سفارشی جدید')
                  : mode === 'edit'
                  ? (isEn ? 'Edit Topology Map & Access Rules' : 'ویرایش مشخصات و سطح دسترسی نقشه')
                  : (isEn ? 'Delete Custom Topology Map' : 'حذف نقشه سفارشی توپولوژی')}
              </h3>
              <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {mode === 'delete'
                  ? (isEn ? 'This action cannot be undone.' : 'این عملیات غیرقابل بازگشت است.')
                  : (isEn ? 'Set title, description, and visibility permissions.' : 'نام، توضیحات و مجوزهای مشاهده نقشه را تعیین کنید.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onMinimize && (
              <button
                type="button"
                onClick={onMinimize}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isLightMode
                    ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={isEn ? 'Minimize' : 'کوچک‌کردن'}
              >
                <Minus className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isLightMode
                  ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isEn ? 'Close' : 'بستن'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {mode === 'delete' ? (
          <div className={`p-6 space-y-4 text-xs ${isLightMode ? 'text-slate-600' : 'text-slate-300'}`}>
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                isLightMode
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-rose-950/40 border-rose-900/60 text-rose-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {isEn
                    ? `Are you sure you want to delete map "${currentMap?.name}"?`
                    : `آیا از حذف نقشه «${currentMap?.name}» اطمینان دارید؟`}
                </p>
                <p className="text-[11px] mt-1 opacity-90 leading-relaxed">
                  {isEn
                    ? 'All custom device positions, links, and access rules on this map will be permanently removed from the database.'
                    : 'تمام موقعیت‌ها، کابل‌کشی‌ها و قوانین دسترسی این نقشه به صورت دائمی از دیتابیس حذف خواهند شد.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-xl border transition font-medium cursor-pointer ${
                  isLightMode
                    ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'border-slate-750 bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
                }`}
              >
                {isEn ? 'Cancel' : 'انصراف'}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow-sm cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isEn ? 'Yes, Delete Map' : 'بله، نقشه حذف شود'}</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Map Title */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                {isEn ? 'Map Title / Name:' : 'عنوان یا نام نقشه:'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isEn ? 'e.g. Data Center Core Network, Branch Office WAN' : 'مثال: شبکه دیتاسنتر اصلی، توپولوژی شعب بانکی'}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium transition ${
                  isLightMode
                    ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'
                    : 'border-slate-750 bg-slate-950 text-white placeholder:text-slate-500'
                }`}
              />
            </div>

            {/* Description */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                {isEn ? 'Description / Scope (Optional):' : 'توضیحات و حوزه شبکه (اختیاری):'}
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isEn ? 'Optional details about VLAN trunking, redundant links...' : 'توضیحات اختیاری در مورد لینک‌ها، ترانک‌ها یا افزونگی...'}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none transition ${
                  isLightMode
                    ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'
                    : 'border-slate-750 bg-slate-950 text-white placeholder:text-slate-500'
                }`}
              />
            </div>

            {/* Map Visibility and Access Control */}
            <div className="pt-2">
              <label className={`block text-xs font-bold mb-2 flex items-center justify-between ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  {isEn ? 'Map Visibility & Permissions:' : 'مجوزهای مشاهده و دسترسی به نقشه:'}
                </span>
                {currentMap?.ownerName && (
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {isEn ? `Owner: ${currentMap.ownerName}` : `مالک: ${currentMap.ownerName}`}
                  </span>
                )}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Public */}
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                    visibility === 'public'
                      ? isLightMode
                        ? 'border-indigo-500 bg-indigo-50/60 text-indigo-900 shadow-sm ring-1 ring-indigo-400'
                        : 'border-indigo-500 bg-indigo-950/40 text-indigo-200 shadow-sm ring-1 ring-indigo-500'
                      : isLightMode
                      ? 'border-slate-250 bg-slate-50/70 text-slate-700 hover:border-slate-350 hover:bg-slate-100/60'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Globe className={`w-4 h-4 ${visibility === 'public' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    {visibility === 'public' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{isEn ? 'Public' : 'عمومی (پابلیک)'}</div>
                    <div className="text-[10px] opacity-75 mt-0.5 leading-tight">
                      {isEn ? 'Visible to all users' : 'قابل مشاهده برای تمام کاربران'}
                    </div>
                  </div>
                </button>

                {/* 2. Private */}
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                    visibility === 'private'
                      ? isLightMode
                        ? 'border-amber-500 bg-amber-50/60 text-amber-900 shadow-sm ring-1 ring-amber-400'
                        : 'border-amber-500 bg-amber-950/40 text-amber-200 shadow-sm ring-1 ring-amber-500'
                      : isLightMode
                      ? 'border-slate-250 bg-slate-50/70 text-slate-700 hover:border-slate-350 hover:bg-slate-100/60'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Lock className={`w-4 h-4 ${visibility === 'private' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                    {visibility === 'private' && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{isEn ? 'Private' : 'شخصی (فقط خود من)'}</div>
                    <div className="text-[10px] opacity-75 mt-0.5 leading-tight">
                      {isEn ? 'Visible only to creator' : 'تنها برای سازنده نقشه'}
                    </div>
                  </div>
                </button>

                {/* 3. Restricted / Specific Users */}
                <button
                  type="button"
                  onClick={() => setVisibility('restricted')}
                  className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                    visibility === 'restricted'
                      ? isLightMode
                        ? 'border-cyan-500 bg-cyan-50/60 text-cyan-900 shadow-sm ring-1 ring-cyan-400'
                        : 'border-cyan-500 bg-cyan-950/40 text-cyan-200 shadow-sm ring-1 ring-cyan-500'
                      : isLightMode
                      ? 'border-slate-250 bg-slate-50/70 text-slate-700 hover:border-slate-350 hover:bg-slate-100/60'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Users className={`w-4 h-4 ${visibility === 'restricted' ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                    {visibility === 'restricted' && <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{isEn ? 'Specific Users' : 'کاربران منتخب'}</div>
                    <div className="text-[10px] opacity-75 mt-0.5 leading-tight">
                      {isEn ? 'Share with chosen users' : 'اشتراک با کاربران مجاز'}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Restricted User Selection Panel */}
            {visibility === 'restricted' && (
              <div
                className={`p-3.5 rounded-xl border space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 ${
                  isLightMode
                    ? 'bg-slate-50/80 border-slate-200'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-bold flex items-center gap-1.5 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                    <UserCheck className="w-4 h-4 text-cyan-500" />
                    {isEn ? 'Authorized Users List:' : 'لیست کاربران مجاز جهت مشاهده نقشه:'}
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {allowedUsers.length} {isEn ? 'user(s) selected' : 'کاربر انتخاب شده'}
                  </span>
                </div>

                {/* Quick Add Buttons for System Users */}
                <div>
                  <div className="text-[10px] text-slate-400 mb-1.5">
                    {isEn ? 'Click to grant or revoke access:' : 'برای اعطا یا لغو دسترسی کلیک کنید:'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSystemUsers.map((u) => {
                      const isSelected = allowedUsers.includes(u.toLowerCase());
                      return (
                        <button
                          key={u}
                          type="button"
                          onClick={() => handleToggleUser(u)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? isLightMode
                                ? 'bg-cyan-600 border-cyan-600 text-white'
                                : 'bg-cyan-500 border-cyan-500 text-slate-950 font-bold'
                              : isLightMode
                              ? 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                              : 'bg-slate-900 border-slate-750 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          <span>{u}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom User Candidate Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customUserCandidate}
                    onChange={(e) => setCustomUserCandidate(e.target.value)}
                    onKeyDown={handleAddCandidateUser}
                    placeholder={isEn ? 'Type username to add...' : 'نام کاربری را تایپ کنید...'}
                    className={`flex-1 px-3 py-1.5 rounded-lg border text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none ${
                      isLightMode
                        ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'
                        : 'border-slate-750 bg-slate-900 text-white placeholder:text-slate-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddCandidateUser}
                    disabled={!customUserCandidate.trim()}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer"
                  >
                    {isEn ? 'Add' : 'افزودن'}
                  </button>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                  isLightMode
                    ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'border-slate-750 bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
                }`}
              >
                {isEn ? 'Cancel' : 'انصراف'}
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{mode === 'create' ? (isEn ? 'Create Map' : 'ایجاد نقشه') : (isEn ? 'Save Changes' : 'ذخیره تغییرات')}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
