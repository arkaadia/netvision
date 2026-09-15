/**
 * Device Port Specifications & Canonical Breakdown Descriptions
 */

export function getDevicePortComment(
  count: number,
  model: string = '',
  type: string = 'switch',
  isEn: boolean = false
): string {
  const m = model.toLowerCase();

  if (count === 48) {
    return isEn
      ? '48x 10/100/1000Base-T Ethernet Access Ports (Standard 48-Port Switch)'
      : '۴۸ پورت گیگابیت اترنت اکسس (سوئیچ استاندارد ۴۸ پورت)';
  }
  if (count === 52) {
    return isEn
      ? '48x Gigabit Ethernet + 4x 10G SFP+ Uplink Ports (Enterprise 52-Port Switch)'
      : '۴۸ پورت اکسس گیگابیت + ۴ پورت آپلینک فیبر نوری SFP+ (سوئیچ سازمانی ۵۲ پورت)';
  }
  if (count === 50) {
    return isEn
      ? '48x Gigabit Ethernet + 2x SFP Uplink Ports'
      : '۴۸ پورت اکسس گیگابیت + ۲ پورت آپلینک فیبر نوری SFP';
  }
  if (count === 24) {
    return isEn
      ? '24x 10/100/1000Base-T Ethernet Access Ports (Standard 24-Port Switch)'
      : '۲۴ پورت گیگابیت اترنت اکسس (سوئیچ استاندارد ۲۴ پورت)';
  }
  if (count === 28) {
    return isEn
      ? '24x Gigabit Ethernet + 4x 10G SFP+ Uplink Ports (Enterprise 28-Port Switch)'
      : '۲۴ پورت اکسس گیگابیت + ۴ پورت آپلینک فیبر نوری SFP+ (سوئیچ سازمانی ۲۸ پورت)';
  }
  if (count === 26) {
    return isEn
      ? '24x Gigabit Ethernet + 2x SFP Uplink Ports'
      : '۲۴ پورت اکسس گیگابیت + ۲ پورت آپلینک فیبر نوری SFP';
  }
  if (count === 16) {
    return isEn
      ? '16x Gigabit Ethernet Ports (Compact Switch / Distribution Node)'
      : '۱۶ پورت گیگابیت اترنت (سوئیچ کامپکت توزیع/اکسس)';
  }
  if (count === 10) {
    return isEn
      ? '8x Gigabit Ethernet + 2x SFP+ Ports (MikroTik CCR / Multi-Interface Router)'
      : '۸ پورت گیگابیت اترنت + ۲ پورت آپلینک SFP+ (روتر چند پورت یا CCR)';
  }
  if (count === 8) {
    return isEn
      ? '8x Gigabit Ethernet Ports (Compact Switch / Branch Router)'
      : '۸ پورت گیگابیت اترنت (سوئیچ کامپکت یا روتر شعب)';
  }
  if (count === 4) {
    return isEn
      ? '4x Gigabit Ethernet / WAN-LAN Ports (Router / Security Gateway)'
      : '۴ پورت گیگابیت اترنت WAN/LAN (روتر یا فایروال لبه)';
  }
  if (count === 2) {
    return isEn
      ? '2x Gigabit Ethernet Ports (Access Point / PoE Gateway)'
      : '۲ پورت گیگابیت اترنت (اکسس‌پوینت یا گیت‌وی PoE)';
  }
  return isEn
    ? `${count} Active Network Ports detected for ${model || type}`
    : `${count} پورت فعال شبکه شناسایی‌شده برای ${model || type}`;
}
