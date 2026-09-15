# Modal Development Guidelines & Universal Minimization Pattern
# دستورالعمل و استانداردهای طراحی مودال و قابلیت مینیمایز سراسری

> **مخاطب**: تمامی توسعه‌دهندگان، معماران سیستم و هوش مصنوعی‌های فعال در پروژه NetTopology.
> **هدف**: تضمین یکپارچگی، عدم تداخل پنجره‌ها، پشتیبانی همیشگی از مینیمایز شدن به نوار داک (Dock)، دسته‌بندی تب‌ها در صورت تراکم پنجره‌ها، و پشتیبانی ۱۰۰٪ دو زبانه (فارسی و انگلیسی).

---

## ۱. معماری کلی سیستم مودال‌ها (Architecture Overview)

در این پروژه، مودال‌ها به دو دسته کلی تقسیم می‌شوند:
1. **مودال‌های ابزاری (Network Tools Suite)**: مانند IP Subnetting, Password Generator, Port Scanner, Host Checker و...
2. **مودال‌های عملیاتی و سیستمی (Standard/System Modals)**: مانند Add Device, Edit Device, Port Inspector, Terminal Workspace, Apply Template, Release Notes و هر مودال جدیدی که در آینده اضافه می‌شود.

هر دو گروه به صورت متحد در **نوار ابزار هوشمند پایین صفحه (`ToolsDock.tsx`)** قرار می‌گیرند و ویژگی‌های زیر را دارند:
- تب‌ها به صورت افقی کنار هم چیده می‌شوند و هرگز روی هم نمی‌افتند.
- امکان بستن یا بازگرداندن پنجره از روی نوار داک وجود دارد.
- در صورتی که تعداد تب‌ها افزایش یابد یا عرض صفحه پر شود، دکمه دسته‌بندی هوشمند (Categorized Dropdown Pill) فعال می‌شود تا کاربر بتواند تب‌ها را بر اساس نوع (`tools`, `device`, `terminal`, `system`, `config`) فیلتر کند یا همه را یکجا ببندد یا بازیابی نماید.

---

## ۲. قوانین ساخت یک مودال جدید (Step-by-Step Implementation Rules)

هنگام طراحی یا ایجاد هر مودال جدید در سیستم، مراحل زیر را **دقیقاً** رعایت کنید:

### مرحله ۱: تعریف اینترفیس Props مودال
کامپوننت مودال شما باید حتماً پراپ‌های `onMinimize` و `onClose` و وضعیت دوزبانه یا تم را بپذیرد:

```typescript
export interface MyNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void; // حتماً اختیاری برای پشتیبانی از داک
  isLightMode?: boolean;
  // سایر پراپ‌های داده‌ای
}
```

### مرحله ۲: قراردادن دکمه مینیمایز در هدر مودال
در هدر مودال، از کامپوننت آماده `ModalHeaderControls` یا ساختار هدر استاندارد استفاده کنید:

```tsx
import { ModalHeaderControls } from './common/ModalHeaderControls';
// یا با دکمه مستقیم:
import { X, Minus } from 'lucide-react';

<div className="flex items-center gap-1.5">
  {onMinimize && (
    <button
      type="button"
      onClick={onMinimize}
      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 transition cursor-pointer"
      title={isEn ? 'Minimize to bottom dock' : 'مینیمایز به نوار پایین'}
      aria-label={isEn ? 'Minimize' : 'مینیمایز'}
    >
      <Minus className="w-4 h-4" />
    </button>
  )}
  <button
    type="button"
    onClick={onClose}
    className="p-1.5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
    aria-label="Close"
  >
    <X className="w-4 h-4" />
  </button>
</div>
```

### مرحله ۳: ثبت آیدی و متادیتا در `ToolsDock.tsx`
در فایل `/src/components/tools/ToolsDock.tsx`:
1. شناسه مودال را به تایپ `StandardModalId` اضافه کنید:
   ```typescript
   export type StandardModalId =
     | 'add_device'
     | 'edit_device'
     | 'my_new_modal'; // آیدی جدید شما
   ```
2. آیکون مربوطه را در آبجکت `STANDARD_MODAL_ICONS` ثبت کنید.

### مرحله ۴: اتصال در `App.tsx`
در فایل ریشه `/src/App.tsx`:
1. شرایط نمایش را با بررسی وضعیت مینیمایز تنظیم کنید:
   ```tsx
   <MyNewModal
     isOpen={isMyNewModalOpen && !isModalMinimized('my_new_modal')}
     onClose={() => handleCloseStandardModal('my_new_modal')}
     onMinimize={() =>
       handleMinimizeStandardModal({
         id: 'my_new_modal',
         labelEn: 'My New Modal',
         labelFa: 'عنوان فارسی مودال',
         badge: 'Info',
         category: 'system', // یکی از دسته‌های: 'tools' | 'device' | 'terminal' | 'system' | 'config'
       })
     }
   />
   ```
2. در تابع `handleRestoreStandardModal` و `handleCloseStandardModal` متغیرهای استیت مربوطه را مدیریت کنید.

---

## ۳. چک‌لیست اعتبارسنجی کیفی (Quality Checklist)
- [ ] دکمه خط فاصله / تفریق (`Minus` از `lucide-react`) کنار دکمه بستن (`X`) قرار گرفته است.
- [ ] با کلیک روی مینیمایز، پنجره بسته شده و تب آن در داک پایین صفحه ظاهر می‌شود.
- [ ] کلیک روی تب در داک، مودال را مجدداً با حفظ تمامی ورودی‌ها و فرم‌ها باز می‌کند.
- [ ] دکمه بستن در تب داک، پنجره را به صورت کامل می‌بندد.
- [ ] هیچ متن فارسی هاردکدشده‌ای در حالت انگلیسی نمایش داده نمی‌شود (`isEn` رعایت شده است).
