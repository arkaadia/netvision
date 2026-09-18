# Modal Development Guidelines & Universal Standards
# دستورالعمل و استانداردهای جامع و اجباری طراحی مودال‌ها

> **مخاطب**: تمامی توسعه‌دهندگان، معماران سیستم و هوش مصنوعی‌های فعال در پروژه NetTopology.
> **هدف**: تضمین یکپارچگی کامل، پشتیبانی همیشگی از مینیمایز شدن به نوار داک (Dock)، پشتیبانی از فول‌اسکرین با حفظ حریم فوتر، انطباق کامل با تم‌های روشن و تیره، چندزبانگی صددرصدی و تولتیپ‌های راهنمای سه‌بخشی بدون سرریز از کادر صفحه.

---

## ۱. قوانین پنج‌گانه اجباری برای هر مودال (Mandatory Universal 5 Rules)

هر مودالی که در سیستم ساخته می‌شود باید بلااستثنا قواعد پنج‌گانه زیر را برآورده کند:

### ۱. دکمه‌های سه‌گانه کنترلی هدر (بستن، مینیمایز، تمام‌صفحه)
در بخش بالای هدر هر مودال (بخش کنترلی)، باید ۳ دکمه تعبیه شده باشد:
- **دکمه بستن (`Close` - آیکون `X` از `lucide-react`)**: جهت بستن قطعی پنجره و ریست وضعیت در صورت نیاز.
- **دکمه مینیمایز (`Minimize` - آیکون `Minus` از `lucide-react`)**: جهت کوچک‌سازی پنجره به نوار ابزار پایین (`ToolsDock`) با حفظ کامل مقادیر و وضعیت.
- **دکمه تمام‌صفحه و بازگشت (`Fullscreen / Restore` - آیکون‌های `Maximize2` و `Minimize2` از `lucide-react`)**: جهت تغییر وضعیت بین اندازه استاندارد و تمام‌صفحه (`isMaximized`).
> **توصیه معماری**: برای راحتی و استانداردسازی، از کامپوننت آماده `<ModalHeaderControls />` یا `<ModalHeader />` از مسیر `src/components/common/` استفاده کنید.

### ۲. رفتار دقیق حالت تمام‌صفحه و حفظ مرز فوتر (Footer Clearance)
هنگامی که مودال در حالت تمام‌صفحه (`isMaximized === true`) قرار می‌گیرد:
- لبه پایینی مودال باید **دقیقاً تا لبه بالایی فوتر (فاصله `bottom-8` از پایین صفحه)** امتداد یابد.
- مودال به هیچ وجه نباید زیر فوتر برود یا روی نوار داک ابزارها بیفتد و نباید از کادر دید خارج شود.
- استایل‌های پیشنهادی برای کانتینر اصلی مودال در حالت تمام‌صفحه:
  ```tsx
  // کانتینر بیرونی overlay / wrapper:
  className={`fixed z-50 transition-all duration-200 ${
    isMaximized
      ? 'top-0 left-0 right-0 bottom-8 p-0'
      : 'inset-0 p-3 sm:p-6 flex items-center justify-center bg-black/60 backdrop-blur-sm'
  }`}

  // پنجره مودال داخلی:
  className={`flex flex-col transition-all duration-200 ${
    isMaximized
      ? 'w-full h-full max-w-none max-h-full rounded-none border-none'
      : 'w-full max-w-4xl max-h-[88vh] rounded-2xl border shadow-2xl'
  }`}
  ```

### ۳. انطباق کامل با تم‌های تیره و روشن (Dark / Light Theme Adaptability)
- ظاهر مودال، هدر، بدنه، کارت‌ها، فیلدهای ورودی و فوتر آن باید با تم فعال سیستم (`isLightMode`) ۱۰۰٪ سازگار و منطبق باشد.
- **تم تیره (Dark Mode)**:
  - پس‌زمینه: `bg-slate-950` یا `bg-slate-900/95`
  - کادرها: `border-slate-800` یا `border-cyan-500/30`
  - متون: `text-slate-100`، `text-white` و عناوین `text-cyan-400`
- **تم روشن (Light Mode)**:
  - پس‌زمینه: `bg-white` یا `bg-slate-50` با تفکیک بصری عالی
  - کادرها: `border-slate-200` یا `border-slate-300`
  - متون: `text-slate-800`، `text-slate-900` با کنتراست ارگونومیک (بدون استفاده از خاکستری محو روی پس‌زمینه روشن)

### ۴. رعایت کامل زبان انتخابی پنل (Strict i18n & Zero Persian in English Mode)
- تمام عناوین، راهنماها، دکمه‌ها، برچسب فیلدها، پیام‌های اعتبارسنجی و تولتیپ‌ها باید دقیقاً متناسب با `language` / `isEn` نمایش داده شوند.
- هنگامی که زبان روی انگلیسی است (`isEn === true`)، نمایش هرگونه کاراکتر یا متن فارسی اکیداً ممنوع است.
- جهت نوشتاری (`dir="ltr"` برای انگلیسی و `dir="rtl"` برای فارسی) باید رعایت شود.

### ۵. تجهیز آیتم‌ها به راهنمای سه‌بخشی Info و جلوگیری قطعی از خروج از ۴ جهت صفحه
در کنار آیتم‌ها، فیلدها و گزینه‌های مهم مودال، باید آیکون راهنما (`<FieldInfoTooltip />`) تعبیه شود. این راهنما باید دقیقاً شامل ۳ بخش شفاف باشد:
1. **این چیست؟ (What is it?)**: تعریف ماهیت مفهوم یا پارامتر.
2. **چرا لازم است؟ (Why is it needed?)**: توضیح علت استفاده و اهمیت مهندسی آن در شبکه.
3. **مثال کاربردی (Practical Example / Recommended Value)**: ارائه نمونه مقدار یا سناریوی واقعی.

**قانون جلوگیری از خروج از کادر صفحه (4-Way Boundary Clamping)**:
- پاپ‌آپ راهنما باید با `createPortal` در `document.body` رندر شود تا در اسکرول داخلی مودال یا کانتینرهای والد بریده (clip) نشود.
- با الگوریتم سنجش هوشمند ویوپورت (Auto-Flip):
  - در صورت نبود فضای کافی در پایین، به بالای دکمه سوییچ کند.
  - از هر چهار جهت (بالا، پایین، چپ و راست) حداقل ۱۲ پیکسل فاصله ایمن با لبه مانیتور حفظ شود تا هرگز از صفحه خارج نگردد.

---

## ۲. استفاده از کامپوننت‌های آماده (Reusable Components)

برای حفظ بالاترین سرعت توسعه و یکنواختی، از کامپوننت‌های استاندارد موجود در `/src/components/common/` استفاده کنید:

### ۱. دکمه‌های کنترل هدر مودال (`ModalHeaderControls` یا `ModalHeader`):
```tsx
import { ModalHeaderControls } from '../common/ModalHeaderControls';

<ModalHeaderControls
  onClose={onClose}
  onMinimize={onMinimize}
  onMaximizeToggle={() => setIsMaximized(!isMaximized)}
  isMaximized={isMaximized}
  isLightMode={isLightMode}
  isEn={isEn}
/>
```

### ۲. پاپ‌آپ راهنمای سه‌بخشی آیتم‌ها (`FieldInfoTooltip`):
```tsx
import { FieldInfoTooltip } from '../common/FieldInfoTooltip';

<label className="flex items-center text-xs font-semibold">
  <span>{isEn ? 'Keepalive Interval' : 'فاصله ارسال Keepalive'}</span>
  <FieldInfoTooltip
    title={isEn ? 'Keepalive Interval' : 'فاصله ارسال Keepalive'}
    whatIsIt={isEn ? 'Time interval between heartbeat packets.' : 'فاصله زمانی بین ارسال بسته‌های اعلام زنده بودن اتصال.'}
    whyNeeded={isEn ? 'Detects dead peers promptly and maintains NAT state.' : 'برای تشخیص به موقع قطعی ارتباط و باز نگه‌داشتن جدول NAT روتر.'}
    example={isEn ? '10s (default for WireGuard / IPsec)' : '10s (پیش‌فرض برای وایرگارد و آی‌پی‌سک)'}
    isLightMode={isLightMode}
    isEn={isEn}
  />
</label>
```

---

## ۳. ثبت مودال در نوار ابزار پایین (`ToolsDock.tsx`) و `App.tsx`

1. **در `src/components/tools/ToolsDock.tsx`**:
   - شناسه مودال را به تایپ `StandardModalId` اضافه کنید.
   - آیکون مربوطه را در `STANDARD_MODAL_ICONS` ثبت کنید.

2. **در `src/App.tsx`**:
   - پراپ‌های `onClose`، `onMinimize` و وضعیت فعال بودن را تنظیم کنید.

---

## ۴. چک‌لیست اعتبارسنجی کیفیت مودال (Modal Quality Checklist)
- [ ] دکمه‌های بستن (`X`)، مینیمایز (`Minus`) و تمام‌صفحه (`Maximize2` / `Minimize2`) هر سه در هدر وجود دارند.
- [ ] در حالت تمام‌صفحه، لبه پایینی مودال دقیقاً مماس بر لبه بالایی فوتر (`bottom-8`) است و زیر فوتر نمی‌رود.
- [ ] رنگ‌بندی و پس‌زمینه مودال در هر دو تم تیره و روشن خوانا و ارگونومیک است.
- [ ] در حالت زبان انگلیسی، حتی یک کلمه فارسی نمایش داده نمی‌شود.
- [ ] فیلدها دارای راهنمای Info با سه بخش (چیست، چرا لازم است، مثال کاربردی) هستند.
- [ ] کادر Info در هیچ اندازه‌ای از صفحه نمایش از ۴ جهت کادر خارج نمی‌شود.

