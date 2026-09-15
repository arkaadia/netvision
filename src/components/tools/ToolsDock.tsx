import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ActiveToolState, NetworkToolId } from './types';
import {
  Calculator,
  KeyRound,
  SearchCode,
  Globe2,
  Route,
  ShieldCheck,
  FileCode2,
  BatteryCharging,
  Radar,
  Maximize2,
  X,
  Layers,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Folder,
  FolderDown,
  FolderUp,
  Terminal,
  Server,
  FileSpreadsheet,
  History,
  Activity,
  Sliders,
  AlertCircle,
} from 'lucide-react';

export type StandardModalId =
  | 'add_device'
  | 'edit_device'
  | 'port_inspector'
  | 'terminal'
  | 'apply_template'
  | 'release_notes';

export interface MinimizedStandardModal {
  id: StandardModalId;
  labelEn: string;
  labelFa: string;
  badge?: string;
  category: 'system' | 'device' | 'terminal' | 'config';
}

export type DockCategoryId = 'all' | 'tools' | 'device' | 'terminal' | 'system' | 'config';

export interface ToolsDockProps {
  activeTools: ActiveToolState[];
  onRestoreTool: (id: NetworkToolId) => void;
  onCloseTool: (id: NetworkToolId) => void;
  // Standard modals minimized items
  minimizedModals?: MinimizedStandardModal[];
  onRestoreModal?: (id: StandardModalId) => void;
  onCloseModal?: (id: StandardModalId) => void;
  // Bulk operations
  onRestoreAll?: () => void;
  onCloseAll?: () => void;
  // Attention highlight target
  attentionModalId?: string | null;
  onClearAttention?: () => void;
  isEn: boolean;
  isLightMode: boolean;
  isRtl: boolean;
}

const TOOL_ICONS: Record<NetworkToolId, React.ComponentType<{ className?: string }>> = {
  ip_subnetting: Calculator,
  password_gen: KeyRound,
  port_scanner: SearchCode,
  net_utils: Globe2,
  trace_tools: Route,
  cert_lookup: ShieldCheck,
  header_analyzer: FileCode2,
  ups_calculator: BatteryCharging,
  host_checker: Radar,
};

const STANDARD_MODAL_ICONS: Record<StandardModalId, React.ComponentType<{ className?: string }>> = {
  add_device: PlusCircle,
  edit_device: Sliders,
  port_inspector: Server,
  terminal: Terminal,
  apply_template: FileSpreadsheet,
  release_notes: History,
};

export interface UnifiedDockItem {
  key: string;
  type: 'tool' | 'modal';
  id: string;
  labelEn: string;
  labelFa: string;
  badge?: string;
  category: DockCategoryId;
  icon: React.ComponentType<{ className?: string }>;
  onRestore: () => void;
  onClose: () => void;
}

export const ToolsDock: React.FC<ToolsDockProps> = ({
  activeTools,
  onRestoreTool,
  onCloseTool,
  minimizedModals = [],
  onRestoreModal,
  onCloseModal,
  onRestoreAll,
  onCloseAll,
  attentionModalId,
  onClearAttention,
  isEn,
  isLightMode,
  isRtl,
}) => {
  const [activeCategory, setActiveCategory] = useState<DockCategoryId>('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsedIntoCategory, setIsCollapsedIntoCategory] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dockRootRef = useRef<HTMLDivElement>(null);

  // Compile all minimized items into a single unified list
  const allMinimizedItems: UnifiedDockItem[] = useMemo(() => {
    const items: UnifiedDockItem[] = [];

    // Minimized Network Tools
    const minimizedTools = activeTools.filter((t) => t.isMinimized);
    minimizedTools.forEach((tool) => {
      items.push({
        key: `tool_${tool.id}`,
        type: 'tool',
        id: tool.id,
        labelEn: tool.labelEn,
        labelFa: tool.labelFa,
        badge: tool.badge,
        category: 'tools',
        icon: TOOL_ICONS[tool.id] || Calculator,
        onRestore: () => onRestoreTool(tool.id),
        onClose: () => onCloseTool(tool.id),
      });
    });

    // Minimized Standard Modals
    minimizedModals.forEach((mod) => {
      items.push({
        key: `modal_${mod.id}`,
        type: 'modal',
        id: mod.id,
        labelEn: mod.labelEn,
        labelFa: mod.labelFa,
        badge: mod.badge,
        category: mod.category,
        icon: STANDARD_MODAL_ICONS[mod.id] || Activity,
        onRestore: () => onRestoreModal?.(mod.id),
        onClose: () => onCloseModal?.(mod.id),
      });
    });

    return items;
  }, [activeTools, minimizedModals, onRestoreTool, onCloseTool, onRestoreModal, onCloseModal]);

  // Bugfix (Issue 3): When all items are closed, or activeCategory has 0 items, auto-reset to 'all'
  useEffect(() => {
    if (allMinimizedItems.length === 0) {
      setActiveCategory('all');
      setIsCollapsedIntoCategory(false);
      setIsMenuOpen(false);
      return;
    }

    if (activeCategory !== 'all') {
      const matchCount = allMinimizedItems.filter((i) => i.category === activeCategory).length;
      if (matchCount === 0) {
        setActiveCategory('all');
      }
    }
  }, [allMinimizedItems, activeCategory]);

  // If an attention target is active and filtered out, reveal it
  useEffect(() => {
    if (attentionModalId) {
      const targetItem = allMinimizedItems.find((i) => i.id === attentionModalId);
      if (targetItem && activeCategory !== 'all' && targetItem.category !== activeCategory) {
        setActiveCategory('all');
      }
    }
  }, [attentionModalId, allMinimizedItems, activeCategory]);

  // Categories metadata
  const categories: { id: DockCategoryId; labelEn: string; labelFa: string; count: number }[] = useMemo(() => {
    const counts: Record<DockCategoryId, number> = {
      all: allMinimizedItems.length,
      tools: allMinimizedItems.filter((i) => i.category === 'tools').length,
      device: allMinimizedItems.filter((i) => i.category === 'device').length,
      terminal: allMinimizedItems.filter((i) => i.category === 'terminal').length,
      system: allMinimizedItems.filter((i) => i.category === 'system').length,
      config: allMinimizedItems.filter((i) => i.category === 'config').length,
    };

    return [
      { id: 'all', labelEn: 'All', labelFa: 'همه', count: counts.all },
      { id: 'tools', labelEn: 'Network Tools', labelFa: 'ابزارهای شبکه', count: counts.tools },
      { id: 'device', labelEn: 'Devices & Ports', labelFa: 'تجهیزات و پورت‌ها', count: counts.device },
      { id: 'terminal', labelEn: 'Terminals', labelFa: 'ترمینال‌ها', count: counts.terminal },
      { id: 'config', labelEn: 'Templates', labelFa: 'تمپلت‌ها', count: counts.config },
      { id: 'system', labelEn: 'System', labelFa: 'سیستم', count: counts.system },
    ].filter((cat) => cat.id === 'all' || cat.count > 0);
  }, [allMinimizedItems]);

  // Filter items based on active category
  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return allMinimizedItems;
    return allMinimizedItems.filter((i) => i.category === activeCategory);
  }, [allMinimizedItems, activeCategory]);

  // Check scroll position and boundaries (Issue 2)
  const updateScrollState = useCallback(() => {
    const el = containerRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    // Account for potential rounding differences
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      ro.disconnect();
    };
  }, [filteredItems, updateScrollState, isCollapsedIntoCategory]);

  // Scroll tabs left or right
  const handleScroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    const distance = 240;
    containerRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  // Close All handler (Issue 3)
  const handleCloseAll = () => {
    if (onCloseAll) {
      onCloseAll();
    } else {
      allMinimizedItems.forEach((it) => it.onClose());
    }
    setActiveCategory('all');
    setIsCollapsedIntoCategory(false);
    setIsMenuOpen(false);
  };

  // Restore All handler
  const handleRestoreAll = () => {
    if (onRestoreAll) {
      onRestoreAll();
    } else {
      allMinimizedItems.forEach((it) => it.onRestore());
    }
    setIsMenuOpen(false);
  };

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dockRootRef.current && !dockRootRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  if (allMinimizedItems.length === 0) return null;

  const showCategoryPill = isCollapsedIntoCategory || allMinimizedItems.length >= 3 || categories.length > 2;
  const isAttentionTarget = (itemId: string) => attentionModalId === itemId;
  const hasAttentionInAny = !!attentionModalId;

  return (
    <div
      ref={dockRootRef}
      id="global-minimized-modals-dock"
      className={`fixed bottom-9 sm:bottom-10 ${
        isRtl ? 'right-4' : 'left-4'
      } z-[1200] flex items-center gap-1.5 sm:gap-2 select-none max-w-[calc(100vw-24px)] sm:max-w-[calc(100vw-36px)] md:max-w-[calc(100vw-48px)] transition-all duration-300`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Category Filter / Minimization Dropdown Pill */}
      {showCategoryPill && (
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border shadow-lg font-mono text-xs font-semibold backdrop-blur-xl transition-all cursor-pointer ${
              hasAttentionInAny && isCollapsedIntoCategory
                ? 'bg-amber-500 text-slate-950 border-amber-300 animate-bounce ring-4 ring-amber-400/80 shadow-[0_4px_25px_rgba(245,158,11,0.8)] scale-105'
                : isCollapsedIntoCategory
                ? isLightMode
                  ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700 shadow-emerald-200'
                  : 'bg-emerald-600 text-white border-emerald-400 hover:bg-emerald-500 shadow-[0_4px_20px_rgba(16,185,129,0.5)]'
                : isLightMode
                ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700 shadow-indigo-200'
                : 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-500 shadow-[0_4px_20px_rgba(79,70,229,0.5)]'
            }`}
            title={
              hasAttentionInAny && isCollapsedIntoCategory
                ? (isEn ? 'Action required: An open modal is inside this category' : 'نیاز به اقدام: پنجره باز در این دسته‌بندی قرار دارد')
                : isCollapsedIntoCategory
                ? (isEn ? 'All Modals are collapsed here (Click to open menu / expand)' : 'تمامی پنجره‌ها در اینجا جمع شده‌اند (کلیک جهت بازگشایی)')
                : (isEn ? 'Filter Minimized Modals by Category' : 'دسته‌بندی و فیلتر تب‌های مینیمایز شده')
            }
          >
            {hasAttentionInAny && isCollapsedIntoCategory ? (
              <AlertCircle className="w-3.5 h-3.5 text-slate-950 animate-spin" />
            ) : isCollapsedIntoCategory ? (
              <FolderDown className="w-3.5 h-3.5 text-emerald-100" />
            ) : (
              <Layers className="w-3.5 h-3.5" />
            )}

            <span className="hidden xs:inline">
              {isCollapsedIntoCategory
                ? (isEn ? 'Minimized' : 'پنجره‌های باز')
                : (isEn
                    ? categories.find((c) => c.id === activeCategory)?.labelEn || 'Categories'
                    : categories.find((c) => c.id === activeCategory)?.labelFa || 'دسته‌بندی‌ها')}
            </span>

            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              hasAttentionInAny && isCollapsedIntoCategory
                ? 'bg-slate-950 text-amber-300'
                : 'bg-white/20 text-white'
            }`}>
              {allMinimizedItems.length}
            </span>

            {isMenuOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>

          {/* Categorized Dropdown Popover (Features Issue 4 Collapse & Restore) */}
          {isMenuOpen && (
            <div
              className={`absolute bottom-full mb-2 ${
                isRtl ? 'right-0' : 'left-0'
              } w-72 sm:w-80 p-2.5 rounded-2xl border shadow-2xl backdrop-blur-2xl z-[1300] animate-in fade-in zoom-in-95 ${
                isLightMode
                  ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300'
                  : 'bg-slate-900/95 border-slate-700 text-slate-200 shadow-black'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-700/40 text-[11px] font-bold">
                <span className="flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  {isEn ? 'Modal Workspace & Categories' : 'دسته‌بندی پنجره‌های باز'}
                </span>
                <span className="font-mono text-slate-400">
                  {allMinimizedItems.length} {isEn ? 'Active' : 'پنجره'}
                </span>
              </div>

              {/* Action 4: Collapse All Into Category Toggle Button */}
              <div className="pt-2 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsCollapsedIntoCategory(!isCollapsedIntoCategory);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isCollapsedIntoCategory
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/30'
                      : isLightMode
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                      : 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/30'
                  }`}
                  title={
                    isCollapsedIntoCategory
                      ? (isEn ? 'Expand all minimized tabs back to the dock' : 'نمایش مجدد تب‌ها در نوار پایین')
                      : (isEn ? 'Hide all tabs into this category indicator' : 'مخفی و جمع کردن تب‌ها در این نشانگر')
                  }
                >
                  <span className="flex items-center gap-1.5">
                    {isCollapsedIntoCategory ? (
                      <FolderUp className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <FolderDown className="w-4 h-4 text-indigo-400" />
                    )}
                    <span>
                      {isCollapsedIntoCategory
                        ? (isEn ? 'Expand All to Dock' : 'نمایش همه در نوار پایین')
                        : (isEn ? 'Collapse All to Category' : 'جمع کردن همه در دسته‌بندی')}
                    </span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-indigo-500/30">
                    {allMinimizedItems.length}
                  </span>
                </button>
              </div>

              {/* Category Filters */}
              <div className="py-1 space-y-1">
                <div className="text-[10px] font-semibold text-slate-400 px-2 pt-1 uppercase tracking-wider">
                  {isEn ? 'Filter by Category' : 'فیلتر بر اساس دسته'}
                </div>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat.id);
                      if (isCollapsedIntoCategory) {
                        setIsCollapsedIntoCategory(false);
                      }
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      activeCategory === cat.id && !isCollapsedIntoCategory
                        ? isLightMode
                          ? 'bg-indigo-50 text-indigo-700 font-bold'
                          : 'bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/40'
                        : isLightMode
                        ? 'hover:bg-slate-100 text-slate-700'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span>{isEn ? cat.labelEn : cat.labelFa}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                        activeCategory === cat.id
                          ? 'bg-indigo-500 text-white'
                          : isLightMode
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* If Collapsed, show quick item list to restore directly */}
              {isCollapsedIntoCategory && (
                <div className="pt-2 border-t border-slate-700/40 max-h-40 overflow-y-auto space-y-1">
                  <div className="text-[10px] font-semibold text-slate-400 px-2 uppercase tracking-wider">
                    {isEn ? 'Quick Restore Modal' : 'بازیابی سریع پنجره‌ها'}
                  </div>
                  {allMinimizedItems.map((item) => {
                    const ItemIcon = item.icon;
                    const isAtt = isAttentionTarget(item.id);
                    return (
                      <div
                        key={item.key}
                        className={`flex items-center justify-between p-1.5 rounded-lg transition text-xs ${
                          isAtt
                            ? 'bg-amber-500/20 border border-amber-500/60 text-amber-300 animate-pulse'
                            : isLightMode
                            ? 'hover:bg-slate-100 text-slate-800'
                            : 'hover:bg-slate-800/80 text-slate-200'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            item.onRestore();
                            onClearAttention?.();
                            setIsMenuOpen(false);
                          }}
                          className="flex items-center gap-1.5 flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <ItemIcon className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                          <span className="truncate font-mono text-[11px]">
                            {isEn ? item.labelEn : item.labelFa}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => item.onClose()}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded cursor-pointer"
                          title={isEn ? 'Close' : 'بستن'}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bulk Actions: Restore All & Close All */}
              <div className="mt-2 pt-2 border-t border-slate-700/40 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleRestoreAll}
                  className={`text-[11px] font-semibold px-2 py-1 rounded transition cursor-pointer ${
                    isLightMode
                      ? 'text-indigo-600 hover:bg-indigo-50'
                      : 'text-indigo-400 hover:bg-indigo-950/50'
                  }`}
                >
                  {isEn ? 'Restore All' : 'بازیابی همه'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseAll}
                  className="text-[11px] font-semibold px-2 py-1 rounded text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                >
                  {isEn ? 'Close All' : 'بستن همه'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Tabs Container: Hidden if collapsed into category (Issue 4) */}
      {!isCollapsedIntoCategory && (
        <div className="flex-1 min-w-0 flex items-center gap-1 relative overflow-hidden">
          {/* Scroll Left Arrow (Desktop/Touch overflow helper) */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className={`p-1 rounded-full border shadow-md shrink-0 backdrop-blur-md transition-all z-10 cursor-pointer ${
                isLightMode
                  ? 'bg-white/90 text-slate-700 border-slate-300 hover:bg-slate-100'
                  : 'bg-slate-800/90 text-slate-200 border-slate-600 hover:bg-slate-700'
              }`}
              title={isEn ? 'Scroll tabs left' : 'پیمایش تب‌ها به چپ'}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Scrollable Tabs Viewport (Guarantees zero overflow out of right boundary) */}
          <div
            ref={containerRef}
            className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 px-0.5 custom-scrollbar"
            style={{ scrollbarWidth: 'none' }}
            onWheel={(e) => {
              if (containerRef.current) {
                containerRef.current.scrollLeft += e.deltaY;
              }
            }}
          >
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const label = isEn ? item.labelEn : item.labelFa;
              const isAttention = isAttentionTarget(item.id);

              return (
                <div
                  key={item.key}
                  className={`group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border shadow-lg transition-all duration-200 cursor-pointer backdrop-blur-xl shrink-0 ${
                    isAttention
                      ? 'bg-amber-500/30 text-amber-200 border-amber-400 animate-bounce ring-4 ring-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.8)] scale-105 z-20'
                      : item.type === 'modal'
                      ? isLightMode
                        ? 'bg-indigo-50/95 text-slate-900 border-indigo-300 hover:border-indigo-500 shadow-indigo-100'
                        : 'bg-slate-900/95 text-slate-100 border-indigo-500/50 hover:border-indigo-400 shadow-[0_4px_20px_rgba(79,70,229,0.3)]'
                      : isLightMode
                      ? 'bg-white/95 text-slate-800 border-slate-300 hover:border-indigo-400 shadow-slate-300/60'
                      : 'bg-slate-900/95 text-slate-200 border-cyan-500/40 hover:border-cyan-400 shadow-[0_4px_20px_rgba(0,0,0,0.6)]'
                  }`}
                  onClick={() => {
                    item.onRestore();
                    if (isAttention) onClearAttention?.();
                  }}
                  title={
                    isAttention
                      ? (isEn ? 'This modal is currently open here. Click to restore.' : 'این پنجره هم‌اکنون در اینجا باز است. جهت بازگردانی کلیک کنید.')
                      : (isEn ? `Click to restore ${label}` : `کلیک برای بازگشت پنجره ${label}`)
                  }
                >
                  <div
                    className={`p-1 rounded-md shrink-0 ${
                      isAttention
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : item.type === 'modal'
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : isLightMode
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'bg-cyan-500/20 text-cyan-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  <span className="text-xs font-medium font-mono truncate max-w-[110px] sm:max-w-[150px] md:max-w-[180px]">
                    {label}
                  </span>

                  {item.badge && (
                    <span
                      className={`text-[9px] font-mono px-1 py-0.5 rounded border shrink-0 hidden sm:inline-block ${
                        isAttention
                          ? 'bg-amber-400/30 text-amber-200 border-amber-400/50'
                          : isLightMode
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-white/10 text-cyan-300 border-white/10'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  <div className="flex items-center gap-1 border-l border-white/10 pl-1.5 ml-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        item.onRestore();
                        if (isAttention) onClearAttention?.();
                      }}
                      className={`p-1 rounded hover:scale-110 transition cursor-pointer ${
                        isLightMode
                          ? 'hover:bg-slate-100 text-slate-500'
                          : 'hover:bg-white/10 text-slate-400 hover:text-cyan-300'
                      }`}
                      title={isEn ? 'Restore' : 'بازیابی'}
                      aria-label={isEn ? 'Restore' : 'بازیابی'}
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        item.onClose();
                        if (isAttention) onClearAttention?.();
                      }}
                      className={`p-1 rounded hover:scale-110 transition cursor-pointer ${
                        isLightMode
                          ? 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                          : 'hover:bg-white/10 text-slate-400 hover:text-red-400'
                      }`}
                      title={isEn ? 'Close' : 'بستن'}
                      aria-label={isEn ? 'Close' : 'بستن'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scroll Right Arrow */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className={`p-1 rounded-full border shadow-md shrink-0 backdrop-blur-md transition-all z-10 cursor-pointer ${
                isLightMode
                  ? 'bg-white/90 text-slate-700 border-slate-300 hover:bg-slate-100'
                : 'bg-slate-800/90 text-slate-200 border-slate-600 hover:bg-slate-700'
              }`}
              title={isEn ? 'Scroll tabs right' : 'پیمایش تب‌ها به راست'}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
