/**
 * Bulk Configuration Templates & Parameters Comprehensive Info Guide
 * Provides structured educational information for:
 * 1. What it is (ماهیت و عملکرد)
 * 2. Why it is needed (چرا نیاز است و ضرورت کارکردی)
 * 3. Practical Example (مثال کاربردی و مقدار نمونه)
 */

export interface InfoItem {
  what: string;
  why: string;
  example: string;
}

export interface TemplateInfoGuide {
  template: InfoItem;
  parameters: Record<string, InfoItem>;
}

export const TEMPLATE_INFO_GUIDE_FA: Record<string, TemplateInfoGuide> = {
  create_vlan: {
    template: {
      what: 'ایجاد شبکه محلی مجازی (VLAN) جهت جداسازی ترافیک لایه ۲، کاهش دامنه انتشار (Broadcast Domain) و اعمال پالیسی‌های امنیتی.',
      why: 'در شبکه‌های سازمانی برای تفکیک بخش‌ها (مانند اداری، مالی، دوربین‌ها، مهمان و سرورها) و جلوگیری از نفوذ یا تداخل ترافیکی ضروری است.',
      example: 'ایجاد VLAN 10 به نام SALES_DATA با آی‌پی گیت‌وی 192.168.10.1/24 روی سوئیچ‌های اکسس و کور.'
    },
    parameters: {
      vlan_id: {
        what: 'شناسه عددی منحصربه‌فرد استاندارد 802.1Q بین ۱ تا ۴۰۹۴ جهت تفکیک سگمنت شبکه.',
        why: 'سوئیچ‌ها و روترها فریم‌های اترنت را بر اساس این عدد تگ‌گذاری و تفکیک می‌کنند.',
        example: '10 (کاربران), 20 (صدا/VoIP), 100 (سرورها)'
      },
      vlan_name: {
        what: 'نام توصیفی برای وی‌لن در پایگاه داده سوئیچ (بدون فاصله).',
        why: 'خوانایی و مدیریت راحت‌تر در مانیتورینگ و دستورات show vlan brief.',
        example: 'CORP_DATA, GUEST_WIFI, IP_CAMERAS'
      },
      configure_ip_gateway: {
        what: 'فعال‌سازی اینترفیس مجازی لایه ۳ (SVI در سیسکو یا Interface VLAN در میکروتیک) به عنوان گیت‌وی.',
        why: 'اگر مایلید این سوئیچ یا روتر نقش Default Gateway کاربران آن وی‌لن را بازی کرده و مسیریابی بین وی‌لن‌ها (Inter-VLAN Routing) را انجام دهد، این گزینه را فعال کنید.',
        example: 'فعال (True) برای سوئیچ‌های L3 و Core، غیرفعال (False) برای سوئیچ‌های صرفاً اکسس L2.'
      },
      gateway_ip: {
        what: 'آدرس IP لایه سه که به عنوان گیت‌وی پیش‌فرض به کلاینت‌های این وی‌لن اختصاص می‌یابد.',
        why: 'کلاینت‌ها برای ارتباط با اینترنت یا سایر وی‌لن‌ها بسته‌های خود را به این آدرس تحویل می‌دهند.',
        example: '192.168.10.1 یا 10.50.0.1'
      },
      subnet_mask: {
        what: 'ماسک زیرشبکه یا طول پیشوند جهت مشخص کردن ابعاد ساب‌نت.',
        why: 'تعیین‌کننده محدوده هاست‌ها و آدرس برودکست شبکه.',
        example: '255.255.255.0 (معادل /24 با ۲۵۴ هاست) یا 255.255.0.0 (/16)'
      },
      assign_access_ports: {
        what: 'پورت‌های اکسس جهت اتصال مستقیم رایانه‌ها یا تجهیزات انتهایی به این وی‌لن.',
        why: 'سوئیچ بسته‌های ورودی از این پورت‌ها را با PVID این وی‌لن برچسب می‌زند.',
        example: 'در سیسکو: Gi1/0/1-12 | در میکروتیک: ether2,ether3,ether4'
      },
      add_to_trunk_ports: {
        what: 'پورت‌های ترانک با قابلیت انتقال چند وی‌لن به سمت سوئیچ‌های دیگر یا روتر.',
        why: 'جهت عبور فریم‌های تگ‌شده این وی‌لن بین سوئیچ‌های مختلف شبکه بدون مسدود شدن.',
        example: 'در سیسکو: Gi1/0/24,Gi1/0/48 | در میکروتیک: ether1,sfp-sfpplus1'
      },
      mikrotik_parent_interface: {
        what: 'اینترفیس والد در سیستم‌عامل میکروتیک که وی‌لن به آن متصل می‌شود.',
        why: 'در معماری Bridge VLAN Filtering میکروتیک، وی‌لن باید عضو بریج سراسری باشد.',
        example: 'bridge (پیش‌فرض استاندارد) یا ether1'
      },
      cisco_router_parent_interface: {
        what: 'اینترفیس فیزیکی روتر سیسکو که ساب‌اینترفیس Router-on-a-Stick روی آن ساخته می‌شود.',
        why: 'روترها به جای اینترفیس مجازی، ساب‌اینترفیس با شماره ساب‌دومین و کپسوله‌سازی dot1Q می‌سازند.',
        example: 'GigabitEthernet0/0/0 یا GigabitEthernet0/1'
      }
    }
  },
  delete_vlan: {
    template: {
      what: 'حذف کامل شناسه و اینترفیس یک VLAN از دیتابیس سوئیچ یا جدول بریج میکروتیک.',
      why: 'هنگام از رده خارج شدن یک شبکه یا سگمنت و پاکسازی کانفیگ‌های قدیمی.',
      example: 'حذف VLAN 99 پس از جابه‌جایی سرورهای تست.'
    },
    parameters: {
      vlan_id: {
        what: 'شماره عددی وی‌لنی که قصد حذف آن را از تمام تجهیزات دارید.',
        why: 'دستگاه بر اساس این شناسه دیتابیس و پورت‌ها را آزاد می‌کند.',
        example: '10'
      },
      remove_svi: {
        what: 'حذف اینترفیس مجازی لایه ۳ متناظر (no interface VlanX).',
        why: 'جلوگیری از باقی‌ماندن آدرس‌های IP بلااستفاده و تداخل در جدول روتینگ.',
        example: 'فعال (توصیه می‌شود)'
      }
    }
  },
  create_local_user: {
    template: {
      what: 'ایجاد یک حساب کاربری محلی (Local Username/Secret) روی دستگاه جهت ورود از طریق کنسول و SSH.',
      why: 'جهت اعطای دسترسی به ادمین‌های شبکه بدون وابستگی صرف به سرورهای احراز هویت خارجی (TACACS+/RADIUS).',
      example: 'ایجاد کاربر sec_admin با سطح دسترسی ۱۵ جهت مدیریت اضطراری.'
    },
    parameters: {
      username: {
        what: 'نام کاربری استاندارد برای ورود به سیستم.',
        why: 'تفکیک هویت کاربران و ثبت دقیق لاگ فعالیت‌های هر شخص.',
        example: 'netadmin, operator_teh, noc_monitor'
      },
      password: {
        what: 'رمز عبور امن و قوی کاربر.',
        why: 'جلوگیری از نفوذ و حملات Brute-Force به کنسول و سرویس SSH دستگاه.',
        example: 'P@$$w0rd#2026! (حداقل ۱۰ کاراکتر با ارقام و علائم)'
      },
      privilege_level: {
        what: 'سطح اختیارات و مجوزهای کاربر در سیستم‌عامل (۱ تا ۱۵ در سیسکو یا گروه در میکروتیک).',
        why: 'رعایت اصل حداقل دسترسی (Least Privilege)؛ کاربران اپراتور نباید اختیارات تغییر کانفیگ حساس داشته باشند.',
        example: 'سطح ۱۵ (دسترسی کامل مدیریتی)، سطح ۱ (فقط خواندنی)'
      }
    }
  },
  delete_local_user: {
    template: {
      what: 'حذف حساب کاربری از پایگاه داده داخلی تجهیزات.',
      why: 'هنگام خروج یا تغییر سمت پرسنل برای سلب فوری دسترسی به تجهیزات زیرساخت.',
      example: 'حذف کاربر temp_contractor پس از پایان پروژه پیمانکاری.'
    },
    parameters: {
      username: {
        what: 'نام دقیق کاربری که می‌خواهید دسترسی آن را حذف کنید.',
        why: 'حذف قطعی کاربر از لیست کاربران مجاز سیستم‌عامل.',
        example: 'old_admin, contractor1'
      }
    }
  },
  change_user_password: {
    template: {
      what: 'تغییر و چرخش دوره‌ای رمز عبور یک کاربر محلی موجود در تمام تجهیزات انتخابی.',
      why: 'رعایت استانداردهای امنیتی (مانند ISO 27001 و NIST) مبنی بر تعویض دوره‌ای کلمات عبور ادمین‌ها.',
      example: 'به‌روزرسانی رمز عبور کاربر admin به یک عبارت عبور تازه در ۵۰ سوئیچ به صورت یکجا.'
    },
    parameters: {
      username: {
        what: 'نام کاربری موجود روی دستگاه که مایل به تغییر رمز آن هستید.',
        why: 'مشخص کردن حساب کاربری هدف جهت تغییر سکرت.',
        example: 'admin, netops'
      },
      new_password: {
        what: 'رمز عبور یا Secret جدید.',
        why: 'جایگزینی رمز قبلی با یک عبارت امن جدید.',
        example: 'Str0ng#P@ss_2026'
      }
    }
  },
  set_ntp_servers: {
    template: {
      what: 'پیکربندی سرورهای پروتکل زمان شبکه (Network Time Protocol).',
      why: 'همگام‌سازی دقیق زمان رویدادها در تمام تجهیزات برای تحلیل رویدادهای امنیتی (Forensics) و مطابقت لاگ‌ها حیاتی است.',
      example: 'تنظیم time.google.com یا سرور NTP داخلی سازمان (10.0.0.10) روی کل سوییچ‌ها.'
    },
    parameters: {
      primary_ntp: {
        what: 'آدرس IP یا FQDN سرور اصلی ارائه‌دهنده زمان دقیق استاندارد.',
        why: 'منبع اصلی تنظیم و همگام‌سازی ساعت سخت‌افزاری دستگاه.',
        example: '10.0.0.10 (داخلی) یا time.google.com'
      },
      secondary_ntp: {
        what: 'آدرس سرور زمان پشتیبان جهت تاب‌آوری در صورت عدم پاسخگویی سرور اول.',
        why: 'جلوگیری از ناهماهنگی ساعت در صورت قطعی موقت سرور اصلی.',
        example: '10.0.0.11 یا 1.1.1.1'
      }
    }
  },
  set_dns_servers: {
    template: {
      what: 'تنظیم سرورهای سامانه نام دامنه (Domain Name System).',
      why: 'تجهیزات شبکه برای حل نام دامنه‌های اینترنتی، سرورهای NTP، سرورهای لایسنس و مانیتورینگ به DNS نیاز دارند.',
      example: 'تنظیم 1.1.1.1 و 8.8.8.8 به عنوان سرورهای DNS سراسری.'
    },
    parameters: {
      primary_dns: {
        what: 'آدرس سرور DNS اصلی جهت ترجمه نام به آدرس آی‌پی.',
        why: 'نخستین سروری که درخواست‌های DNS تجهیز به آن ارسال می‌شود.',
        example: '10.0.0.2 یا 1.1.1.1'
      },
      secondary_dns: {
        what: 'سرور DNS جایگزین جهت بالا بردن پایداری سرویس نام‌گذاری.',
        why: 'در صورت عدم پاسخگویی سرور اول، ترافیک ترجمه به این سرور فرستاده می‌شود.',
        example: '8.8.8.8 یا 1.0.0.1'
      }
    }
  },
  set_syslog_server: {
    template: {
      what: 'ارسال خودکار و آنی لاگ‌های سیستم‌عامل به یک سرور متمرکز (SIEM/Syslog Server).',
      why: 'ثبت متمرکز وقایع، کشف رفتارهای مشکوک، ممیزی امنیتی و حفظ لاگ‌ها حتی پس از ریبوت سخت‌افزار.',
      example: 'ارسال لاگ‌های تمام روترها به سرور Graylog یا Splunk روی 192.168.10.50.'
    },
    parameters: {
      syslog_ip: {
        what: 'آدرس IP سرور گردآورنده لاگ‌ها (Syslog Daemon / SIEM).',
        why: 'مقصد ارسال بسته‌های UDP حاوی لاگ‌های سیستم‌عامل.',
        example: '192.168.10.50'
      },
      syslog_port: {
        what: 'پورت UDP سرور سیس‌لاگ (استاندارد جهانی ۵۱۴ است).',
        why: 'پورت شبکه‌ای که سرویس لاگ روی آن گوش فرا می‌دهد.',
        example: '514'
      },
      severity: {
        what: 'حداقل سطح اهمیت پیام‌ها برای ارسال (از دیباگ تا خطاهای بحرانی).',
        why: 'جلوگیری از اشغال پهنای باند و پر شدن بی‌دلیل هارد دیسک سرور با پیام‌های کم‌اهمیت.',
        example: 'informational (پیش‌فرض بهینه) یا warnings'
      }
    }
  },
  set_banner_motd: {
    template: {
      what: 'تنظیم بنر هشدار و پیام خوش‌آمدگویی هنگام اتصال ترمینال به تجهیز (Message of the Day).',
      why: 'الزام قانونی و امنیتی جهت اعلام دسترسی غیرمجاز ممنوع است و تمامی اقدامات مانیتور و ثبت می‌گردد.',
      example: 'نمایش پیام هشدار امنیتی هنگام باز شدن خط فرمان SSH.'
    },
    parameters: {
      banner_text: {
        what: 'متن هشداری که در ترمینال کاربر پیش از وارد کردن نام کاربری ظاهر می‌شود.',
        why: 'پیام رسمی اطلاع‌رسانی سیاست‌های حریم خصوصی و امنیتی شرکت.',
        example: 'Authorized Personnel Only! All activities are monitored and recorded.'
      }
    }
  },
  configure_snmp: {
    template: {
      what: 'پیکربندی پروتکل مدیریت ساده شبکه (Simple Network Management Protocol).',
      why: 'مانیتورینگ مصرف منابع (CPU، حافظه، ترافیک پورت‌ها، دمای دستگاه و وضعیت لینک‌ها) در سامانه‌هایی نظیر Zabbix یا SolarWinds.',
      example: 'فعال‌سازی SNMPv2 با رشته فقط خواندنی NetMon_RO برای نرم‌افزار پایش شبکه.'
    },
    parameters: {
      community: {
        what: 'رشته کلید یا رمز عبور مشترک (Community String) میان دستگاه و سامانه مانیتورینگ.',
        why: 'اعتبارسنجی نرم‌افزار مانیتورینگ برای دریافت اطلاعات سنسورها و اینترفیس‌ها.',
        example: 'CorpMon2026_RO (هرگز از public پیش‌فرض استفاده نکنید)'
      },
      permission: {
        what: 'مجوز دسترسی پروتکل (فقط خواندنی RO یا خواندن و نوشتن RW).',
        why: 'توصیه اکید امنیتی استفاده از RO است تا نرم‌افزار پایش فقط وضعیت را بخواند و امکان تغییر کانفیگ را نداشته باشد.',
        example: 'RO (Read-Only - توصیه شده)'
      },
      location: {
        what: 'موقعیت مکانی فیزیکی یا رک قرارگیری تجهیز.',
        why: 'یافتن سریع محل استقرار فیزیکی دستگاه توسط اپراتور مرکز عملیات شبکه (NOC).',
        example: 'DC1 - Rack 04 - Unit 22'
      },
      contact: {
        what: 'اطلاعات تماس ادمین یا تیم مسئول دستگاه.',
        why: 'اطلاع‌رسانی سریع در شرایط بحرانی.',
        example: 'noc@company.com / +9821-88880000'
      }
    }
  },
  backup_running_config: {
    template: {
      what: 'دریافت کانفیگ فعال فعلی (Running-Config یا Export) و ذخیره آن به صورت یک فایل پشتیبان با برچسب زمان در دیتابیس.',
      why: 'حفظ تاریخچه تغییرات و امکان بازیابی سریع شبکه در صورت بروز خطای انسانی یا خرابی سخت‌افزار.',
      example: 'گرفتن بکاپ گروهی قبل از اعمال تغییرات گسترده در سوئیچ‌های شبکه.'
    },
    parameters: {
      label: {
        what: 'عنوان یا توضیح اختیاری برای شناسایی آسان‌تر این نسخه در تاریخچه پشتیبان‌ها.',
        why: 'سهولت در یافتن این نقطه بازیابی در میان لیست بلند بکاپ‌ها.',
        example: 'بکاپ قبل از آپدیت فرمور یا تغییرات وی‌لن'
      }
    }
  },
  save_running_config: {
    template: {
      what: 'ذخیره کانفیگ در حال اجرا در حافظه دائمی دستگاه (write memory / copy run start در سیسکو).',
      why: 'اگر تنظیمات ذخیره نشوند، با هر بار قطع برق یا ریبوت تجهیز تمامی تغییرات اخیر از دست می‌روند.',
      example: 'ذخیره‌سازی دائمی پس از پایان پیکربندی‌های روزانه.'
    },
    parameters: {}
  },
  reboot_device: {
    template: {
      what: 'راه‌اندازی مجدد سخت‌افزاری و نرم‌افزاری تجهیزات به صورت کنترل‌شده و ایمن.',
      why: 'اعمال آپدیت‌های نرم‌افزاری جدید، راه‌اندازی پس از تغییرات ماژول سخت‌افزاری یا پاکسازی حافظه در شرایط بحرانی.',
      example: 'ریبوت دوره‌ای برنامه‌ریزی‌شده سوئیچ‌ها در ساعات بامداد و خارج از پیک ترافیک.'
    },
    parameters: {
      reason: {
        what: 'علت راه‌اندازی مجدد جهت ثبت در سیستم‌عامل و لاگ‌های بازرسی.',
        why: 'مستندسازی تغییرات شبکه و رعایت الزامات استانداردهای امنیت ITIL.',
        example: 'Scheduled monthly maintenance reboot'
      }
    }
  },
  enable_ssh_timeout: {
    template: {
      what: 'تنظیم مدت‌زمان مجاز عدم فعالیت کاربر قبل از قطع خودکار اتصال خط فرمان SSH/Telnet (Exec-Timeout).',
      why: 'اگر مدیر شبکه پنجره ترمینال را باز رها کند، نشست باز مانده می‌تواند مورد سوءاستفاده افراد غیرمجاز قرار گیرد.',
      example: 'قطع خودکار نشست پس از ۱۰ یا ۱۵ دقیقه بی‌تحرکی.'
    },
    parameters: {
      timeout_minutes: {
        what: 'تعداد دقایق عدم دریافت دستور پیش از قطع خودکار نشست.',
        why: 'تنظیم بازه زمانی استاندارد بسته به سیاست‌های امنیتی سازمان.',
        example: '15 (دقیقه)'
      }
    }
  },
  configure_timezone: {
    template: {
      what: 'تنظیم منطقه زمانی ساعت سیستم‌عامل دستگاه.',
      why: 'نمایش صحیح و محلی ساعت رویدادها در لاگ‌ها و دستورات show clock متناسب با کشور استقرار.',
      example: 'تنظیم روی Asia/Tehran یا IRST.'
    },
    parameters: {
      timezone_name: {
        what: 'نام استاندارد منطقه زمانی جغرافیایی.',
        why: 'محاسبه اختلاف ساعت با زمان گرینویچ (UTC) به همراه محاسبات تابستانی.',
        example: 'Asia/Tehran یا UTC یا IRST'
      }
    }
  },
  custom_raw_commands: {
    template: {
      what: 'اجرای دسته‌ای دستورات خط فرمان اختصاصی به صورت مستقیم روی دستگاه‌ها.',
      why: 'انعطاف‌پذیری نامحدود برای اعمال کانفیگ‌های خاص، عیب‌یابی گروهی یا سناریوهایی که قالب از پیش تعریف شده ندارند.',
      example: 'فعال‌سازی پروتکل LLDP یا تنظیم پورت‌های خاص به طور همزمان روی ده‌ها سوئیچ.'
    },
    parameters: {
      commands: {
        what: 'دستورات متنی که به ترتیب روی هر دستگاه اجرا می‌شوند (در هر خط یک دستور).',
        why: 'تعریف دقیق توالی فرامین مورد نظر توسط مهندس شبکه.',
        example: 'lldp run\nservice password-encryption\nno ip domain-lookup'
      },
      require_config_mode: {
        what: 'ورود خودکار به حالت configure terminal قبل از ارسال دستورات.',
        why: 'برای دستوراتی که ماهیت پیکربندی دارند نیاز به حالت کانفیگ است؛ برای دستورات صرفاً نمایشی (مانند show) می‌توانید این گزینه را غیرفعال کنید.',
        example: 'فعال (True) برای دستورات کانفیگ، غیرفعال (False) برای دستورات مانیتورینگ'
      }
    }
  }
};

export const TEMPLATE_INFO_GUIDE_EN: Record<string, TemplateInfoGuide> = {
  create_vlan: {
    template: {
      what: 'Creates and provisions a Virtual Local Area Network (VLAN) to segment Layer 2 traffic, isolate broadcast domains, and enforce access policies.',
      why: 'Crucial in enterprise networks to partition departments (Staff, Finance, Cameras, Guests, Servers) and prevent security breaches or broadcast storms.',
      example: 'Create VLAN 10 named SALES_DATA with Layer 3 gateway 192.168.10.1/24 across access and distribution switches.'
    },
    parameters: {
      vlan_id: {
        what: 'Standard IEEE 802.1Q numerical identifier between 1 and 4094 to isolate network segments.',
        why: 'Switches and routers tag and switch Ethernet frames based on this unique integer.',
        example: '10 (Corporate), 20 (VoIP), 100 (Servers)'
      },
      vlan_name: {
        what: 'Descriptive alphanumeric label stored in the switch VLAN database (no spaces).',
        why: 'Facilitates troubleshooting and management during monitoring and CLI show commands.',
        example: 'CORP_DATA, GUEST_WIFI, IP_CAMERAS'
      },
      configure_ip_gateway: {
        what: 'Enables Layer 3 virtual interface (SVI on Cisco or Interface VLAN on MikroTik) acting as default gateway.',
        why: 'Required if this device performs Inter-VLAN Routing and terminates client traffic as their local gateway.',
        example: 'Enabled (True) for L3 Core/Distribution, Disabled (False) for purely L2 access switches.'
      },
      gateway_ip: {
        what: 'Layer 3 IPv4 address assigned to the VLAN interface serving as the default gateway.',
        why: 'Connected endpoints point their default route to this IP to communicate beyond the local subnet.',
        example: '192.168.10.1 or 10.50.0.1'
      },
      subnet_mask: {
        what: 'Dotted-decimal subnet mask or CIDR prefix determining the network host capacity.',
        why: 'Defines the valid IP range and broadcast boundary for endpoints inside this VLAN.',
        example: '255.255.255.0 (equivalent to /24 with 254 hosts) or 255.255.0.0 (/16)'
      },
      assign_access_ports: {
        what: 'Switch ports configured in untagged access mode connected directly to end-user workstations.',
        why: 'Directs incoming untagged Ethernet frames into this designated VLAN ID.',
        example: 'Cisco: Gi1/0/1-12 | MikroTik: ether2,ether3,ether4'
      },
      add_to_trunk_ports: {
        what: 'Inter-switch trunk ports carrying multiple tagged VLANs towards other switches or routers.',
        why: 'Ensures frames tagged with this VLAN pass through uplink interconnects without being dropped.',
        example: 'Cisco: Gi1/0/24,Gi1/0/48 | MikroTik: ether1,sfp-sfpplus1'
      },
      mikrotik_parent_interface: {
        what: 'Parent interface in MikroTik RouterOS that hosts the VLAN interface.',
        why: 'In modern Bridge VLAN Filtering, VLAN interfaces typically attach to the system bridge.',
        example: 'bridge (recommended default) or ether1'
      },
      cisco_router_parent_interface: {
        what: 'Physical parent Ethernet interface on Cisco routers for Router-on-a-Stick sub-interfaces.',
        why: 'Routers create logical sub-interfaces with IEEE 802.1Q encapsulation tied to a physical port.',
        example: 'GigabitEthernet0/0/0 or GigabitEthernet0/1'
      }
    }
  },
  delete_vlan: {
    template: {
      what: 'Safely removes a VLAN definition and associated interfaces from the switch database or bridge table.',
      why: 'Used during network decommissioning to reclaim unused VLAN IDs and clean stale configurations.',
      example: 'Delete obsolete VLAN 99 after completing a test lab migration.'
    },
    parameters: {
      vlan_id: {
        what: 'The numerical VLAN identifier to delete across all selected targets.',
        why: 'Instructs the device which VLAN database entry and bridge membership to purge.',
        example: '10'
      },
      remove_svi: {
        what: 'Removes the corresponding Layer 3 SVI interface (no interface VlanX).',
        why: 'Prevents lingering orphan IP addresses and avoids routing table anomalies.',
        example: 'Enabled (Recommended)'
      }
    }
  },
  create_local_user: {
    template: {
      what: 'Creates a local user account (Username and Password/Secret) on the device for console and SSH access.',
      why: 'Grants administrative and operator access without depending solely on external AAA servers (TACACS+/RADIUS).',
      example: 'Create sec_admin with privilege level 15 for out-of-band emergency recovery.'
    },
    parameters: {
      username: {
        what: 'Unique username for authentication.',
        why: 'Distinguishes engineer identity and facilitates audit trail tracking in security logs.',
        example: 'netadmin, operator_teh, noc_monitor'
      },
      password: {
        what: 'Cryptographically strong password or secret.',
        why: 'Protects the device CLI against unauthorized access and brute-force attempts.',
        example: 'P@$$w0rd#2026! (minimum 10 chars with mixed case and symbols)'
      },
      privilege_level: {
        what: 'Role or privilege tier (1 to 15 in Cisco or group name in MikroTik).',
        why: 'Enforces the Principle of Least Privilege so junior operators cannot modify critical routing.',
        example: 'Level 15 (Full Admin / Root), Level 1 (Read-Only User)'
      }
    }
  },
  delete_local_user: {
    template: {
      what: 'Permanently removes a local user account from device authentication storage.',
      why: 'Used when personnel depart or contracts end to instantly revoke CLI access across the infrastructure.',
      example: 'Delete user temp_contractor following project completion.'
    },
    parameters: {
      username: {
        what: 'Target username to delete from the internal user table.',
        why: 'Deletes the specified credential entry.',
        example: 'old_admin, contractor1'
      }
    }
  },
  change_user_password: {
    template: {
      what: 'Updates and rotates credentials for an existing local account across all chosen hardware.',
      why: 'Complies with industry cybersecurity standards (NIST, ISO 27001) requiring regular credential rotation.',
      example: 'Bulk-rotate the password for local admin across 50 campus switches simultaneously.'
    },
    parameters: {
      username: {
        what: 'Existing username on the target device whose password will be rotated.',
        why: 'Targets the exact account to update.',
        example: 'admin, netops'
      },
      new_password: {
        what: 'New secret password to apply.',
        why: 'Replaces previous credentials with fresh, secure characters.',
        example: 'Str0ng#P@ss_2026'
      }
    }
  },
  set_ntp_servers: {
    template: {
      what: 'Configures Network Time Protocol (NTP) synchronization servers.',
      why: 'Precise hardware clock synchronization is essential for security auditing, log correlation, and forensic investigations.',
      example: 'Set time.google.com or corporate internal NTP (10.0.0.10) across all switches.'
    },
    parameters: {
      primary_ntp: {
        what: 'IP address or FQDN of the primary authoritative time server.',
        why: 'Primary source of accurate UTC time for the device hardware clock.',
        example: '10.0.0.10 (Internal) or time.google.com'
      },
      secondary_ntp: {
        what: 'Secondary backup time server for high availability.',
        why: 'Guarantees continuous time synchronization if the primary server becomes unreachable.',
        example: '10.0.0.11 or 1.1.1.1'
      }
    }
  },
  set_dns_servers: {
    template: {
      what: 'Configures Domain Name System (DNS) resolver servers.',
      why: 'Enables network devices to resolve FQDN hostnames for NTP, licensing, cloud telemetry, and remote logging.',
      example: 'Configure 1.1.1.1 and 8.8.8.8 as enterprise-wide DNS resolvers.'
    },
    parameters: {
      primary_dns: {
        what: 'Primary DNS server IP used for name resolution queries.',
        why: 'The first resolver queried whenever a domain name is looked up.',
        example: '10.0.0.2 or 1.1.1.1'
      },
      secondary_dns: {
        what: 'Secondary fallback DNS server IP.',
        why: 'Provides failover if the primary DNS resolver suffers an outage.',
        example: '8.8.8.8 or 1.0.0.1'
      }
    }
  },
  set_syslog_server: {
    template: {
      what: 'Forwards operating system events and security alarms to a central SIEM or Syslog server.',
      why: 'Centralizes audit logs, detects anomalies, and prevents log loss during device reboots or hardware failures.',
      example: 'Forward logs from all routers to a central Graylog or Splunk cluster at 192.168.10.50.'
    },
    parameters: {
      syslog_ip: {
        what: 'IP address of the remote Syslog collector or SIEM host.',
        why: 'Target address where UDP log datagrams will be dispatched.',
        example: '192.168.10.50'
      },
      syslog_port: {
        what: 'UDP port of the remote Syslog service (standard default is 514).',
        why: 'The network port where the collector daemon listens for syslog packets.',
        example: '514'
      },
      severity: {
        what: 'Minimum severity threshold for emitted logs (from debugging to emergency).',
        why: 'Filters noise to avoid saturating storage with low-priority verbose messages.',
        example: 'informational (Optimal default) or warnings'
      }
    }
  },
  set_banner_motd: {
    template: {
      what: 'Configures the Message of the Day (MOTD) banner shown upon terminal connection.',
      why: 'Establishes explicit legal warning stating that unauthorized access is prohibited and all sessions are audited.',
      example: 'Display authorized access disclaimer upon SSH CLI session opening.'
    },
    parameters: {
      banner_text: {
        what: 'Warning text presented to the operator prior to authentication prompt.',
        why: 'Formal policy notification satisfying corporate security compliance requirements.',
        example: 'Authorized Personnel Only! All activities are monitored and recorded.'
      }
    }
  },
  configure_snmp: {
    template: {
      what: 'Configures Simple Network Management Protocol (SNMP) polling parameters.',
      why: 'Allows Network Management Systems (Zabbix, PRTG, SolarWinds) to monitor CPU, memory, interface errors, and link status.',
      example: 'Enable SNMPv2c with community NetMon_RO for continuous health telemetry.'
    },
    parameters: {
      community: {
        what: 'Shared authentication secret string between the device and NMS monitoring server.',
        why: 'Authorizes monitoring tools to query system MIB counters and operational statistics.',
        example: 'CorpMon2026_RO (Never leave as default public)'
      },
      permission: {
        what: 'Access tier granted to the community string (Read-Only RO or Read-Write RW).',
        why: 'Strictly recommend RO so telemetry probes cannot alter device running configurations.',
        example: 'RO (Read-Only - Recommended)'
      },
      location: {
        what: 'Physical location or datacenter rack coordinate for the device.',
        why: 'Aids NOC engineers in physically tracking down the hardware during outages.',
        example: 'DC1 - Rack 04 - Unit 22'
      },
      contact: {
        what: 'Contact information of the administrative team or owner.',
        why: 'Enables swift escalation during critical incidents.',
        example: 'noc@company.com / +1-555-0199'
      }
    }
  },
  backup_running_config: {
    template: {
      what: 'Fetches the active running configuration and stores a timestamped snapshot in the system database.',
      why: 'Maintains configuration history and enables quick disaster recovery against human error or hardware failures.',
      example: 'Take a synchronized snapshot across all switches prior to a major firmware upgrade.'
    },
    parameters: {
      label: {
        what: 'Optional descriptive note or tag to label this backup point in history.',
        why: 'Simplifies locating this restore point later among numerous archival records.',
        example: 'Pre-maintenance bulk snapshot'
      }
    }
  },
  save_running_config: {
    template: {
      what: 'Writes active running configuration to persistent storage (write memory / copy run start on Cisco).',
      why: 'Without persisting changes, any power loss or hardware reboot will discard all recent configurations.',
      example: 'Commit daily bulk configurations permanently to NVRAM.'
    },
    parameters: {}
  },
  reboot_device: {
    template: {
      what: 'Performs a controlled, graceful reboot of the hardware operating system.',
      why: 'Applies kernel patches, finishes hardware module initialization, or clears corrupted memory states.',
      example: 'Scheduled early morning reboot of distribution switches outside peak production hours.'
    },
    parameters: {
      reason: {
        what: 'Reason for the reboot recorded in device logs and audit trails.',
        why: 'Satisfies ITIL change management and compliance tracking standards.',
        example: 'Scheduled monthly maintenance reboot'
      }
    }
  },
  enable_ssh_timeout: {
    template: {
      what: 'Enforces an automatic inactivity disconnection timeout for interactive terminal sessions (Exec-Timeout).',
      why: 'Prevents abandoned unattended terminal sessions from being hijacked by unauthorized individuals.',
      example: 'Automatically terminate CLI sessions after 10 or 15 minutes of inactivity.'
    },
    parameters: {
      timeout_minutes: {
        what: 'Inactivity duration in minutes before tearing down idle SSH/VTY sessions.',
        why: 'Aligns terminal timeout with organizational security policies.',
        example: '15 (minutes)'
      }
    }
  },
  configure_timezone: {
    template: {
      what: 'Sets the operating system geographical timezone.',
      why: 'Ensures system clock and log timestamps match the physical deployment location of the equipment.',
      example: 'Set timezone to UTC or Asia/Tehran.'
    },
    parameters: {
      timezone_name: {
        what: 'Standard timezone identifier or geographical abbreviation.',
        why: 'Calculates the correct offset from UTC along with daylight saving transitions.',
        example: 'Asia/Tehran, UTC, or EST'
      }
    }
  },
  custom_raw_commands: {
    template: {
      what: 'Executes custom batch CLI commands line-by-line across all targeted equipment.',
      why: 'Provides total flexibility for specialized configurations or diagnostics without predefined templates.',
      example: 'Enable LLDP protocol or apply unique access-lists across 40 switches at once.'
    },
    parameters: {
      commands: {
        what: 'CLI commands to execute sequentially on each device (one command per line).',
        why: 'Defines the exact custom configuration script to run.',
        example: 'lldp run\nservice password-encryption\nno ip domain-lookup'
      },
      require_config_mode: {
        what: 'Automatically enters configure terminal mode before sending the commands.',
        why: 'Required for configuration commands, but should be disabled for diagnostic show commands.',
        example: 'Enabled (True) for configuration, Disabled (False) for show/exec commands'
      }
    }
  }
};

/**
 * Retrieve comprehensive template guidance (What, Why, Example)
 */
export function getTemplateGuide(
  templateId: string,
  isEn: boolean,
  backendTemplate?: {
    title?: string;
    title_en?: string;
    description?: string;
    description_en?: string;
    info_what_fa?: string;
    info_what_en?: string;
    info_why_fa?: string;
    info_why_en?: string;
    info_example_fa?: string;
    info_example_en?: string;
  } | null
): InfoItem {
  const guideMap = isEn ? TEMPLATE_INFO_GUIDE_EN : TEMPLATE_INFO_GUIDE_FA;
  const guide = guideMap[templateId]?.template;

  if (backendTemplate) {
    const what = isEn
      ? backendTemplate.info_what_en || guide?.what || backendTemplate.description_en || ''
      : backendTemplate.info_what_fa || guide?.what || backendTemplate.description || '';

    const why = isEn
      ? backendTemplate.info_why_en || guide?.why || (isEn ? 'Required for network baseline consistency.' : 'ضروری جهت یکپارچگی زیرساخت شبکه.')
      : backendTemplate.info_why_fa || guide?.why || 'ضروری جهت یکپارچگی زیرساخت شبکه.';

    const example = isEn
      ? backendTemplate.info_example_en || guide?.example || ''
      : backendTemplate.info_example_fa || guide?.example || '';

    if (what || why || example) {
      return { what, why, example };
    }
  }

  if (guide) {
    return guide;
  }

  return {
    what: isEn ? 'Standard network configuration template.' : 'الگوی استاندارد پیکربندی تجهیزات شبکه.',
    why: isEn ? 'Ensures consistent policy across multi-vendor devices.' : 'ایجاد هماهنگی و یکپارچگی در تنظیمات تجهیزات.',
    example: isEn ? 'Batch execution across network devices.' : 'اجرای سراسری روی تجهیزات انتخاب شده.'
  };
}

/**
 * Retrieve comprehensive parameter guidance (What, Why, Example)
 */
export function getParameterGuide(
  templateId: string,
  param: {
    name: string;
    labelFa?: string;
    labelEn?: string;
    placeholder?: string;
    default?: any;
    info_what_fa?: string;
    info_what_en?: string;
    info_why_fa?: string;
    info_why_en?: string;
    info_example_fa?: string;
    info_example_en?: string;
  },
  isEn: boolean
): InfoItem {
  const guideMap = isEn ? TEMPLATE_INFO_GUIDE_EN : TEMPLATE_INFO_GUIDE_FA;
  const tplGuide = guideMap[templateId];
  const paramGuide = tplGuide?.parameters?.[param.name];

  const what = isEn
    ? param.info_what_en || paramGuide?.what || (param.labelEn ? `${param.labelEn} value.` : 'Configuration variable.')
    : param.info_what_fa || paramGuide?.what || (param.labelFa ? `مقدار ${param.labelFa}.` : 'متغیر پیکربندی دستور.');

  const why = isEn
    ? param.info_why_en || paramGuide?.why || 'Defines specific operational behavior on the target device.'
    : param.info_why_fa || paramGuide?.why || 'تعیین‌کننده رفتار و مقادیر اجرایی دستور روی تجهیزات مقصد.';

  const example = isEn
    ? param.info_example_en || paramGuide?.example || (param.placeholder ? `e.g. ${param.placeholder}` : (param.default !== undefined ? String(param.default) : ''))
    : param.info_example_fa || paramGuide?.example || (param.placeholder ? `نمونه: ${param.placeholder}` : (param.default !== undefined ? String(param.default) : ''));

  return { what, why, example };
}
