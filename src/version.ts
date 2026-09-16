export type VersionType = 'major' | 'minor' | 'patch';

export interface ReleaseNote {
  version: string;
  releaseDate: string;
  type: VersionType;
  title: string;
  title_en?: string;
  changes: string[];
  changes_en?: string[];
}

export const APP_VERSION = '1.60.4';

export const RELEASE_HISTORY: ReleaseNote[] = [
  {
    version: '1.60.4',
    releaseDate: '2026-09-16',
    type: 'patch',
    title: 'تفکیک دقیق نمای کارت و فیزیکی در توپولوژی، تصحیح خودکار آی‌پی مدیریتی در ثبت تجهیز و ارتقای ایمنی تایپ‌ها',
    title_en: 'Card vs Physical View Separation in Topology Canvas, SSH Target IP Auto-fill, Port Deduplication & Strict Type Safety',
    changes: [
      'تفکیک صریح کنترل‌ها و دکمه‌های نوار ابزار توپولوژی؛ دکمه‌های «افزودن رک»، «افزودن دکل» و «نصب تجهیز فیزیکی» تنها در نمای فیزیکی (Physical Mode) نمایش داده می‌شوند.',
      'اصلاح مودال ثبت تجهیز در نقشه سفارشی جهت پنهان‌سازی سوییچر حالت فیزیکی در زمان انتخاب نمای کارتی.',
      'تکمیل خودکار فیلد Management IP بر اساس نتیجه تست SSH و هاست ورودی در مودال ثبت تجهیز جدید.',
      'رفع ریشه‌ای تکثیر و ۲ برابر شدن پورت‌ها در دیسکاوری تجهیزات و تلمتری اینترفیس‌ها.',
      'رفع تمامی خطاهای تایپ‌اسکریپت در کامپوننت‌های گوناگون و تضمین اجرای کاملاً سبز lint و build پروژه.',
      'پایبندی ۱۰۰٪ به قوانین محلی‌سازی و ممنوعیت متون فارسی در حالت انگلیسی پنل.'
    ],
    changes_en: [
      'Explicitly separated toolbar controls for topology canvas: "Add Rack", "Add Tower", and "Install Hardware" buttons are only visible when in Physical Mode.',
      'Updated Custom Map Add Device Modal to conditionally hide representation switcher when initialized in Card mode.',
      'Implemented auto-filling of the Management IP Address field based on SSH test probe results and target host.',
      'Resolved interface duplication bug where ports were counted twice during device discovery and telemetry fetching.',
      'Fixed all TypeScript type issues across components, ensuring 100% green compilation and lint verification.',
      'Strictly adhered to i18n localization guidelines with no Persian text appearing in English mode.'
    ]
  },
  {
    version: '1.60.3',
    releaseDate: '2026-09-16',
    type: 'patch',
    title: 'رفع باگ انتخاب خودکار تمامی پورت‌ها در ترمینال سیسکو، میکروتیک و بازرس پورت‌ها',
    title_en: 'Fix All Ports Pre-Selected Bug in Cisco/MikroTik Terminal and Port Inspector Modals',
    changes: [
      'برطرف‌سازی ریشه‌ای مشکل انتخاب و هایلایت شدن ناخواسته همه پورت‌های تجهیز هنگام باز کردن مودال ترمینال سیسکو، ترمینال میکروتیک و بازرس پورت‌ها.',
      'اصلاح منطق بررسی وضعیت انتخاب پورت (isSelected) در فیس‌پلیت پورت‌ها و جدول بازرس پورت‌ها به صورت ایمن و عدم تطابق مقادیر تعریف‌نشده (undefined).',
      'نرمال‌سازی کامل ساختار اطلاعات پورت‌ها و تضمین اختصاص شناسه یکتای port_id در بک‌اند سرور و تمامی لایه‌های فرانت‌اند (PortInspectorModal، CiscoTerminalModal، MikroTikTerminalModal، PortManagementView).',
      'ریست و خالی کردن صریح آرایه selectedPortIds و selectedPort به محض باز شدن مودال ترمینال یا تغییر دیوایس برای جلوگیری از نشت استیت قبلی.',
      'رعایت کامل استانداردهای بین‌المللی‌سازی و عدم نمایش متن فارسی در حالت انگلیسی (Strict Localization Rule).'
    ],
    changes_en: [
      'Fundamentally fixed the bug where all device ports were unexpectedly shown as selected/highlighted when opening Cisco terminal, MikroTik terminal, or Port Inspector modals.',
      'Hardened the selection check logic (isSelected) in CompactTerminalFaceplate, PortInspectorModal, PortManagementView, and MikroTik modals to prevent undefined-to-undefined accidental matches.',
      'Normalized port data structures at both the backend route layer and frontend consumers to ensure consistent presence of port_id and fallback naming.',
      'Explicitly cleared and initialized selectedPortIds and selectedPort state upon modal opening and device switching, preventing stale selection leakage.',
      'Enforced 100% strict localization compliance with complete Persian/English symmetry.'
    ]
  },
  {
    version: '1.60.2',
    releaseDate: '2026-09-16',
    type: 'patch',
    title: 'رفع مشکل صفحه مشکی در ترمینال مستقیم SSH و بازرس پورت‌ها، اعمال گارد دفاعی کامل بر روی فیلدهای پورت و افزودن ErrorBoundary سراسری',
    title_en: 'Fix Black Screen Crash on Direct SSH Console & Port Inspector, Complete Defensive Guards on Port Properties & Global React ErrorBoundary',
    changes: [
      'برطرف‌سازی ریشه‌ای خطای شکست اجرای برنامه (TypeError: Cannot read properties of undefined reading toUpperCase) که باعث مشکی شدن صفحه هنگام کلیک روی ترمینال مستقیم SSH یا بازرس پورت‌ها می‌شد.',
      'افزودن گاردها و فالبک‌های پیشگیرانه در تمامی ماژول‌های بصری پورت‌ها شامل NetworkPortSvg، CompactTerminalFaceplate، PortInspectorModal، CiscoTerminalModal، MikroTikTerminalModal، MikroTikDeviceManageModal، HardwareSvgRenderer و PortManagementView.',
      'پیاده‌سازی کامپوننت سراسری ErrorBoundary در ریشه نرم‌افزار جهت محافظت کامل در برابر خطاهای رندرینگ غیرمنتظره و جلوگیری از سفید یا مشکی شدن صفحه همراه با امکان تلاش مجدد بدون نیاز به رفرش دستی.',
      'افزودن ویژگی‌های استاندارد autoComplete به فیلدهای فرم افزودن و ویرایش تجهیزات جهت برطرف‌سازی هشدارهای کنسول مرورگر.',
      'رعایت صددرصدی استاندارد بین‌المللی‌سازی و عدم نمایش متن فارسی در حالت انگلیسی (Strict Localization Rule).'
    ],
    changes_en: [
      'Fundamentally resolved the crash defect (TypeError: Cannot read properties of undefined reading toUpperCase) that caused a black screen when launching the direct SSH console or inspecting device ports.',
      'Applied comprehensive defensive null-coalescing guards and fallbacks across all port rendering components: NetworkPortSvg, CompactTerminalFaceplate, PortInspectorModal, CiscoTerminalModal, MikroTikTerminalModal, MikroTikDeviceManageModal, HardwareSvgRenderer, and PortManagementView.',
      'Implemented an enterprise-grade React ErrorBoundary component at the application root to capture unexpected UI exceptions and prevent blank/black screens, with built-in retry and reload controls.',
      'Added standard autoComplete attributes to SSH and device credential input fields in Add and Edit device modals to eliminate browser console DOM warnings.',
      'Enforced 100% strict localization compliance with complete Persian/English symmetry and zero untranslated content in English mode.'
    ]
  },
  {
    version: '1.60.1',
    releaseDate: '2026-09-16',
    type: 'patch',
    title: 'رفع مشکل پرش و بازگشت موقعیت کارت‌ها در نمای شماتیک پس از افزودن تجهیزات از انبار به رک',
    title_en: 'Fix Device Card Position Reset & Persistence After Mounting Hardware from Inventory to Rack in Schematic View',
    changes: [
      'حل مشکل پرش و بازگشت موقعیت کارت (Card Position Reversion) هنگام جابجایی تجهیزاتی که از انبار سخت‌افزار به رک در نمای فیزیکی اضافه شده بودند.',
      'طراحی سیستم جامع تفکیک و تطبیق شناسه‌ها و نام‌های مستعار (Identifier Aliases Synchronization) شامل شناسه‌های خام اینونتوری، پیشوندهای hw-، پیشوندهای radio- و شناسه‌های تمیز در سراسر استیت‌های محلی و پایگاه داده.',
      'یکپارچه‌سازی و همگام‌سازی موقعیت‌ها در هر دو ساختار داده devicePositions و physicalPositions در زمان ذخیره سخت‌افزار، جابجایی درگ‌اند‌دراپ و ترنزیشن بین ویوها.',
      'پاکسازی دقیق و کامل شناسه‌های مستعار از استیت موقت customPositions پس از پایان درگ برای جلوگیری از تداخل موقعیت‌های موقت با دیتای ماندگار.',
      'رعایت کامل استانداردهای بین‌المللی‌سازی و عدم نمایش متن فارسی در حالت انگلیسی (Strict Localization Rule).'
    ],
    changes_en: [
      'Resolved device card position reversion defect where hardware mounted to a rack from inventory in physical view would revert to previous coordinates when moved in card view.',
      'Engineered an identifier aliases synchronization engine mapping base clean inventory IDs, hw- prefixes, radio- prefixes, and device IDs across local state and persistent storage.',
      'Synchronized coordinates across both devicePositions and physicalPositions during hardware insertion, drag-and-drop mouse up, and view transitions.',
      'Ensured complete cleanup of temporary drag coordinates across all alias keys from customPositions to prevent stale layout conflicts.',
      'Maintained 100% strict localization compliance with complete Persian/English symmetry and zero untranslated content in English mode.'
    ]
  },
  {
    version: '1.60.0',
    releaseDate: '2026-09-16',
    type: 'minor',
    title: 'پیاده‌سازی موتور واقعی ترمینال SSH پایتون با پشتیبانی از الگوریتم‌های قدیمی سیسکو، رمزنگاری اعتبارات و استریم دوطرفه سوکت',
    title_en: 'Implementation of Real Python Paramiko SSH Engine with Legacy Cisco Algorithms, Fernet Credential Encryption & WebSocket Streaming',
    changes: [
      'جایگزینی کامل داده‌های شبیه‌سازی‌شده ترمینال با موتور واقعی SSH و Telnet تحت پایتون (کتابخانه Paramiko) برای برقراری اتصال زنده به تجهیزات شبکه.',
      'طراحی و پیاده‌سازی مسیر اختصاصی وب‌سوکت (/ws/ssh/:deviceId و /ws/terminal) جهت استریم بی‌درنگ ورودی و خروجی شل تعاملی (PTY).',
      'پشتیبانی جامع از تجهیزات قدیمی سیسکو (مانند Cisco Catalyst 2960) با مکانیزم Fallback خودکار به الگوریتم‌های diffie-hellman-group1-sha1، ssh-rsa و aes128-cbc در صورت شکست اعتبارسنجی مدرن.',
      'امن‌سازی کامل اطلاعات کاربری با ماژول رمزنگاری متقارن Fernet (Cryptographic Symmetric Encryption) و ذخیره رمزنگاری‌شده گذرواژه‌ها در پایگاه داده و مهاجرت امن خودکار داده‌های پیشین.',
      'مدیریت چرخه حیات نشست‌های تعاملی شبکه، تغییر ابعاد PTY متناسب با ترمینال کاربری (Terminal Resize) و پاکسازی و آزادسازی حافظه و سوکت‌ها پس از بستن ترمینال.',
      'به‌روزرسانی اسکریپت راه‌اندازی setup-panel.sh و نصب پیش‌نیازهای python3-paramiko، python3-cryptography و python3-websockets بر روی سرور.',
      'رعایت صددرصدی استاندارد بین‌المللی‌سازی و عدم نمایش متن فارسی در حالت انگلیسی (Strict Localization Rule).'
    ],
    changes_en: [
      'Replaced mocked terminal output with a real Python SSH and Telnet engine using Paramiko for direct, live interactive connections to network hardware.',
      'Implemented dedicated full-duplex WebSocket routes (/ws/ssh/:deviceId and /ws/terminal) for real-time streaming of pseudo-terminal (PTY) standard input and output.',
      'Integrated comprehensive legacy Cisco support (e.g., Catalyst 2960) featuring automatic algorithm negotiation fallback to diffie-hellman-group1-sha1, ssh-rsa, and aes128-cbc.',
      'Secured network device credentials using Fernet symmetric encryption with automatic database migration of existing stored passwords and on-the-fly decryption at session start.',
      'Engineered interactive terminal session management with dynamic PTY window resizing, keepalive heartbeats, and guaranteed resource teardown on disconnect.',
      'Updated setup-panel.sh script with automated installation of python3-paramiko, python3-cryptography, and python3-websockets system packages.',
      'Enforced 100% strict localization compliance with complete Persian/English symmetry and zero untranslated content in English mode.'
    ]
  },
  {
    version: '1.59.1',
    releaseDate: '2026-09-15',
    type: 'patch',
    title: 'رفع مشکل پلکانی تایپ کاراکترها در ترمینال، اصلاح نمایش آدرس خالی در بنر اتصال و تفکیک دقیق نشست واقعی از شبیه‌ساز',
    title_en: 'Terminal Staircase Typing & Echo Fix, Empty IP Hostname Banner Resolution, and Accurate Real vs Simulated Session Distinction',
    changes: [
      'رفع مشکل اکوی کاراکتر به کاراکتر و شکستگی خطوط (Staircase Effect) در ترمینال سوکت با بافر کردن خطی دستورات بر روی کلید Enter و ارسال بدون اکوی مضاعف.',
      'اصلاح استخراج آدرس IP میزبان و جلوگیری از نمایش پرانتز و فیلد خالی ("Target Host: \'\'" و "Connected to ()") در بنر احراز هویت و وضعیت اتصال ترمینال.',
      'تفکیک دقیق وضعیت اتصال واقعی سخت‌افزاری از موتور شبیه‌ساز ترمینال محلی و جلوگیری از نمایش نادرست پیام اتصال زنده بر روی آی‌پی نامشخص.',
      'پشتیبانی کامل از ترنزیشن مدهای CLI سیسکو (enable، configure terminal، interface و exit) و تغییر خط اعلان (Prompt) بدون خروجی اضافی.',
      'رعایت کامل قانون عدم نمایش متن فارسی در حالت انگلیسی (Strict Localization Rule) در پیام‌های راه‌اندازی و وضعیت ترمینال.'
    ],
    changes_en: [
      'Resolved character-by-character echoing and line-breaking staircase defects in terminal WebSockets by enforcing line buffering on Enter with clean response delivery.',
      'Fixed device host resolution preventing empty parentheses or empty host strings ("Target Host: \'\'" and "Connected to ()") in the authentication banner and terminal header.',
      'Accurately differentiated between real hardware SSH sessions and the simulated local CLI engine, preventing false "Live SSH Established" alerts when no IP is reachable.',
      'Added smooth Cisco CLI mode transitions (enable, configure terminal, interface sub-modes, and exit) with synchronized prompts and clean outputs.',
      'Enforced 100% strict localization compliance: verified zero Persian text in English mode across all terminal connection headers, banners, and status messages.'
    ]
  },
  {
    version: '1.59.0',
    releaseDate: '2026-09-15',
    type: 'minor',
    title: 'ارتباط مستقیم و پایدار SSH WebSocket با مشخصات ثبت‌شده دیوایس، استعلام زنده وضعیت پورت‌ها از طریق تانل، دکمه همگام‌سازی روی فیس‌پلیت و تب اینترفیس‌ها',
    title_en: 'Persistent SSH WebSocket Tunnel with Stored Credentials, Live Tunnel Port Syncing, Interactive Faceplate Sync Trigger & Interface Tab Tunnel Queries',
    changes: [
      'برقراری اتصال مستقیم و پایدار SSH WebSocket از منوی سه نقطه تجهیزات با استفاده از اطلاعات ثبت‌شده دیوایس (IP، پورت، نام کاربری و رمز عبور) و حفظ فعال اتصال تا زمان بسته شدن کامل مودال.',
      'پیاده‌سازی سازوکار KeepAlive پینگ/پانگ (Ping/Pong) برای جلوگیری از قطع شدن زودهنگام تانل سوکت در حین باز بودن پنجره ترمینال.',
      'افزودن اندپوینت جدید استعلام پورت‌ها (/api/devices/:dev_id/ports/sync) جهت خواندن زنده وضعیت و جزئیات پورت‌ها مستقیماً از روی تانل فعال SSH و اجرای دستورات واقعی سخت‌افزاری (show ip interface brief / show running-config در سیسکو و /interface print در میکروتیک).',
      'تجهیز برچسب تعداد پورت‌ها در کامپوننت فیس‌پلیت سخت‌افزاری (CompactTerminalFaceplate) به دکمه تعاملی همگام‌سازی مجدد با آیکون انیمیشنی و نمایش وضعیت بررسی زنده.',
      'افزودن دکمه اختصاصی بررسی و همگام‌سازی زنده SSH در سربرگ جستجوی تب اینترفیس‌های ترمینال سیسکو و میکروتیک و همگام‌سازی خودکار پورت‌ها پس از اجرای دستورات نمایش اینترفیس.',
      'رعایت کامل قانون عدم نمایش متن فارسی در حالت انگلیسی (Strict Localization Rule) در تمامی پیام‌های استعلام تانل و همگام‌سازی.'
    ],
    changes_en: [
      'Established direct, persistent SSH WebSocket connections initiated from device actions using registered credentials (IP, port, username, password) that remain continuously alive until the modal is closed.',
      'Implemented proactive WebSocket ping/pong keepalive loop preventing idle disconnection while the terminal window remains open.',
      'Added hardware interface synchronization endpoint (/api/devices/:dev_id/ports/sync) querying live port states directly over the active SSH tunnel using real driver commands (show ip int brief / show running-config on Cisco, and /interface print on MikroTik).',
      'Upgraded the port count badge on the CompactTerminalFaceplate into an interactive re-sync button with spinning loader animation and live tunnel verification.',
      'Added dedicated "Sync SSH" button in the interfaces tab sidebar header across Cisco and MikroTik terminal modals with automatic port re-sync triggered after interface inspection commands.',
      'Enforced 100% strict localization compliance: verified zero Persian text in English mode across all tunnel query and synchronization logs.'
    ]
  },
  {
    version: '1.58.0',
    releaseDate: '2026-09-15',
    type: 'minor',
    title: 'اصلاح و استخراج دقیق نام میزبان (Hostname)، تصحیح منطق شمارش پورت‌ها به ۴۸ پورت استاندارد، افزودن توضیحات دقیق پورت‌ها بر اساس مدل و بومی‌سازی کامل پیام‌های اتصال SSH',
    title_en: 'Accurate Device Hostname Extraction, Canonical 48-Port Normalization, Model-Aware Port Specifications & Strict SSH English Localization',
    changes: [
      'اصلاح و تقویت الگوریتم استخراج نام میزبان (Device Hostname) از کانفیگ فعال (running-config)، سربرگ سیستم (Sysname) و خط اعلان CLI در موتورهای دیسکاوری پایتون و نود.',
      'تصحیح منطق محاسبه تعداد کل پورت‌ها؛ فیلتر کردن دقیق پورت‌های مدیریتی (FastEthernet0 / management) از پورت‌های فیزیکی اکسس/ترانک جهت جلوگیری از شمارش نادرست ۴۹ پورت و ثبت دقیق ۴۸ یا ۵۲ پورت استاندارد بر اساس مدل دستگاه.',
      'افزودن توضیحات راهنما و کامنت دقیق برای فیلد تعداد کل پورت‌ها (Total Ports Count) منطبق با معماری سخت‌افزار (پورت‌های گیگابیت اترنت اکسس به همراه آپلینک‌های فیبر نوری SFP/SFP+).',
      'تضمین رعایت ۱۰۰٪ قانون عدم نمایش متن فارسی در حالت انگلیسی در تمامی پیام‌های موفقیت، خطا، بنرها و وضعیت اتصال SSH در فرم ثبت و ویرایش تجهیز.',
      'ارتقا و همگام‌سازی کامل فیلدها در هر دو مودال AddDeviceModal و EditDeviceModal به همراه قابلیت قفل و بازگشایی دستی.'
    ],
    changes_en: [
      'Enhanced regex pattern matching to accurately extract Device Hostname from running-config, Sysname headers, and active CLI prompts across Cisco IOS, IOS-XE, and MikroTik RouterOS.',
      'Corrected canonical port counting logic; properly excluded management interfaces (FastEthernet0 / mgmt0) to eliminate erroneous 49-port readings and reliably normalize to standard 48 or 52 ports.',
      'Added dynamic model-aware descriptive annotations for the Total Ports Count field specifying physical copper access ports vs. SFP/SFP+ optical uplinks.',
      'Enforced 100% strict localization compliance: eliminated any Persian text in SSH success/error banners, notifications, and tooltips when English mode is active.',
      'Synchronized telemetry auto-population, dynamic comments, and discovery locking across both AddDeviceModal and EditDeviceModal.'
    ]
  },
  {
    version: '1.57.0',
    releaseDate: '2026-09-15',
    type: 'minor',
    title: 'موتور کشف سخت‌افزار حقیقی از طریق SSH پایتون، ایجاد کانکشن مادر (Mother Connection)، استخراج خودکار مشخصات سخت‌افزاری و واحدهای منبع تغذیه (PSU & Watts)',
    title_en: 'Real Hardware Discovery Engine via Python SSH, Mother Connection Tunnel, Hardware Specs Auto-population & PSU Telemetry',
    changes: [
      'پیاده‌سازی موتور کشف سخت‌افزاری زنده با پایتون (hardware_discovery.py) برای برقراری تانل واقعی SSH به سوئیچ‌ها و روترهای سیسکو و میکروتیک بدون دیتای شبیه‌سازی.',
      'ایجاد مفهوم کانکشن مادر (Mother Connection) و اتصال یکتای master_session_id؛ جلسه SSH برقرار شده در تست اتصال حفظ شده و مستقیماً به عنوان کانکشن اصلی دیوایس ثبت می‌گردد.',
      'استخراج و پر کردن خودکار مشخصات سخت‌افزاری شامل نام میزبان (Hostname)، مدل تجهیز، شماره سریال (Serial Number)، مک آدرس پایه (Base MAC)، نسخه فریم‌ور/سیستم‌عامل (Firmware/OS) و مدت‌زمان کارکرد (Uptime) با اجرای دستورات واقعی (show version / inventory / running-config در سیسکو و /system/resource در میکروتیک).',
      'افزودن بخش اختصاصی واحدهای منبع تغذیه و بار مصرفی (Power Supply Units & Load - PSU & Watts) با محاسبه و استخراج هوشمند تعداد پاورها و توان مصرفی بر اساس مدل و تله‌متری زنده.',
      'نمایش وضعیت زنده کانکشن مادر به همراه شناسه جلسه در فرم اطلاعات ترمینال و رعایت دقیق قوانین عدم نمایش متن فارسی در حالت انگلیسی (Strict Localization).'
    ],
    changes_en: [
      'Implemented real hardware discovery engine in Python (hardware_discovery.py) establishing genuine SSH tunnels to Cisco switches/routers and MikroTik RouterBOARD devices with zero simulated data.',
      'Introduced the Mother Connection paradigm with persistent master_session_id caching, preserving the active SSH session from test-connection directly into device registration.',
      'Auto-populated device identifiers and hardware specs including Hostname, Model, Serial Number, Base MAC Address, OS/Firmware Version, and System Uptime via live CLI commands (show version / inventory / running-config / mac address-table on Cisco, and /system/resource /system/routerboard on MikroTik).',
      'Added dedicated Power Supply Units & Load (PSU & Watts) section with intelligent wattage and power supply redundancy discovery based on hardware telemetry.',
      'Added real-time Mother Connection indicator with session identifier badge in terminal credentials form and verified 100% strict localization compliance (zero Persian text in English mode).'
    ]
  },
  {
    version: '1.56.0',
    releaseDate: '2026-09-15',
    type: 'minor',
    title: 'همگام‌سازی و بازطراحی کامل مودال ثبت تجهیز جدید شبکه (AddDeviceModal) منطبق با ساختار و امکانات پیشرفته ویرایش تجهیز',
    title_en: 'Complete Redesign of Register New Network Device Modal (AddDeviceModal) Aligned with Edit Device Properties Architecture',
    changes: [
      'بازطراحی کامل ساختار، چیدمان و استایل مودال ثبت تجهیز جدید شبکه (AddDeviceModal) دقیقاً منطبق با مودال ویرایش ویژگی‌های تجهیز (EditDeviceModal).',
      'افزودن نمای فیس‌پلیت گرافیکی و جدول تله‌متری پورت‌های سوئیچ (show interface status) با پشتیبانی از کشف زنده پورت‌ها از طریق تست اتصال SSH یا تله‌متری آزمایشگاهی.',
      'افزودن امکان تست اتصال بلادرنگ SSH / Telnet با قابلیت کشف و پر کردن خودکار شناسه تجهیز (Hostname)، مدل سخت‌افزاری و تعداد پورت‌ها به همراه قفل ایمن و قابلیت ویرایش دستی.',
      'تجهیز فیلد آدرس آی‌پی به ابزار پینگ زنده هاست (Ping Host) با نمایش بلادرنگ میزان تاخیر (Latency ms) و وضعیت پاسخ‌دهی ICMP.',
      'یکپارچه‌سازی انتخاب پلتفرم سخت‌افزاری و سیستم‌عامل (Cisco IOS, Cisco IOS-XE, MikroTik RouterOS, Generic Linux) با دکمه‌های انتخاب سریع رده سخت‌افزاری و نقش دستگاه.',
      'پشتیبانی کامل از سلسله‌مراتب فیزیکی و استقرار در رک به همراه امکان استقرار قالب پیکربندی اولیه بلافاصله پس از ثبت تجهیز.',
      'رعایت ۱۰۰٪ دستورالعمل‌های چندزبانگی (FA/EN بدون متن فارسی در زبان انگلیسی) و تجهیز کامل به دکمه مینیمایز (Minimize) به نوار ابزار پایین صفحه.'
    ],
    changes_en: [
      'Comprehensive redesign of Register New Network Device modal (AddDeviceModal) to strictly mirror the visual layout, spacing, and advanced functionality of Edit Device Properties (EditDeviceModal).',
      'Integrated switch ports graphical faceplate and live telemetry banner (show interface status) with live SSH port discovery and lab telemetry loading.',
      'Added real-time SSH / Telnet connection testing with auto-population of device hostname, hardware model, and total port count with discovery locking and manual unlock capability.',
      'Equipped management IP address field with a live ICMP Ping Host test utility displaying real-time latency (ms) and host reachability status.',
      'Streamlined side-by-side hardware platform & OS driver selection (Cisco IOS, Cisco IOS-XE, MikroTik RouterOS, Generic Linux) with rapid hardware class buttons and role selector.',
      'Integrated physical location and rack placement with autocomplete suggestions, plus optional post-registration configuration template deployment.',
      '100% strict compliance with bilingual localization (zero Persian text in English mode) and universal modal minimization support.'
    ]
  },
  {
    version: '1.55.0',
    releaseDate: '2026-09-15',
    type: 'minor',
    title: 'توسعه کامل پروتکل‌های پیشرفته VPN میکروتیک (WireGuard, EoIP, VXLAN, SSTP, OpenVPN)، راهنمای تعاملی اینفو برای تمام فیلدها و اتصال سخت‌افزاری زنده',
    title_en: 'Advanced MikroTik VPN Protocols (WireGuard, EoIP, VXLAN, SSTP, OpenVPN), Field Info Tooltips, and Live Hardware SSH Integration',
    changes: [
      'حذف کامل حالت شبیه‌ساز و واژه‌های فازبندی؛ کلیه عملیات VPN مستقیماً روی روتر حقیقی از طریق مشخصات SSH دستگاه در ماژول مدیریت تجهیزات اجرا می‌گردند.',
      'افزودن دکمه تعاملی راهنما (i Info) برای تمامی تکست‌باکس‌ها و فیلدهای ورودی در فرم‌های VPN با ارائه توضیحات مهندسی شبکه درباره چیستی و چرایی ضرورت هر پارامتر در میکروتیک.',
      'توسعه و تجهیز کامل پروتکل‌های مدرن شامل WireGuard (با سرعت حداکثری هسته کرنل)، EoIP (پل شفاف لایه ۲ اترنت)، VXLAN (اورلی سگمنت‌های دیتاسنتر)، SSTP (با پورت ۴۴۳ عبور از فیلترینگ) و OpenVPN.',
      'ماژولار کردن معماری فرانت‌اند و تفکیک کامپوننت‌های فرم‌های پروتکل و مودال بررسی وضعیت زنده اینترفیس‌ها با قابلیت مینیمایز کامل.',
      'رعایت ۱۰۰٪ دستورالعمل‌های چندزبانگی (بدون متن فارسی در حالت انگلیسی) و اعتبارسنجی کامل داده‌های ورودی.'
    ],
    changes_en: [
      'Completely removed simulator mode and all phase naming; all VPN configurations are executed directly on the real hardware router via credentials managed in the Network Inventory module.',
      'Integrated interactive information tooltips (i Info) next to every single input text box across all VPN protocol forms, detailing the parameter purpose and network engineering necessity.',
      'Expanded protocol suite to include WireGuard (high-throughput kernel-level crypto), EoIP (Layer 2 transparent bridging), VXLAN (datacenter multi-tenant overlay), SSTP (HTTPS port 443 firewall bypass), and OpenVPN.',
      'Modularized frontend architecture with dedicated sub-components for protocol forms and live interface inspection with universal modal minimization support.',
      'Strict bilingual localization compliance (zero Persian text in English mode) and comprehensive input validation.'
    ]
  },
  {
    version: '1.54.0',
    releaseDate: '2026-09-15',
    type: 'minor',
    title: 'پیاده‌سازی کامل و واقعی سوییت VPN میکروتیک (L2TP/IPsec و GRE) در مودال مدیریت روتر با اتصال زنده SSH',
    title_en: 'Full Non-Simulated MikroTik VPN Suite (L2TP/IPsec & GRE) with Live Router SSH Execution & Rollback Protection',
    changes: [
      'پیاده‌سازی تب اختصاصی و قدرتمند VPN در مودال مدیریت تجهیزات میکروتیک (MikroTikDeviceManageModal) منطبق با معماری Device → Platform → Driver → SSH Connection.',
      'پشتیبانی کامل از پروتکل‌های L2TP/IPsec در هر دو حالت Remote Access (کاربران دورکار) و Site-to-Site و همچنین تونل GRE با رمزنگاری سخت‌افزاری IPsec و مسیرهای استاتیک.',
      'ویزارد گام به گام هوشمند شامل سناریو، پروتکل، پارامترهای اصلی و پیشرفته، پیش‌نمایش دستورات RouterOS با ماسک کردن رمزها (Masking Secrets) و استعلام زنده وضعیت عملیاتی روتر.',
      'سیستم اعمال امن دستورات با قابلیت Rollback خودکار در صورت بروز خطای نحوی یا قطعی در اتصال روتر.',
      'پایبندی ۱۰۰٪ به قوانین چندزبانه (FA/EN)، عدم استفاده از شبیه‌ساز یا داده ساختگی، رعایت کامل محرمانگی گذرواژه‌ها و پشتیبانی از قابلیت مینیمایز در تمامی پنجره‌های فرعی.'
    ],
    changes_en: [
      'Implemented dedicated production-ready VPN Suite tab within MikroTik RouterOS Device Management Modal following the Device → Platform → Driver → SSH Connection architecture.',
      'Full protocol support for L2TP/IPsec in both Remote Access (teleworker road-warrior) and Site-to-Site modes, as well as GRE Routed Overlay with hardware IPsec encryption and static routes.',
      'Multi-step creation wizard featuring scenario selection, protocol catalog, basic & advanced configuration, masked RouterOS script preview, and live operational interface verification.',
      'Safe sequential command execution pipeline with automatic atomic rollback of preceding steps upon syntax or network errors.',
      '100% strict compliance with bilingual localization (FA/EN), zero mock/fake data, complete password sanitization from API responses/audit logs, and universal modal minimization.'
    ]
  },
  {
    version: '1.53.6',
    releaseDate: '2026-09-15',
    type: 'patch',
    title: 'افزودن دکمه جمع‌کردن و بازکردن نوار ابزار نقشه‌ها در صفحه شماتیک جهت افزایش دید کاربر',
    title_en: 'Collapsible Map View Secondary Toolbar with Toggle Arrow in Schematic Canvas',
    changes: [
      'افزودن دکمه فلش جمع‌کننده/بازکننده نوار ابزار دوم نقشه‌ها (Map View & Custom Tools) در بخش بالای صفحه شماتیک.',
      'امکان مخفی‌سازی نوار و تبدیل آن به یک نوار باریک با مصرف حداقل ارتفاع جهت افزایش فضای کاری و دید بهتر نقشه برای کاربر.',
      'ذخیره‌سازی هوشمند وضعیت باز یا بسته بودن نوار در حافظه محلی مرورگر (localStorage) جهت حفظ تنظیم کاربر در دفعات مراجعه بعدی.',
      'پشتیبانی کامل از دو زبانه بودن اعلان‌ها، آیکون‌های متناسب ChevronUp/ChevronDown و حفظ دسترسی به عنوان نقشه فعال در حالت جمع‌شده.'
    ],
    changes_en: [
      'Added a toggle arrow button to collapse or expand the secondary Map View & custom tools toolbar in the schematic topology canvas.',
      'Allows minimizing the secondary toolbar to a slim compact bar to provide maximum screen real estate and viewing canvas area for topology analysis.',
      'Persistent toolbar state stored in browser localStorage (nettopology_schematic_toolbar_collapsed) across user sessions.',
      'Full bilingual localization (FA/EN) with responsive ChevronUp/ChevronDown states and active map indicator in collapsed mode.'
    ]
  },
  {
    version: '1.53.5',
    releaseDate: '2026-09-15',
    type: 'patch',
    title: 'تازه‌سازی خودکار و همگام‌سازی آخرین تغییرات نقشه و موقعیت تجهیزات از پایگاه‌داده با دکمه بازنشانی زوم',
    title_en: 'Auto-Refresh & Synchronize Latest Database Map Changes and Device Coordinates on Reset Zoom Action',
    changes: [
      'ارتقای عملکرد دکمه بازنشانی زوم و مرکز صفحه (Reset Zoom & Center View) در نوار ابزار بوم شماتیک شبکه.',
      'همگام‌سازی آنی آخرین داده‌های ذخیره‌شده در پایگاه‌داده شامل موقعیت جدید تجهیزات جابجا شده (/api/settings/node-positions)، نقشه‌های سفارشی (/api/settings/maps)، درخت سلسله‌مراتب فیزیکی (/api/settings/hierarchy) و وضعیت زنده اتصال و پورت‌های شبکه.',
      'افزودن انیمیشن چرخش آیکون تازه‌سازی (Spinning Indicator) در زمان بارگذاری و نمایش اعلان وضعیت انجام موفقیت‌آمیز دریافت تغییرات متناسب با زبان فعال (FA/EN).'
    ],
    changes_en: [
      'Enhanced the Reset Zoom & Center View action in the schematic topology canvas toolbar.',
      'Instant synchronization of latest persisted database state including relocated device coordinates (/api/settings/node-positions), custom maps (/api/settings/maps), physical hierarchy (/api/settings/hierarchy), and live device port reachability.',
      'Added dynamic spinning refresh indicator during database sync with localized confirmation toast notifications respecting current language mode (FA/EN).'
    ]
  },
  {
    version: '1.53.4',
    releaseDate: '2026-09-15',
    type: 'patch',
    title: 'بازطراحی و همگام‌سازی کامل قالب تیره (Dark Mode) در مودال ثبت تجهیز جدید شبکه',
    title_en: 'Full Dark Mode Visual Theme Alignment and Consistency for Register New Network Device Modal',
    changes: [
      'اصلاح و همگام‌سازی کامل رنگ‌بندی تمام بخش‌های مودال ثبت تجهیز جدید (AddDeviceModal) در تم تیره شامل سربرگ، کادرهای پس‌زمینه، فیلدهای متنی، کادرهای کشویی (Select)، چک‌باکس‌ها و دکمه‌ها.',
      'به‌روزرسانی استایل‌های بلوک‌های اطلاعاتی پلتفرم سخت‌افزاری، پارامترهای اتصال ترمینال و احراز هویت، انتخابگر مکان فیزیکی (ساختمان، طبقه، واحد، رک) و الگوهای کانفیگ متناسب با تم تاریک.',
      'رندر مودال از طریق createPortal روی بدنه سند جهت یکپارچگی عمق Z-Index و مدیریت کامل چرخه حیات تم در تم روشن و تیره.'
    ],
    changes_en: [
      'Comprehensive dark mode palette overhaul for the Register New Network Device modal (AddDeviceModal) including header, card containers, inputs, selects, checkboxes, and buttons.',
      'Updated styling for hardware platform cards, terminal authentication controls, physical location selectors (Building, Floor, Unit, Rack), and initial config templates for dark mode consistency.',
      'Attached modal rendering to document.body via createPortal for optimal z-index layering and seamless dynamic theme switching.'
    ]
  },
  {
    version: '1.53.3',
    releaseDate: '2026-09-15',
    type: 'patch',
    title: 'رفع خطای پروکسی سوکت وب‌ترمینال (ECONNREFUSED 127.0.0.1:5002) و استقرار موتور بومی WebSocket ترمینال در نود',
    title_en: 'Fix Terminal WS Proxy ECONNREFUSED 127.0.0.1:5002 Error with Native Node.js WebSocket Terminal Engine',
    changes: [
      'رفع خطای اتصال سوکت پروکسی ترمینال (Terminal WS Proxy Error: connect ECONNREFUSED 127.0.0.1:5002) ناشی از عدم اجرای وب‌سوکت در پایتون.',
      'پیاده‌سازی و استقرار مستقیم و بومی سرور وب‌سوکت در نود (Native WebSocket Terminal Engine) با استفاده از پکیج ws و کلاینت ssh2.',
      'پشتیبانی همزمان از استریم دوطرفه SSH تجهیزات واقعی و شبیه‌ساز تعاملی CLI همراه با بافر ورودی و بازنشانی خودکار بدون ایجاد قطعی یا خطای سوکت.'
    ],
    changes_en: [
      'Resolved Terminal WS Proxy Error: connect ECONNREFUSED 127.0.0.1:5002 caused by unstarted Python websocket service.',
      'Implemented native Node.js WebSocket Terminal Engine using ws package and ssh2 client for immediate terminal upgrade handling.',
      'Added full support for bidirectional live SSH streaming and interactive CLI fallback with prompt generation and input buffering without socket drops.'
    ]
  },
  {
    version: '1.53.2',
    releaseDate: '2026-09-15',
    type: 'patch',
    title: 'فشرده‌سازی گرافیکی و بازآرایی ۲ ستونه بخش‌های بالایی مودال ویرایش برای نمایش بدون اسکرول مشخصات ترمینال',
    title_en: 'Compact 2-Column Redesign of Upper Sections in Edit Device Modal for Immediate No-Scroll Terminal Access',
    changes: [
      'بازطراحی و بهینه‌سازی فضایی بخش پلتفرم سخت‌افزاری (Hardware Platform & OS) و رده تجهیز (Device Role & Category) در ساختار گرید دو ستونه ساید‌بای‌ساید بسیار فشرده.',
      'کاهش ارتفاع و حاشیه‌های هدر مودال، پدینگ‌های بیرونی فرم و بنر تله‌متری پورت‌های سوئیچ به همراه حالت جمع‌شده (Collapsed) پیش‌فرض تله‌متری تا زمان دیسکاوری پورت‌ها.',
      'امکان مشاهده کامل و آنی کادر مشخصات اتصال ترمینال و دسترسی CLI (پروتکل، نام کاربری و رمزعبور، پورت، تست SSH و Enable Secret) در بدو باز شدن مودال بدون نیاز به هرگونه اسکرول عمودی.'
    ],
    changes_en: [
      'Redesigned the Hardware Platform & OS and Device Role & Category sections into an ultra-compact side-by-side two-column grid layout.',
      'Reduced vertical heights, padding, and font metrics of modal header, form container, and switch telemetry banner with collapsed-by-default ports state until discovery.',
      'Ensured the Terminal Protocol & Credentials section (SSH/Telnet, credentials, port, SSH test and enable secret) is immediately visible without scrolling upon opening the modal.'
    ]
  },
  {
    version: '1.53.1',
    releaseDate: '2026-09-15',
    type: 'patch',
    title: 'جابجایی بخش تله‌متری و پورت‌های سوئیچ به بالای کادر مشخصات اتصال ترمینال و CLI در مودال ویرایش دستگاه',
    title_en: 'Relocate Switch Ports & Telemetry Section Directly Above Terminal Protocol & Credentials in Edit Device Modal',
    changes: [
      'انتقال بلوک تله‌متری فیس‌پلیت سخت‌افزاری و وضعیت زنده پورت‌ها (Switch Ports & Telemetry - show interface status) به موقعیت دقیق بالای بخش مشخصات اتصال ترمینال و دسترسی CLI.',
      'بهبود جریان کاربری (UX Workflow) جهت مشاهده بی‌واسطه نتایج تست اتصال SSH و دریافت خودکار پورت‌ها مستقیماً بالای فیلدهای احراز هویت ترمینال.'
    ],
    changes_en: [
      'Relocated the hardware switch faceplate telemetry block (Switch Ports & Telemetry - show interface status) directly above the Terminal Protocol & Credentials section.',
      'Enhanced user experience and interaction hierarchy, allowing immediate visibility of live SSH discovery results right adjacent to terminal authentication parameters.'
    ]
  },
  {
    version: '1.53.0',
    releaseDate: '2026-09-15',
    type: 'minor',
    title: 'کشف خودکار پورت‌های سوئیچ با دستور show interface status از طریق SSH، قفل‌گذاری هوشمند فیلدها و ارتقای موقعیت مشخصات ترمینال',
    title_en: 'Automated Switch Port Discovery via SSH "show interface status", Smart Field Locking, and Terminal Credentials Relocation',
    changes: [
      'انتقال بخش مشخصات اتصال ترمینال و دسترسی CLI به موقعیت بالاتر مستقیماً زیر بخش رده و نوع تجهیز (Device Role) در پنجره ویرایش دستگاه.',
      'افزودن موتور دیسکاوری خودکار در بک‌گراند از طریق تست اتصال SSH و اجرای دستور show interface status روی سوئیچ جهت استخراج نام پورت‌ها، دسکریپشن، وضعیت فعال/غیرفعال بودن (Up/Down)، نوع پورت (Trunk/Access)، VLAN، سرعت و دوبلکس.',
      'طراحی پنل تله‌متری فیس‌پلیت سخت‌افزاری سوئیچ در بالای مودال با دو حالت نمایش گرافیکی ماتریس پورت‌ها و جدول تله‌متری با قابلیت فیلتر و آمار خلاصه وضعیت.',
      'تکمیل و قفل خودکار فیلدهای نام هاست (Hostname)، مدل سخت‌افزاری و تعداد پورت‌ها با وضعیت غیرقابل ویرایش (Read-only/Grayed out) به همراه دکمه بازگشایی قفل برای ویرایش دستی در صورت نیاز کاربر.',
      'ذخیره‌سازی و پایداری کامل آرایه پورت‌های شناسایی‌شده در رکورد پایگاه‌داده تجهیز جهت استفاده در کل سیستم و مانیتورینگ.'
    ],
    changes_en: [
      'Relocated the Terminal Protocol & Credentials section directly below Device Role & Category in the Edit Device modal for intuitive workflow.',
      'Implemented background SSH discovery executing "show interface status" on network switches to automatically extract port names, descriptions, link status (Up/Down), port modes (Trunk/Access), VLAN assignments, speeds, and duplex settings.',
      'Designed a hardware switch faceplate telemetry panel at the top of the modal with both grid visualization and tabular views with real-time port statistics.',
      'Auto-populated and locked device hostname, hardware model, and total port count as read-only fields with visual indicators and manual unlock options.',
      'Persisted discovered switch ports array into the device database record for system-wide topology and monitoring consumption.'
    ]
  },
  {
    version: '1.52.1',
    releaseDate: '2026-09-15',
    type: 'patch',
    title: 'مدیریت هوشمند قفل پکیج‌منیجر سیستم‌عامل (dpkg/apt lock)، پیشگیری از تداخل با unattended-upgrades و نصب امن Nginx در اسکریپت راه‌اندازی',
    title_en: 'Intelligent OS Package Manager Lock Guard (dpkg/apt lock), Unattended-Upgrades Conflict Prevention, and Resilient Nginx Installation in Setup Scripts',
    changes: [
      'تجهیز اسکریپت setup-panel.sh و install.sh به ماژول تشخیص خودکار قفل DPKG/APT (فایل‌های lock و lock-frontend) با قابلیت انتظار هوشمند (Polling) تا آزادسازی کامل توسط سیستم‌عامل.',
      'توقف موقت تایمرها و سرویس‌های آپدیت پس‌زمینه لینوکس (unattended-upgrades و apt-daily) در حین اجرای اسکریپت نصب و بازیابی خودکار پس از پایان جهت جلوگیری از توقف تصادفی در مرحله پیکربندی Nginx.',
      'افزودن تابع بازآزمایی خودکار safe_apt_install و safe_apt_update با قابلیت تلاش مجدد تا ۵ مرتبه همراه با مکث هوشمند در صورت بروز خطای تداخل فرآیندهای لینوکس.',
      'نصب پیش‌دستانه وب‌سرور Nginx همگام با پکیج‌های پایه و بررسی شرطی فعال بودن Nginx قبل از فراخوانی apt-get در فاز تنظیم SSL/HTTPS معکوس.'
    ],
    changes_en: [
      'Engineered automated DPKG/APT lock detection (lock and lock-frontend files) with intelligent retry and polling in setup-panel.sh and install.sh scripts.',
      'Temporarily paused background Linux automated upgrade timers (unattended-upgrades and apt-daily) during installer execution with auto-restore on exit to prevent lock collisions.',
      'Introduced robust safe_apt_install and safe_apt_update functions with 5-step exponential backoff retry logic upon encountering OS process contention.',
      'Proactively bundled Nginx web server installation with core dependencies and added conditional existence verification before invoking apt-get in the reverse proxy and SSL phase.'
    ]
  },
  {
    version: '1.52.0',
    releaseDate: '2026-09-15',
    type: 'minor',
    title: 'جداسازی قطعی ویو کارت و فیزیکی در شماتیک، ذخیره‌سازی مجزای مختصات در پایگاه داده و رفع تداخل المان‌های فیزیکی',
    title_en: 'Strict Card & Physical View Isolation, Dedicated Coordinates Persistence in Database, and Physical Elements Filtering',
    changes: [
      'جداسازی کامل منطق نمایش در صفحه شماتیک: در حالت ویو کارت، رک‌ها، دکل‌های مخابراتی و شاسی‌های فیزیکی پنهان شده و کلیه دیوایس‌ها به همراه اتصالات و پورت‌ها به صورت کارت‌های شماتیک نمایش می‌یابند.',
      'اختصاص رک‌ها، دکل‌ها و شاسی‌های سرور به ویو فیزیکی (Physical View) و سوئیچ خودکار به ویو فیزیکی هنگام کلیک بر روی افزودن رک یا دکل.',
      'افزودن فیلد physicalPositions به مدل‌های داده و ذخیره‌سازی مستقل و پایدار مختصات دو حالت ویو (کارت و فیزیکی) در PostgreSQL و استور پشتیبان دیتابیس.',
      'تضمین ثبات موقعیت فیزیکی و شماتیکی دیوایس‌ها در اشتراک‌گذاری نقشه‌ها (Map Visibility & Permissions) برای کاربران عمومی، محدود و مرورگرهای مختلف بدون بازگشت یا جابجایی المان‌ها.',
      'بهینه‌سازی سیستم درگ و دراپ المان‌ها (گره‌ها، رک‌ها، دکل‌ها و یادداشت‌ها) با ثبت قطعی و دقیق آخرین مختصات ماوس در دیتابیس بدون از دست رفتن موقعیت در رویداد MouseUp.'
    ],
    changes_en: [
      'Strict separation of Card vs. Physical views on the schematic canvas: racks, telecom towers, and physical chassis are exclusively hidden in Card mode where all devices render as schematic cards with ports and links.',
      'Reserved server racks, telecom towers, and physical chassis to Physical View, with automatic view transition when adding racks or towers.',
      'Added physicalPositions to the schema and enabled independent, durable persistence for both Card and Physical coordinate sets in PostgreSQL and fallback storage.',
      'Guaranteed map layout and position retention across shared maps (Map Visibility & Permissions) for public/restricted users and different browsers without coordinate reset.',
      'Optimized drag-and-drop mechanics for nodes, racks, towers, and sticky notes with precise immediate mouse release coordinate commit to the database on MouseUp.'
    ]
  },
  {
    version: '1.51.1',
    releaseDate: '2026-09-14',
    type: 'patch',
    title: 'همسان‌سازی استایل کامند گاید در تم تیره و دسترسی دائمی به نوار فوتر و دکمه ابزارها هنگام باز بودن مودال‌ها',
    title_en: 'Cisco Terminal Command Guide Dark Mode Harmonization & Persistent Bottom Footer and Tools Access During Modals',
    changes: [
      'همسان‌سازی کامل پالت رنگ، کادرها و دکمه‌های راهنمای دستورات (Command Guide) ترمینال سیسکو با تب اینترفیس‌ها در تم تیره و روشن.',
      'ارتقای ساختار لایه‌بندی و حفظ دسترسی به نوار فوتر پایین صفحه و منوی ابزارها (Tools) هنگام باز بودن مودال‌های ترمینال، پورت‌ها و سایر پنجره‌ها.',
      'تنظیم حاشیه و فضای امن پایینی (Safe Bottom Clearance) برای کلیه مودال‌ها جهت عدم هم‌پوشانی با استاتوس بار و داک ابزارها.'
    ],
    changes_en: [
      'Harmonized Cisco Terminal Command Guide color scheme, cards, and action buttons with the Interfaces tab across dark and light modes.',
      'Elevated footer status bar and Tools button stacking layers (z-index) to remain visible and fully interactive when terminal and port modals are open.',
      'Added safe bottom margin clearance across full-screen modals to prevent occlusion with the bottom status bar and minimized tools dock.'
    ]
  },
  {
    version: '1.51.0',
    releaseDate: '2026-09-14',
    type: 'minor',
    title: 'انتقال اینترفیس‌ها به تب‌های سایدبار ترمینال، رفع بیرون‌زدگی تولتیپ پورت‌ها در تمام‌صفحه و اصلاح کنتراست تم روشن',
    title_en: 'Terminal Interfaces Sidebar Tab Integration, Fullscreen Port Tooltip Overflow Fix, and Light Theme High-Contrast Polish',
    changes: [
      'انتقال دکمه و لیست اینترفیس‌ها از بالای ترمینال به داخل سایدبار با ساختار دو تب مجزا (راهنمای دستورات / اینترفیس‌ها) همراه با قابلیت جستجوی زنده.',
      'اصلاح موقعیت‌دهی پویا و محاسبه هوشمند محدوده صفحه (Viewport Clamping) برای تولتیپ پورت‌های فیزیکی در حالت فول‌اسکرین ترمینال‌های سیسکو و میکروتیک.',
      'بهبود کامل کنتراست برچسب جزئیات پورت هنگام هاور در تم روشن جهت جلوگیری از تداخل رنگ با پس‌زمینه.',
      'اصلاح استایل نشانگر تعداد پورت‌ها با رنگ سفید و متن بولد (Bold) و پس‌زمینه مناسب با خوانایی بالا در کلیه تم‌ها.'
    ],
    changes_en: [
      'Migrated the interfaces button and menu into the terminal sidebar as a dedicated dual-tab interface (Command Guide / Interfaces) with live search.',
      'Implemented smart viewport clamping for physical port tooltips in fullscreen mode across both Cisco and MikroTik terminals to prevent off-screen overflow.',
      'Enhanced high-contrast styling for hovered port detail pill in light mode, preventing background color blending.',
      'Updated the port count badge to a solid, bold white display for crystal-clear readability across light and dark themes.'
    ]
  },
  {
    version: '1.50.5',
    releaseDate: '2026-09-14',
    type: 'patch',
    title: 'تضمین پایداری کامل داده‌های کاربران و نقشه‌ها در PostgreSQL و رفع عدم ذخیره‌سازی جداول',
    title_en: 'Full PostgreSQL Persistence Assurance for Users & Maps with Automatic Data Sync',
    changes: [
      'رفع مشکل خالی بودن جداول users و custom_maps در سرور PostgreSQL از طریق بارگذاری صحیح متغیرهای محیطی در systemd و فایل .env.',
      'پیاده‌سازی مکانیزم اتصال پویا (ensurePostgresConnection) با قابلیت بازیابی خودکار در تمام عملیات خواندن، نوشتن و حذف کاربران و نقشه‌ها.',
      'اضافه شدن همگام‌سازی خودکار و دوطرفه داده‌های fallback store به دیتابیس PostgreSQL هنگام اتصال یا در صورت خالی بودن جداول.',
      'اصلاح ساختار اسکریپت migration جدول‌های users و custom_maps با دستورات ایمن IF NOT EXISTS جهت سازگاری با پایگاه‌های داده قبلی.',
      'افزودن دسترسی و مالکیت کامل کلیه جداول و دنباله‌ها (Sequences) به کاربر دیتابیس در فرآیند نصب setup-panel.sh.'
    ],
    changes_en: [
      'Resolved empty PostgreSQL tables for users and custom_maps by ensuring reliable environment variable loading in systemd and .env locations.',
      'Implemented dynamic connection recovery (ensurePostgresConnection) across all user and map CRUD operations in PostgreSQL.',
      'Added two-way automatic data migration from the fallback store into PostgreSQL whenever the database connects or contains empty tables.',
      'Enhanced database schema migration scripts for users and custom_maps with safe IF NOT EXISTS clauses for legacy compatibility.',
      'Configured full table and sequence ownership grants for the dedicated database user in setup-panel.sh.'
    ]
  },
  {
    version: '1.50.4',
    releaseDate: '2026-09-14',
    type: 'patch',
    title: 'اصلاح پیام‌های نشانگر وضعیت لودینگ سوکت شبکه و رعایت دقیق زبان فعال پنل (فارسی/انگلیسی)',
    title_en: 'Enhanced Page Loading State Messaging for Network Socket Loader with Strict Language Alignment',
    changes: [
      'تنظیم عنوان و متن توضیحات زیر سوکت شبکه جهت نمایش صریح وضعیت «در حال بارگذاری صفحه...» / «Loading Page...».',
      'تفکیک دقیق زبان متون نشانگر فیزیکی و تبادل فعال داده متناسب با زبان فعال پنل کاربری.',
      'افزودن شناسایی خودکار زبان ذخیره‌شده (app_language) در لودینگ پیش‌فرض HTML جهت نمایش زبان صحیح بدون کوچک‌ترین تاخیر قبل از مانت شدن ری‌اکت.'
    ],
    changes_en: [
      'Configured socket loader title and description to clearly indicate "Loading Page..." / "در حال بارگذاری صفحه...".',
      'Strictly localized physical port status and active data stream badges based on the active panel language.',
      'Added immediate detection of stored language (app_language) in the initial HTML loader for seamless localized display before React mounts.'
    ]
  },
  {
    version: '1.50.3',
    releaseDate: '2026-09-14',
    type: 'patch',
    title: 'طراحی لودینگ اختصاصی سوکت پورت شبکه با انیمیشن چراغ دیتای چشمک‌زن واقعی و رفع صفحه مشکی اولیه در رفرش صفحه',
    title_en: 'Realistic Animated RJ45 Network Port Socket Loader with Blinking Data LED and Elimination of Blank Screen During Page Reload',
    changes: [
      'حذف صفحه سیاه/مشکی اولیه هنگام رفرش صفحه و جایگزینی با لودینگ سبک و فوق سریع سوکت پورت شبکه اترنت (RJ45 Socket) در HTML و CSS خالص.',
      'طراحی انیمیشن دقیق سخت‌افزاری سوکت شبکه با محافظ فلزی، ۸ پین طلایی براق، محفظه ضامن، چراغ ثابت لینک (LNK) و چراغ کهربایی چشمک‌زن دیتا (ACT).',
      'ایجاد کامپوننت ماژولار و بازاستفاده‌پذیر NetworkSocketLoader جهت یکپارچه‌سازی وضعیت بارگذاری در سراسر برنامه (بررسی نشست، بارگذاری نقشه توپولوژی و رفرش).',
      'پشتیبانی کامل از زبان‌های فارسی و انگلیسی و همگام‌سازی فوری با تنظیمات ذخیره‌شده کاربر بدون تأخیر در رندر اولیه.'
    ],
    changes_en: [
      'Eliminated initial blank/black screen during page reload with an instant, zero-dependency RJ45 Ethernet port socket loader rendered in pure HTML and CSS.',
      'Crafted realistic hardware animations featuring a metallic shielded casing, 8 reflective gold pins, latch notch, solid Link (LNK) LED, and pulsating amber Data Activity (ACT) LED.',
      'Created modular and reusable NetworkSocketLoader component to standardize loading states across auth verification, topology mapping, and page transitions.',
      'Full localization support for Persian and English with instant detection of user-selected language on initial boot.'
    ]
  },
  {
    version: '1.50.2',
    releaseDate: '2026-09-14',
    type: 'patch',
    title: 'رفع اساسی خطای ورود کاربران محلی، اتصال مستقیم و ایمن فرم ایجاد کاربر به پایگاه داده و محافظت در برابر پاسخ‌های غیر JSON',
    title_en: 'Critical Fix for Local User Login Authentication, Direct Database Persistence for User Creation, and Resilient Guard Against Non-JSON Gateway Responses',
    changes: [
      'رفع خطای لاگین Unexpected token < و ناتوانی در اعتبارسنجی کاربران محلی تازه ایجادشده با برقراری ارتباط مستقیم فرم ایجاد کاربر با پایگاه داده (/api/settings/users).',
      'ایمن‌سازی ذخیره‌سازی پسورد کاربران محلی جدید با سیستم هشینگ فوق امن PBKDF2 و سالت ۵۱۲ بیتی در پایگاه داده PostgreSQL و استور پشتیبان.',
      'اصلاح و ایمن‌سازی توابع saveUser، loadFallbackStore و findUserByUsername در لایه دیتابیس برای جلوگیری از ثبت رکوردهای تهی یا فاسد.',
      'افزودن پاسخ‌دهی استاندارد JSON در میدل‌ور خطای سراسری سرور و هندلینگ امن محتوای غیر JSON در صفحه ورود (LoginPage) جهت جلوگیری از نمایش خطاهای خام HTML به کاربر.',
      'پشتیبانی کامل از حذف همگام کاربر (deleteUserFromDatabase) در پایگاه داده و اعمال شاخص وضعیت در حال ذخیره (isSavingUser) در مودال کاربران.'
    ],
    changes_en: [
      'Resolved local user authentication failure and unexpected HTML token response by directly persisting newly created user accounts and credentials to the backend database (/api/settings/users).',
      'Hardened local user password security with standard PBKDF2 derivation and 512-bit salt hashing across PostgreSQL database and persistent JSON backup store.',
      'Refactored and sanitized saveUser, loadFallbackStore, and findUserByUsername database layer routines to prevent malformed or nameless user records.',
      'Added strict global JSON error handling in Express server and guarded client-side response parsing in LoginPage to eliminate raw HTML parse errors.',
      'Added synchronized database user deletion and interactive saving indicator state in the Local Users management modal.'
    ]
  },
  {
    version: '1.50.1',
    releaseDate: '2026-09-14',
    type: 'patch',
    title: 'بهبود پایداری رندرر سخت‌افزار و کابینت رک، دسترس‌پذیری یکپارچه ابزارهای رک/دکل در تمام نماها و رفع خطاهای ناگهانی بوم',
    title_en: 'Enhanced Rack & Hardware Canvas Rendering Resiliency, Unified Rack/Tower Tool Accessibility Across Views, and Elimination of Canvas Layout Errors',
    changes: [
      'ایمن‌سازی کامل رندرر کارت‌های شبکه و تجهیزات سخت‌افزاری (HardwareSvgRenderer و PhysicalNodeOnCanvas) در برابر آرایه‌های نامعتبر یا تعریف‌نشده کارت‌ها و دستگاه‌ها.',
      'افزودن موقعیت‌یابی هوشمند و پایدار خودکار (Universal Fallback Positioning) برای تمام نودها و تجهیزات دکل/رک در نقشه‌های سفارشی جهت جلوگیری از خطای مختصات نامعتبر.',
      'دسترس‌پذیر کردن ابزارهای افزودن تجهیز، ایجاد رک، افزودن دکل و نصب سخت‌افزار در هر دو نمای کارتی و فیزیکی بوم توپولوژی سفارشی.',
      'تجهیز مودال افزودن تجهیز به نقشه سفارشی (CustomMapAddDeviceModal) به دکمه مینیمایز (Minimize) در هدر مطابق با دستورالعمل جامع مودال‌ها.',
      'اصلاح منطق تشخیص تجهیزات نصب‌شده در رک جهت سازگاری کامل با شناسه‌های پیشوندی (hw- و radio-) و همگام‌سازی بی‌درنگ وضعیت‌ها.'
    ],
    changes_en: [
      'Hardened network card and mounted hardware renderers (HardwareSvgRenderer & PhysicalNodeOnCanvas) against undefined or malformed card arrays and device structures.',
      'Implemented resilient universal fallback canvas positioning for all nodes, custom map tower devices, and standalone hardware to prevent coordinate layout anomalies.',
      'Unified toolbar button accessibility for Add Device, Add Rack, Add Tower, and Install Hardware across both Card and Physical view modes on custom topology maps.',
      'Equipped the Custom Map Add Device modal (CustomMapAddDeviceModal) with a header minimize button in strict compliance with the universal modal minimization guidelines.',
      'Enhanced mounted hardware detection logic to seamlessly resolve prefixed device IDs (hw- and radio-) and maintain accurate real-time rack occupancy indicators.'
    ]
  },
  {
    version: '1.50.0',
    releaseDate: '2026-09-14',
    type: 'minor',
    title: 'ذخیره‌سازی جامع پایگاه‌داده (Database Persistence) برای نقشه‌ها و نودها، کنترل دسترسی نقشه (Public/Private/Restricted) و سازگاری مودال مشخصات سخت‌افزاری و کارت شبکه با تم روشن',
    title_en: 'Full Database Persistence for Maps & Node Positions, Granular Map Access Control (Public/Private/Restricted), and Light Theme Adaptation for Hardware Specs & Network Cards Modal',
    changes: [
      'پیاده‌سازی پایدارسازی و ذخیره‌سازی داده‌های تمام نقشه‌های سفارشی (Custom Maps) و موقعیت نودها (Node Positions) در پایگاه‌داده PostgreSQL و فایل استور مطمئن.',
      'تجهیز سیستم نقشه‌ها به کنترل سطح دسترسی امن (Map Access Control): امکان تعریف نقشه به صورت عمومی (Public)، شخصی (Private - فقط سازنده)، یا محدود به کاربران مشخص (Restricted).',
      'نمایش نشان‌های امنیتی وضعیت دسترسی (Public/Private/Restricted) در نوار ابزار نقشه‌ها و منوی کشویی انتخاب نقشه.',
      'همگام‌سازی خودکار موقعیت تجهیزات روی بوم شماتیک با اندپوینت‌های اختصاصی /api/settings/node-positions در پایگاه‌داده.',
      'اصلاح کامل استایل و هماهنگی مودال ویرایش مشخصات سخت‌افزاری و کارت‌های شبکه (Edit Hardware Specifications & Network Cards) با تم روشن (Light Theme)، شامل پس‌زمینه، کادرها، فیلدهای ورودی و پیش‌نمایش SVG.',
      'افزودن دکمه مینیمایز (Minimize) به هدر مودال سخت‌افزار و کارت‌های شبکه جهت رعایت استاندارد جهانی مینیمایز تمامی مودال‌ها.'
    ],
    changes_en: [
      'Implemented full database persistence for custom topology maps and canvas node positions with dual PostgreSQL and resilient JSON store support.',
      'Engineered granular Map Access Control allowing maps to be configured as Public, Private (creator only), or Restricted to specified users.',
      'Integrated security visibility indicators and badges (Public/Private/Restricted) into the schematic map selector toolbar.',
      'Synchronized real-time node coordinate dragging and positioning directly with /api/settings/node-positions database endpoints.',
      'Fully resolved light theme styling incompatibilities for Edit Hardware Specifications & Network Cards modal, ensuring crystal-clear contrast across backgrounds, borders, inputs, and SVG preview containers.',
      'Added universal modal minimize button to the Hardware & Network Cards modal header in strict adherence to modal UX guidelines.'
    ]
  },
  {
    version: '1.49.1',
    releaseDate: '2026-09-14',
    type: 'patch',
    title: 'رفع مشکل فریز و توقف اسکریپت نصب آنلاین (curl | bash)، حذف ریدایرکت مخرب ورودی استاندارد و خواندن ایمن TTY',
    title_en: 'Fix Online Piped Installer Execution Hang (curl | bash), Eliminate Broken Stdin Redirection & Ensure Resilient TTY Reading',
    changes: [
      'حذف دستور مخرب exec 0< /dev/tty از ابتدای اسکریپت‌های setup-panel.sh و install.sh که باعث قطع استریم دریافت کدهای بش از دستور curl و هنگ نامحدود نصب می‌شد.',
      'پیاده‌سازی تابع اختصاصی has_usable_tty جهت سنجش واقعی قابلیت خواندن و نوشتن ترمینال تعاملی پیش از تلاش برای ارتباط با کنسول.',
      'بهبود توابع prompt_read و prompt_input جهت خواندن مستقیم مقادیر از /dev/tty در زمان فعال بودن ترمینال و فالبک خودکار هوشمند به مقادیر پیش‌فرض در اجرای غیرتعاملی بدون توقف.',
      'ارتقای روش تشخیص خودکار IP سرور با پوشش کامل ابزارهای ip و hostname به صورت امن در برابر خطاهای pipefail.',
      'تست و اعتبارسنجی جامع رفتار اسکریپت با شبیه‌سازهای PTY در هر دو حالت تعاملی کاربر و پایپ بدون TTY.'
    ],
    changes_en: [
      'Eliminated problematic exec 0< /dev/tty directives from setup-panel.sh and install.sh that prematurely severed the incoming curl bash script stream, resolving the silent installer hang.',
      'Engineered a dedicated has_usable_tty verification function to test real subshell accessibility to /dev/tty before attempting terminal I/O.',
      'Enhanced prompt_read and prompt_input handlers to query /dev/tty directly during interactive executions while seamlessly falling back to default values in automated headless environments.',
      'Fortified network IP auto-detection against pipefail errors utilizing fail-safe fallbacks between ip route and hostname.',
      'Validated end-to-end pipe execution using comprehensive Python pseudo-terminal (PTY) simulations across both interactive and automated streaming modes.'
    ]
  },
  {
    version: '1.49.0',
    releaseDate: '2026-09-14',
    type: 'minor',
    title: 'اصلاح مهندسی پایپ اجرای آنلاین شل (curl | bash)، اتصال مستقیم ترمینال TTY و استقرار تضمینی پایگاه‌داده PostgreSQL',
    title_en: 'Enterprise DevOps Piped Installer Architecture (curl | bash), Guaranteed TTY Terminal Redirection & PostgreSQL Automation',
    changes: [
      'مهندسی مجدد پایپ اجرای آنلاین (curl -sSL ... | sudo bash) با ریدایرکت خودکار ورودی استاندارد (FD 0) به ترمینال تعاملی (/dev/tty) جهت جلوگیری از رد شدن خودکار سوالات.',
      'طراحی مرحله تفکیک‌شده و تعاملی تنظیمات پایگاه داده PostgreSQL شامل نام دیتابیس، نام کاربری، کلمه عبور دیتابیس، پورت و رمز عبور حساب اصلی ادمین.',
      'نصب قطعی پکیج‌های postgresql، postgresql-contrib و postgresql-client به همراه حلقه اعتبارسنجی سوکت سرور پیش از اجرای دستورات.',
      'ایجاد تضمینی کاربر و پایگاه داده با مجوزهای کامل و اجرای مایگریشن جداول backend/schema.sql با ثبت لاگ تعداد جداول آماده‌سازی شده.',
      'همگام‌سازی کامل اسکریپت‌های setup-panel.sh و install.sh برای اطمینان از تجربه نصب یکپارچه در تمام روش‌های اجرای آنلاین و محلی.'
    ],
    changes_en: [
      'Re-engineered online piped installer workflow (curl -sSL ... | sudo bash) with automatic stdin (FD 0) redirection to interactive controlling terminal (/dev/tty).',
      'Created dedicated interactive prompts for PostgreSQL configuration: database name, user credentials, service port, and primary admin password.',
      'Automated resilient installation of postgresql, postgresql-contrib, and client packages with socket readiness verification retry loops.',
      'Provisioned database roles, user permissions, and executed table schema migrations from backend/schema.sql with verified table count logging.',
      'Synchronized setup-panel.sh and install.sh scripts ensuring identical, rock-solid installation outcomes across both online and local execution methods.'
    ]
  },
  {
    version: '1.48.0',
    releaseDate: '2026-09-14',
    type: 'minor',
    title: 'ماتریس نقطه‌ای قاره‌ها روی کره سه‌بعدی لاگین، یکپارچه‌سازی تم‌های ۶‌گانه پنل در صفحه ورود و نصب خودکار پایگاه‌داده PostgreSQL در setup-panel.sh',
    title_en: 'Dot-Matrix Continental Mesh on 3D Globe, Full Login Theme Synchronization with Light Mode & Automated PostgreSQL Provisioning in setup-panel.sh',
    changes: [
      'تولید ماتریس نقاط متراکم و دقیق قاره‌ها (Dot-Matrix Continents) با هندسه ژئودتیک قاره‌های جهان روی کره سه‌بعدی صفحه لاگین با پالس‌های نوری دینامیک.',
      'یکپارچه‌سازی کامل تم‌های پنل در صفحه لاگین شامل منوی تعاملی انتخاب تم با تمام ۶ تم (Obsidian، Emerald، Cobalt، Rose، Amber و Clean Light).',
      'سازگاری و بازطراحی ویژه صفحه لاگین با تم روشن (Light Mode) با فرم سفید شفاف، تایپوگرافی خوانا، هماهنگی رنگ‌های کره، برچسب‌ها و کارت‌های تله‌متری.',
      'به‌روزرسانی اسکریپت اصلی نصب سرور (setup-panel.sh) جهت دریافت تعاملی نام، کاربر، پسورد و پورت پایگاه‌داده PostgreSQL و کلمه عبور کاربر ارشد ادمین.',
      'نصب خودکار بسته‌های PostgreSQL، ایجاد کاربر و پایگاه‌داده، اجرای مایگریشن جداول اسکیما (backend/schema.sql) و ذخیره متغیرها در فایل .env سرور.',
      'همگام‌سازی انتخاب تم لاگین با استیت سراسری پنل مدیریت شبکه بدون نیاز به رفرش صفحه.'
    ],
    changes_en: [
      'Engineered a dense geodetic dot-matrix continental mesh on the 3D rotating globe with dynamic luminosity pulsing and responsive depth culling.',
      'Integrated panel theme synchronization directly into the login screen, featuring a 6-palette switcher (Obsidian, Emerald, Cobalt, Rose, Amber, and Clean Light).',
      'Crafted high-contrast Light Mode styling for the login interface with crystal-clear typography, adapted globe atmosphere, and legible telemetry HUD cards.',
      'Upgraded setup-panel.sh installation script to interactively prompt for PostgreSQL database name, credentials, port, and initial superadmin password.',
      'Automated PostgreSQL package installation, user/db provisioning, database table schema migration (backend/schema.sql), and .env deployment on the server.',
      'Synchronized theme switching seamlessly between the login portal and the core network operations workspace.'
    ]
  },
  {
    version: '1.47.0',
    releaseDate: '2026-09-14',
    type: 'minor',
    title: 'یکپارچه‌سازی پایگاه‌داده پایدار PostgreSQL، صفحه لاگین با انیمیشن سه‌بعدی کره شبکه و احراز هویت دومنظوره محلی و اکتیو دایرکتوری',
    title_en: 'PostgreSQL Database Integration, Interactive 3D Network Globe Login Suite & Dual-Mode Local/Active Directory Authentication',
    changes: [
      'پیاده‌سازی اسکیما و مایگریشن جامع PostgreSQL (backend/schema.sql) برای ذخیره‌سازی پایدار تجهیزات، مپ‌ها، کاربران و ساختار سلسله‌مراتبی فیزیکی.',
      'افزودن پیکربندی تعاملی PostgreSQL در اسکریپت نصب (install.sh) شامل دریافت نام دیتابیس، نام کاربری، کلمه عبور امن و پورت سرویس.',
      'طراحی صفحه لاگین منطبق بر تم‌های پنل با ساختار یک‌چهارم فرم ورود امن و سه‌چهارم انیمیشن سه‌بعدی کره تعاملی شبکه (3D Interactive Network Globe).',
      'پشتیبانی از ورود با حساب محلی با هش‌گذاری امن PBKDF2 و اعتبارسنجی احراز هویت دامین اکتیو دایرکتوری (Active Directory / LDAP).',
      'مدیریت نشست‌های کاربری (AuthContext)، اعتبارسنجی توکن، محدودکننده نرخ ورود (Rate Limiter) در برابر حملات Brute Force و دکمه خروج امن در نوار ناوبری.',
      'همگام‌سازی بلادرنگ مپ‌های سفارشی، سلسله‌مراتب ساختمان و کاربران بین حافظه محلی و پایگاه‌داده سرور جهت حفظ داده در تمام مرورگرها و کلاینت‌ها.'
    ],
    changes_en: [
      'Architected PostgreSQL schema and automated database migrations (backend/schema.sql) for durable persistence of devices, maps, users, and physical hierarchy.',
      'Extended interactive installation script (install.sh) with prompts for PostgreSQL database name, credentials, port, and automatic user/table provisioning.',
      'Engineered an enterprise login experience featuring a 1/4 secure authentication panel and a 3/4 canvas-based 3D rotating network globe with live data packets.',
      'Implemented dual-mode authentication supporting local PBKDF2-hashed credentials and domain Active Directory / LDAP account verification.',
      'Added secure session management (AuthContext), token validation, brute-force rate limiting, and an account logout action in the navigation header.',
      'Automated bidirectional synchronization for custom topology maps, building hierarchies, and user settings between client cache and PostgreSQL backend.'
    ]
  },
  {
    version: '1.46.0',
    releaseDate: '2026-09-14',
    type: 'minor',
    title: 'تکمیل سیستم مینیمایز ترمینال‌ها، رفع سرریز افقی داک، جمع‌شوندگی انیمیشنی در دسته‌بندی و پالس هوشمند پنجره‌های باز',
    title_en: 'Terminal Minimization Completion, Dock Overflow Guard, Animated Category Collapse & Conflict Attention Animation Suite',
    changes: [
      'تجهیز پنجره‌های ترمینال سیسکو (Cisco CLI) و میکروتیک (RouterOS) در هر دو حالت تک‌پنجره و چندپنجره به دکمه مینیمایز در هدر و اتصال کامل به نوار داک پایین.',
      'مهار کامل سرریز افقی نوار ابزار پایین (ToolsDock) در سمت راست صفحه از طریق تعیین سقف عرض بر اساس ویوپورت، اسکرول افقی روان، دکمه‌های پیمایش چپ و راست و پشتیبانی از چرخ ماوس.',
      'رفع باگ عدم نمایش تب‌های جدید پس از استفاده از دکمه «بستن همه» (Close All) در دراپ‌دان دسته‌بندی بدون نیاز به رفرش صفحه از طریق ریست اتمیک فیلترها.',
      'افزودن قابلیت «جمع کردن همه در دسته‌بندی» (Collapse All to Category) با انیمیشن انتقال نرم و امکان بازیابی مستقیم و تکی هر پنجره از داخل منو یا بازگشایی همگانی به نوار داک.',
      'سیستم هشدار بصری و انیمیشن جهنده (Attention Pulse & Bounce) روی تب مینیمایز شده یا نشانگر دسته‌بندی در صورت تلاش کاربر برای باز کردن مجدد پنجره‌ای که در پایین باز است.',
      'رعایت صددرصدی قوانین چندزبانگی (i18n) و تفکیک کامل متون فارسی و انگلیسی در تمامی وضعیت‌ها و اعلان‌ها.'
    ],
    changes_en: [
      'Equipped both Cisco Terminal and MikroTik RouterOS CLI modals (single-pane and multi-pane workspaces) with a dedicated header minimize button and dock integration.',
      'Eliminated dock horizontal screen overflow with strict viewport width bounds, smooth horizontal scrolling, responsive navigation arrows, and mouse wheel support.',
      'Resolved the category state desynchronization bug where minimized modals would not reappear after clicking "Close All" without needing a browser refresh.',
      'Engineered an animated "Collapse All to Category" feature that neatly tucks dock tabs into a compact category indicator with instant individual restore actions.',
      'Implemented an intelligent conflict attention animation (amber bounce, ring, and pulse) on dock tabs or category badges when attempting to open a duplicate active modal.',
      'Enforced 100% strict bilingual localization (FA / EN) without Persian leaks across all indicators, tooltips, and release notes.'
    ]
  },
  {
    version: '1.45.0',
    releaseDate: '2026-09-14',
    type: 'minor',
    title: 'افزودن قابلیت مینیمایز سراسری به تمامی مودال‌های سیستم همراه با نوار داک اشتراکی و سیستم دسته‌بندی و فیلتر هوشمند تب‌ها',
    title_en: 'Universal Modal Minimization Suite with Shared Multi-Modal Dock, Anti-Overlap Layout & Categorized Tab Grouping',
    changes: [
      'تجهیز تمامی مودال‌های برنامه (افزودن تجهیز، ویرایش، مدیریت پورت‌ها، ترمینال‌های چندگانه، اعمال تمپلت و گزارش تغییرات) به دکمه مینیمایز در هدر در کنار دکمه بستن.',
      'طراحی نوار داک اشتراکی شناور (Global Tools & Modals Dock) بدون هرگونه همپوشانی و تداخل افقی پنجره‌های مینیمایز شده.',
      'افزودن سیستم هوشمند دسته‌بندی تب‌های مینیمایز شده (Categorized Dropdown Filter) بر اساس نوع مودال (ابزارهای شبکه، تجهیزات و پورت‌ها، ترمینال‌ها، تمپلت‌ها، سیستم) در صورت پر شدن عرض صفحه یا تعدد پنجره‌ها.',
      'امکان بازیابی یا بستن سریع تب‌های مینیمایز شده به صورت تکی یا گروهی (Restore All / Close All) با حفظ کامل استیت و فرم‌های باز.',
      'تدوین و ثبت سند رسمی استانداردهای توسعه مودال در فایل MODAL_GUIDELINES.md و اعمال قانون اجباری شماره ۵ در فایل‌های دایرکتیو هوش مصنوعی (AGENTS.md و GEMINI.md) جهت تضمین رعایت همیشگی این الگو در تمامی مودال‌های آینده.',
      'رعایت ۱۰۰٪ استانداردهای دو زبانه (فارسی و انگلیسی) و سازگاری کامل با تم‌های تاریک و روشن.'
    ],
    changes_en: [
      'Equipped every modal across the entire application (Add Device, Edit Device, Port Inspector, Multi-Terminal Workspace, Apply Template, Release Notes) with a dedicated minimize button alongside the close button.',
      'Architected an intelligent, shared bottom dock (Global Tools & Modals Dock) ensuring minimized tabs sit side-by-side without overlapping.',
      'Implemented automated categorized tab grouping & filtering (Network Tools, Devices & Ports, Terminals, Templates, System) when dock tabs multiply or exceed viewport width.',
      'Provided single-click tab restoration and individual/bulk closing actions (Restore All / Close All) while preserving form and state persistence.',
      'Published official engineering standards in MODAL_GUIDELINES.md and injected Mandatory Directive Section 5 into AGENTS.md and GEMINI.md to enforce this minimization architecture across all future modal developments.',
      'Enforced strict 100% bilingual localization (FA / EN) and adaptive high-contrast styling across dark and light themes.'
    ]
  },
  {
    version: '1.44.0',
    releaseDate: '2026-09-14',
    type: 'minor',
    title: 'یکپارچه‌سازی ممیزی توان نقشه‌های فیزیکی و تفکیک رک‌ها با محاسبه‌گر توان یو‌پی‌اس و رفع خطای هاست چکر',
    title_en: 'Integration of Physical Maps & Rack Power Auditing with UPS Sizing Calculator and Host Checker Fixes',
    changes: [
      'افزودن امکان انتخاب مستقیم هر یک از نقشه‌های فیزیکی (Physical Maps) در فرم محاسبه‌گر یو‌پی‌اس و نشستن خودکار مجموع توان تمامی رک‌ها و تجهیزات نقشه در فیلد Required Power (Watts).',
      'ایجاد تب سوم اختصاصی «نقشه‌ها و تفکیک رک‌ها (Physical Maps & Racks)» با داشبورد ممیزی جامع الکتریکی و حرارتی اتاق سرور و دیتاسنتر.',
      'محاسبه بلادرنگ شاخص‌های کلیدی توان کل اتاق (Total Room Load)، توان ظاهری (kVA @ PF 0.8)، ظرفیت یوپی‌اس مرکزی پیشنهادی، بار برودتی مورد نیاز (AC Cooling Tons & BTU/h) و جریان فیدر اصلی ورودی (Amps @ 230V).',
      'کارت‌های تعاملی کابینت رک به همراه نمایش ظرفیت یونیت، دسته‌بندی تراکم بار (عادی، متوسط و متراکم > 4.5 kW)، گیج بار حرارتی و دکمه اختصاصی «محاسبه فقط برای این رک» (Size This Rack).',
      'جدول تفصیلی تجهیزات نصب‌شده در هر رک همراه با پوزیشن یونیت، برند، مدل، افزونگی پاور (PSU) و توان مصرفی تخمینی یا اسمی.',
      'امکان جستجوی سریع تجهیزات و فیلترسازی رک‌ها بر اساس توان مصرفی به همراه خروجی و کپی گزارش جامع ممیزی برق کل دیتاسنتر به کلیپ‌بورد.',
      'رفع کامل خطای Endpoint not found در ماژول Host Checker از طریق نرمال‌سازی مسیرهای URL در بک‌اند پایتون و اندپوینت مستقیم Express.',
      'حذف دراپ‌دان تجهیزات توپولوژی در هاست چکر بر اساس درخواست کاربر جهت سادگی و تمیزی رابط کاربری.'
    ],
    changes_en: [
      'Integrated physical maps into the UPS Capacity & Battery Bank Sizing Calculator, automatically aggregating and applying the total power of all racks and equipment directly into Required Power (Watts).',
      'Added a dedicated third tab "Physical Maps & Racks" featuring a complete data center electrical and thermal audit suite.',
      'Implemented real-time calculation of room-level electrical KPIs: Total Room Load (Watts/kW), Apparent Power (kVA @ PF 0.8), Sized Central UPS (kVA), Required AC Cooling Load (Tons & BTU/hr), and Mains Feeder Current (Amps @ 230V).',
      'Engineered interactive rack cabinet cards with U-height badges, power density classification (Standard, Medium, High > 4.5 kW), thermal budget gauges, and a one-click "Size This Rack" UPS sizing action.',
      'Rendered an expandable rack equipment inventory table with unit positions, equipment category, vendor, model, PSU redundancy, and wattage.',
      'Added instant rack/device search, density filters, and one-click comprehensive data center power audit export to clipboard.',
      'Fixed the "Endpoint not found" issue in the Host Checker module via backend Python routing path normalization and direct Express handlers.',
      'Streamlined the Host Checker modal by removing the topology devices dropdown as requested for a cleaner, user-friendly interface.'
    ]
  },
  {
    version: '1.43.0',
    releaseDate: '2026-09-14',
    type: 'minor',
    title: 'افزودن ابزار هاست چکر بین‌المللی (Global Host Checker) با اتصال به API چِک‌هاست و سنجش پینگ از کشورهای مختلف جهان',
    title_en: 'Addition of Global Host Checker Tool to Network Suite with Check-Host.net Multi-Country Ping Diagnostics',
    changes: [
      'افزودن ابزار نهم به مجموعه جعبه‌ابزار مهندسی شبکه تحت عنوان «هاست چکر بین‌المللی» (Global Host Checker).',
      'اتصال مستقیم به API قدرتمند و توزیع‌شده Check-Host.net جهت انجام تست پینگ، اندازه‌گیری میزان تاخیر (RTT) و محاسبه درصد افت پکت (Packet Loss) از سرورهای کشورهای گوناگون جهان (آمریکا، آلمان، ایران، هلند، فرانسه، سوئیس، اندونزی، اسپانیا و...).',
      'نمایش پرچم اختصاصی هر کشور با ایموجی، نام کشور، شهر، آی‌پی نود، ASN و آی‌پی ریزالو شده مقصد.',
      'ردیابی و مصورسازی ۴ نمونه پینگ متوالی برای هر کشور همراه با میلی‌ثانیه‌های دقیق یا برچسب Timeout.',
      'محاسبه بلادرنگ آمارهای کلیدی شامل میانگین تاخیر جهانی (Global Avg Latency)، سریع‌ترین نود (Fastest Node)، کندترین سرور و نرخ پکت لاس کلی شبکه.',
      'سیستم فیلترسازی پیشرفته بر اساس وضعیت سلامت (بدون افت، دارای افت پکت، عدم پاسخ، در حال تست) و مرتب‌سازی بر اساس کمترین/بیشترین تاخیر، نام کشور و بیشترین افت بسته.',
      'پشتیبانی از پیش‌فرض‌های آماده (Cloudflare, Google, Quad9) و امکان انتخاب مستقیم تجهیزات از روی توپولوژی فعال.',
      'قابلیت استخراج و کپی گزارش جامع جدول کشورها به کلیپ‌بورد و دکمه اتصال مستقیم به لینک دائمی گزارش رسمی Check-Host.',
      'هماهنگی صددرصد با هر دو تم تاریک و روشن و پشتیبانی کامل و دوطرفه از زبان‌های فارسی و انگلیسی.'
    ],
    changes_en: [
      'Added the 9th engineering utility to the network Tools Suite: "Global Host Checker" powered by distributed Check-Host.net nodes.',
      'Integrated live multi-country ICMP ping diagnostics, round-trip time (RTT) measurements, and packet loss calculation across worldwide servers (USA, Germany, Iran, Netherlands, Spain, Indonesia, etc.).',
      'Rendered national flags with country emojis, country name, city, node IP, ASN and target resolved IP.',
      'Visualized 4 individual ping samples per node with exact millisecond latency badges and timeout indicators.',
      'Computed live global performance metrics including Global Avg Latency, Fastest Node, Slowest Node, and Overall Packet Loss rate.',
      'Implemented dynamic filtering by node health status (All, OK, Packet Loss, Timeout, In Progress) and multi-field sorting (Fastest First, Slowest First, Country Alphabetical, Highest Loss).',
      'Added quick host presets (Cloudflare, Google Public, Quad9) and direct host import from active network topology devices.',
      'Added one-click comprehensive report export to clipboard and direct link to official permanent Check-Host report.',
      'Delivered pristine Light & Dark theme compatibility with strict bidirectional Persian/English localization.'
    ]
  },
  {
    version: '1.42.0',
    releaseDate: '2026-09-13',
    type: 'minor',
    title: 'افزودن ابزار جامع محاسبه‌گر توان یو‌پی‌اس و سایزینگ بانک باتری شبکه (UPS & Battery Bank Sizing)',
    title_en: 'Addition of UPS Capacity and Battery Bank Sizing Calculator Suite to Network Tools',
    changes: [
      'افزودن ابزار هشتم به مجموعه تولبار شبکه (Tools Suite) جهت محاسبات مهندسی برق و توان دیتاسنتر و اتاق سرور.',
      'محاسبه خودکار تبدیل توان اکتیو وات (Watts) به توان ظاهری (kVA) بر اساس ضریب توان بار (Power Factor: 0.6 تا 1.0) و حاشیه امن رشد تجهیزات (Headroom 25%).',
      'محاسبه دقیق انرژی مورد نیاز بانک باتری (Wh / kWh) و ظرفیت کل آمپرساعت (Ah) بر اساس ولتاژ باس DC یوپی‌اس (12V تا 240V)، راندمان اینورتر و عمق تخلیه مجاز (DoD).',
      'جدول ماتریس مقایسه‌ای باتری‌های استاندارد یو‌پی‌اس (شامل ۱۲ ولت ۲۸ آمپر، ۱۲ ولت ۴۲ آمپر، ۷، ۹، ۱۲، ۱۸، ۶۵، ۱۰۰، ۱۲۰، ۱۵۰ و ۲۰۰ آمپرساعت) با تفکیک تعداد سری در هر استرینگ، تعداد استرینگ‌های موازی و تعداد کل باتری‌های لازم.',
      'قابلیت محاسبه معکوس (Reverse Sizing): تعیین دقیق زمان برق‌دهی (ساعت و دقیقه) با داشتن تعداد و مشخصات باتری‌های موجود برای یک بار معین، یا تعیین حداکثر توان قابل تامین (وات و کاوا) برای یک زمان مورد نظر.',
      'امکان تخمین هوشمند بار مصرفی از روی سوئیچ‌ها و روترهای موجود در توپولوژی شبکه فعلی.',
      'هماهنگی صددرصد با هر دو تم تاریک و روشن با کنتراست استاندارد و خوانایی بالا، به همراه قابلیت کپی گزارش جامع محاسبات مهندسی به کلیپ‌بورد.'
    ],
    changes_en: [
      'Added the 8th network engineering tool: UPS Capacity & Battery Bank Sizing Calculator to the footer Tools Suite.',
      'Engineered live active load conversion from Watts to apparent power (kVA) using adjustable Power Factor (0.6 - 1.0) with configurable 25% safety headroom.',
      'Calculated total battery bank energy requirement (Wh/kWh) and Ah capacity across variable DC bus voltages (12V through 240V), inverter efficiency, and Depth of Discharge (DoD).',
      'Implemented full standard UPS battery comparison matrix (including 12V 28Ah, 12V 42Ah, 7Ah, 9Ah, 12Ah, 18Ah, 65Ah, 100Ah, 150Ah, and 200Ah) displaying series count per string, parallel strings, and total battery units.',
      'Implemented full Reverse Sizing mode: given existing battery count and specs, calculate exact backup runtime (hours & minutes) for a given load, or find maximum supported wattage/kVA for a target duration.',
      'Added one-click active equipment power estimation from active network topology switches and routers.',
      'Delivered full Light & Dark mode adaptive styling with high color contrast, plus one-click formatted engineering sizing report export to clipboard.'
    ]
  },
  {
    version: '1.41.1',
    releaseDate: '2026-09-13',
    type: 'patch',
    title: 'رفع مشکل کشیدگی ارتفاع مودال تولید پسورد و اصلاح چیدمان فیلدهای اسکنر پورت TCP',
    title_en: 'Fix Height Overflow on Password Generator and Layout Conflict in TCP Port Scanner Modal',
    changes: [
      'رفع مشکل ارتفاع بیش از حد در مودال Password Generator با اعمال محدودیت max-h-[82vh]، اسکرول‌پذیری روان محتوا و قرارگیری لایه رویی با z-[60] جهت عدم تداخل با هدر و فوتر.',
      'اصلاح چیدمان فرم در مودال TCP Socket Port Scanner و جداسازی تکس‌باکس پورت و دراپ‌دان انتخاب تجهیزات توپولوژی به ستون‌های مستقل شبکه جهت جلوگیری از هرگونه همپوشانی فیلدها.',
      'ارتقای لایه z-index تمامی ابزارهای هفت‌گانه شبکه به z-[60] برای جلوگیری از رفتن زیر المان‌های چسبان و نوارهای وضعیت.'
    ],
    changes_en: [
      'Resolved vertical overflow in Password Generator modal by enforcing max-h-[82vh], smooth interior scrolling, and z-[60] overlay positioning to prevent clipping behind headers and footers.',
      'Fixed layout conflict in TCP Socket Port Scanner modal by separating the Port input and Topology Device dropdown into dedicated CSS grid columns with responsive alignment.',
      'Enhanced overlay layering across all network tools modals to z-[60] ensuring proper display above sticky status bars and headers.'
    ]
  },
  {
    version: '1.41.0',
    releaseDate: '2026-09-13',
    type: 'minor',
    title: 'افزودن مجموعه ابزارهای کمکی مهندسی شبکه (Tools Suite) در فوتر با قابلیت منوی کشویی رو به بالا، داک مینیمایز و ۷ ابزار پیشرفته شبکه',
    title_en: 'Addition of Network Engineering Tools Suite in Footer with Bottom-up Menu, Minimized Tools Dock and 7 Advanced Network Utilities',
    changes: [
      'افزودن دکمه Tools در فوتر نرم‌افزار با منوی بازشونده از پایین به بالا (Bottom-up Popup Menu) جهت دسترسی سریع به ابزارهای عملیاتی شبکه.',
      'پیاده‌سازی ابزار جامع ساب‌نتینگ آی‌پی (IP Subnetting & VLSM Calculator) شامل ماسک‌های شبکه، دامنه آی‌پی‌های قابل اختصاص، برادکست، ماسک وایلدکارت، نمایش باینری، جدول کامل مرجع CIDR و محاسبه‌گر زیرشبکه‌بندی متغیر (VLSM).',
      'طراحی سیستم مدیریت وضعیت مودال‌ها با قابلیت مینیمایز و بستن همزمان، و نوار داک شناور پایین صفحه (Tools Dock) برای حفظ داده‌ها و جابجایی بدون وقفه میان کار با توپولوژی و ابزارها.',
      'افزودن ابزار تولیدکننده پسورد تجهیزات (Password Generator) با تنظیم طول، آنتروپی بیت و حالت‌های امنیتی اختصاصی Cisco Secret5/Type7 و MikroTik RouterOS.',
      'افزودن اسکنر پورت‌های TCP با پروب‌های مالتی‌ترد زنده سوکت روی آدرس‌های شبکه و تجهیزات توپولوژی به همراه پورت‌های رایج شبکه.',
      'افزودن ابزارهای DNS و پینگ زنده با قابلیت رکوردگیری A, AAAA, MX, TXT, NS, CNAME, SOA, PTR، محاسبه RTT و پکت‌لاس.',
      'افزودن ردیابی مسیر Traceroute زنده با دیاگرام گرافیکی تاخیر هاپ‌ها و سوئیچ به خروجی ترمینال.',
      'افزودن بازرس گواهی‌های امنیتی SSL/TLS (Cert Lookup) جهت بازرسی زنجیره X.509، تاریخ انقضا و SANs.',
      'افزودن تحلیلگر هدرهای وب و امنیت HTTP با ارزیابی امتیاز و گرید امنیتی طبق استانداردهای OWASP.'
    ],
    changes_en: [
      'Added a dedicated "Tools" button in the application footer with a smooth bottom-up flyout menu for quick access to network engineering tools.',
      'Implemented a comprehensive IP Subnetting & VLSM Calculator featuring subnet mask parsing, usable host range, broadcast calculation, wildcard masks, full binary visualization, CIDR reference matrix, and dynamic VLSM subdividing.',
      'Engineered a persistent multi-tool window state manager with Minimize, Restore, and Close controls, supported by a bottom dock bar that preserves user input while interacting with the network canvas.',
      'Added Network Device Password Generator with customizable entropy, length, and Cisco/MikroTik safe character modes.',
      'Added live multi-threaded TCP socket Port Scanner supporting device presets and custom IP targets.',
      'Added real-time DNS Record Query and ICMP Ping inspector with latency and packet loss metrics.',
      'Added live Traceroute & Hop Path Analyzer featuring hop-by-hop latency profiling and terminal output toggle.',
      'Added SSL/TLS Certificate Inspector for X.509 chains, expiration tracking, TLS ciphers, and SANs.',
      'Added HTTP Response & Security Header Analyzer with OWASP security grading and audit matrix.'
    ]
  },
  {
    version: '1.40.2',
    releaseDate: '2026-09-13',
    type: 'patch',
    title: 'اصلاح کامل هماهنگی رنگ‌ها و سازگاری مودال‌های ویرایش مشخصات تجهیز و اعمال تعاملی تمپلیت با تم روشن',
    title_en: 'Full Light Mode Color Scheme and Polish for Edit Device Properties and Interactive Template Deployment Modals',
    changes: [
      'اصلاح ساختار بصری و هماهنگی رنگی کامل مودال Edit Device Properties با تم روشن شامل کارت‌ها، تب‌ها، فیلدها و کادرهای اطلاعاتی.',
      'سازگاری کامل مودال Interactive Template Deployment با تم روشن شامل مراحل تعاملی، تاییدیه‌ها، سلکتورها و ویرایشگر متغیرها.',
      'افزودن شناسایی خودکار وضعیت تم روشن از طریق کلاس HTML و ویژگی سراسری panelTheme برای تمامی زیرمودال‌ها.'
    ],
    changes_en: [
      'Refined visual layout and full light mode color harmony for Edit Device Properties modal, including tabs, cards, inputs, and information banners.',
      'Fully styled Interactive Template Deployment modal for light mode across interactive variable inputs, verification cards, and selectors.',
      'Added dynamic light mode detection via document element class and global panelTheme state for seamless rendering across modals.'
    ]
  },
  {
    version: '1.40.1',
    releaseDate: '2026-09-13',
    type: 'patch',
    title: 'حذف شبیه‌سازهای ساختگی و الزام اتصال به سخت‌افزار واقعی در ترمینال و پورت‌ها',
    title_en: 'Elimination of Mock Emulation and Enforcement of Real Hardware Connectivity',
    changes: [
      'حذف کامل فال‌بک شبیه‌سازی ساختگی در ترمینال میکروتیک و سیسکو و الزام به برقراری ارتباط واقعی سوکت و SSH با تجهیز فیزیکی.',
      'رد دستورات ترمینال در زمان قطعی اتصال و نمایش صریح وضعیت DISCONNECTED / UNREACHABLE به جای پاسخ‌های فیک محلی.',
      'بهبود بخش مدیریت پورت‌ها با تفکیک برچسب‌های سخت‌افزار زنده (LIVE HARDWARE)، انبار ذخیره‌شده و تجهیز غیرقابل دسترس (OFFLINE).',
      'پاکسازی خودکار و بستن نشست‌های فعال سوکت و وب‌سوکت هنگام بستن مودال ترمینال.'
    ],
    changes_en: [
      'Completely removed mock emulation fallbacks in MikroTik and Cisco terminals, enforcing authentic socket and SSH connections to physical hardware.',
      'Explicitly reject CLI commands during disconnected states and display prominent DISCONNECTED / UNREACHABLE badges instead of mock outputs.',
      'Enhanced Port Management view with explicit badges distinguishing LIVE HARDWARE, SAVED INVENTORY, and OFFLINE / UNREACHABLE states.',
      'Implemented clean teardown and termination of active streaming WebSocket and SSH socket sessions when closing terminal modals.'
    ]
  },
  {
    version: '1.40.0',
    releaseDate: '2026-09-13',
    type: 'minor',
    title: 'تبدیل ترمینال تجهیزات شبکه از حالت شبیه‌سازی به اتصال سخت‌افزاری واقعی SSH و Telnet',
    title_en: 'Real Hardware SSH & Telnet Live Connection for Network Equipment Inventory Terminals',
    changes: [
      'تبدیل ترمینال تجهیزات شبکه در بخش Network Equipment از حالت شبیه‌سازی محلی (Mock) به اتصال سوکت واقعی سخت‌افزاری با پشتیبانی کامل از پروتکل‌های SSH و Telnet.',
      'پیاده‌سازی موتور نشست ترمینال در بک‌اند (Python Network Terminal Session Manager) همراه با پراکسی امن وب‌سوکت برای استریم زنده دوطرفه و PTY تعاملی.',
      'افزودن سلکتور انتخاب پروتکل اتصال (SSH / Telnet) در فرم و مودال ثبت و ویرایش تجهیزات شبکه بدون تغییر ساختار UI.',
      'اتصال خودکار نشست‌های ترمینال میکروتیک و سیسکو به سخت‌افزار واقعی با حفظ قابلیت فال‌بک خودکار به شبیه‌ساز آفلاین در صورت عدم دسترسی به تجهیز.',
      'افزودن نشانگر وضعیت اتصال لایو (LIVE SSH / LIVE TELNET) و پینگ تاخیر لحظه‌ای در هدر ترمینال با تفکیک کامل زبان‌های فارسی و انگلیسی.'
    ],
    changes_en: [
      'Converted the Network Equipment Inventory terminal from local mock simulation to real hardware socket connections supporting both SSH and Telnet protocols.',
      'Implemented the Python Network Terminal Session Manager backend engine with WebSocket streaming proxy for bidirectional live interactive PTY sessions.',
      'Added connection protocol selector (SSH / Telnet) in the existing device registration and edit modals seamlessly within current UI workflows.',
      'Integrated live hardware execution into both MikroTik and Cisco terminal modals with graceful automatic fallback to offline emulation when devices are unreachable.',
      'Added dynamic live connection status badges (LIVE SSH / LIVE TELNET) and real-time latency indicators in the terminal header with strict bilingual localization.'
    ]
  },
  {
    version: '1.39.2',
    releaseDate: '2026-09-13',
    type: 'patch',
    title: 'اصلاح و سازگاری کامل مودال ویرایش و مشخصات سخت‌افزاری و کارت‌های شبکه با تم روشن',
    title_en: 'Full Light Mode Compatibility for Edit Hardware Specifications & Network Cards Modal',
    changes: [
      'اصلاح رنگ پس‌زمینه، حاشیه‌ها، هدر و دکمه‌های بستن و انصراف در مودال ویرایش مشخصات سخت‌افزاری و کارت‌های شبکه در تم روشن.',
      'روشن و خوانا شدن پس‌زمینه فرم‌ها، کارت‌های انبار تجهیزات، تب‌های کاتالوگ سخت‌افزار و پیش‌نمایش‌ها مطابق استانداردهای تم روشن.',
      'اصلاح رنگ و کنتراست اینپوت‌ها، سلکتورها و دراپ‌داون‌های پیکربندی یونیت‌ها، پاورها و کارت‌های شبکه به همراه پشتیبانی کامل چندزبانه (fa/en).'
    ],
    changes_en: [
      'Adapted modal background, borders, header, close, and action buttons in Edit Hardware Specifications & Network Cards for light theme.',
      'Refactored form backgrounds, inventory cards, hardware catalog tabs, and preview containers for high contrast and readability in light mode.',
      'Polished inputs, select dropdowns, unit placement controls, PSU load calculations, and NIC configuration cards with full bilingual i18n support.'
    ]
  },
  {
    version: '1.39.1',
    releaseDate: '2026-09-13',
    type: 'patch',
    title: 'اصلاح استایل کادر آپدیت در تاریخچه نسخه‌ها و رنگ متون رک در تم روشن',
    title_en: 'Release Notes Update Banner Styling and Rack Metric Typography Alignment in Light Mode',
    changes: [
      'اصلاح کادر اعلان آپدیت در مودال Version History & Release Notes در تم روشن و هماهنگ‌سازی رنگ زمینه و حاشیه آن با کارت‌های Installed Version History بدون گرادیانت.',
      'مشکی و پررنگ شدن کامل نوشته‌های داخل کادر آپدیت، نسخه جدید، برچسب Update و لیست تغییرات نسخه در تم روشن.',
      'سفید شدن رنگ متن نام رک و مجموعه وات توان مصرفی در تم روشن.',
      'تغییر رنگ عنوان Total Rack Power Load و جزییات فنی به خاکستری روشن در تم روشن.',
      'تغییر رنگ بج تعداد و درصد یونیت‌های اشغالی رک و مشخصات یونیت و عمق زیر نام رک به خاکستری روشن در تم روشن.'
    ],
    changes_en: [
      'Restyled the update banner in the Version History & Release Notes modal in light mode to match the clean background and border styling of Installed Version History cards without gradients.',
      'Ensured high-contrast black typography for update notes, version badges, update tags, and change list items in light mode.',
      'Set rack name and total power load wattage to crisp white in light mode.',
      'Set the "Total Rack Power Load" label and electrical specifications to light gray in light mode.',
      'Set the rack unit occupancy percentage badge and the unit/depth subtitle beneath the rack name to light gray in light mode.'
    ]
  },
  {
    version: '1.39.0',
    releaseDate: '2026-09-13',
    type: 'minor',
    title: 'قابلیت جابه‌جایی چند یونیته تجهیزات رک، اصلاح هایلایت شفاف هاور و مشکی شدن فلش‌های انتقال در تم روشن',
    title_en: 'Multi-Unit Rack Device Step Movement, Transparent Hover Highlight and High-Contrast Black Move Arrows in Light Mode',
    changes: [
      'افزودن قابلیت جابه‌جایی چند یونیته (Multi-Unit Move) به دکمه‌های Move Up و Move Down در منوی هاور تجهیزات رک با امکان انتخاب گام حرکتی (۱ تا ۵ یونیت).',
      'اصلاح هایلایت هاور روی تجهیزات رک در تم روشن به صورت کادر شفاف و بدون پوشش رنگ سفید مات تا دیوایس به صورت صددرصد واضح و خوانا زیر هاور دیده شود.',
      'اصلاح کامل دکمه‌های انتقال به بالا و پایین (Move Up / Move Down) در تم روشن با فلش‌های مشکی پررنگ و برجسته و ضخامت خط بیشتر برای وضوح بصری کامل.',
      'همگام‌سازی بلادرنگ موقعیت هایلایت دیوایس همزمان با جابه‌جایی به بالا یا پایین در رک.'
    ],
    changes_en: [
      'Added multi-unit step movement (1U to 5U) to the Move Up and Move Down buttons on the rack device hover action menu.',
      'Fixed the rack device hover highlight in light theme with a transparent fill and distinct border so hardware faceplates remain 100% visible and un-obscured.',
      'Rendered bold, high-contrast dark black arrows for Move Up and Move Down buttons in light theme with increased stroke weight.',
      'Synchronized real-time device highlight positioning when shifting devices across rack units.'
    ]
  },
  {
    version: '1.38.5',
    releaseDate: '2026-09-13',
    type: 'patch',
    title: 'اصلاح رنگ و خوانایی نوشته‌های منوی هاور دیوایس‌های رک و دکل در تم روشن',
    title_en: 'High-Contrast Text and Button Legibility for Rack and Tower Device Hover Menus in Light Mode',
    changes: [
      'اصلاح و روشن‌سازی کامل رنگ متون، تایتل تجهیز، مدل، شماره یونیت (U-Slot) و برچسب دکمه‌های منوی هاور دیوایس‌های رک (مانند مشخصات، کانفیگ، خط فرمان، پورت، کارت و انتقال) در تم روشن.',
      'جلوگیری از تاریک‌شدن متون داخل منوی هاور شناور تجهیزات رک توسط استایل‌های عمومی تم روشن و ایجاد رنگ‌های درخشان و با کنتراست بالا مطابق تم تیره.',
      'اصلاح رنگ عنوان، توضیحات و دکمه‌های مدال تایید حذف تجهیز از رک در تم روشن برای خوانایی کامل.',
      'بهینه‌سازی نمایش مشخصات و دکمه‌های هاور رادیوهای متصل به دکل در تم روشن.'
    ],
    changes_en: [
      'Fixed and brightened text colors, device title, model, U-slot badge, and action button labels (Props, Config, CLI, Port, Card, Transfer) on the rack device hover menu in light mode.',
      'Prevented global light theme styles from darkening text inside the floating quick actions menu, ensuring vivid high-contrast colors matching dark theme.',
      'Enhanced typography and button contrast for the rack device removal confirmation modal in light mode.',
      'Optimized tower radio device hover cards for clear, legible text in light theme.'
    ]
  },
  {
    version: '1.38.4',
    releaseDate: '2026-09-13',
    type: 'patch',
    title: 'محو شوندگی و بسته شدن خودکار اعلان سوئیچ بین نماها و رفع کنتراست تاریخچه نسخه‌ها در تم روشن',
    title_en: 'Auto Fade-Out for View Switch Notifications and High-Contrast Typography for Release History in Light Theme',
    changes: [
      'پیاده‌سازی حالت محو شوندگی (Fade-out) و بسته شدن خودکار اعلان‌های سوئیچ بین نماها (مانند انتقال به نمای فیزیکی، کارتی و رک) ظرف ۳ ثانیه به طوری که دید نقشه شماتیک مسدود نشود.',
      'اصلاح تایپوگرافی و کنتراست متن Installed Version History و یادداشت‌های تغییرات در تم روشن به رنگ مشکی پررنگ و خوانا.',
      'بهینه‌سازی تگ‌ها، نشانگرها، تاریخ و دکمه‌های پاورقی مدال تاریخچه نسخه‌ها در تم روشن برای وضوح بصری کامل.'
    ],
    changes_en: [
      'Implemented smooth fade-out and auto-dismissal for view switch feedback notifications (Card, Physical, Rack) within 3 seconds so schematic view is never obstructed.',
      'Fixed light mode text contrast in Installed Version History and release notes cards with high-contrast black typography.',
      'Enhanced tags, badges, calendar metadata, and footer buttons in the Release Notes modal for pristine legibility in light theme.'
    ]
  },
  {
    version: '1.38.3',
    releaseDate: '2026-09-13',
    type: 'patch',
    title: 'همگام‌سازی کامل تم تیره و روشن در نقشه، حذف آیکون چشم کارت‌ها و رفع باگ‌های بصری نوتیفیکیشن و جریان داده',
    title_en: 'Theme Parity for Topology Modals, Eye Icon Removal, and Light Theme Text Contrast Fixes',
    changes: [
      'حذف آیکون چشم از دکمه مشاهده فیزیکی در پایین کارت‌ها در نمای شماتیک جهت رفع افزونگی بصری.',
      'همگام‌سازی کامل تم تیره در مدال Create New Topology Map (CustomMapManageModal) و مدال‌های رک/دکل برای همخوانی با تم مشکی.',
      'اصلاح رنگ متن و آیکون گزینه جریان داده (Data Flow) در تم روشن به رنگ سفید خالص جهت خوانایی کامل.',
      'اصلاح استایل و کانتراست اعلان سوئیچ به نمای فیزیکی (Switched to Physical View) در تم روشن با پس‌زمینه و تایپوگرافی سازگار.',
      'اصلاح دکمه‌های غیرفعال سوئیچ نمای کارت و فیزیکی و برچسب Add Note در تم روشن نقشه سفارشی با متن سفید واضح.',
      'رفع قطعی فالبک متون فارسی در اعلان آپدیت پروفایل و تاریخچه نسخه‌ها در حالت زبان انگلیسی مطابق قانون چندزبانگی.'
    ],
    changes_en: [
      'Removed redundant eye icon from the Physical view button on device cards in schematic view.',
      'Full dark theme parity for Create New Topology Map modal and Rack/Tower management modals.',
      'Enhanced Data Flow toggle in light theme with high-contrast white text and white icon.',
      'Redesigned Switched to Physical View feedback toast with proper light mode background and legible typography.',
      'Ensured inactive Card/Physical view switch buttons and Add Note labels render with clear white text in light theme.',
      'Eliminated Persian text fallbacks in the profile dropdown update notification and historical release notes when English is active.'
    ]
  },
  {
    version: '1.38.2',
    releaseDate: '2026-09-13',
    type: 'patch',
    title: 'اصلاح نمایش زبان اعلان‌های به‌روزرسانی در منوی پروفایل و ثبت قانون اجباری چندزبانگی',
    title_en: 'Enforce Language-Aware Update Notifications in Profile Menu and Add Mandatory Localization Rule',
    changes: [
      'اصلاح پیام اعلان آپدیت در پنجره بازشوی پروفایل تا در حالت زبان انگلیسی، عنوان انگلیسی ریلیز (title_en) نمایش داده شود و هیچ متنی به فارسی دیده نشود.',
      'افزودن لاگ‌های دوزبانه در فرآیند اجرای به‌روزرسانی در UpdateContext.',
      'ثبت قانون اجباری قطعی در مستندات AGENTS.md و GEMINI.md مبنی بر ممنوعیت کامل نمایش هرگونه متن فارسی در حالت زبان انگلیسی در تمامی بخش‌های پنل.'
    ],
    changes_en: [
      'Fixed profile dropdown update notification banner to display the English release title (title_en) when English language is active.',
      'Added language-aware update execution logs and error feedback in UpdateContext.',
      'Added strict permanent localization rule in AGENTS.md and GEMINI.md prohibiting any Persian text when the application is set to English.'
    ]
  },
  {
    version: '1.38.1',
    releaseDate: '2026-09-13',
    type: 'patch',
    title: 'حذف آیکون چشم تکراری از هدر کارت‌ها در نمای کارت شماتیک و ساده‌سازی رابط کاربری',
    title_en: 'Remove Redundant Eye Icon from Device Card Header in Schematic View',
    changes: [
      'حذف دکمه آیکون چشم اضافی از هدر کارت تجهیزات در نمای شماتیک به دلیل عملکرد کاملاً یکسان با گزینه «فیزیکی» (Physical) در پایین کارت.',
      'بهینه‌سازی فضای نوار وضعیت بالای کارت و یکپارچه‌سازی دسترسی به نمای فیزیکی و رک.'
    ],
    changes_en: [
      'Removed redundant eye icon button from the device card header in schematic card view, consolidating navigation through the dedicated Physical action button.',
      'Streamlined card status bar layout and improved UI clarity.'
    ]
  },
  {
    version: '1.38.0',
    releaseDate: '2026-09-13',
    type: 'minor',
    title: 'سیستم هوشمند بررسی به‌روزرسانی مخزن، نشانگر اعلان قرمز روی پروفایل و ارتقای خودکار پنل با یک کلیک',
    title_en: 'Automated Repository Update Checker, Pulsating Profile Notification, and One-Click In-Panel Updater',
    changes: [
      'پیاده‌سازی اندپوینت‌های سرور (/api/system/check-update و /api/system/perform-update) جهت پایش برخط مخزن Net-Management و مقایسه نگارش با سمانتیک ورژن.',
      'افزودن نشانگر چشمک‌زن قرمز پویا (Pulsating Red Ping Dot) روی آیکون پروفایل و کارت مدیریت در هدر پنل هنگام انتشار نسخه جدید.',
      'امکان کلیک روی نشانگر و مشاهده کارت رسمی نگارش جدید شامل تاریخ انتشار، نوع ارتقا و لیست کامل تغییرات (Release Notes).',
      'پیاده‌سازی دکمه و موتور اجرای خودکار ارتقا (One-Click Update Engine) با فرآیند همگام‌سازی فایل‌های مخزن، نصب پکیج‌ها، بازسازی پروژکشن باندل و تازه‌سازی خودکار صفحه.',
      'افزودن امکان تست و شبیه‌سازی اعلان آپدیت (Simulate Update Alert) جهت بررسی بصری عملکرد بدون نیاز به انتظار برای انتشار نسخه جدید.'
    ],
    changes_en: [
      'Implemented server-side endpoints (/api/system/check-update and /api/system/perform-update) for live GitHub Net-Management repository tracking and SemVer evaluation.',
      'Added a dynamic pulsating red indicator badge on the profile avatar and navigation header when a new release is available.',
      'Interactive release note preview modal detailing new features, changes, and release dates directly from the repository.',
      'Integrated one-click in-panel software updater with repository synchronization, package installation, build re-generation, and automated interface refresh.',
      'Added simulated update testing mode for developer demonstration and verification.'
    ]
  },
  {
    version: '1.37.1',
    releaseDate: '2026-09-13',
    type: 'patch',
    title: 'به‌روزرسانی آدرس‌های مخزن، لینک‌های نصب و حذف خودکار One-Liner و اسکریپت‌های سرور به Net-Management',
    title_en: 'Update Repository URLs, Automated One-Liner Install/Uninstall Commands, and Server Scripts to Net-Management',
    changes: [
      'به‌روزرسانی کامل لینک‌های نصب تک‌خطی (One-Liner Install) با دستور curl و bash در فایل README.md بر اساس مخزن جدید Net-Management.',
      'به‌روزرسانی دستور اسکریپت حذف و پاک‌سازی پنل (Uninstall-panel.sh) متصل به مخزن Net-Management.',
      'اصلاح آدرس‌های گیت کلون، سورس‌های پشتیبان ZIP و پروکسی‌های آینه در اسکریپت setup-panel.sh و uninstall-panel.sh.',
      'به‌روزرسانی نشان‌ها (Badges) و دستورالعمل‌های کامیت گیت در مستندات AI_INSTRUCTIONS.md.'
    ],
    changes_en: [
      'Updated automated one-liner curl installation commands in README.md to reference the Net-Management repository.',
      'Updated the automated uninstallation suite command (uninstall-panel.sh) linked to the Net-Management repository.',
      'Adjusted git clone targets, mirror proxies, and fallback ZIP download URLs in setup-panel.sh and uninstall-panel.sh.',
      'Updated repository badges and git workflow references in AI_INSTRUCTIONS.md.'
    ]
  },
  {
    version: '1.37.0',
    releaseDate: '2026-09-13',
    type: 'minor',
    title: 'افزودن مجموعه کامل رادیوهای وایرلس میکروتیک به کاتالوگ سخت‌افزار و استقرار دکل مخابراتی به‌صورت سازه مستقل بیرون از رک روی نقشه',
    title_en: 'Add Complete MikroTik Wireless Radio Suite to Hardware Catalog & Independent Telecom Tower Map Entity',
    changes: [
      'افزودن مجموعه متنوع رادیوهای وایرلس میکروتیک (MikroTik Wireless Radios) به کاتالوگ سخت‌افزار شامل مدل‌های NetMetal ax (Wi-Fi 6)، NetMetal 5، NetBox 5، BaseBox 2/5، LHG 5 ac، LHG XL 5 ac، SXTsq 5 ac، QRT 5 ac، DISC Lite5 ac، Cube 60Pro ac، mANTBox 19s/15s، wAP ac و Groove 52 ac همراه با کانکتورهای RP-SMA و پورت‌های شبکه گیگابیت و ۲.۵G.',
      'تثبیت دکل مخابراتی به عنوان یک سازه فیزیکی مستقل روی نقشه (مانند رک): دکل‌ها روی بوم نقشه با فریم مستقل قرار می‌گیرند و به هیچ وجه داخل رک نصب نمی‌شوند.',
      'فیلتر هوشمند دسته‌بندی دکل‌های مخابراتی در مدال افزودن سخت‌افزار رک (Add Hardware to Rack) جهت جلوگیری قطعی از انتخاب اشتباه دکل درون یونیت‌های رک سرور.',
      'توسعه مدال‌های اختصاصی افزودن و نصب رادیو و آنتن روی دکل (AddTowerModal و MountRadioOnTowerModal) با قابلیت انتخاب رادیو از کاتالوگ میکروتیک یا سخت‌افزارهای موجود در اینونتوری، تنظیم جهت پرتو (Azimuth)، زاویه شیب (Tilt) و ارتفاع نصب روی دکل.',
      'عدم نمایش تکراری تجهیزات نصب‌شده روی دکل در بوم نمای فیزیکی و هماهنگی ابعاد فریم دکل با تمامی سکتورها و دیش‌های متصل.'
    ],
    changes_en: [
      'Added comprehensive MikroTik wireless radio models to the hardware catalog, including NetMetal ax (Wi-Fi 6), NetMetal 5, NetBox 5, BaseBox 2/5, LHG 5 ac, LHG XL 5 ac, SXTsq 5 ac, QRT 5 ac, DISC Lite5 ac, Cube 60Pro ac, mANTBox 19s/15s, wAP ac, and Groove 52 ac with RP-SMA connectors, PoE, and 2.5G/Gigabit ports.',
      'Secured telecom towers as first-class, independent physical entities placed directly on the topology map canvas, completely separate from server racks.',
      'Strictly filtered out telecom tower categories from the Rack Hardware Installation modal to prevent any accidental placement of towers inside rack units.',
      'Enhanced dedicated AddTowerModal and MountRadioOnTowerModal components supporting direct radio mounting from MikroTik catalog or existing inventory, with azimuth direction, tilt degrees, and elevation settings.',
      'Prevented duplicated floating icons on the canvas for radios mounted on telecom towers, and broadened the foreignObject container boundaries for crisp rendering of all mounted sectors and parabolic dishes.'
    ]
  },
  {
    version: '1.36.0',
    releaseDate: '2026-09-13',
    type: 'minor',
    title: 'سوییچ خودکار به نمای فیزیکی هنگام افزودن رک/دکل، حذف اتمیک دیوایس از کارت و فیزیکال، و غیرفعال‌سازی هوشمند تجهیزات نصب‌شده در اینونتوری',
    title_en: 'Auto-Switch to Physical View on Rack/Tower Creation, Unified Atomic Device Removal Across Views, and Greying Out Mounted Inventory Equipment',
    changes: [
      'تغییر خودکار و بلادرنگ حالت نقشه به نمای فیزیکال (Physical View) در هنگام انتخاب و ایجاد رک یا دکل در وضعیت خالی بودن نقشه سفارشی (Custom Map Canvas is Empty).',
      'حذف کاملاً یکپارچه و اتمیک تجهیزات در دکمه Remove from map: حذف همزمان از نمای کارتی (شناسه‌ها، پوزیشن‌ها و کابل‌های متصل) و نمای فیزیکال (تمامی اسلات‌های رک‌ها و دکل‌ها).',
      'خاکستری شدن و غیرفعال‌سازی تجهیزات در تب تجهیزات موجود (Inventory Equipment) هنگام نصب سخت‌افزار در رک یا دکل جهت جلوگیری از انتخاب تکراری همراه با نمایش وضعیت «نصب‌شده در رک/دکل».',
      'پشتیبانی کامل از ایجاد، جابجایی درگ‌اند‌دراپ و مدیریت دکل‌های مخابراتی (Telecom Towers & Masts) و نصب رادیوهای وایرلس روی بوم نقشه‌های سفارشی.'
    ],
    changes_en: [
      'Automatic real-time view mode switch to Physical View when adding a server rack or telecom tower from an empty custom map canvas or infrastructure toolbar.',
      'Atomic and unified device removal via "Remove from map": cleans up devices synchronously from Card View (IDs, positions, and cables) and Physical View (all rack slots and tower mounts).',
      'Smart greying out and disabling of already mounted equipment in the Inventory Equipment tab, preventing duplicate placement with a clear "Already Mounted" indicator tag.',
      'Full custom map support for Telecom Towers & Masts with drag-and-drop canvas positioning, wireless radio mounting, and physical infrastructure inspection.'
    ]
  },
  {
    version: '1.35.0',
    releaseDate: '2026-09-12',
    type: 'minor',
    title: 'انتقال معکوس از نمای کارتی به نمای فیزیکی با آیکون چشم و افکت نئونی چرخشی روی سخت‌افزار/رک',
    title_en: 'Reverse Navigation from Card View to Physical View with Eye Icon & Rotating Neon Hardware Beam',
    changes: [
      'افزودن آیکون چشم (Eye Icon) در بالای کارت دیوایس‌ها در نمای کارتی و همچنین دکمه اکشن «فیزیکی» در بخش پایینی کارت جهت جابجایی بلادرنگ به نمای فیزیکی.',
      'مکان‌یابی هوشمند دیوایس در نمای فیزیکی: هدایت بوم به سمت رک مدنظر (در صورت نصب بودن دستگاه در رک) یا شاسی مستقل دستگاه و فعال‌سازی افکت نئونی چرخشی ۳ ثانیه‌ای دور تا دور اسلات یا شاسی سخت‌افزاری.',
      'افزودن نشان متحرک هدف (Target Hardware Badge) روی اسلات رک یا شاسی دستگاه در نمای فیزیکی جهت تشخیص فوری سخت‌افزار مدنظر.',
      'پشتیبانی از نمای فیزیکی بر مبنای ساختمان و طبقات با اسکرول خودکار و اعمال کادر نئونی چرخشی روی کارت دستگاه در پنل فیزیکی.'
    ],
    changes_en: [
      'Added a dedicated Eye icon in the device card header and a "Physical" action button in Card View for instant reverse navigation to the Physical View.',
      'Intelligent physical device localization: automatically pans the viewport to the host rack cabinet (if mounted) or standalone chassis and ignites the 3-second rotating neon border beam around the hardware slot.',
      'Integrated floating "Target Hardware" badge on the targeted rack slot or physical chassis for immediate visual recognition.',
      'Full compatibility with building and floor physical view, featuring smooth auto-scroll and rotating neon border beam on equipment hierarchy cards.'
    ]
  },
  {
    version: '1.34.1',
    releaseDate: '2026-09-12',
    type: 'patch',
    title: 'چرخش پرتو نئونی دور تا دور بوردر کارت و تارگت فوق‌دقیق دیوایس رک در نمای کارتی',
    title_en: 'Rotating Border Neon Beam & Ultra-Precise Device Card Targeting from Physical Rack',
    changes: [
      'تبدیل انیمیشن نئونی پخش‌شده به یک پرتو لیزری متمرکز و شیک (Rotating Neon Border Beam) با چرخش پیوسته دور تا دور کادر کارت بدون پخش شدن رنگ یا پوشاندن اطلاعات کارت.',
      'اصلاح و ارتقای متد رهگیری و تارگت دیوایس (Device ID & Alias Resolution) به طوری که کلیک روی دکمه کارت در پنل هاور رک، مستقیماً کارت همان دیوایس را روی بوم پیدا کرده، بوم را دقیقاً روی آن تنظیم و افکت نئونی را روی همان کارت فعال کند.',
      'جلوگیری از ایجاد کارت‌های تکراری روی بوم و ایجاد یکپارچگی کامل میان شناسه‌های فیزیکی شاسی سخت‌افزاری و کارت‌های توپولوژی.',
      'بهینه‌سازی کادر و پالت رنگی نئونی با کنتراست بالا و هسته سفید درخشان متحرک.'
    ],
    changes_en: [
      'Replaced the diffuse, wide-spread glow animation with an elegant, focused rotating border beam that smoothly travels around the card perimeter without obscuring device text or ports.',
      'Enhanced target device resolution and alias tracking so clicking the Card button in the physical rack hover bar targets the exact corresponding device card on the canvas with smooth camera panning.',
      'Deduplicated identical card instances on canvas to ensure a single, consistent card view representation per physical hardware unit.',
      'Refined the neon beam aesthetics with high-contrast glowing hues and a vivid white-hot core running along the border track.'
    ]
  },
  {
    version: '1.34.0',
    releaseDate: '2026-09-12',
    type: 'minor',
    title: 'انیمیشن پالس نئونی رنگی ۳ ثانیه‌ای جهت مشخص‌سازی کارت دیوایس هنگام سوییچ از نمای فیزیکال به کارتی',
    title_en: '3-Second Vibrant Neon Pulse Animation for Instant Device Identification on Switching from Physical to Card View',
    changes: [
      'پیاده‌سازی افکت و انیمیشن جذاب نئونی (Neon Border & Glow) با رنگ تصادفی شاد و پرنور به مدت دقیق ۳ ثانیه روی کادر کارت دیوایس هنگام سوییچ از نمای فیزیکی به کارتی.',
      'افزودن نشان شناور و پالس‌دار بالای کارت هدف (Target Device Badge) همراه با شمارش معکوس ۳ ثانیه‌ای جهت تمایز بلادرنگ دیوایس مدنظر.',
      'تجهیز دکمه‌های «کارت» در پنل هاور رک، شاسی فیزیکی روی بوم و کارت‌های پنل فیزیکی به قابلیت سوییچ همراه با فوکوس و هایلایت نئونی.',
      'پشتیبانی از دابل‌کلیک روی شاسی فیزیکی جهت انتقال مستقیم به نمای کارتی و فعال‌سازی هایلایت نئونی.'
    ],
    changes_en: [
      'Implemented a dynamic 3-second neon border & glow pulse animation with randomized luminous colors on device cards when transitioning from physical to card view.',
      'Added a floating animated target badge over the highlighted card with a 3-second visual indicator for instant device localization.',
      'Equipped the "Card" action buttons across rack hover bars, canvas physical chassis, and physical hierarchy cards with smart neon-highlight switching.',
      'Added double-click support on canvas physical chassis to directly trigger the card view switch with the neon highlight animation.'
    ]
  },
  {
    version: '1.33.0',
    releaseDate: '2026-09-12',
    type: 'minor',
    title: 'افزودن درگ & دراپ و جابجایی هوشمند پنجره‌های ترمینال همزمان، قفل بستن ترمینال با کلیک بیرون مودال و رفع برش تولتیپ پورت‌ها',
    title_en: 'Drag & Drop Terminal Pane Reordering, Smart Multi-Pane Swapping, Backdrop Outside-Click Lock, and Unclipped Port Tooltips',
    changes: [
      'پیاده‌سازی قابلیت کشیدن و رها کردن (Drag & Drop) با دستگیره اختصاصی و نمایشگر شناور هدف برای جابجایی و سوآپ مستقیم هر کدام از پنجره‌های ترمینال اسپلیت.',
      'رفع محدودیت جابجایی تنها دو ترمینال سمت چپ و هوشمندسازی دکمه‌های Swap برای جابجایی دوره‌ای و سریع بین تمام پنجره‌های فعال.',
      'افزودن دکمه قفل بستن ترمینال (Backdrop Lock) در نوار ابزار میز کار چند ترمینال و مودال‌های سیسکو و میکروتیک برای جلوگیری از بسته شدن با کلیک تصادفی بیرون مودال.',
      'رفع کامل مشکل افتادن تولتیپ مشخصات پورت‌ها در هاور پشت آیتم‌های بالایی و اسکرول فیس‌پلیت سخت‌افزاری با سیستم مختصات شناور آزاد.'
    ],
    changes_en: [
      'Implemented full Drag & Drop support with dedicated grip handles and drop target indicators to easily reorder and swap any terminal pane in multi-terminal workspace.',
      'Overcame the two-leftmost-terminal swap limitation by adding smart cyclic swapping and drag-and-drop across all active split-screen panes.',
      'Added a Backdrop Lock toggle in the multi-terminal workspace top bar and Cisco/MikroTik modals to prevent modal closure upon clicking outside.',
      'Completely resolved hardware port tooltip clipping over upper elements by using an unconstrained fixed-coordinate overlay renderer.'
    ]
  },
  {
    version: '1.32.0',
    releaseDate: '2026-09-12',
    type: 'minor',
    title: 'تعبیه منوی شناور رنگ و قلم در ترمینال‌های سیسکو و میکروتیک، رفع پرش تولتیپ فیس‌پلیت پورت‌ها و هوشمندسازی انتخاب و جایگزینی بازه‌ای پورت‌ها در خط فرمان',
    title_en: 'Appearance Menu Popover for Cisco & MikroTik Terminals, Flicker-Free Port Tooltips, and Smart Port/Range Command Insertion',
    changes: [
      'انتقال پالت‌های انتخاب رنگ پس‌زمینه و قلم ترمینال‌های سیسکو و میکروتیک به یک دکمه منوی اختصاصی ظاهر (Appearance) جهت جلوگیری از شلوغی هدر ترمینال.',
      'رفع کامل لرزش و پرش‌های مکرر تولتیپ پورت‌ها در بخش Hardware Port Faceplate با حذف شناسه بومی title مرورگر و پیاده‌سازی تولتیپ مستقل، سبک و بدون تداخل رویدادهای ماوس.',
      'هوشمندسازی کلیک روی پورت‌ها جهت درج در دستور: جایگزینی هوشمندانه نام پورت جدید با پورت قبلی بدون پاک شدن متن دستور تایپ‌شده کاربر.',
      'پشتیبانی از کلید Ctrl/Shift برای انتخاب بازه‌ای از پورت‌ها (Range Selection) در سیسکو و میکروتیک.',
      'پشتیبانی جامع ترمینال سیسکو از دستورات بازه‌ای نظیر interface range و تغییر خودکار پرامپت به (config-if-range)# و اعمال دستورات ساب‌کانفیگ (shutdown، no shutdown، switchport vlan و...) روی تمامی پورت‌های انتخاب‌شده در بازه.'
    ],
    changes_en: [
      'Added a dedicated Appearance popover menu for Cisco and MikroTik terminals to cleanly house background and text color swatches without cluttering the toolbar.',
      'Completely eliminated tooltip flickering and mouse hover jitter on the Hardware Port Faceplate by removing native browser title attributes and isolating hover events.',
      'Implemented smart port click insertion in terminal command input: clicking subsequent ports cleanly replaces the previous interface token without erasing existing typed commands.',
      'Added Ctrl/Meta/Shift key support for selecting ranges of ports across both Cisco and MikroTik port faceplates.',
      'Full Cisco CLI support for interface range commands with dynamic (config-if-range)# prompt and multi-port subcommand application (shutdown, vlan assignment, mode trunk/access, description).'
    ]
  },
  {
    version: '1.31.0',
    releaseDate: '2026-09-12',
    type: 'minor',
    title: 'توسعه گسترده کاتالوگ سخت‌افزاری سیسکو، میکروتیک و فورتی‌نت و تثبیت دقیق یونیت شروع در مودال افزودن به رک',
    title_en: 'Massive Expansion of Cisco, MikroTik & Fortinet Hardware Catalog and Precise Start-U Preservation in Rack Mounting Modal',
    changes: [
      'تثبیت دقیق مقدار Starting Unit (Start U) در مودال افزودن تجهیز به رک مطابق با یونیتی که کاربر روی آن کلیک کرده و حذف تغییر خودکار آن.',
      'افزودن محصولات جدید سوییچ سیسکو شامل سری Catalyst 2960-XR، 3560-X، 3650، 9200L، 9300X با توان UPOE+، شاسی‌های ماژولار 9404R و 9407R، سوییچ هسته 9500-48Y4C، شاسی غول‌پیکر 9606R و سوییچ‌های دیتاسنتری Nexus 3064، 3172، 9336C و 9364C.',
      'افزودن روترها و تجهیزات امنیتی سیسکو شامل ISR 1100، 1941، 2911، 2951، 3945، 4331، 4351، 4431، 4461، سری نسل جدید Catalyst 8200، 8300 (1U/2U)، 8500، روترهای اپراتوری ASR 1001-HX، 1002-HX، 1004، 1006-X و فایروال‌های سخت‌افزاری ASA 5516-X، ASA 5525-X، Firepower 1120/1140، Firepower 2130 و Cisco Secure Firewall 3110.',
      'توسعه سبد محصولات میکروتیک شامل روترهای پرقدرت RB4011، RB5009 تمام PoE، CCR1016، پرچمدار فیبر نوری CCR2004 Optical، سوییچ‌های CRS326، CRS354-48G، سوییچ غول‌پیکر CRS354-48P با توان ۸۰۰ وات، CRS317، CRS309 بی‌صدا، CRS312 مسی، CRS326-24S، سوییچ‌های فوق‌سریع ۱۰۰ گیگابیت CRS504، CRS510، CRS518 و سوییچ اختصاصی CSS326 SwOS.',
      'افزودن مجموعه کامل تجهیزات فورتی‌نت شامل FortiGate 60F Rackmount، 80F، فایروال نسل جدید SP5 با مدل‌های 90G و 120G، سری‌های سازمانی و دیتاسنتری 400F، 900G/1000F، 1800F، 2600F، ابر فایروال ۴۰۰ گیگابیت 4400F، سوییچ‌های هوشمند FortiSwitch 124F-FPOE، 448E و سوییچ دیتاسنتری 1048E، دستگاه تحلیل امنیت FortiAnalyzer 300G و گیت‌وی ایمیل FortiMail 200F.',
      'پشتیبانی از انواع جدید پورت‌های شبکه 2.5GbE RJ45 و 1GbE SFP در سیستم کارت‌های شبکه و مودال پیکربندی دیوایس‌ها.'
    ],
    changes_en: [
      'Strictly preserved the clicked rack unit in Starting Unit (Start U) in the Add Hardware modal, preventing unwanted auto-recalculation.',
      'Added extensive Cisco switch line: Catalyst 2960-XR, 3560-X, 3650, 9200L, 9300X (90W UPOE+), modular chassis 9404R & 9407R, core switch 9500-48Y4C, 9606R core chassis, and data center Nexus 3064, 3172, 9336C, 9364C.',
      'Added Cisco routing and security suite: ISR 1100, 1941, 2911, 2951, 3945, 4331, 4351, 4431, 4461, Catalyst 8200, 8300 (1U/2U), 8500, carrier routers ASR 1001-HX, 1002-HX, 1004, 1006-X, and firewalls ASA 5516-X, ASA 5525-X, Firepower 1120, Firepower 2130, and Cisco Secure Firewall 3110.',
      'Expanded MikroTik portfolio: RB4011, RB5009 (Full PoE), CCR1016, CCR2004 Optical Flagship, CRS326, CRS354-48G, CRS354-48P (800W), CRS317, silent CRS309, CRS312 10G Copper, CRS326-24S, 100G ultra switches CRS504, CRS510, CRS518, and CSS326 SwOS.',
      'Added comprehensive Fortinet lineup: FortiGate 60F RM, 80F, SP5 next-gen firewalls 90G & 120G, campus/datacenter firewalls 400F, 900G/1000F, 1800F, 2600F, hyperscale 4400F (400G), FortiSwitch 124F-FPOE, 448E, 1048E, FortiAnalyzer 300G, and FortiMail 200F.',
      'Added support for 2.5GbE RJ45 and 1GbE SFP port types in NIC configurations and rack hardware modals.'
    ]
  },
  {
    version: '1.30.0',
    releaseDate: '2026-09-12',
    type: 'minor',
    title: 'اصلاح باز شدن مودال استودیو رک، لایه‌بندی مودال‌های فرزند، نوار ابزار هاور دیوایس‌ها، افزودن تجهیزات انبار به رک و منوی راست‌کلیک پورت سیسکو',
    title_en: 'Fix Rack Elevation Studio Modal Layering, Hover Action Bar Overflow, Inventory Device Rack Mounting, and Cisco Port Context Menu',
    changes: [
      'اصلاح باز شدن استودیو رک (Inspect Rack Elevation Studio) برای تمامی رک‌ها و همگام‌سازی لحظه‌ای وضعیت رک با استیت نقشه.',
      'رفع مشکل رفتن مودال استودیو رک به زیر هدر با ایجاد فاصله استاندارد و تنظیم ابعاد ریسپانسیو ویوپورت.',
      'اصلاح لایه‌بندی (Z-Index و React Portal) برای باز شدن مودال‌های فرزند نظیر Install Hardware، Edit Rack، Transfer Device و Edit Device Properties روی استودیو رک.',
      'اصلاح کامل نوار ابزار هاور دیوایس‌ها در نمای فیزیکی رک (کاهش اندازه دکمه‌ها، تنظیم چیدمان فشرده و جلوگیری از بیرون‌زدگی دکمه‌های پورت، کانفیگ، ترمینال و...).',
      'امکان مشاهده و افزودن تجهیزات موجود در بخش Inventory به بوم نقشه فیزیکی و نصب مستقیم آنها درون رک‌ها با توجه به مدل و مشخصات سخت‌افزاری.',
      'تنظیم دقیق موقعیت باز شدن منوی راست‌کلیک پورت‌های گرافیکی سیسکو بر روی مختصات نشانگر ماوس.'
    ],
    changes_en: [
      'Fixed Rack Elevation Studio modal opening logic for all racks with dynamic state synchronization.',
      'Resolved header overlap issue by ensuring proper viewport padding and height boundaries for the elevation studio.',
      'Fixed child modal layering (Install Hardware, Edit Rack, Transfer Device, Device Properties) using React Portals and top-level z-indexing.',
      'Redesigned the physical device hover toolbar on racks to prevent button overflow and ensure clean, compact action controls.',
      'Enabled seamless selection of devices from Network Equipment Inventory and direct mounting into server racks in Physical View.',
      'Fixed Cisco graphical port right-click context menu positioning to precisely match mouse cursor coordinates.'
    ]
  },
  {
    version: '1.29.0',
    releaseDate: '2026-09-12',
    type: 'minor',
    title: 'فیس‌پلیت پورت‌های گرافیکی با سایز ۵۰٪ در ترمینال سیسکو و میکروتیک و سیستم تقسیم صفحه و کار همزمان با چند ترمینال (Multi-Terminal Workspace)',
    title_en: 'Compact 50% Port Faceplate in Cisco & MikroTik Terminals and Multi-Terminal Split-Screen Workspace',
    changes: [
      'افزودن کادر گرافیکی نمایش پورت‌ها بالای پنجره کنسول ترمینال سیسکو و میکروتیک (دقیقاً مشابه مودال فیس‌پلیت پورت‌ها اما با ابعاد نصف و فشرده) به همراه وضعیت زنده Link UP/DOWN، شماره پورت، و امکان کلیک روی پورت جهت تزریق سریع دستور به CLI.',
      'پیاده‌سازی قابلیت تقسیم صفحه ترمینال (Split Screen): با کلیک روی دکمه Split، صفحه مانیتور به دو نیمه تقسیم شده و ترمینال جاری در سمت چپ و لیست هوشمند انتخاب دیوایس‌های شبکه در سمت راست باز می‌شود.',
      'امکان اتصال و اجرای همزمان CLI چند دیوایس با پشتیبانی از باز شدن حداکثر ۴ ترمینال همزمان در چینش ستونی یا گرید (۲x۲).',
      'قابلیت جابجایی سریع جایگاه ترمینال‌ها با یک کلیک (دکمه Swap Panes: سمت راستی به چپ و سمت چپی به راست).',
      'امکان تغییر دیوایس متصل به هر پنجره، بستن مستقل هر ترمینال، و پشتیبانی کامل از هر دو برند تجهیزات Cisco IOS و MikroTik RouterOS.'
    ],
    changes_en: [
      'Integrated a compact 50% scale graphical port faceplate into the top header of both Cisco and MikroTik terminal modals with live link UP/DOWN indicators, port numbering, and click-to-CLI command injection.',
      'Implemented Split-Screen Multi-Terminal workspace: clicking the Split button places the active terminal on the left and opens an interactive network device selector on the right.',
      'Added support for concurrent CLI sessions for up to 4 devices simultaneously in flexible column or 2x2 grid layouts.',
      'Enabled quick one-click pane swapping (Swap Panes button to switch left and right terminals instantly).',
      'Added per-pane device switching, individual pane closing, and full cross-platform support for both Cisco IOS and MikroTik RouterOS devices.'
    ]
  },
  {
    version: '1.28.0',
    releaseDate: '2026-09-12',
    type: 'minor',
    title: 'رفع مشکل پنهان شدن دیوایس‌ها در رک، بهینه‌سازی ابعاد مودال افزودن تجهیز، جستجو در کاتالوگ سخت‌افزار، و یکپارچه‌سازی لایه نمای کارتی',
    title_en: 'Fix Rack Device Persistence, Add Hardware Modal Sizing & Catalog Search, and Card View Integration for Rack-Mounted Devices',
    changes: [
      'رفع باگ حذف یا غیب شدن ناگهانی پچ‌پنل و سایر تجهیزات رک پس از افزودن دیوایس‌های جدید (میکروتیک، فورتی‌گیت و...) با تضمین تخصیص شناسه‌های منحصربه‌فرد و تفکیک حالت‌های ویرایش و درج تجهیز جدید.',
      'اصلاح ساختار و استایل کانتینر مودال افزودن سخت‌افزار (Add Hardware Device to Rack)، تنظیم موقعیت عمودی و اسکرول داخلی جهت جلوگیری از افتادن زیر هدر و بیرون‌زدگی از پنجره مرورگر.',
      'افزودن کادر جستجوی زنده (Live Search Box) در تب کاتالوگ سخت‌افزار (Hardware Catalog) برای یافتن سریع تجهیزات بر اساس نام، مدل، برند (سیسکو، میکروتیک، فورتی‌گیت، HP و...) و دسته‌بندی.',
      'پشتیبانی کامل از لایه نمای کارتی (Card View) برای تجهیزات داخل رک، همگام‌سازی موقعیت قرارگیری روی بوم نقشه، و افزودن دکمه‌های انتقال مستقیم به نمای کارتی (Card View) در منوی هاور و پنل اینسپکتور جهت بررسی و کابل‌کشی پورت‌ها.'
    ],
    changes_en: [
      'Fixed the disappearing patch panel/hardware bug when adding new devices (such as MikroTik, FortiGate, etc.) into a rack by enforcing collision-free unique IDs and separating edit vs. new mount logic.',
      'Optimized the Add Hardware Device to Rack modal sizing, vertical bounds, and scroll containers to prevent falling under the page header or clipping outside the viewport.',
      'Implemented a live search box in the Hardware Catalog tab to quickly filter and locate hardware templates by brand, model name, and category.',
      'Added full Card View integration for rack-mounted devices, including automated canvas coordinate mapping and direct "Card View" quick-actions in the hover menu and inspector modal for port cabling inspection.'
    ]
  },
  {
    version: '1.27.0',
    releaseDate: '2026-09-11',
    type: 'minor',
    title: 'امکان ویرایش مشخصات و ابعاد رک، انتقال تجهیزات بین رک‌ها، و جلوگیری از ثبت نام تکراری برای رک',
    title_en: 'Rack Editing & Unit Resizing, Inter-Rack Device Transfer, and Duplicate Rack Name Prevention',
    changes: [
      'افزودن امکان ویرایش کامل مشخصات رک (Edit Rack Modal) شامل تغییر نام رک، تنظیم تعداد یونیت‌ها (از ۱۲U تا ۴۸U یا یونیت سفارشی)، و تغییر عمق رک (۶۰۰ تا ۱۲۰۰ میلی‌متر) با بررسی خودکار عدم تداخل با تجهیزات موجود.',
      'پیاده‌سازی ماژول اختصاصی انتقال دیوایس بین رک‌ها (Transfer Device Modal) با قابلیت انتخاب رک مقصد، تشخیص هوشمند اولین اسلات خالی، و اعتبارسنجی زنده تداخل با اسلات‌های اشغال‌شده.',
      'افزودن دکمه‌های انتقال سریع دیوایس (Transfer) در منوی شناور تجهیز، نمای تفصیلی اینسپکتور، و لیست اقلام منصوب در رک.',
      'جلوگیری از ایجاد یا ویرایش رک با نام تکراری در کل نقشه توپولوژی و همچنین در سلسله‌مراتب فیزیکی با هشدارهای آنی و غیرفعال‌سازی هوشمند کلید ذخیره.'
    ],
    changes_en: [
      'Introduced comprehensive Rack Editing modal allowing users to rename racks, resize rack units (from 12U to 48U or custom), and adjust cabinet depth (600mm to 1200mm) with automatic collision checks against installed hardware.',
      'Built a dedicated Inter-Rack Device Transfer modal enabling seamless relocation of hardware devices between cabinets, with smart first-available slot selection and live slot occupancy validation.',
      'Added quick-action Transfer buttons in the device hover menu, the elevation inspector device details panel, and the mounted hardware inventory list.',
      'Enforced duplicate rack name prevention across custom topology maps and physical building/floor hierarchy with real-time UI validation alerts and disabled submit states.'
    ]
  },
  {
    version: '1.26.0',
    releaseDate: '2026-09-11',
    type: 'minor',
    title: 'افزودن انیمیشن زنده پویانمایی انتقال داده (Data Flow Animation) روی کابل‌ها و لینک‌های بین تجهیزات',
    title_en: 'Live Animated Data Flow & Packet Exchange on Network Links in Card View',
    changes: [
      'پیاده‌سازی پویانمایی زنده جریان ترافیک داده (Live Packet Animation) روی لینک‌ها و کابل‌های ارتباطی بین دو دیوایس متصل به یکدیگر در نمای کارتی (Card View).',
      'نمایش پکت‌های رفت و برگشت (TX و RX) با رنگ‌ها و سرعت‌های متمایز بر اساس نوع کابل (فیبر نوری با سرعت فوق‌سریع و رنگ کهربایی، ترانک با رنگ سرخابی/بنفش، و کابل شبکه مسی با پکت‌های درخشان فیروزه‌ای/آبی).',
      'افزودن استریم نقطه‌چین روان (Flowing Dash Stream) با شتاب پیوسته روی کابل جهت نمایش فعال بودن تبادل بسته در لینک‌های آنلاین، و توقف خودکار انیمیشن در هنگام قطعی لینک (Link Down).',
      'افزودن کلید کنترل اختصاصی «جریان داده» (Data Flow) در نوار ابزار بالا با آیکون پالس، جهت فعال/غیرفعال‌سازی سریع این جلوه بصری.'
    ],
    changes_en: [
      'Implemented live animated data traffic flow and packet exchange along connection cables between connected devices in Card View.',
      'Rendered bidirectional packet beacons (TX and RX) traveling along the cable curve with distinct speeds and color themes tailored to cable types (ultra-fast amber for Fiber, vibrant magenta for Trunk, and electric blue for Copper Ethernet).',
      'Added a continuous flowing dash stream overlay across cables to visualize active data transmission on healthy links, with automatic suspension when links are down.',
      'Added a dedicated "Data Flow" toggle control with an active pulse indicator in the top toolbar to effortlessly toggle the live animation.'
    ]
  },
  {
    version: '1.25.0',
    releaseDate: '2026-09-11',
    type: 'minor',
    title: 'اتصال کامل منوی هاور تجهیزات رک به مودال مشخصات انبار، ترمینال CLI، بررسی پورت‌ها و حذف ایمن',
    title_en: 'Direct Rack Hover Actions: Inventory Edit Device Properties Modal, CLI Terminal, Port Inspector & Safe Removal',
    changes: [
      'اتصال مستقیم دکمه Edit Device Properties (مشخصات دستگاه) در منوی شناور هاور تجهیزات رک به مودال ویرایش مشخصات انبار تجهیزات شبکه (Network Equipment Inventory & Management).',
      'افزودن امکان باز کردن ترمینال خط فرمان (CLI) و صفحه بررسی پورت‌ها (Port Inspector) مستقیماً از روی تجهیز در رک با دسترسی سریع.',
      'یکپارچه‌سازی فرآیند حذف تجهیز از رک با مودال تایید حذف ایمن (Delete Confirmation Modal) و به‌روزرسانی هماهنگ استیت‌ها و نقشه.'
    ],
    changes_en: [
      'Connected the Edit Device Properties button in the rack device hover menu directly to the Network Equipment Inventory & Management modal with full two-way state and configuration synchronization.',
      'Enabled quick-launch access for CLI Terminal and Port Inspector directly from the mounted hardware device hover menu in rack cabinets.',
      'Integrated safe deletion confirmation workflow for mounted rack devices, ensuring synchronized map and hardware updates.'
    ]
  },
  {
    version: '1.24.2',
    releaseDate: '2026-09-11',
    type: 'patch',
    title: 'اصلاح رفتار درگ تجهیز در رک و انطباق دقیق پیش‌نمایش با موقعیت موس',
    title_en: 'Rack Device Drag Experience & Precision Cursor-Aligned Placement Fix',
    changes: [
      'حذف و غیرفعال‌سازی نمایش دکمه «+ افزودن تجهیز» (Add Device) و استایل‌های هاور اسلات‌های خالی در حین درگ کردن تجهیز داخل رک.',
      'اصلاح و بهینه‌سازی سیستم محاسبه یونیت مقصد در هنگام درگ (Drag Target U) بر اساس مختصات واقعی نشانگر موس در اس‌وی‌جی رک، جهت انطباق دقیق کادر راهنمای جای‌گذاری با موس.'
    ],
    changes_en: [
      'Suppressed empty slot "+ Add Device" prompt and hover styling while actively dragging a device within the rack cabinet.',
      'Enhanced drag placeholder positioning by recalculating target rack units directly from cursor SVG bounds, ensuring the ghost outline perfectly tracks the mouse position.'
    ]
  },
  {
    version: '1.24.1',
    releaseDate: '2026-09-11',
    type: 'patch',
    title: 'تفکیک نمایش یادداشت‌ها (Sticky Notes) بر اساس نوع ویو (کارت شماتیک و فیزیکال)',
    title_en: 'View-Specific Sticky Notes Isolation (Card View vs Physical View)',
    changes: [
      'تفکیک هوشمند یادداشت‌های متنی (Sticky Notes): یادداشت‌های ثبت شده در نمای کارت شماتیک منحصراً در همین نما نمایش داده می‌شوند و یادداشت‌های ثبت شده در نمای فیزیکی فقط در نمای فیزیکال قابل مشاهده هستند.',
      'افزودن فیلد viewMode به نوع ساختار داده CustomTopologyStickyNote و فیلتر کردن اتوماتیک خطوط اتصال و کارت‌های یادداشت بر پایه حالت نمایش فعال بوم.'
    ],
    changes_en: [
      'Isolated Sticky Notes between canvas views: notes created in Card View are now strictly displayed in Card View, and notes created in Physical View are exclusively visible in Physical View.',
      'Added viewMode attribute to CustomTopologyStickyNote type and dynamically filtered note rendering and device connector lines based on active canvas displayMode.'
    ]
  },
  {
    version: '1.24.0',
    releaseDate: '2026-09-11',
    type: 'minor',
    title: 'رفع مشکل همپوشانی کادر هاور رک (Z-Index)، تاییدیه حذف تجهیز از رک، تفکیک مودال‌های تنظیمات و پشتیبانی از تم روشن میکروتیک',
    title_en: 'Rack Device Hover Z-Index Stacking Fix, Rack Device Deletion Confirmation, Distinct Device Properties & Port Modals, & MikroTik Light Mode Theme Suite',
    changes: [
      'اصلاح ساختار لایه‌بندی Z-Index در نمای کابینت رک (RackCabinetSvg) با خارج کردن کادر عملیات و مشخصات هاور دیوایس از داخل foreignObject اس‌وی‌جی به لایه شناور برتر (z-50)، تا کادر هاور هرگز به زیر دیوایس‌های پایینی نیفتد.',
      'افزودن مودال تایید حذف امن (DeleteConfirmModal) هنگام کلیک بر روی دکمه حذف تجهیز از داخل رک، به همراه نمایش نام تجهیز، یونیت قرارگیری و هشدارهای مربوطه قبل از خروج تجهیز از رک.',
      'تفکیک دکمه‌های هاور دیوایس در رک: اختصاص دکمه «ویرایش مشخصات سخت‌افزاری» به باز شدن مودال Edit Device Properties و دکمه مجزا برای «پیکربندی کارت‌های شبکه و پورت‌ها» با تول‌تیپ‌های فارسی و انگلیسی دقیق.',
      'پشتیبانی جامع و حرفه‌ای از تم روشن (Light Mode) در تمامی بخش‌های میکروتیک شامل پنجره ترمینال، پنل مدیریت دیوایس و اینترفیس‌ها، جدول بریج و وی‌لن، سربرگ منابع و کانفیگ و منوی راست‌کلیک پورت‌ها.',
      'طراحی و پیاده‌سازی گرافیک اختصاصی پورت‌های میکروتیک مطابق با شکل واقعی سوکت‌های RouterOS با تفکیک رنگ پین‌ها و وضعیت چراغ‌های ال‌ای‌دی در هر دو تم روشن و تاریک.',
      'قابلیت انتخاب موقعیت مکانی تجهیز (ساختمان، طبقه، واحد، رک) از بین موارد از پیش تعریف‌شده در سیستم فیزیکی همراه با امکان تعریف سریع مورد جدید در مودال ثبت تجهیز (Register New Network Device).'
    ],
    changes_en: [
      'Resolved SVG stacking context clipping for rack device hover actions by hoisting the hover overlay above the SVG container into a dedicated top-level z-50 overlay, preventing it from clipping underneath lower rack units.',
      'Integrated DeleteConfirmModal on rack device removal action, preventing accidental unmounting and clearly detailing device name, rack unit (U), and impact.',
      'Separated rack device action buttons: configured "Edit Device Properties" modal independently from "Configure Network Cards & Ports" modal with distinct, descriptive tooltips.',
      'Comprehensive light mode theme support for the MikroTik suite: CLI Terminal, Device Management Modal, Port Inspector, Bridge & VLAN filtering, Resource Monitors, and Port Context Menu.',
      'Authentic MikroTik port hardware graphics with RouterOS-accurate port housings, metallic shielding, gold pin contacts, and dual Link/Activity LEDs in both light and dark themes.',
      'Integrated existing physical hierarchy selection (Building, Floor, Unit, Rack) into Register New Network Device modal with instant quick-add for new entries.'
    ]
  },
  {
    version: '1.23.0',
    releaseDate: '2026-09-11',
    type: 'minor',
    title: 'یکپارچه‌سازی کامل تجهیزات انبار شبکه در نمای فیزیکی نقشه، نصب در رک با فیس‌پلیت واقعی و باز شدن منوی راست‌کلیک پورت در محل نشانگر ماوس',
    title_en: 'Full Network Equipment Inventory Integration in Physical Map View, Photorealistic Rack Mounting, & Accurate Mouse-Positioned Port Context Menu',
    changes: [
      'نمایش لیست و پنل تجهیزات ثبت‌شده در انبار (Network Equipment Inventory) در نمای فیزیکی نقشه با قابلیت فیلتر، جستجو و جانمایی مستقیم در رک.',
      'افزودن امکان انتخاب تجهیزات انبار در مودال نصب سخت‌افزار (AddHardwareModal) همراه با پیش‌نمایش زنده و واقع‌گرایانه فیس‌پلیت فیزیکی (شامل سیسکو، میکروتیک، فورتی‌نت، سوفوس و اچ‌پی).',
      'تشخیص هوشمند ابعاد (1U/2U)، توان مصرفی، تعداد و نوع پورت‌ها بر اساس مدل و برند تجهیز و محاسبه خودکار اولین اسلات آزاد در رک برای جلوگیری از تداخل (Collision Detection).',
      'اصلاح و بهینه‌سازی موقعیت منوی راست‌کلیک روی پورت‌های سیسکو با استفاده از React Portal در بدنه صفحه (document.body) و باز شدن دقیق منو در مختصات نوک نشانگر ماوس با تشخیص هوشمند لبه‌های صفحه.',
      'همگام‌سازی اطلاعات تجهیزات انبار در رک‌ها شامل آی‌پی، نام اختصاصی، لاگ‌های پورت و دسترسی مستقیم به ترمینال و عیب‌یابی.'
    ],
    changes_en: [
      'Directly integrated Network Equipment Inventory devices into the Physical Map View with dedicated search, filtering, and 1-click or drag-and-drop mounting into racks.',
      'Added an Inventory Equipment selection mode in the AddHardwareModal with live photorealistic SVG faceplate rendering for Cisco, MikroTik, Fortinet, Sophos, HPE, and ASUS hardware.',
      'Automated rack collision detection and slot calculation based on hardware unit height (1U/2U) and preconfigured manufacturer specifications.',
      'Fixed Cisco port context menu positioning by rendering through React Portal to document.body, ensuring the menu opens precisely at mouse cursor coordinates with smart edge collision avoidance.',
      'Synchronized inventory attributes (IP address, vendor, model, port counts) across physical rack chassis with direct CLI and inspection integration.'
    ]
  },
  {
    version: '1.22.0',
    releaseDate: '2026-09-11',
    type: 'minor',
    title: 'مودال تایید حذف هوشمند رک و تجهیزات، تفکیک کامل نمای کارتی و فیزیکی، رفع تداخل لایه‌ها (Z-Index) و محاسبه توان مصرفی رک',
    title_en: 'Smart Deletion Confirmation Modal, Strict Global Card vs Physical Mode Separation, Z-Index Layering Fix, & Rack Power Wattage Metrics',
    changes: [
      'پیاده‌سازی مودال تایید حذف امن (DeleteConfirmModal) برای رک‌ها و تجهیزات با حذف فوری window.confirm پیشین.',
      'افزودن امکان انتخاب سرنوشت تجهیزات مستقر در رک هنگام حذف رک: حذف کامل همراه رک یا حفظ تجهیزات و انتقال آنها به بوم نقشه.',
      'یکپارچه‌سازی سیستم حذف امن در تمام بخش‌های برنامه از جمله لیست موجودی تجهیزات (DeviceListView) و کارت‌های روی نقشه.',
      'تفکیک منطقی و ساختاری کامل بین نمای کارتی (Card Mode) و نمای فیزیکی (Physical Mode): در نمای کارتی رک‌ها و شاسی‌های فیزیکی مخفی و کابل‌ها و پورت‌ها نمایش داده می‌شوند؛ در نمای فیزیکی کارت‌ها و کابل‌ها مخفی شده، تجهیزات داخل رک قرار گرفته و تنها قطعات نصب‌نشده روی بوم جهت مانت نمایش داده می‌شوند.',
      'سازگاری هوشمند نوار ابزار بالا با نمای فعال: نمایش دکمه‌های «افزودن دیوایس» و «کابل‌کشی» در نمای کارتی، و دکمه‌های «افزودن رک» و «نصب سخت‌افزار» در نمای فیزیکی.',
      'حل کامل مشکل لایه‌بندی و اولویت بصری (Z-Index): هاور و درگ کردن هر دیوایس آن را در بالاترین لایه بصری SVG (z-index 9999) قرار داده و مانع از افتادن تول‌تیپ یا کادر زیر رک یا سایر کارت‌ها می‌شود.',
      'محاسبه و نمایش لحظه‌ای توان مصرفی مجموع تجهیزات رک (بر حسب وات و کیلووات) به همراه تعداد پاور سرورها در بنر بالای هر کابینت رک.',
      'حفظ دسترسی و نمایش پایدار یادداشت‌های چسبان (Sticky Notes) در هر دو حالت نمای کارتی و فیزیکی.'
    ],
    changes_en: [
      'Implemented dedicated DeleteConfirmModal for racks and devices, completely eliminating abrupt window.confirm prompts.',
      'Added smart handling for mounted rack devices during rack deletion: choose to cascade delete or preserve devices by releasing them to the canvas.',
      'Unified safe deletion workflow across both the canvas topology view and the inventory list view (DeviceListView).',
      'Engineered strict global mode separation: Card Mode displays cards, ports, and inter-device cabling while hiding racks; Physical Mode hides cards and cables, places mounted hardware inside racks, and only leaves unmounted hardware on canvas for rack elevation.',
      'Context-aware toolbar controls: "Add Device" and "Cable" are displayed exclusively in Card Mode, while "Add Rack" and "Install Hardware" appear in Physical Mode.',
      'Completely resolved SVG stacking and Z-index layering: hovering or dragging any device hoists it to the top of the SVG stack (z-index 9999), preventing it from clipping behind racks or adjacent cards.',
      'Real-time power consumption aggregation (Watts and kW) with redundant PSU counters in the rack cabinet top status header.',
      'Maintained persistent visibility and positioning for draggable Sticky Notes across both Card and Physical view modes.'
    ]
  },
  {
    version: '1.21.0',
    releaseDate: '2026-09-11',
    type: 'minor',
    title: 'کنسول مدیریت اختصاصی پورت‌ها و شاسی روترهای میکروتیک (MikroTik RouterOS)، منوی راست‌کلیک و ارسال بلادرنگ دستورات RouterOS',
    title_en: 'Dedicated MikroTik RouterOS Port Management Console, Realistic Faceplate, Context Menu, & Instant RouterOS CLI Command Dispatch',
    changes: [
      'پیاده‌سازی مودال اختصاصی مدیریت و تنظیمات پورت‌های میکروتیک (MikroTik Port Management Console) با شبیه‌سازی دقیق فیس‌پلیت سخت‌افزاری روتربوردها (CCR/CRS).',
      'طراحی پورت‌های واقع‌گرایانه میکروتیک (MikroTikPortSvg) شامل پورت‌های اترنت محافظت‌شده RJ45، پورت‌های فیبر نوری SFP+ 10G، چراغ‌های وضعیت Link/Act، نشانگر PoE-IN و پرچم‌های روتر او اس (R: Running, X: Disabled).',
      'افزودن منوی راست‌کلیک هوشمند روی پورت‌های میکروتیک: فعال/غیرفعال‌سازی پورت، عضویت در بریج (Bridge Membership)، تنظیم PVID/VLAN، تغییر سرعت و دوبلکس، یادداشت پورت (Comment) و تست عیب‌یابی کابل (TDR Cable Test).',
      'پیاده‌سازی مودال پیش‌نمایش و تایید دستورات RouterOS پیش از ارسال به دستگاه، با امکان کپی اسکریپت و ارسال امن به روتر.',
      'افزودن ترمینال تعاملی خط فرمان میکروتیک (MikroTikTerminalModal) با پشتیبانی از دستورات اسلش روتر او اس، راهنمای سریع دستورات و انتخاب تم رنگی کنسول.',
      'رفع خطای ماژول ترجمه‌ها و بازسازی کامل کامپوننت‌های پایدار سیستم.'
    ],
    changes_en: [
      'Engineered dedicated MikroTik RouterOS Port Management Modal featuring photorealistic RouterBOARD (CCR/CRS) physical faceplate rendering.',
      'Created realistic MikroTik port components (MikroTikPortSvg) including shielded RJ45 interfaces, 10G SFP+ optical cages, dual Link/Act LEDs, PoE-IN badges, and RouterOS flags (R for Running, X for Disabled).',
      'Implemented intelligent right-click context menu for MikroTik ports: interface enable/disable, bridge membership, PVID/VLAN assignment, speed/duplex modes, port comment annotations, and TDR cable diagnostics.',
      'Designed a RouterOS command review and confirmation modal (MikroTikPortConfigConfirmModal) displaying live RouterOS syntax before safe dispatch to the target device.',
      'Integrated interactive MikroTik CLI Terminal (MikroTikTerminalModal) with slash syntax support, command quick-guide, and customizable terminal palettes.',
      'Resolved translation export syntax errors and restored clean builds across all driver modules.'
    ]
  },
  {
    version: '1.20.0',
    releaseDate: '2026-09-11',
    type: 'minor',
    title: 'دوگانگی نمای کارت و سخت‌افزار فیزیکی (Card/Physical Mode)، نصب مستقیم تجهیزات در رک و یادداشت‌های استیکی چسبان (Sticky Notes) با قابلیت اتصال به دیوایس‌ها',
    title_en: 'Dual Device Canvas Modes (Card/Physical), Direct Rackmount from Canvas, & Interactive Connected Sticky Notes with Global Hide/Show',
    changes: [
      'پیاده‌سازی دو حالت نمایش متمایز برای هر دیوایس روی نقشه: نمای کارتی (Card Mode) جهت طراحی شماتیک کابل‌کشی و مشخص کردن پورت‌ها، و نمای فیزیکی (Physical Hardware Mode) با رندر واقع‌گرایانه شاسی سرور/سوئیچ جهت استقرار در رک.',
      'افزودن امکان تغییر آسان بین نمای کارتی و نمای فیزیکی به صورت سراسری از نوار ابزار و همچنین به ازای هر تجهیز به صورت جداگانه از روی هدر کارت.',
      'امکان نصب مستقیم تجهیزات فیزیکی از روی بوم نقشه به درون رک‌های دلخواه (Mount to Rack) همراه با مدیریت برخورد و پیش‌گیری از تداخل یونیت‌ها.',
      'پیاده‌سازی سیستم یادداشت‌های چسبان تعاملی (Sticky Notes): قابلیت جابه‌جایی آزاد روی نقشه با درگ، ویرایش عنوان و متن، انتخاب تم رنگی (زرد، آبی، سبز، سرخ، بنفش، کهربایی)، و تاریخ ثبت.',
      'قابلیت اتصال خطی یادداشت به هر دیوایس مشخص با خط‌چین هدایتگر تعاملی زرد/فیروزه‌ای و دکمه فوکوس دوربین روی تجهیز متصل شده.',
      'افزودن چک‌باکس پنهان/نمایان‌سازی سراسری کلیه استیکی نوت‌ها در نوار ابزار بالا جهت خلوت نگه‌داشتن صفحه در مواقع لزوم.',
      'اصلاح و بومی‌سازی دو دکمه «افزودن رک» و «نصب سخت‌افزار» در زبان انگلیسی به «Add Rack» و «Install Hardware» به همراه ترجمه صحیح تول‌تیپ‌ها.'
    ],
    changes_en: [
      'Engineered dual visual modes for canvas devices: Card Mode (optimized for port-to-port cable drawing and link management) and Physical Mode (photorealistic enterprise chassis representation for rack elevation).',
      'Added seamless switching between Card and Physical views both globally via the toolbar and per-device via the device card header action button.',
      'Enabled direct mounting of canvas physical devices into target racks with slot collision checking and unit allocation.',
      'Created interactive draggable Sticky Notes: full free-form placement, rich text/markdown notes, timestamping, and 6 vibrant color themes (Yellow, Blue, Green, Rose, Purple, Amber).',
      'Implemented dynamic device linking for sticky notes with vector dashed callout lines and single-click camera focus on linked nodes.',
      'Added a global Hide/Show Notes toggle checkbox directly in the top custom map toolbar.',
      'Fixed language localization for "Add Rack" and "Install Hardware" buttons and their comprehensive tooltips in English view.'
    ]
  },
  {
    version: '1.19.0',
    releaseDate: '2026-09-11',
    type: 'minor',
    title: 'جابه‌جایی درگ‌وان‌دراپ تجهیزات در رک، پیشگیری از تداخل یونیت‌ها (Collision Detection)، ویرایش مشخصات و بومی‌سازی دو زبانه (FA/EN)',
    title_en: 'In-Rack Drag & Drop Hardware Relocation, Unit Collision Prevention, Full Device Spec Editing, & Dual Language i18n Localization',
    changes: [
      'پیاده‌سازی قابلیت جابه‌جایی درگ و دراپ (Drag & Drop) تجهیزات سخت‌افزاری درون رک با فیدبک بصری بلادرنگ (Ghost Preview)، هدایتگر وضعیت و دکمه‌های گام‌به‌گام بالا و پایین بردن تجهیز.',
      'پیاده‌سازی مکانیزم هوشمند جلوگیری از تداخل فیزیکی در یونیت‌های رک (Slot Collision Detection): عدم امکان نشستن دو تجهیز روی یک یونیت، نمایش پیام هشدار تداخل به همراه دکمه هوشمند یافتن خودکار اولین یونیت آزاد (Find Free Slot).',
      'افزودن امکان ویرایش کامل مشخصات سخت‌افزارها و پیکربندی مجدد کارت‌های شبکه و پورت‌ها هم از روی رک و هم داخل استودیو بازرسی رک.',
      'بومی‌سازی و چندزبانگی کامل (i18n): تطبیق خودکار تمام منوها، مودال‌ها، دکمه‌ها، عنوان‌ها و ابزارها مطابق زبان فعال سیستم (فارسی و انگلیسی).',
      'ارتقای واقع‌گرایی المان‌های SVG تجهیزات با شبیه‌سازی دقیق فیس‌پلیت‌های سازمانی، ماژول‌های ذخیره‌ساز، پنل‌های ال‌ای‌دی، پورت‌های شبکه و فن‌های پشتی.'
    ],
    changes_en: [
      'Implemented fluid in-rack drag-and-drop hardware relocation with real-time ghost previews, slot snapping, and single-click move up/down controls.',
      'Engineered intelligent rack slot collision detection preventing hardware overlap, rendering clear collision alerts and a "Find Free Slot" auto-locator.',
      'Added full hardware specifications and network card/port editing capabilities directly from rack cards and within the Rack Elevation Studio.',
      'Comprehensive dual-language localization (i18n): dynamically adapting all modal copy, buttons, tooltips, and categories between English and Persian based on active system language.',
      'Enhanced photorealistic vector SVG rendering reflecting genuine enterprise server faceplates, drive caddies, diagnostic LEDs, and rear I/O connectivity.'
    ]
  },
  {
    version: '1.18.0',
    releaseDate: '2026-09-11',
    type: 'minor',
    title: 'استودیو طراحی و مدیریت فیزیکی رک‌های دیتاسنتر (16U تا 44U) و کاتالوگ سخت‌افزارهای سرور، سوییچ، استوریج و پیکربندی پورت‌های شبکه',
    title_en: 'Data Center Rack Elevation Studio (16U-44U), Hardware Catalog (HPE/Asus/Cisco/Storage/Firewalls), & Interactive NIC/Port Configurator',
    changes: [
      'افزودن امکان ایجاد و چیدمان رک‌های سرور استاندارد ۱۹ اینچ روی نقشه‌های شماتیک در سایزهای ۱۶، ۲۱، ۲۸، ۳۶، ۴۰ و ۴۴ یونیت با عمق‌های ۶۰، ۸۰، ۱۰۰ و ۱۲۰ سانتی‌متر.',
      'طراحی گرافیکی SVG واقع‌گرایانه تجهیزات و رک‌ها با قابلیت سوئیچ بین نمای جلو (Front View) و نمای پشت (Rear View) شامل شاسی، ریل‌ها، شماره‌گذاری یونیت‌ها (U-slots)، پنل‌های تهویه و براکت‌های نصب.',
      'کاتالوگ جامع سخت‌افزارهای دیتاسنتر: انواع سرورهای HPE ProLiant (نسل‌های Gen8 تا Gen11)، سرورهای ASUS ESC/RS، سرورهای Cisco UCS، سوئیچ‌ها و روترهای سیسکو و میکروتیک، فایروال‌های FortiGate و Sophos XGS، ذخیره‌سازهای HPE MSA/Alletra و Dell EMC، نس QNAP، کیس‌های رکمونت صنعتی، پچ‌پنل‌های مسی و فیبر، و کیبل منیجمنت.',
      'سیستم تعاملی پیکربندی کارت‌های شبکه (NIC) و پورت‌ها هنگام افزودن یا ویرایش سخت‌افزار با تعیین تعداد کارت‌ها، تعداد پورت‌ها در هر کارت، نوع پورت (1GbE RJ45، 10GbE RJ45، 10G SFP+، 25G SFP28، 40G QSFP+، 100G QSFP28 و فیبرچنل FC) با مقادیر پیش‌فرض هوشمند و امکان ویرایش آتی.',
      'استودیو بازرسی و مدیریت ارتقا یافته رک (Rack Elevation Studio Modal) برای مشاهده تفصیلی تجهیزات مستقر در هر یونیت، مصرف برق، پورت‌های شبکه، جابه‌جایی و مدیریت آسان سخت‌افزار.'
    ],
    changes_en: [
      'Added support for placing standard 19-inch server racks on custom schematic maps in 16U, 21U, 28U, 36U, 40U, and 44U unit sizes with 60cm, 80cm, 100cm, and 120cm depth specifications.',
      'Photorealistic vector SVG rendering of racks and hardware devices with instantaneous front/rear view switching, including perforated doors, unit slot numbering, chassis, ventilation grilles, and mounting brackets.',
      'Extensive hardware catalog including HPE ProLiant servers (Gen8 through Gen11), ASUS rack servers, Cisco UCS, Cisco and MikroTik switches/routers, FortiGate and Sophos firewalls, HPE and Dell EMC storage arrays, QNAP rackmount NAS, industrial IPC chassis, copper/fiber patch panels, and horizontal cable managers.',
      'Interactive Network Interface Card (NIC) and port configurator enabling custom card counts, port counts per card, and port interface types (1GbE RJ45, 10GbE RJ45, 10G SFP+, 25G SFP28, 40G QSFP+, 100G QSFP28, 8G/16G/32G FC) with smart template defaults and future re-configurability.',
      'Full-screen Rack Elevation Studio inspector modal displaying unit allocation, total power budget in Watts, port totals, device inspection, and direct NIC editing.'
    ]
  },
  {
    version: '1.17.0',
    releaseDate: '2026-09-11',
    type: 'minor',
    title: 'منوی راست‌کلیک پورت‌های گرافیکی میکروتیک و مودال تایید اجرای دستورات RouterOS از طریق تانل',
    title_en: 'MikroTik Graphical Port Right-Click Context Menu & RouterOS Tunnel CLI Execution Confirmation Modal',
    changes: [
      'پیاده‌سازی کامل منوی راست‌کلیک تعاملی (MikroTikPortContextMenu) روی اینترفیس‌ها و پورت‌های گرافیکی در مدال مدیریت میکروتیک با امکانات جامع RouterOS.',
      'پشتیبانی از اقدامات کلیدی: فعال‌سازی/غیرفعال‌سازی اینترفیس (disabled=yes/no)، عضویت و جدا کردن از بریج (Bridge Port Add/Remove)، تغییر و تخصیص VLAN شناسه PVID به همراه انتخابگر سریع و سفارشی، تنظیمات سرعت و مذاکره خودکار (Auto-Negotiation / 100M Full-Duplex / 10G SFP+).',
      'افزودن قابلیت‌های پیشرفته میکروتیک شامل: فعال‌سازی محافظت لوپ شبکه (Loop Protect)، مدیریت برق‌رسانی PoE Out، تغییر کامنت و برچسب پورت، تست سلامت کابل (TDR Cable Diagnostic)، بازنشانی مک‌آدرس کارخانه‌ای و دسترسی مستقیم به ترمینال CLI.',
      'پیاده‌سازی دیالوگ تایید نهایی قبل از اجرا (مشابه مودال سیسکو) که اسکریپت و دستورات دقیق متناظر RouterOS را به همراه پیش‌نمایش تانل نمایش داده و با تایید کاربر، دستورات را بلادرنگ از طریق تانل مستقیم به میکروتیک ارسال و اجرا می‌کند.'
    ],
    changes_en: [
      'Implemented full interactive right-click context menu (MikroTikPortContextMenu) for graphical physical ports in the MikroTik Device Management Modal.',
      'Full support for core RouterOS port operations: Interface enable/disable (disabled=yes/no), Bridge membership toggle (Bridge Port Add/Remove), Bridge VLAN PVID assignment with quick presets and custom ID prompt, speed & duplex control (Auto-negotiation / 100M Full-duplex / 10G SFP+).',
      'Integrated advanced MikroTik capabilities: Hardware Loop Protect activation, PoE Out power delivery management, port comment/description editing, TDR Cable Diagnostic test, factory MAC address reset, and direct RouterOS terminal launching.',
      'Pre-execution CLI confirmation modal (mirroring Cisco workflow) displaying exact RouterOS CLI syntax and tunnel dispatch details, executing live commands over the tunnel upon user confirmation.'
    ]
  },
  {
    version: '1.16.0',
    releaseDate: '2026-09-11',
    type: 'minor',
    title: 'سوئیت جامع VPN میکروتیک، پالت انتخاب رنگ متن ترمینال‌های سیسکو و میکروتیک، و بهبود عملکرد آکاردئونی سایدبار',
    title_en: 'Comprehensive MikroTik VPN Suite, Terminal Text Color Customization, and Collapsed Sidebar Accordion Enhancement',
    changes: [
      'پیاده‌سازی کامل سوئیت VPN میکروتیک با پشتیبانی از ۷ پروتکل: WireGuard، SSTP، OpenVPN، IPsec Site-to-Site، EoIP Tunnel، VXLAN Overlay و PPTP به همراه تولید خودکار کلیدها، فایروال، روتینگ و اعتبارسنجی پارامترها.',
      'افزودن پالت ۸ رنگ متن قلم ترمینال (سفید، زرد، سبز، آبی روشن، بنفش، صورتی، کهربایی، مشکی) در مدال‌های ترمینال سیسکو (Cisco) و میکروتیک (MikroTik) با پایداری در localStorage.',
      'اصلاح رفتار آکاردئونی سایدبار ناوبری در حالت جمع‌شده (Collapsed): مخفی ماندن خودکار زیرمنوهای والدهای بسته زیر والد خود همانند حالت باز بودن منو و امکان کلیک تعاملی روی والد در حالت فشرده.',
      'ثبت قانون اجباری ارتقای نسخه (Version Bump) به ازای هر تغییر برای تمامی هوش‌های مصنوعی در مستندات AGENTS.md و GEMINI.md.'
    ],
    changes_en: [
      'Full multi-protocol MikroTik VPN Suite: WireGuard, SSTP, OpenVPN, IPsec site-to-site, EoIP tunnel, VXLAN overlay, and PPTP with automated key generation, firewall rules, route injection, and parameter validation.',
      'Added 8-color terminal typography palette (White, Yellow, Green, Sky Light Blue, Purple, Pink, Amber Orange, Black) to both Cisco and MikroTik terminal modals with localStorage persistence.',
      'Enhanced collapsed sidebar navigation behavior: properly hiding closed parent children in collapsed mode while allowing interactive parent toggles.',
      'Documented mandatory version bumping rules in AGENTS.md and GEMINI.md for all AI coding agents working on this project.'
    ]
  },
  {
    version: '1.15.4',
    releaseDate: '2026-09-10',
    type: 'patch',
    title: 'تکمیل انطباق کنتراست متن در ترمینال سیسکو: متن سفید در پس‌زمینه‌های تیره و رنگی و متن مشکی در پس‌زمینه سفید',
    title_en: 'Cisco Terminal Typography Contrast: Pure White on Dark & Colored Backgrounds, Pure Black on White',
    changes: [
      'تنظیم سراسری رنگ متون در ترمینال سیسکو (CiscoTerminalModal): با انتخاب هر یک از رنگ‌های پس‌زمینه (سرمه‌ای، مشکی خالص OLED، آبی‌نفتی، سبز ماتریکس، بنفش سایبرپانک، زغالی)، تمامی متون خروجی ترمینال، پرامپت‌ها، بنر ورود و متن ورودی کاربر در داخل کامند به رنگ سفید خالص (Pure White) نمایش داده می‌شوند.',
      'در صورت انتخاب پس‌زمینه سفید خالص (Pure White)، کلیه نوشته‌های خروجی و فیلد تایپ دستور به رنگ مشکی خالص (Pure Black) تبدیل می‌شوند تا خوانایی فوق‌العاده و کنتراست استاندارد حاصل شود.',
      'حذف تداخل استایل‌های CSS از cisco-cli-input و cisco-terminal-screen برای اعمال بلادرنگ و بدون نقص رنگ انتخابی.'
    ],
    changes_en: [
      'Comprehensive terminal typography contrast for Cisco Terminal Modal: with any dark or colored background selected (Slate, Pitch Black OLED, Solarized Teal, Matrix Green, Cyberpunk Violet, Charcoal), all output texts, prompts, system banners, and the user command input render in pure white.',
      'When selecting Pure White background, all output texts and the command input field automatically switch to pure black for optimal contrast.',
      'Removed CSS override conflicts from cisco-cli-input and cisco-terminal-screen for seamless dynamic color rendering.'
    ]
  },
  {
    version: '1.15.3',
    releaseDate: '2026-09-10',
    type: 'patch',
    title: 'انطباق کنتراست متن ترمینال: متن سفید خالص در پس‌زمینه‌های تیره و متن مشکی خالص در پس‌زمینه سفید',
    title_en: 'Terminal Text Contrast Synchronization: Pure White on Dark Backgrounds and Pure Black on White',
    changes: [
      'تنظیم دقیق رنگ متون در ترمینال میکروتیک و سیسکو: در صورت انتخاب هر یک از پس‌زمینه‌های تیره و رنگی (سرمه‌ای، مشکی خالص، آبی‌نفتی، سبز ماتریکس، بنفش، زغالی)، تمامی متون خروجی ترمینال، پرامپت‌ها و فیلد ورودی کامند به رنگ سفید خالص (Pure White) نمایش داده می‌شوند.',
      'در صورت انتخاب پس‌زمینه سفید (Pure White)، کلیه نوشته‌های خروجی ترمینال، پرامپت ورودی و متن در حال تایپ به رنگ مشکی خالص (Pure Black) تبدیل می‌شوند تا حداکثر خوانایی و کنتراست بصری فراهم گردد.'
    ],
    changes_en: [
      'Synchronized terminal typography contrast in MikroTik and Cisco modals: on all dark and colored backgrounds, terminal output lines, prompt symbols, and the command input field render in pure white.',
      'On white backgrounds, all terminal output texts, prompt indicators, and typing text automatically switch to pure black for high contrast and readability.'
    ]
  },
  {
    version: '1.15.2',
    releaseDate: '2026-09-10',
    type: 'patch',
    title: 'شخصی‌سازی رنگ پس‌زمینه ترمینال میکروتیک، منوی تاریخچه دستورات و ناوبری با کلیدهای جهت‌نما',
    title_en: 'MikroTik Terminal Background Palette, Command History Dropdown & Arrow Key Navigation',
    changes: [
      'افزودن پالت انتخاب رنگ‌های پس‌زمینه به ترمینال میکروتیک (MikroTikTerminalModal) مشابه ترمینال سیسکو (شامل رنگ‌های سرمه‌ای پیش‌فرض روتر او اس، مشکی OLED، سرمه‌ای اقیانوسی، آبی‌نفتی میکروتیک، ماتریکس، بنفش سایبرپانک، زغالی و سفید ملایم) همراه با ذخیره‌سازی خودکار در localStorage',
      'افزودن دکمه تاریخچه (History) در کنار دکمه Send در نوار ورودی ترمینال میکروتیک همراه با شمارنده دستورات و منوی شناور',
      'امکان اجرای مجدد و سریع هر دستور قبلی با دکمه Run، کلیک روی ردیف برای درج مستقیم در پرامپت، و دکمه پاک‌سازی کامل تاریخچه (Clear)',
      'پشتیبانی کامل از کلیدهای جهت‌نمای بالا و پایین کیبورد (ArrowUp / ArrowDown) برای پیمایش سریع در دستورات قبلی و بعدی با حفظ متن در حال تایپ کاربر (Draft Input) و تنظیم خودکار مکان‌نما در انتهای خط'
    ],
    changes_en: [
      'Added terminal background color customization palette to MikroTikTerminalModal matching Cisco terminal palette (RouterOS Slate, OLED Black, Midnight Navy, MikroTik Teal, Matrix Green, Cyberpunk Violet, Zinc Charcoal, and Clean Light) with localStorage persistence',
      'Introduced dedicated History button next to the Send button in MikroTik Terminal with badge counter and interactive dropdown menu',
      'Instant re-execution of previous commands with one-click Run button, click-to-insert into prompt, and Clear History action',
      'Complete ArrowUp and ArrowDown keyboard history navigation with draft input buffer preservation and end-of-line cursor positioning'
    ]
  },
  {
    version: '1.15.1',
    releaseDate: '2026-09-10',
    type: 'patch',
    title: 'ارتقای گرافیک بومی پورت‌های میکروتیک، هماهنگی کامل تم روشن در ترمینال و اتصال دوطرفه سلسله‌مراتب فیزیکی در فرم ثبت تجهیز',
    title_en: 'Native MikroTik Port Graphics, Light Theme Parity in RouterOS Terminal, and Bidirectional Physical Placement Selector/Creator',
    changes: [
      'یکپارچه‌سازی سلسله‌مراتب فیزیکی (Physical Placement) در مودال ثبت تجهیز جدید (AddDeviceModal): امکان انتخاب مستقیم تمام ساختمان‌ها، طبقات، واحدها، اتاق‌ها، سکشن‌ها و رک‌های تعریف‌شده در سیستم یا ایجاد موارد جدید با ذخیره‌سازی بلادرنگ در حافظه سلسله‌مراتب شبکه',
      'طراحی مجدد و دقیق پورت‌های میکروتیک (MikroTikPortSvg): شبیه‌سازی جک‌های فلزی شیلدد RJ45، پین‌های تماس طلایی، ال‌ای‌دی‌های دوگانه LINK و ACT، نشانگرهای R (Running) و X (Disabled)، برچسب PoE-IN روی پورت ether1 و اسلات‌های نوری فلزی SFP+ 10G با زبانه اهرم و کانکتورهای LC Duplex',
      'پشتیبانی کامل تم روشن (Light Mode) در مودال ترمینال خط فرمان میکروتیک (MikroTikTerminalModal) و مودال مدیریت سخت‌افزار میکروتیک (MikroTikDeviceManageModal) منطبق بر پالت رنگ روشن سیستم',
      'همگام‌سازی بلادرنگ سلسله‌مراتب مکان فیزیکی با رخداد سفارشی nettopology_hierarchy_updated بین تب Physical Placement و مودال ثبت تجهیز'
    ],
    changes_en: [
      'Integrated Physical Placement hierarchy into AddDeviceModal: select from all existing buildings, floors, rooms/units/sections, and racks or quickly define new ones with instant synchronization',
      'Crafted authentic MikroTik hardware port graphics (MikroTikPortSvg) including metallic shielded RJ45 jacks, gold contact pins, dual LINK & ACT corner LEDs, RouterOS R/X flags, ether1 PoE-IN badge, and SFP+ 10G optical cages',
      'Full light theme parity for MikroTik RouterOS Interactive Terminal and Hardware Management modals matching system theme settings',
      'Real-time bidirectional event synchronization for physical locations across Schematic Topology and Add Device workflows'
    ]
  },
  {
    version: '1.15.0',
    releaseDate: '2026-09-10',
    type: 'minor',
    title: 'مودال‌های اختصاصی میکروتیک (MikroTik RouterOS Terminal & Management Modal) و اتصال هوشمند شماتیک توپولوژی',
    title_en: 'Dedicated MikroTik RouterOS Terminal Modal, Hardware & Port Management Console, and Schematic Topology Integration',
    changes: [
      'پیاده‌سازی مودال اختصاصی ترمینال میکروتیک (MikroTikTerminalModal) با تم تاریک RouterOS، بنر اسکی آرت بومی میکروتیک، پرامپت پویا ([admin@Identity] >) و پشتیبانی از کلیه دستورات خط فرمان با اسلش',
      'ایجاد سایدبار راهنمای جامع دستورات RouterOS دسته‌بندی‌شده شامل پورت‌ها و بریج (/interface)، آدرس‌ها و روتینگ (/ip)، سیستم و سخت‌افزار (/system)، ابزارهای پایش و پینگ (/tool) و استخراج پیکربندی (/export)',
      'توسعه مودال جامع مدیریت سخت‌افزار و پورت‌های میکروتیک (MikroTikDeviceManageModal) به سبک WinBox و WebFig با نمایش گرافیکی شاسی پورت‌ها (Faceplate)، وضعیت‌های R (Running)، X (Disabled) و پورت‌های SFP+ 10G',
      'امکان مدیریت بلادرنگ مشخصات اینترفیس‌ها، تغییر وضعیت Admin، شناسه PVID/VLAN، سرعت، برچسب کامنت و انجام عملیات گروهی (Batch Operations) روی پورت‌های میکروتیک',
      'تب‌های پایش منابع سخت‌افزاری RouterBOARD (لود پردازنده، حافظه رم، فضای دیسک NAND، ولتاژ، دما)، مدیریت آدرس‌های IP و روتینگ، بریج و VLAN filtering، و استخراج اسکریپت .rsc با یک کلیک',
      'یکپارچه‌سازی کامل در نقشه شماتیک توپولوژی (Schematic Topology View): کلیک روی دکمه CLI در کارت‌های دیوایس میکروتیک مستقیماً ترمینال اختصاصی میکروتیک را باز می‌کند و کلیک روی دکمه پورت‌ها، مودال اختصاصی مدیریت میکروتیک را فراخوانی می‌کند.'
    ],
    changes_en: [
      'Implemented dedicated MikroTik RouterOS Interactive Terminal Modal (MikroTikTerminalModal) featuring RouterOS branding, ASCII banner art, native prompt ([admin@Identity] >), and slash command execution',
      'Built MikroTik Command Guide sidebar categorized by Interfaces & Bridge (/interface), IP & Routing (/ip), System Resources (/system), Diagnostic Tools (/tool), and Configuration Export (/export)',
      'Developed comprehensive MikroTik Device & Port Inspector Modal (MikroTikDeviceManageModal) inspired by WinBox/WebFig with physical chassis faceplate, status LEDs (Running/Disabled/SFP+), and port inspector',
      'Enabled real-time interface configuration, Admin status toggle, PVID/VLAN assignment, link speed, comment annotations, and multi-port batch operations',
      'Added hardware resource monitors (multi-core CPU, RAM, NAND flash, voltage, temperature), IP address table manager, Bridge VLAN filtering overview, and one-click .rsc configuration export',
      'Full Schematic Topology View integration: clicking CLI on any MikroTik node card immediately opens the dedicated RouterOS Terminal, and clicking Ports opens the dedicated MikroTik Device & Port Manager'
    ]
  },
  {
    version: '1.14.0',
    releaseDate: '2026-09-10',
    type: 'minor',
    title: 'بازطراحی جامع معماری چندپلتفرمه دیوایس‌ها با الگوی درایور (Multi-Vendor Driver Pattern)، ترمینال چندسیستم‌عاملی (Cisco/MikroTik/Linux) و تفکیک انحنای کابل‌های موازی توپولوژی',
    title_en: 'Multi-Vendor Driver Architecture (Cisco IOS/IOS-XE, MikroTik RouterOS, Linux), Platform-Aware Interactive Terminal & Parallel Topology Links Curvature',
    changes: [
      'پیاده‌سازی الگوی معماری درایور (Driver Pattern) در بک‌اند با ایجاد کلاس انتزاعی BaseDriver و درایورهای مستقل برای Cisco (IOS/IOS-XE)، MikroTik (RouterOS)، Generic Linux و Simulator',
      'مدیریت هوشمند و بهینه اتصالات SSH با کلاس تخصصی SSHConnectionManager بر پایه پارامیکو، سیاست Lazy Connection و بستن خودکار نشست‌های بلااستفاده',
      'بازطراحی فرم‌های افزودن و ویرایش دیوایس (Add/Edit Device Modal) با پشتیبانی صریح از انتخاب پلتفرم (Platform & OS Driver)، سوییچ حالت درایور (SSH Live / Simulator) و پنهان‌سازی خودکار فیلدهای غیرمرتبط مانند Enable Secret برای میکروتیک و لینوکس',
      'یکپارچه‌سازی و استانداردسازی مدل داده‌ای Device با آبجکت ساختاریافته connection شامل پروتکل، هاست، پورت، تایم‌اوت و اعتبارسنجی مستقل',
      'توسعه ترمینال تعاملی دیوایس با تشخیص بلادرنگ پلتفرم: پشتیبانی از پرامپت‌ها و ساختار شل بومی میکروتیک ([admin@Router] >) و لینوکس (user@host:~$) و خطایابی استاندارد هر سیستم‌عامل',
      'افزودن سایدبار هوشمند دستورات (Command Guide) اختصاصی برای سیستم‌عامل لینوکس (شامل ip -c a، ss -tulpn، ethtool، systemctl، iptables و...) در کنار دستورات میکروتیک و سیسکو',
      'بهینه‌سازی محاسبات ریاضی موتور برداری نقشه توپولوژی (Schematic Map) و تفکیک کامل انحنای کابل‌های موازی بین دو دیوایس (Parallel Cables Overlap Fix) با اصلاح تراز جهت برداری'
    ],
    changes_en: [
      'Implemented backend Multi-Vendor Driver Pattern with BaseDriver abstraction and dedicated driver modules for Cisco IOS/IOS-XE, MikroTik RouterOS, Generic Linux, and Simulator',
      'Added enterprise SSHConnectionManager with Paramiko, lazy session acquisition, keepalive support, and automatic lifecycle cleanup',
      'Overhauled Add & Edit Device modals with Hardware Platform & OS selection, Driver Mode toggles (SSH Live vs Simulator), and platform-tailored credential inputs',
      'Standardized device schema with unified connection object supporting explicit protocols, ports, hosts, timeouts, and multi-vendor credentials',
      'Upgraded Interactive Device Terminal with native platform awareness: dynamic prompts ([admin@Router] >, user@host:~$), banner styling, and OS-authentic command parsing',
      'Enriched Quick Command Guide sidebar with dedicated Linux POSIX/iproute2 commands (ip -c a, ss -tulpn, ethtool, iptables, systemctl) alongside MikroTik and Cisco catalogs',
      'Resolved parallel topology link overlaps in Schematic View with vector direction compensation and dynamic curvature separation'
    ]
  },
  {
    version: '1.13.0',
    releaseDate: '2026-09-10',
    type: 'minor',
    title: 'پورتال جامع پشتیبان‌گیری و بازیابی اطلاعات شبکه (Backup & Disaster Recovery Portal) با رمزنگاری AES-GCM، ممیزی امنیتی SHA-256 و نقطه بازگشت خودکار',
    title_en: 'Enterprise Backup & Disaster Recovery Portal with 256-bit AES-GCM Encryption, SHA-256 Checksum Auditing & Instant Safety Rollback Protection',
    changes: [
      'ایجاد پورتال اختصاصی و پیشرفته پشتیبان‌گیری و بازیابی اطلاعات شبکه (Backup Portal) در منوی تنظیمات و سایدبار با رویکرد تاب‌آوری در برابر فاجعه (Disaster Recovery)',
      'پشتیبانی از تفکیک دامنه‌های استخراج: پکیج جامع شبکه (Full DR)، نقشه‌ها و توپولوژی سفارشی، کاربران و سطوح دسترسی (RBAC)، و الگوهای پیکربندی',
      'امنیت حداکثری داده‌ها: رمزنگاری استاندارد AES-GCM (256-bit) با مشتق‌گیری کلید PBKDF2 از رمز عبور دلخواه و قابلیت پاکسازی و ماسک‌کردن سکرت‌ها و پسوردهای SSH جهت اهداف ممیزی',
      'حفاظت و ارزیابی پیش از بازیابی (Pre-flight Inspection): بررسی خودکار اصالت امضای دیجیتال و هش SHA-256 و پیش‌نمایش دقیق محتوا قبل از اعمال روی دیتابیس',
      'مکانیزم ایمن بازگردانی: پشتیبانی از دو استراتژی جایگزینی کامل (Full Overwrite) با تایید کلمه‌ای و ادغام هوشمند افزایشی (Smart Incremental Merge)',
      'نقطه بازیابی اضطراری خودکار (Safety Snapshot): ایجاد اسنپ‌شات پیش از هرگونه تغییر با قابلیت بازگشت آنی یک‌کلیکه (Instant Rollback)',
      'کنترل دسترسی دقیق (RBAC): افزودن مجوزهای مجزای canExportBackup و canImportBackup به ماتریس پالیسی‌های دسترسی جهت مسدودسازی دسترسی کاربران غیرمجاز',
      'دفتر کل رویدادها (Audit Trail): ثبت دائمی تمام فعالیت‌های استخراج، بازیابی، رول‌بک و درخواست‌های مسدودشده با جزئیات کاربر و هش فایل'
    ],
    changes_en: [
      'Introduced dedicated Enterprise Backup & Disaster Recovery Portal in Settings and Sidebar with disaster resilience and state preservation architecture',
      'Multi-scope export engine: Full Disaster Recovery package, Custom Topology Maps & Inventory, Identity & Access Policies (RBAC), and Configuration Templates',
      'High-grade cryptographic security: 256-bit AES-GCM encryption with PBKDF2 key derivation from custom passphrase, plus sensitive credential sanitization for safe audit exports',
      'Pre-flight integrity validation: Automatic SHA-256 checksum verification, structural schema validation, and item inventory preview before database commit',
      'Two restore execution modes: Full Overwrite with safety keyword confirmation ("RESTORE") or Smart Incremental Merge preserving existing state',
      'Automated disaster rollback snapshot (Safety Point): Captures live system state prior to any restore operation with one-click Instant Rollback capability',
      'Granular RBAC integration: Added dedicated canExportBackup and canImportBackup capability flags to access control policies, locking actions for unauthorized roles',
      'Tamper-evident Disaster Recovery Audit Trail: Real-time logging of all export, restore, rollback, and RBAC-blocked events with timestamps and SHA-256 hashes'
    ]
  },
  {
    version: '1.12.0',
    releaseDate: '2026-09-09',
    type: 'minor',
    title: 'تفکیک منوی تنظیمات به زیرمنوهای سایدبار، ایجاد ماژول مدیریت کاربران و گروه‌های محلی و تعمیم کنترل دسترسی (RBAC) به تجهیزات میکروتیک و لینوکس',
    title_en: 'Modular Settings Navigation in Sidebar, Local Users & Security Groups Identity Management & Multi-Vendor Granular RBAC (Cisco, MikroTik RouterOS, Linux)',
    changes: [
      'تفکیک صفحات منوی تنظیمات از تب‌های فشرده درون‌صفحه‌ای به زیرمنوهای مستقل در سایدبار (گروه‌بندی دیوایس‌ها، کاربران و گروه‌های محلی، اکتیو دایرکتوری، سطوح دسترسی RBAC)',
      'افزودن کامل بخش مدیریت کاربران و گروه‌های محلی (Local Users & Security Groups) با قابلیت ایجاد کاربر، تخصیص کلمه عبور، فعال/غیرفعال‌سازی، تعریف گروه‌های امنیتی و مدیریت عضویت',
      'تعمیم جامع ماتریس دسترسی به تجهیزات غیر سیسکو و پشتیبانی از تجهیزات میکروتیک (MikroTik RouterOS) شامل Bridge VLAN، غیرفعال‌سازی اینترفیس، Safe-Mode، بکاپ و کنسول RouterOS',
      'پشتیبانی از اختیارات تجهیزات جنریک و لینوکسی (ip link toggle، عیب‌یابی پکت و شبکه، بکاپ کانفیگ، شل ترمینال)',
      'یکپارچه‌سازی کامل شبیه‌ساز نقش‌ها و پالیسی‌های دسترسی با کاربران و گروه‌های محلی در کنار اکتیو دایرکتوری'
    ],
    changes_en: [
      'Refactored Settings into dedicated sidebar submenus (Device Groups, Local Identity, Active Directory / LDAP, Granular RBAC) for clean navigation hierarchy',
      'Introduced full Local Identity management (Local Users & Security Groups) with account creation, credential management, activation toggles, and group membership sync',
      'Generalized Granular RBAC to multi-vendor network equipment with native MikroTik RouterOS capabilities (Bridge VLAN, interface toggle, Safe-Mode, IP pool, backup, RouterOS CLI)',
      'Added Linux & Generic network appliance capabilities (interface link toggle, diagnostics ping/trace/capture, config archive, SSH shell terminal)',
      'Fully linked the RBAC live role simulator with local identity groups and accounts alongside Active Directory'
    ]
  },
  {
    version: '1.11.0',
    releaseDate: '2026-09-09',
    type: 'minor',
    title: 'رفع سرریز دراپ‌داون اینترفیس‌ها در ترمینال، متن سفید پررنگ تگ‌های Trunk/Access، بنر تیره لاگین، منوی راست‌کلیک پورت‌ها (Shutdown/No Shutdown) و نشان استاندارد Layer 2 Security',
    title_en: 'Resolved Terminal Interface Dropdown Viewport Overflow, Bold White Trunk/Access Badges, Dark Gray Login Banner, Switch Faceplate Right-Click Context Menu (Shutdown/No Shutdown) & Standardized Layer 2 Security Badge',
    changes: [
      'اصلاح و بهینه‌سازی کادر کشویی اینترفیس‌ها در مودال ترمینال سیسکو و جلوگیری کامل از خروج آن از صفحه و کادر با جانمایی هوشمند',
      'اصلاح رنگ و کنتراست تگ‌های Trunk و Access در لیست اینترفیس‌ها به صورت متن کاملاً سفید و پررنگ (Bold) در تم روشن',
      'تغییر رنگ خطوط پیام احراز هویت لاگین (User Access Verification، نام کاربری، رمز عبور و خطوط ستاره) در تم روشن به رنگ خاکستری تیره استاندارد و خوانا',
      'اصلاح و سفید و بولد کردن متون و برچسب‌های بنفش در بخش Switch Faceplate زیر پورت‌های سخت‌افزاری',
      'تجهیز Switch Faceplate به منوی راست‌کلیک مستقیم با گزینه‌های مجزای Shutdown (خاموش/دیزیبل) و No Shutdown (روشن) و کپی دستورات CLI',
      'استانداردسازی کادر Layer 2 Security با متن مشکی و فونت پررنگ (Bold Black) در تمام بخش‌ها با کلاس سراسری'
    ],
    changes_en: [
      'Resolved Cisco terminal modal interface dropdown overflowing outside viewport with responsive auto-clamping and boundary protection',
      'Fixed contrast on Trunk and Access port mode badges with crisp bold white typography on vivid backgrounds in light theme',
      'Darkened Cisco login verification text (User Access Verification, credentials, and asterisks) to readable dark gray in light mode',
      'Formatted purple badges and VLAN tags under Switch Faceplate ports with high-contrast bold white text',
      'Equipped Switch Faceplate ports with dedicated right-click context menu offering direct Shutdown and No Shutdown operations with CLI command copy',
      'Standardized Layer 2 Security badges globally with ultra-crisp bold black text styling'
    ]
  },
  {
    version: '1.10.0',
    releaseDate: '2026-09-09',
    type: 'minor',
    title: 'اتصال زنده و واقعی SSH به تجهیزات شبکه در ترمینال CLI، نمایش پویا و زنده پورت‌ها، حذف بصری کابل‌های نقشه با تاییدیه و خوانایی برچسب‌های لینک',
    title_en: 'Real Hardware SSH Connectivity in Cisco Terminal CLI, Dynamic Real-Time Interface State Engine, Visual Topology Cable Deletion with Confirmation & Overlap-Free Link Badges',
    changes: [
      'پیاده‌سازی ارتباط زنده و واقعی SSH (Native SSH Client) از طریق کتابخانه قدرتمند ssh2 در بک‌اند نود و اجرای مستقیم دستورات روی تجهیزات سخت‌افزاری',
      'نمایش بلادرنگ وضعیت نشست SSH، تاخیر میلی‌ثانیه‌ای (Latency)، سایفر ارتباطی و لاگین زنده در سربرگ ترمینال سیسکو',
      'موتور پویا و زنده نمایش اطلاعات پورت‌ها و اینترفیس‌ها در دستورات show ip interface brief، show mac address-table، show port-security و show interfaces status بر اساس وضعیت حقیقی دستگاه',
      'امکان حذف بصری و مستقیم کابل‌ها و اتصالات در نقشه شماتیک توپولوژی با دکمه ضربدر شناور هنگام هاور موس همراه با مودال تایید حذف امن',
      'بهینه‌سازی کامل نشان‌ها و برچسب‌های اطلاعاتی کابل‌ها (پورت، ویلن و IP) جهت جلوگیری از همپوشانی و خوانایی حداکثری'
    ],
    changes_en: [
      'Implemented real hardware SSH connectivity using the native ssh2 client in the backend server with live command execution on network devices',
      'Added real-time SSH session indicator badges, millisecond latency measurements, cipher negotiation details, and live handshake in the Cisco terminal header',
      'Dynamic real-time interface and port state engine for show ip interface brief, show mac address-table, show port-security, and show interfaces status reflecting actual hardware configurations',
      'Visual interactive cable deletion on topology links with hover-activated delete action and a confirmation modal for safe link removal',
      'Optimized cable label badges (port IDs, VLANs, and IPs) with enhanced spacing to eliminate visual overlap and ensure maximum clarity'
    ]
  },
  {
    version: '1.9.0',
    releaseDate: '2026-09-09',
    type: 'minor',
    title: 'تست زنده اتصال SSH تجهیزات، فیلدهای احراز هویت در فرم افزودن تجهیز و ویرایش و اعمال دسته‌ای پورت‌های سوئیچ (Multi-Port Batch Configuration)',
    title_en: 'Live SSH Device Connection Testing, Inventory Credential Fields & Multi-Port Batch Switchport Configuration',
    changes: [
      'افزودن فیلدهای اطلاعات احراز هویت SSH (پورت، نام کاربری، کلمه عبور و Enable Secret) به مودال افزودن تجهیز جدید',
      'دکمه تعاملی بررسی زنده اتصال SSH (Test Connection) با سنجش بلادرنگ تاخیر (Latency) و نمایش فیدبک بصری خطا یا موفقیت',
      'امکان انتخاب چندتایی پورت‌های سوئیچ با نگه‌داشتن کلید Ctrl / Cmd / Shift روی فیس‌پلیت سخت‌افزاری یا چک‌باکس‌های جدول پورت‌ها',
      'پنل اختصاصی پیکربندی دسته‌ای پورت‌ها (Batch Configuration) با قابلیت تغییر همزمان وضعیت ادمین (no shutdown / shutdown)، مود ترانک و اکسس، تخصیص ویلن، ویلن‌های مجاز و امنیت پورت (Port Security)',
      'یکپارچه‌سازی کامل قابلیت ویرایش گروهی پورت‌ها در هر دو نمای مودال بازرس پورت (PortInspectorModal) و صفحه مستقل مدیریت پورت‌ها (PortManagementView)'
    ],
    changes_en: [
      'Added SSH credential fields (SSH Port, Username, Password, and Enable Secret) to the Add Device modal',
      'Interactive live SSH connection test button (Test Connection) with real-time latency measurement and visual feedback',
      'Multi-port batch selection support via Ctrl / Cmd / Shift + click on hardware faceplate ports or table checkboxes',
      'Dedicated Multi-Port Batch Configuration panel for bulk updates to Admin Status, Switchport Mode, Access VLAN, Trunk Allowed VLANs, and Cisco Port Security',
      'Unified batch configuration across both PortInspectorModal and the dedicated PortManagementView page'
    ]
  },
  {
    version: '1.8.2',
    releaseDate: '2026-09-09',
    type: 'patch',
    title: 'رفع خطای فراخوانی تابع ذخیره در مودال پیکربندی لینک (Fix onSave Function Handler in Link Modal)',
    title_en: 'Fix onSave Function Handler in Link Configuration Modal',
    changes: [
      'رفع خطای Uncaught TypeError: onSave is not a function هنگام ثبت کابل و ایجاد اتصال در نقشه سفارشی توپولوژی',
      'پشتیبانی دوگانه از پروپ‌های onSave / onSaveLink و onDelete / onDeleteLink با فراخوانی ایمن در مودال پیکربندی کابل و لینک'
    ],
    changes_en: [
      'Resolved Uncaught TypeError: onSave is not a function when connecting cables and creating links in custom topology maps',
      'Added dual backward-compatible support for onSave/onSaveLink and onDelete/onDeleteLink with defensive invocation guards in the link configuration modal'
    ]
  },
  {
    version: '1.8.1',
    releaseDate: '2026-09-09',
    type: 'patch',
    title: 'رفع خطای برخورد نام آیکون Map با سازنده اصلی جاوااسکریپت (Fix Map Constructor Conflict)',
    title_en: 'Fix Map Name Collision with JavaScript Native Map Constructor',
    changes: [
      'رفع خطای Uncaught TypeError: Map is not a constructor در صفحه شماتیک توپولوژی با تغییر نام آیکون Map به MapIcon',
      'تضمین عملکرد بی‌نقص نگاشت مختصات نودها در بوم نقشه با استفاده از شیء استاندارد JavaScript Map'
    ],
    changes_en: [
      'Resolved Uncaught TypeError: Map is not a constructor in Schematic Topology View by aliasing the Lucide Map icon to MapIcon',
      'Ensured seamless coordinate and node position mapping on the canvas using the native JavaScript Map object'
    ]
  },
  {
    version: '1.8.0',
    releaseDate: '2026-09-09',
    type: 'minor',
    title: 'سیستم جامع نقشه‌های سفارشی توپولوژی، ابزار سیم‌کشی و کابل‌کشی تعاملی و پیکربندی پورت‌ها و لینک‌ها',
    title_en: 'Custom Topology Maps, Interactive Cabling Tool, and Dual-End Port & Link Configuration Engine',
    changes: [
      'امکان ایجاد، ویرایش، حذف و جابجایی بین چندین نقشه توپولوژی سفارشی (Custom Topology Maps) در کنار نقشه خودکار کشف‌شده شبکه',
      'قابلیت انتخاب و افزودن تجهیزات موجود در شبکه به نقشه‌های سفارشی و تعیین موقعیت مکانی دلخواه بر روی صفحه بوم (Canvas)',
      'نوار ابزار تعاملی جدید شامل ابزار انتخاب/جابجایی (Select) و ابزار کابل‌کشی (Cable Tool) با بنر راهنمای گام‌به‌گام',
      'مودال انتخاب پورت تعاملی با پیش‌نمایش سخت‌افزاری Faceplate، تفکیک پورت‌های مبدأ و مقصد و تشخیص پورت‌های آزاد و مشغول',
      'مودال پیشرفته پیکربندی لینک و اتصالات کابل با قابلیت تعیین IP هر دو سمت، نوع کابل (Copper, Fiber, Serial)، پهنای باند، حالت پورت (Trunk یا Access)، شماره ویلن اختصاصی و توضیحات',
      'برچسب‌گذاری و نمایش زنده مشخصات کابل، پورت‌ها، شماره ویلن و IP هر سمت بر روی خطوط ارتباطی SVG در نقشه سفارشی با قابلیت کلیک برای ویرایش یا حذف لینک',
      'ذخیره‌سازی پایدار و مجزای نقشه‌ها، چیدمان نودها و لینک‌ها در حافظه محلی سیستم (LocalStorage)'
    ],
    changes_en: [
      'Support for creating, editing, renaming, deleting, and switching between multiple custom user-defined topology maps alongside the auto-discovered network schematic',
      'Ability to add and position existing inventory switches and routers onto custom map canvases with drag-and-drop spatial coordinate persistence',
      'New secondary toolbar with Select/Move and interactive Cable tools featuring persistent step-by-step connection banners',
      'Visual port selector modal featuring hardware switch faceplate previews, search filtering, and occupied/free port detection',
      'Advanced dual-end link configuration modal to define management IPs, port modes (802.1Q Trunk vs Access), VLAN IDs, cable types (Copper, Fiber, Serial), and link speeds',
      'Interactive SVG link rendering with endpoint badges for source/target ports, VLANs, and IPs, plus click-to-edit capabilities',
      'Complete client-side persistence of custom maps, node layouts, and custom link configurations in LocalStorage'
    ]
  },
  {
    version: '1.7.1',
    releaseDate: '2026-09-09',
    type: 'patch',
    title: 'یکپارچه‌سازی کامل نمایش فیزیکی پورت‌های سوئیچ (Switch Faceplate) در صفحه پایش پورت‌ها و ویلن',
    title_en: 'Harmonize Switch Faceplate Visual & Port Matrix in Port & VLAN Monitoring View',
    changes: [
      'یکپارچه‌سازی کامل نحوه نمایش پورت‌های فیزیکی در بخش «Ports, Trunk/Access & VLAN Monitoring» با استاندارد Switch Faceplate مودال جزئیات تجهیزات',
      'به‌کارگیری کامپوننت وکتور پورت‌های RJ-45 (NetworkPortSvg) به همراه شاسی سخت‌افزاری سوئیچ (Switch Chassis & Grid) در صفحه مدیریت پورت‌ها',
      'افزودن کارت اختصاصی وضعیت پورت سکیوریتی سیسکو (Cisco Port Security) به کارت ۵ گانه بازرس پورت در حالت مشاهده',
      'هماهنگ‌سازی لژند رنگی پورت‌ها (Up, Down, Disabled, Trunk) و ال‌ای‌دی‌های وضعیت با استانداردهای طراحی شاسی سخت‌افزاری'
    ],
    changes_en: [
      'Harmonized the physical port visualization in "Ports, Trunk/Access & VLAN Monitoring" to match the exact Switch Faceplate chassis and grid design of PortInspectorModal',
      'Integrated dedicated RJ-45 vector socket rendering (NetworkPortSvg) with interactive link LEDs, VLAN chips, and responsive hover/context states',
      'Added Cisco Port Security status card to the 5-card inspector grid in the port management view',
      'Synchronized faceplate header, hardware chassis background, and port status legend (Up, Down, Disabled, Trunk) across views'
    ]
  },
  {
    version: '1.7.0',
    releaseDate: '2026-09-08',
    type: 'minor',
    title: 'تاییدیه هوشمند دستورات سیسکو (سویچ/روتر)، مودال تخصیص ویلن، رنگ‌بندی وضعیت پورت‌ها و ناوبری پورت سکیوریتی',
    title_en: 'Cisco Device Command Confirmation (Switch/Router), Assign Access VLAN Modal, Port State Visuals & Port Security Navigation',
    changes: [
      'افزودن مودال تایید دو مرحله‌ای بله/خیر با تولید و پیش‌نمایش بلادرنگ دستورات Cisco IOS متناسب با نوع دستگاه (Switch یا Router) برای تغییرات Shutdown/No Shutdown، ترانک، اکسس و پورت سکیوریتی',
      'طراحی مودال اختصاصی تخصیص ویلن دسترسی (Assign Access VLAN Modal) با نمایش لیست ویلن‌های موجود تجهیز در بالا و کادر ورودی شماره دلخواه ویلن با تولید دستور متناظر switchport access vlan',
      'هدایت هوشمند و خودکار گزینه «فعال‌سازی پورت سکیوریتی» در منوی راست‌کلیک به بخش ویرایش پورت و تیک خوردن خودکار سکیوریتی جهت تنظیم دستی کاربر',
      'رنگ‌بندی بصری پورت‌های فیزیکی سوئیچ: پس‌زمینه قرمز ملایم برای پورت‌های Shutdown، پس‌زمینه نارنجی ملایم برای پورت‌های Disabled و حالت پیش‌فرض برای پورت‌های Up',
      'اصلاح رنگ و کنتراست بج‌های ویلن (v1, v10, ...) با متن سفید پررنگ (Bold White) روی پس‌زمینه بنفش برای خوانایی بی‌نقص در تمامی تم‌ها'
    ],
    changes_en: [
      'Interactive Yes/No Cisco CLI Command Confirmation Modal with real-time command syntax preview tailored to device type (Switch vs Router) for shutdown, no shutdown, trunk/access, and security toggle',
      'Dedicated Assign Access VLAN modal displaying existing device VLANs at top with custom VLAN ID input and generated CLI configuration preview',
      'Context menu "Enable Port Security" automated routing into port inspector edit form with auto-enabled toggle and smooth scroll',
      'Dynamic port status background coloring on Switch Faceplate: soft red tint for shutdown ports, soft amber tint for disabled ports, and standard dark tint for active ports',
      'High-contrast bold white typography on purple VLAN badges across switch ports and inventory tables for optimal visibility'
    ]
  },
  {
    version: '1.6.1',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'منوی راست‌کلیک پورت‌های سوئیچ (Cisco Port Context Menu)، بهینه‌سازی دراپ‌داون اینترفیس‌ها و کنتراست بالای لیبل‌ها در تم روشن',
    title_en: 'Cisco Switch Port Right-Click Context Menu, Terminal Interface Dropdown Fix & High-Contrast Light Theme Badges',
    changes: [
      'افزودن منوی راست‌کلیک پیشرفته روی پورت‌های فیزیکی سوئیچ (Switch Faceplate) جهت اعمال دستورات shutdown / no shutdown، تغییر حالت Trunk/Access، فعال‌سازی پورت سکیوریتی و تنظیم سریع VLAN',
      'رفع مشکل خروج لیست اینترفیس‌ها در مودال ترمینال از کادر و بهبود اسکرول و جانمایی خودکار با کلیک در بیرون کادر',
      'اصلاح رنگ و کنتراست تگ‌های Trunk و Access در تم روشن به صورت متن سفید پررنگ (Bold) روی پس‌زمینه بنفش/نیلی خوانا',
      'اصلاح رنگ متن بنر لاگین ترمینال (User Access Verification، نام کاربری و پسورد و خطوط ستاره) در تم روشن به خاکستری تیره استاندارد و خوانا',
      'به‌روزرسانی و استانداردسازی جهانی برچسب Layer 2 Security در کادر پورت سکیوریتی با متن مشکی و فونت بولد برجسته'
    ],
    changes_en: [
      'Introduced advanced right-click context menu (CiscoPortContextMenu) on Switch Faceplate physical ports for instant shutdown/no-shutdown, Trunk/Access mode toggle, Port Security activation, and quick VLAN assignment',
      'Resolved terminal modal interface dropdown overflowing outside viewport with responsive placement and click-outside dismissal',
      'Enhanced Trunk and Access port mode badges with crisp white bold typography over vivid purple/indigo backgrounds for pristine readability across light and dark themes',
      'Refined Cisco Terminal login verification banner text (User Access Verification, credentials, and asterisks) to dark slate/gray in light theme for optimal legibility',
      'Applied high-contrast bold black text styling globally to Layer 2 Security badge in Cisco Port Security modules'
    ]
  },
  {
    version: '1.6.0',
    releaseDate: '2026-09-08',
    type: 'minor',
    title: 'مدیریت سلسله‌مراتبی پیشرفته استقرار فیزیکی (ساختمان > طبقه > بخش/واحد > رک) با درگ اند دراپ، ویرایش، حذف و تنظیم پورت بک‌اند',
    title_en: 'Advanced Hierarchical Physical Placement (Building > Floor > Unit > Rack) with Drag & Drop, Full CRUD & Backend Port Selection',
    changes: [
      'پیاده‌سازی ساختار سلسله‌مراتبی کامل فیزیکی شامل ساختمان (Building)، طبقه (Floor)، واحد/بخش (Unit/Section) و رک (Rack)',
      'پشتیبانی کامل از کشیدن و رها کردن (Drag & Drop) تجهیزات بین ساختمان‌ها، طبقات، بخش‌ها و رک‌ها با فیدبک بصری و ذخیره‌سازی زنده',
      'امکان ایجاد، ویرایش نام (Rename) و حذف (Delete) برای تمامی سطوح سلسله‌مراتب (ساختمان، طبقه، واحد و رک)',
      'افزودن امکان تعریف واحد/بخش و رک درون هر طبقه به صورت اختصاصی با مودال‌های مدرن',
      'حذف برچسب نسخه از هدر جهت خلوت‌تر و مینیمال شدن نوار بالایی سامانه',
      'دریافت پورت سفارشی بک‌اند با مقدار پیش‌فرض در اسکریپت‌های نصب خودکار (install.sh و setup-panel.sh)'
    ],
    changes_en: [
      'Full physical hierarchy structure implementation supporting Building > Floor > Unit/Section > Rack levels',
      'End-to-end interactive Drag & Drop for devices across buildings, floors, units, and racks with live visual drop feedback and persistence',
      'Complete CRUD controls: Add, Rename, and Delete for all hierarchy levels (Building, Floor, Unit, and Rack)',
      'Floor-level actions to dynamically spawn custom Units/Rooms and Server Racks via modern glassmorphic modals',
      'Removed version tag from top navbar for a clean, minimalist header bar',
      'Interactive backend port configuration with intelligent default fallback in automated Linux installer scripts (install.sh & setup-panel.sh)'
    ]
  },
  {
    version: '1.5.0',
    releaseDate: '2026-09-08',
    type: 'minor',
    title: 'قابلیت کشیدن و رها کردن (Drag & Drop) تجهیزات بین طبقات و ساختمان‌ها در نقشه استقرار فیزیکی',
    title_en: 'Drag & Drop Physical Device Placement Across Buildings & Floors in Physical Map',
    changes: [
      'امکان درگ اند دراپ (Drag & Drop) تعاملی تجهیزات شبکه بین طبقات مختلف یک ساختمان یا جابجایی بین ساختمان‌های مجزا در نمای استقرار فیزیکی (Physical Placement)',
      'به‌روزرسانی آنی و زنده رابط کاربری (Optimistic UI) با ارسال همزمان درخواست تغییر موقعیت فیزیکی به بک‌اند و بازگشت خودکار در صورت بروز خطا',
      'افزودن امکان تعریف ساختمان جدید و طبقات جدید به صورت داینامیک با مودال‌های مدرن و شیشه‌ای',
      'افزودن دکمه و مودال جابجایی دستی (Manual Relocation) برای دستگاه‌ها جهت پشتیبانی از انتخاب دقیق یا سفارشی ساختمان و طبقه مقصد',
      'نمایش وضعیت زنده، پیام‌های راهنما، انیمیشن ناحیه هدف (Drop Zone) و بازخورد صوتی/بصری تغییر مکان'
    ],
    changes_en: [
      'Interactive HTML5 Drag & Drop for network devices between floors and across different buildings in the Physical Placement schematic view',
      'Optimistic UI state updates with real-time backend persistence (PUT /api/devices/:id) and automatic rollback upon error',
      'Dynamic creation of custom buildings and floors via clean glassmorphic modals to expand physical topology hierarchy',
      'Manual relocation modal offering accessible dropdown and custom input selectors for precision placement without drag gestures',
      'Live visual feedback including animated drop zones, moving indicator pills, and toast status notifications'
    ]
  },
  {
    version: '1.4.4',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'سازگاری کامل مودال بازرسی پورت با تمام تم‌های رنگی و خلوت‌سازی نوار کناری و پروفایل',
    title_en: 'Full Theme Color Compatibility for Port Inspector Modal & Sidebar/Profile Decluttering',
    changes: [
      'سازگاری کامل مودال بازرسی و پیکربندی پورت‌ها (Port Inspector Modal) شامل جدول پورت‌ها، فرم ویرایش و سامری تایید با تمامی تم‌های رنگی و تم روشن',
      'حذف باکس هشدار قطعی تجهیزات (Outage Alert) از سایدبار جهت خلوت‌سازی و پاکیزگی نوار ناوبری',
      'حذف نمایش شماره نسخه از پاورقی سایدبار',
      'مینیمال‌سازی نشانگر نشست فعال (Active Session) در منوی کاربری به یک نشانگر ظریف و پالس‌زننده'
    ],
    changes_en: [
      'Full multi-theme color compatibility for Port Inspector Modal including inventory table, edit form, and apply confirmation summary',
      'Removed Outage Alert box from sidebar to achieve a clean, clutter-free navigation drawer',
      'Removed version badge from sidebar footer',
      'Minimized Active Session status in profile dropdown to an elegant pulsing indicator'
    ]
  },
  {
    version: '1.4.3',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'خلوت‌سازی هدر، افزودن منوی دراپ‌داون پروفایل و سازگاری کامل صفحات پورت‌ها و اسکنر CDP/LLDP با تم‌های رنگی',
    title_en: 'Header Decluttering, Profile Dropdown Menu & Full Theme Color Compatibility for Port Management and CDP/LLDP Scanner',
    changes: [
      'ایجاد آیکون و منوی کشویی یکپارچه پروفایل (Profile Dropdown) در هدر با انتقال تنظیمات تیم/سازمان و سوئیچر زبان به داخل آن',
      'حذف نشانگرهای شلوغ تعداد تجهیزات آنلاین و کریتیکال از نوار بالایی جهت خلوت و مینیمال شدن کامل هدر',
      'کوچک‌سازی چشمگیر برچسب نسخه سامانه به یک تگ ظریف و فشرده در هدر',
      'اصلاح و بازطراحی کامل صفحه مدیریت پورت‌ها (PortManagementView) جهت سازگاری ۱۰۰٪ با تمامی تم‌های تیره و رنگی (Obsidian, Emerald, Cobalt, Rose, Amber, Light) و حذف پس‌زمینه‌های سفید استاتیک',
      'به‌روزرسانی و هماهنگ‌سازی استایل پوسته فیزیکی سوئیچ (Faceplate) و جدول پورت‌ها با افکت شیشه‌ای spatial-glass'
    ],
    changes_en: [
      'Implemented a unified user profile dropdown menu in header consolidating Team/Organization and Language controls',
      'Removed crowded online and critical device count badges to deliver a clean, minimalist header bar',
      'Significantly reduced header version badge size into a compact, elegant tag',
      'Refactored Port Management view (PortManagementView) to achieve 100% theme compatibility across Obsidian, Emerald, Cobalt, Rose, Amber, and Light palettes',
      'Harmonized switch hardware faceplate visual and ports data table with adaptive spatial-glass styling'
    ]
  },
  {
    version: '1.4.2',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'طراحی فاوآیکون اختصاصی شبکه و ترجمه کامل انگلیسی صفحات توپولوژی شماتیک، پورت‌ها، اسکنر CDP/LLDP و ادیتور قالب‌ها',
    title_en: 'Network Favicon & Complete English Localization for Schematic Topology, Port Management, CDP/LLDP Scanner & Template Editor',
    changes: [
      'طراحی فاوآیکون مدرن و وکتور مرتبط با شبکه (SVG) و جایگزینی آن در فایل اصلی index.html',
      'ترجمه و بومی‌سازی ۱۰۰٪ صفحه نقشه شماتیک توپولوژی شبکه شامل کارت‌های تجهیز، پورت‌ها، راهنمای نقشه، هدر، سرچ‌باکس و دراور جزئیات',
      'ترجمه کامل انگلیسی مودال ویرایش قالب‌های پیکربندی (Edit Configuration Template) شامل برچسب‌های متغیرها (Display Label) و پلیس‌هولدرها',
      'ترجمه جامع صفحه پایش و مدیریت پورت‌ها (Port Management) شامل طرح فیزیکی پورت‌ها (Faceplate)، فرم ویرایش پورت و جدول پورت‌ها',
      'بومی‌سازی کامل و رفع متون فارسی در اسکنر لایه ۲ همسایگی CDP/LLDP شامل دکمه‌ها، کارت‌های آماری، راهنمای پروتکل و جدول همسایگان'
    ],
    changes_en: [
      'Designed and deployed a modern network-themed SVG favicon replacing default icon in index.html',
      'Complete 100% English translation for Schematic Topology view including node cards, ports, legend, header controls, search, and detail drawer',
      'Localized Edit Configuration Template modal fields, variable display labels, and placeholders in English mode',
      'Comprehensive English localization for Port Management view including physical faceplate layout, port edit form, and inventory table',
      'Full localization of CDP/LLDP Layer-2 Discovery Scanner including scan controls, metrics cards, protocol guide, and neighbor table'
    ]
  },
  {
    version: '1.4.1',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'اصلاح ریسپانسیو مودال‌ها در صفحات کوچک و ترجمه کامل متون فارسی به انگلیسی',
    title_en: 'Modal Responsive Viewport Scaling & Complete English Localization for All Modals',
    changes: [
      'حل کامل مشکل بیرون زدن مودال‌ها از صفحه نمایش در مانیتورها و لپ‌تاپ‌های کوچک با ارتفاع داینامیک (max-h-[90vh]) و اسکرول داخلی',
      'ترجمه جامع و کامل ۱۰۰ درصدی تمام متون، پیام‌ها، راهنماها و دکمه‌های فارسی موجود در مودال‌ها در حالت انگلیسی',
      'تثبیت هدر و فوتر مودال‌ها (Pinned Header/Footer) با کانتینر اسکرول‌پذیر میانی برای دسترسی همیشگی به دکمه‌های تایید و بستن',
      'هماهنگ‌سازی و بهبود استایل مودال‌های ثبت تجهیز، کلون‌گیری، اعمال تمپلیت، بازرسی پورت، ترمینال و یادداشت‌های انتشار'
    ],
    changes_en: [
      'Fixed viewport overflow for all modals on small screens with max-h-[90vh] constraints and independent inner scrolling',
      'Complete 100% English translation for all modal dialogs, forms, tooltips, validation messages, and action buttons',
      'Pinned modal headers and action footers ensuring save/cancel controls remain visible and accessible on any screen height',
      'Harmonized visual styling across Add Device, Clone Template, Apply Template, Port Inspector, Terminal, and Release Notes modals'
    ]
  },
  {
    version: '1.4.0',
    releaseDate: '2026-09-08',
    type: 'minor',
    title: 'سیستم جامع چندزبانگی (انگلیسی پیش‌فرض و فارسی)، منوی آکاردئونی سایدبار و یکپارچه‌سازی سایز دکمه‌ها',
    title_en: 'Comprehensive i18n System (English Default & Persian), Accordion Sidebar & Button Size Standardization',
    changes: [
      'پیاده‌سازی موتور جامع بین‌المللی‌سازی و چندزبانگی (i18n) با زبان پیش‌فرض انگلیسی (English Default) و زبان دوم فارسی (Persian)',
      'تضمین عدم نمایش هرگونه متن فارسی در حالت انگلیسی با واژه‌نامه کامل دوزبانه برای عناوین، پیام‌ها، دکمه‌ها، فیلترها و راهنماها',
      'سوئیچر زبان تعاملی در هدر (Navbar) با تغییر لحظه‌ای و پیوسته جهت چیدمان (RTL / LTR) و ذخیره‌سازی ماندگار در حافظه مرورگر',
      'بازطراحی ساختار منوی سایدبار به صورت آکاردئونی هوشمند (Accordion Collapsible Groups) با حالت باز پیش‌فرض و رفتار تک‌والد بازشونده',
      'هماهنگ‌سازی و استانداردسازی سایز، پدینگ و تایپوگرافی دکمه‌های اکشن بالای صفحه مدیریت الگوها بر اساس استانداردهای صفحه مدیریت تجهیزات',
      'ثبت قوانین الزامی چندزبانگی، رفتار سایدبار و استانداردهای دکمه‌ها در سند راهنمای سیستمی AGENTS.md'
    ],
    changes_en: [
      'Implemented robust internationalization (i18n) engine with English as default and Persian as secondary language',
      'Strict zero-Persian mandate in English mode with full dual-language dictionary across all views, controls, and alerts',
      'Interactive header language selector with seamless RTL/LTR layout transitions and persistent browser storage',
      'Accordion collapsible sidebar architecture with default-open state and single-parent auto-collapse behavior',
      'Standardized action button dimensions, paddings, and typography across template management and device inventory views',
      'Persistent system rule documentation updated in AGENTS.md'
    ]
  },
  {
    version: '1.3.4',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'اصلاح مخفی‌سازی هدر در حالت فول و بهبود موقعیت‌یابی و طراحی راهنمای نقشه توپولوژی',
    changes: [
      'مخفی‌سازی کامل هدر اصلی سامانه (شامل نام پورتال، دکمه داده‌های نمونه، پویش سریع، تم و...) در زمان فعال‌سازی حالت فول (Fullscreen Mode)',
      'اصلاح کانتینر اصلی در App.tsx جهت حذف کامل هدر، سایدبار و فوتر از DOM در حالت تمام‌صفحه و پیشگیری از هم‌پوشانی و تداخل لایه‌ها (Stacking Context)',
      'رفع کامل مشکل قرارگیری راهنمای نقشه توپولوژی زیر فوتر و انتقال آن به موقعیت استاندارد، زیبا و ایمن در گوشه پایین چپ نقشه',
      'طراحی جدید راهنمای نقشه به صورت کارت شناور هوشمند با قابلیت باز و بسته شدن (Collapse / Expand) جهت جلوگیری از پوشاندن نودها و پورت‌ها',
      'پشتیبانی هماهنگ و یکپارچه از کلید Esc جهت خروج روان از حالت تمام‌صفحه'
    ]
  },
  {
    version: '1.3.3',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'حالت تمام‌صفحه نقشه شماتیک (Fullscreen Topology) و معماری اختصاصی و امن Self-Signed SSL',
    changes: [
      'افزودن دکمه شناور اختصاصی حالت تمام‌صفحه در بالا سمت چپ نقشه شماتیک با نمایش عنوان «حالت فول» در هاور و پشتیبانی از کلید میانبر Esc',
      'پوشش کامل و ۱۰۰ درصدی صفحه مرورگر در حالت فول با مخفی‌سازی خودکار هدر، سایدبار، منوهای بالا و فوتر جهت اشراف کامل بر تمام گره‌ها و پیوندهای شبکه',
      'امکان سوئیچ و مخفی‌سازی/نمایش نوار ابزار داخل نقشه در حالت تمام‌صفحه جهت بهره‌برداری حداکثری از فضای ترسیم',
      'اصلاح ساختار اسکریپت‌های راه‌اندازی setup-panel.sh و install.sh و اجباری‌سازی معماری امن انحصاری Strict Self-Signed SSL (HTTPS)',
      'دریافت پورت دلخواه SSL کاربر و حذف کامل لیسنرهای ناامن HTTP (پورت 80 و پورت‌های مستقیم وب و بک‌اند)',
      'ایزوله‌سازی فرانت‌اند و بک‌اند به لوپ‌بک محلی (127.0.0.1) با بازهدایت خودکار خطای 497 (HTTP to HTTPS) در Nginx',
      'اصلاح گزارش نهایی نصب جهت ارائه منحصربه‌فرد آدرس HTTPS امن بدون درج آدرس‌های ناامن دیگر'
    ]
  },
  {
    version: '1.3.2',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'تثبیت و رفع اسکرول منوی دسترسی سایدبار راست (Sticky Sidebar Navigation)',
    changes: [
      'تثبیت کامل منوی دسترسی سایدبار راست حین اسکرول محتوای صفحات (مانند لیست بلند تجهیزات، داشبورد و مدیریت پورت‌ها)',
      'جداسازی اسکرول محتوای صفحه از سایدبار با ساختار دوگانه کانتینر در App.tsx (افزودن overflow-hidden به ریشه و overflow-y-auto به کانتینر اصلی محتوا)',
      'افزودن موقعیت‌یابی چسبنده (sticky top-14) و ارتفاع کامل به همراه اسکرول‌بار اختصاصی و ظریف (custom-scrollbar) برای منوی سایدبار در صفحات کوچک و بزرگ',
      'بهبود استایل و کنتراست آیتم‌های سایدبار در تم روشن (Light Theme) جهت نمایش شفاف وضعیت انتخاب و هاور'
    ]
  },
  {
    version: '1.3.1',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'اصلاح کامل رنگ‌بندی مودال‌های استخراج کانفیگ زنده و اعمال تمپلیت در تم روشن (Light Theme Harmonization)',
    changes: [
      'هماهنگ‌سازی کامل استایل و رنگ‌بندی مودال CaptureConfigModal بر اساس الگوی استاندارد CloneTemplateModal',
      'حذف گرادیانت‌های نامناسب آبی-بنفش و پس‌زمینه‌های تیره/خاکستری کدر در تم روشن مودال‌ها',
      'اصلاح کادرهای ورودی (Inputs, Selects, Textareas) با پس‌زمینه سفید خالص (#ffffff)، متون تیره پرکنتراست (#0f172a) و بوردرهای مشخص جهت رفع مشکل ناخوانایی متن سفید روی پس‌زمینه سفید',
      'خوانایی کامل و استایل‌دهی یکپارچه به کارت‌های آپشن‌های هوشمند، سربرگ‌ها، لاگ‌های نشست و فرامین کانفیگ در هر دو تم تاریک و روشن',
      'بهبود استایل و کنتراست مودال اعمال تمپلیت روی تجهیزات (ApplyTemplateModal) در تم لایت',
      'ثبت قانون دائمی استانداردهای استایل مودال‌ها در فایل AGENTS.md جهت پیشگیری از خطاهای آتی در طراحی رابط کاربری'
    ]
  },
  {
    version: '1.3.0',
    releaseDate: '2026-09-08',
    type: 'minor',
    title: 'موتور استخراج هوشمند و تبدیل خودکار کانفیگ تجهیز زنده (سیسکو و میکروتیک) به الگوی پارامتریک',
    changes: [
      'افزودن دکمه «استخراج الگو از تجهیز زنده» (Extract Live Config) در بخش مدیریت الگوها و تمپلیت‌ها',
      'پشتیبانی از اتصال مستقیم SSH/Telnet به تجهیزات با دریافت آدرس IP، پورت، یوزرنیم، پسورد و Enable Secret',
      'امکان انتخاب سریع از میان تجهیزات ثبت‌شده شبکه یا ورود دستی مشخصات تجهیز جدید',
      'موتور پارامتریک‌سازی خودکار (Auto-Parameterize) جهت تبدیل نام تجهیز، IP مدیریتی، سابنت، گیت‌وی و DNS به متغیرهای پویا',
      'پاکسازی و امن‌سازی اطلاعات حساس (Sanitize Secrets) و ماسک کردن رمزهای عبور، هش‌ها و SNMP Community Strings',
      'پشتیبانی تخصصی از دستورات فشرده میکروتیک (/export compact) و دستورات Cisco IOS/IOS-XE (show running-config)',
      'مودال دو مرحله‌ای پیشرفته برای استخراج، پیش‌نمایش کانفیگ خام، ویرایش متغیرها و نام‌گذاری تمپلیت',
      'امکان ذخیره مستقیم در لیست الگوها و اعمال آنی بر روی سایر تجهیزات شبکه'
    ]
  },
  {
    version: '1.2.3',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'بهبود تفکیک جداول تجهیزات، منوی عملیات ۳ نقطه و هماهنگ‌سازی رنگ‌بندی صفحه الگوها با داشبورد',
    changes: [
      'افزودن خطوط جداکننده عمودی بین سرستون‌های جدول تجهیزات (Header Dividers) برای خوانایی کامل عناوین',
      'افزودن خطوط جداکننده و استایل تفکیک ردیف‌های تجهیزات (Row Separators & Alternating Bands) در تم روشن و تاریک',
      'جایگزینی دکمه‌های کانکت، تمپلیت و حذف با منوی دراپ‌داون سه نقطه (3-Dots Actions Menu) حرفه‌ای و مرتب',
      'اصلاح ساختار و رنگ‌بندی کامل صفحه الگوها و تمپلیت‌ها (Template Management) با کارت‌های spatial-glass، شبیه داشبورد',
      'کنتراست استاندارد و وضوح کارت‌های KPI، تولبار فیلترها و کادر مشاهده کامندهای CLI در هر دو تم تاریک و روشن'
    ]
  },
  {
    version: '1.2.2',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'هماهنگ‌سازی و اصلاح استایل بج Cisco IOS-XE و کادرهای مودال در تم روشن (Light Theme Harmonization)',
    changes: [
      'ایجاد کلاس اختصاصی و بهینه‌سازی شده vendor-badge-cisco و vendor-badge-mikrotik با کنتراست استاندارد و وضوح عالی در تم روشن و تاریک',
      'اصلاح رنگ و پس‌زمینه بج Cisco IOS-XE در سربرگ مودال اعمال تعاملی تمپلیت (Apply Template Modal)',
      'هماهنگ‌سازی استایل بج و تگ‌های سیسکو در تمامی مودال‌ها (کلون‌گیری، ویرایشگر تمپلیت، ترمینال و بازرسی پورت)',
      'اصلاح پس‌زمینه کادر مودال‌ها، فیلدهای ورودی و سلکت‌باکس‌ها در تم روشن جهت یکپارچگی بصری کامل',
      'حفظ خوانایی کنتراست بالای خروجی‌ها و بلوک‌های کد ترمینال در کلیه حالت‌های تم',
    ]
  },
  {
    version: '1.2.1',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'امکان کلون‌گیری و انشعاب از تمپلیت‌ها با نام جدید و ویرایش جزیی دستورات (Template Cloning)',
    changes: [
      'افزودن پنجره اختصاصی کلون‌گیری (Clone Template Modal) با امکان تعیین نام جدید دلخواه برای تجهیز جدید',
      'امکان شخصی‌سازی و اعمال تغییرات جزیی در خطوط فرامین CLI مبدا بدون تغییر تمپلیت اصلی',
      'امکان تغییر مقادیر پیش‌فرض متغیرها (آدرس IP، سابنت، ویلن و...) متناسب با تجهیز جدید',
      'دکمه‌های دسترسی سریع کلون بر روی سربرگ و پاورقی تمامی کارت‌های تمپلیت',
      'امکان ذخیره به عنوان کلون با نام جدید مستقیماً از داخل ویرایشگر تمپلیت (Save as Clone)',
    ]
  },
  {
    version: '1.2.0',
    releaseDate: '2026-09-08',
    type: 'minor',
    title: 'اضافه شدن سیستم مدیریت الگوها و تمپلیت‌های کانفیگ تجهیزات شبکه (Template System)',
    changes: [
      'صفحه اختصاصی مدیریت و تعریف الگوهای کانفیگ (Template Management View) با فیلتر سیسکو و میکروتیک',
      'پشتیبانی از الگوهای استاندارد برای سوئیچ‌ها و روترهای سیسکو (IOS-XE) و میکروتیک (RouterOS)',
      'سیستم متغیرهای پویا (Template Variables) با تشخیص خودکار متغیرهای {{VAR}} در متن دستورات',
      'تایید تعاملی مقادیر و آدرس‌های IP و پیش‌فرض‌ها قبل از اجرا بر روی تجهیز',
      'انتخاب تمپلیت در فرم معرفی تجهیز جدید (Add Device) و شروع بلافاصله فرآیند اعمال کانفیگ',
      'امکان اعمال تمپلیت به طور مستقیم بر روی هر تجهیز از جدول موجودی تجهیزات شبکه',
      'موتور هوشمند اجرای دستورات در مدهای استاندارد خط فرمان با لاگ زنده شبیه‌سازی شده ترمینال و ثبت در دیتابیس',
    ],
  },
  {
    version: '1.1.2',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'رفع مشکل پنهان شدن و برش تجهیزات در هنگام جابجایی در حالت زوم اوت',
    changes: [
      'حذف کادر و محدوده برش SVG (Unbounded Canvas) و انتقال ترنسفورم به لایه گروه بی‌نهایت',
      'نمایش کامل و بدون محدودیت تجهیزات در هنگام درگ به تمام جهات (بالا، پایین، چپ و راست)',
      'افزایش دامنه زوم تا ۰.۲X و بهینه‌سازی حرکت شبکه‌بندی پس‌زمینه همراه با جابجایی دید',
      'رفع خطای برش ForeignObject در نودهای دارای برچسب و سایه عمیق',
    ],
  },
  {
    version: '1.1.1',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'رفع خطای کلید در فیلتر ساختمان‌های نقشه شماتیک',
    changes: [
      'اصلاح ساختار کلیدهای منحصربه‌فرد (unique key prop) در لیست ساختمان‌های فیلتر نقشه شماتیک',
      'پشتیبانی جامع و ایمن از ساختار آرایه‌ای داده‌های ساختمان‌های ارسال شده از سرور',
    ],
  },
  {
    version: '1.1.0',
    releaseDate: '2026-09-08',
    type: 'minor',
    title: 'ارتقای تعاملی نقشه شماتیک و بهینه‌سازی رابط کاربری',
    changes: [
      'قابلیت درگ و دراپ (Drag & Drop) برای جابجایی آزادانه تمامی تجهیزات در نقشه شماتیک',
      'بزرگنمایی و کوچکنمایی نرم نقشه با اسکرول موس (Mouse Wheel Zoom In / Out)',
      'ذخیره‌سازی خودکار و ماندگار موقعیت نودها، سطح بزرگنمایی و موقعیت دید در مرورگر',
      'حذف برچسب‌های متنی اضافه در سایدبار و رفع تداخل ظاهری آن‌ها با عناوین',
      'قابلیت جمع‌شوندگی و بازشوندگی سایدبار (Collapsible Sidebar) برای مشاهده وسیع‌تر نقشه',
      'افزودن سیستم مدیریت نسخه و تاریخچه تغییرات (Release Notes & Versioning)',
    ],
  },
  {
    version: '1.0.0',
    releaseDate: '2026-09-08',
    type: 'major',
    title: 'انتشار نسخه پایه سامانه مانیتورینگ و توپولوژی شبکه NetTopology',
    changes: [
      'داشبورد پایش لحظه‌ای پینگ و تأخیر تجهیزات شبکه',
      'نمایش شماتیک سلسله‌مراتبی سوئیچ‌های Core، Distribution، Access و روترها',
      'محیط شماتیک ساختمانی با تفکیک فیزیکی طبقات و واحدها',
      'موتور کشف همسایگی‌های شبکه سیسکو با پروتکل‌های CDP و LLDP',
      'مدیریت و نظارت دقیق پورت‌ها، ترانک‌ها و ویلن‌ها (VLANs)',
      'کنسول ترمینال شبیه‌ساز سیسکو (CLI Terminal)',
      'موتور تم‌های بصری فضایی و دارک‌مود پیشرفته',
    ],
  },
];
