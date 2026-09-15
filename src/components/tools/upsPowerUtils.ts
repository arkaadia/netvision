import { Device } from '../../types';

export interface RackDevicePowerItem {
  id: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  uPosition: string;
  watts: number;
  isEstimated: boolean;
  powerSupplyCount: number;
}

export interface RackPowerItem {
  id: string;
  name: string;
  units: number;
  deviceCount: number;
  totalWatts: number;
  totalKva: number;
  currentAmps230V: number;
  recommendedPdu: string;
  densityCategory: 'low' | 'medium' | 'high';
  devices: RackDevicePowerItem[];
}

export interface UnmountedDevicePowerItem {
  id: string;
  name: string;
  type: string;
  model: string;
  watts: number;
}

export interface PhysicalMapPowerAudit {
  mapId: string;
  mapName: string;
  description?: string;
  sourceType: 'custom_map' | 'default_physical' | 'sample_template';
  totalRacks: number;
  totalDevices: number;
  totalWatts: number;
  totalKva: number;
  avgWattsPerRack: number;
  recommendedUpsKva: number;
  heatDissipationBtu: number;
  heatDissipationTons: number;
  minMainsAmps230V: number;
  racks: RackPowerItem[];
  unmountedDevices: UnmountedDevicePowerItem[];
}

/**
 * Intelligent electrical estimation for data center and network equipment.
 */
export function estimateDevicePowerWatts(
  categoryOrType?: string,
  modelOrBrand?: string,
  explicitWatts?: number
): number {
  if (typeof explicitWatts === 'number' && explicitWatts > 0) {
    return explicitWatts;
  }

  const cat = (categoryOrType || '').toLowerCase();
  const mdl = (modelOrBrand || '').toLowerCase();

  // Passive infrastructure (0 Watts load)
  if (
    cat.includes('patch') ||
    cat.includes('cable') ||
    cat.includes('brush') ||
    cat.includes('blank') ||
    cat.includes('shelf') ||
    cat.includes('organizer') ||
    cat.includes('panel') ||
    mdl.includes('patch panel') ||
    mdl.includes('cable manager') ||
    mdl.includes('keystone')
  ) {
    return 0;
  }

  // PDU / UPS infrastructure units (distribute power, not consumer load)
  if (cat.includes('pdu') || cat.includes('ups') || mdl.includes('pdu') || mdl.includes('ups')) {
    return 0;
  }

  // Enterprise Dual/Quad CPU Servers (400W - 650W)
  if (
    cat.includes('server') ||
    mdl.includes('proliant') ||
    mdl.includes('poweredge') ||
    mdl.includes('dl380') ||
    mdl.includes('dl360') ||
    mdl.includes('r740') ||
    mdl.includes('r640') ||
    mdl.includes('r750') ||
    mdl.includes('ucs') ||
    mdl.includes('blade')
  ) {
    if (mdl.includes('2u') || mdl.includes('dl380') || mdl.includes('r740') || mdl.includes('r750')) {
      return 520;
    }
    return 420;
  }

  // SAN / NAS / Storage arrays
  if (
    cat.includes('storage') ||
    cat.includes('san') ||
    cat.includes('nas') ||
    mdl.includes('synology') ||
    mdl.includes('qnap') ||
    mdl.includes('msa') ||
    mdl.includes('netapp') ||
    mdl.includes('storeonce')
  ) {
    return 450;
  }

  // PoE Switches (Very high wattage for IP Phones, Cameras, APs)
  if (
    mdl.includes('poe') ||
    mdl.includes('370w') ||
    mdl.includes('740w') ||
    mdl.includes('at-') ||
    mdl.includes('af-') ||
    mdl.includes('fp')
  ) {
    if (mdl.includes('740w') || mdl.includes('full')) return 650;
    return 420;
  }

  // Modular Core Switches / High-End Aggregation
  if (
    mdl.includes('core') ||
    mdl.includes('nexus') ||
    mdl.includes('9500') ||
    mdl.includes('9400') ||
    mdl.includes('6500') ||
    mdl.includes('4500')
  ) {
    return 600;
  }

  // Standard Managed Switches (Cisco Catalyst, Mikrotik CRS, Aruba)
  if (
    cat.includes('switch') ||
    mdl.includes('catalyst') ||
    mdl.includes('2960') ||
    mdl.includes('3850') ||
    mdl.includes('9200') ||
    mdl.includes('9300') ||
    mdl.includes('crs') ||
    mdl.includes('procurve')
  ) {
    return 110;
  }

  // Edge / Core Routers & Firewalls
  if (
    cat.includes('router') ||
    cat.includes('firewall') ||
    mdl.includes('fortigate') ||
    mdl.includes('palo') ||
    mdl.includes('isr') ||
    mdl.includes('asr') ||
    mdl.includes('ccr') ||
    mdl.includes('sophos')
  ) {
    if (mdl.includes('ccr2216') || mdl.includes('asr') || mdl.includes('fg-1000')) {
      return 260;
    }
    return 140;
  }

  // Wireless APs / Gateways
  if (cat.includes('ap') || cat.includes('access_point') || mdl.includes('unifi') || mdl.includes('hap')) {
    return 25;
  }

  return 90;
}

/**
 * Loads all physical maps from localStorage and active topology,
 * calculating full electrical load per rack and per map.
 */
export function loadPhysicalMapAudits(
  devices: Device[] = [],
  powerFactor = 0.8,
  safetyHeadroom = 25
): PhysicalMapPowerAudit[] {
  const audits: PhysicalMapPowerAudit[] = [];
  const pf = Math.max(0.5, Math.min(1.0, powerFactor));
  const headroomFactor = 1 + safetyHeadroom / 100;

  // 1. Read Custom Maps from localStorage
  try {
    const raw = localStorage.getItem('nettopology_custom_maps_v2');
    if (raw) {
      const customMaps = JSON.parse(raw);
      if (Array.isArray(customMaps)) {
        customMaps.forEach((map: any) => {
          if (!map || typeof map !== 'object') return;
          const racksRaw = Array.isArray(map.racks) ? map.racks : [];
          const mountedDeviceIds = new Set<string>();

          const rackItems: RackPowerItem[] = racksRaw.map((rack: any, rIdx: number) => {
            const rawDevs = Array.isArray(rack.devices) ? rack.devices : [];
            const rackDevices: RackDevicePowerItem[] = rawDevs.map((dev: any, dIdx: number) => {
              if (dev.id) mountedDeviceIds.add(dev.id);
              const watts = estimateDevicePowerWatts(
                dev.category,
                `${dev.brand || ''} ${dev.model || ''}`,
                dev.powerWatts
              );
              return {
                id: dev.id || `rdev-${rIdx}-${dIdx}`,
                name: dev.name || `${dev.brand || 'Device'} ${dev.model || ''}`.trim(),
                category: dev.category || 'hardware',
                brand: dev.brand || 'Generic',
                model: dev.model || 'Standard',
                uPosition: dev.startU ? `U${dev.startU} (${dev.heightU || 1}U)` : `${dev.heightU || 1}U`,
                watts,
                isEstimated: !dev.powerWatts || dev.powerWatts === 0,
                powerSupplyCount: dev.powerSupplyCount || 1
              };
            });

            const totalRackWatts = rackDevices.reduce((sum, d) => sum + d.watts, 0);
            const totalRackKva = totalRackWatts / (pf * 1000);
            const currentAmps230V = totalRackWatts / (230 * pf);

            let recommendedPdu = '16A (Single Phase @ 230V)';
            let densityCategory: 'low' | 'medium' | 'high' = 'low';
            if (totalRackWatts > 4500) {
              densityCategory = 'high';
              recommendedPdu = '32A (Three Phase @ 400V)';
            } else if (totalRackWatts > 2200) {
              densityCategory = 'medium';
              recommendedPdu = '32A (Single Phase @ 230V)';
            }

            return {
              id: rack.id || `rack-${rIdx}`,
              name: rack.name || `Rack #${rIdx + 1}`,
              units: rack.units || 42,
              deviceCount: rackDevices.length,
              totalWatts: totalRackWatts,
              totalKva: totalRackKva,
              currentAmps230V,
              recommendedPdu,
              densityCategory,
              devices: rackDevices
            };
          });

          // Unmounted devices placed on canvas in this map
          const unmountedList: UnmountedDevicePowerItem[] = [];
          if (Array.isArray(map.deviceIds)) {
            map.deviceIds.forEach((devId: string) => {
              if (!mountedDeviceIds.has(devId)) {
                const match = devices.find((d) => d.id === devId);
                if (match) {
                  const watts = estimateDevicePowerWatts(match.type, `${match.model}`, match.power_watts);
                  unmountedList.push({
                    id: match.id,
                    name: match.name,
                    type: match.type,
                    model: match.model || '',
                    watts
                  });
                }
              }
            });
          }

          const totalMapWatts =
            rackItems.reduce((sum, r) => sum + r.totalWatts, 0) +
            unmountedList.reduce((sum, u) => sum + u.watts, 0);

          const totalKva = totalMapWatts / (pf * 1000);
          const heatDissipationBtu = totalMapWatts * 3.41214;

          audits.push({
            mapId: map.id || `map-${audits.length + 1}`,
            mapName: map.name || `Physical Map ${audits.length + 1}`,
            description: map.description,
            sourceType: 'custom_map',
            totalRacks: rackItems.length,
            totalDevices:
              rackItems.reduce((sum, r) => sum + r.deviceCount, 0) + unmountedList.length,
            totalWatts: totalMapWatts,
            totalKva,
            avgWattsPerRack: rackItems.length > 0 ? totalMapWatts / rackItems.length : totalMapWatts,
            recommendedUpsKva: totalKva * headroomFactor,
            heatDissipationBtu,
            heatDissipationTons: heatDissipationBtu / 12000,
            minMainsAmps230V: totalMapWatts / (230 * pf),
            racks: rackItems,
            unmountedDevices: unmountedList
          });
        });
      }
    }
  } catch (err) {
    console.error('Failed to parse custom maps for UPS power audit:', err);
  }

  // 2. Synthesize Default Physical Topology (grouped by rack property in active devices)
  const defaultRacksMap = new Map<string, Device[]>();
  const unassignedDevs: Device[] = [];

  devices.forEach((d) => {
    const rackName = (d.rack || '').trim();
    if (rackName) {
      if (!defaultRacksMap.has(rackName)) {
        defaultRacksMap.set(rackName, []);
      }
      defaultRacksMap.get(rackName)!.push(d);
    } else {
      unassignedDevs.push(d);
    }
  });

  if (defaultRacksMap.size > 0 || devices.length > 0) {
    const rackItems: RackPowerItem[] = [];
    let rIndex = 0;

    defaultRacksMap.forEach((devs, rackName) => {
      rIndex++;
      const rackDevices: RackDevicePowerItem[] = devs.map((d, dIdx) => {
        const watts = estimateDevicePowerWatts(d.type, `${d.model}`, d.power_watts);
        return {
          id: d.id || `topo-dev-${dIdx}`,
          name: d.name,
          category: d.type,
          brand: (d.model || '').split(' ')[0] || 'Cisco',
          model: d.model || 'Standard',
          uPosition: `U${dIdx + 1} (1U)`,
          watts,
          isEstimated: !d.power_watts || d.power_watts === 0,
          powerSupplyCount: d.power_supplies || 1
        };
      });

      const totalRackWatts = rackDevices.reduce((sum, d) => sum + d.watts, 0);
      const totalRackKva = totalRackWatts / (pf * 1000);
      const currentAmps230V = totalRackWatts / (230 * pf);

      let recommendedPdu = '16A (Single Phase @ 230V)';
      let densityCategory: 'low' | 'medium' | 'high' = 'low';
      if (totalRackWatts > 4500) {
        densityCategory = 'high';
        recommendedPdu = '32A (Three Phase @ 400V)';
      } else if (totalRackWatts > 2200) {
        densityCategory = 'medium';
        recommendedPdu = '32A (Single Phase @ 230V)';
      }

      rackItems.push({
        id: `default-rack-${rIndex}`,
        name: rackName,
        units: 42,
        deviceCount: rackDevices.length,
        totalWatts: totalRackWatts,
        totalKva: totalRackKva,
        currentAmps230V,
        recommendedPdu,
        densityCategory,
        devices: rackDevices
      });
    });

    const unmountedList: UnmountedDevicePowerItem[] = unassignedDevs.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      model: d.model || '',
      watts: estimateDevicePowerWatts(d.type, d.model, d.power_watts)
    }));

    const totalMapWatts =
      rackItems.reduce((sum, r) => sum + r.totalWatts, 0) +
      unmountedList.reduce((sum, u) => sum + u.watts, 0);

    const totalKva = totalMapWatts / (pf * 1000);
    const heatDissipationBtu = totalMapWatts * 3.41214;

    audits.push({
      mapId: 'default-active-topology-site',
      mapName: 'Active Topology Physical Racks',
      description: 'Aggregated power consumption of all physical racks and devices currently active in network topology',
      sourceType: 'default_physical',
      totalRacks: rackItems.length,
      totalDevices: rackItems.reduce((sum, r) => sum + r.deviceCount, 0) + unmountedList.length,
      totalWatts: totalMapWatts,
      totalKva,
      avgWattsPerRack: rackItems.length > 0 ? totalMapWatts / rackItems.length : totalMapWatts,
      recommendedUpsKva: totalKva * headroomFactor,
      heatDissipationBtu,
      heatDissipationTons: heatDissipationBtu / 12000,
      minMainsAmps230V: totalMapWatts / (230 * pf),
      racks: rackItems,
      unmountedDevices: unmountedList
    });
  }

  // 3. Fallback Sample Template if no custom maps or racks exist
  if (audits.length === 0) {
    const sampleRacks: RackPowerItem[] = [
      {
        id: 'sample-rack-1',
        name: 'Rack 01 - Core Network & Gateways',
        units: 42,
        deviceCount: 6,
        totalWatts: 1350,
        totalKva: 1350 / (pf * 1000),
        currentAmps230V: 1350 / (230 * pf),
        recommendedPdu: '16A (Single Phase @ 230V)',
        densityCategory: 'low',
        devices: [
          { id: 'sr1', name: 'Core-Switch-A', category: 'switch', brand: 'Cisco', model: 'Catalyst 9500-48Y4C', uPosition: 'U40 (1U)', watts: 450, isEstimated: false, powerSupplyCount: 2 },
          { id: 'sr2', name: 'Core-Switch-B', category: 'switch', brand: 'Cisco', model: 'Catalyst 9500-48Y4C', uPosition: 'U38 (1U)', watts: 450, isEstimated: false, powerSupplyCount: 2 },
          { id: 'sr3', name: 'Border-Firewall-A', category: 'firewall', brand: 'Fortinet', model: 'FortiGate 200F', uPosition: 'U35 (1U)', watts: 150, isEstimated: false, powerSupplyCount: 2 },
          { id: 'sr4', name: 'Border-Firewall-B', category: 'firewall', brand: 'Fortinet', model: 'FortiGate 200F', uPosition: 'U33 (1U)', watts: 150, isEstimated: false, powerSupplyCount: 2 },
          { id: 'sr5', name: 'WAN-Edge-Router', category: 'router', brand: 'MikroTik', model: 'CCR2116-12G-4S+', uPosition: 'U30 (1U)', watts: 100, isEstimated: false, powerSupplyCount: 2 },
          { id: 'sr6', name: 'Console-Server', category: 'hardware', brand: 'Opengear', model: 'OM2248', uPosition: 'U28 (1U)', watts: 50, isEstimated: false, powerSupplyCount: 2 },
        ]
      },
      {
        id: 'sample-rack-2',
        name: 'Rack 02 - Virtualization & Compute Cluster',
        units: 42,
        deviceCount: 5,
        totalWatts: 2450,
        totalKva: 2450 / (pf * 1000),
        currentAmps230V: 2450 / (230 * pf),
        recommendedPdu: '32A (Single Phase @ 230V)',
        densityCategory: 'medium',
        devices: [
          { id: 'sr7', name: 'ESXi-Host-01', category: 'server', brand: 'HPE', model: 'ProLiant DL380 Gen10', uPosition: 'U30 (2U)', watts: 490, isEstimated: false, powerSupplyCount: 2 },
          { id: 'sr8', name: 'ESXi-Host-02', category: 'server', brand: 'HPE', model: 'ProLiant DL380 Gen10', uPosition: 'U26 (2U)', watts: 490, isEstimated: false, powerSupplyCount: 2 },
          { id: 'sr9', name: 'ESXi-Host-03', category: 'server', brand: 'HPE', model: 'ProLiant DL380 Gen10', uPosition: 'U22 (2U)', watts: 490, isEstimated: false, powerSupplyCount: 2 },
          { id: 'sr10', name: 'ESXi-Host-04', category: 'server', brand: 'HPE', model: 'ProLiant DL380 Gen10', uPosition: 'U18 (2U)', watts: 490, isEstimated: false, powerSupplyCount: 2 },
          { id: 'sr11', name: 'SAN-Storage-Array', category: 'storage', brand: 'HPE', model: 'MSA 2060 SAN Storage', uPosition: 'U12 (2U)', watts: 490, isEstimated: false, powerSupplyCount: 2 },
        ]
      }
    ];

    const sampleWatts = sampleRacks.reduce((s, r) => s + r.totalWatts, 0);
    const sampleKva = sampleWatts / (pf * 1000);
    const sampleBtu = sampleWatts * 3.41214;

    audits.push({
      mapId: 'sample-datacenter-floor-template',
      mapName: 'Sample Datacenter Floor (2 Racks)',
      description: 'Demonstration template showing physical power calculation across high-density compute and core network racks',
      sourceType: 'sample_template',
      totalRacks: 2,
      totalDevices: 11,
      totalWatts: sampleWatts,
      totalKva: sampleKva,
      avgWattsPerRack: sampleWatts / 2,
      recommendedUpsKva: sampleKva * headroomFactor,
      heatDissipationBtu: sampleBtu,
      heatDissipationTons: sampleBtu / 12000,
      minMainsAmps230V: sampleWatts / (230 * pf),
      racks: sampleRacks,
      unmountedDevices: []
    });
  }

  return audits;
}

/**
 * Generates a clean, professional markdown report of the electrical audit.
 */
export function generateRackAuditReport(audit: PhysicalMapPowerAudit, isEn: boolean): string {
  const lines: string[] = [
    `========================================================================`,
    isEn ? `DATA CENTER ELECTRICAL AUDIT REPORT: ${audit.mapName}` : `گزارش ممیزی بار الکتریکی دیتاسنتر: ${audit.mapName}`,
    isEn ? `Generated: ${new Date().toLocaleString()}` : `تاریخ گزارش: ${new Date().toLocaleString('fa-IR')}`,
    `========================================================================`,
    ``,
    isEn ? `--- EXECUTIVE SUMMARY ---` : `--- خلاصه شاخص‌های کلیدی توان و برق ---`,
    isEn ? `• Total Room Power Load: ${audit.totalWatts.toLocaleString()} Watts (${(audit.totalWatts / 1000).toFixed(2)} kW)` : `• توان بار کل دیتاسنتر: ${audit.totalWatts.toLocaleString()} وات (${(audit.totalWatts / 1000).toFixed(2)} کیلووات)`,
    isEn ? `• Total Apparent Power: ${audit.totalKva.toFixed(2)} kVA` : `• توان ظاهری کل: ${audit.totalKva.toFixed(2)} کاوا`,
    isEn ? `• Total Rack Cabinets: ${audit.totalRacks} Racks (Average: ${(audit.avgWattsPerRack / 1000).toFixed(2)} kW / Rack)` : `• تعداد رک‌ها: ${audit.totalRacks} رک (میانگین: ${(audit.avgWattsPerRack / 1000).toFixed(2)} کیلووات به ازای هر رک)`,
    isEn ? `• Total Active Devices: ${audit.totalDevices} Mounted Units` : `• مجموع تجهیزات اکتیو: ${audit.totalDevices} تجهیز نصب‌شده`,
    isEn ? `• Recommended Central UPS: ${audit.recommendedUpsKva.toFixed(1)} kVA (Includes 25% safety headroom)` : `• ظرفیت پیشنهادی یو‌پی‌اس مرکزی: ${audit.recommendedUpsKva.toFixed(1)} کاوا (با احتساب ۲۵٪ حاشیه امن)`,
    isEn ? `• Heat Dissipation / Cooling: ${audit.heatDissipationBtu.toLocaleString(undefined, { maximumFractionDigits: 0 })} BTU/hr (${audit.heatDissipationTons.toFixed(2)} Tons AC)` : `• تلفات حرارتی و بار سرمایش: ${audit.heatDissipationBtu.toLocaleString(undefined, { maximumFractionDigits: 0 })} BTU/hr (معادل ${audit.heatDissipationTons.toFixed(2)} تن تبرید)`,
    isEn ? `• Minimum Mains Feeder: ${audit.minMainsAmps230V.toFixed(1)} A @ 230V Single-Phase` : `• حداقل جریان فیدر برق ورودی: ${audit.minMainsAmps230V.toFixed(1)} آمپر در ۲۳۰ ولت تک‌فاز`,
    ``,
    isEn ? `--- RACK-BY-RACK POWER BREAKDOWN ---` : `--- تفکیک بار الکتریکی بر اساس رک‌ها ---`,
  ];

  audit.racks.forEach((rack, idx) => {
    lines.push(`\n[Rack #${idx + 1}] ${rack.name} (${rack.units}U)`);
    lines.push(isEn
      ? `  - Subtotal Load: ${rack.totalWatts.toLocaleString()} W (${rack.totalKva.toFixed(2)} kVA) | Current: ${rack.currentAmps230V.toFixed(1)}A @ 230V`
      : `  - توان مصرفی رک: ${rack.totalWatts.toLocaleString()} وات (${rack.totalKva.toFixed(2)} کاوا) | جریان مصرفی: ${rack.currentAmps230V.toFixed(1)} آمپر`
    );
    lines.push(isEn
      ? `  - Recommended PDU: ${rack.recommendedPdu} | Density: ${rack.densityCategory.toUpperCase()}`
      : `  - پی‌دی‌یو پیشنهادی: ${rack.recommendedPdu} | تراکم بار: ${rack.densityCategory === 'high' ? 'بالا' : rack.densityCategory === 'medium' ? 'متوسط' : 'عادی'}`
    );
    lines.push(isEn ? `  - Installed Equipment (${rack.devices.length}):` : `  - لیست تجهیزات رک (${rack.devices.length} مورد):`);
    
    rack.devices.forEach((dev) => {
      lines.push(
        `    * ${dev.uPosition.padEnd(10)} | ${dev.name.padEnd(25)} | ${dev.brand} ${dev.model} | ${dev.watts}W (${dev.powerSupplyCount}x PSU)`
      );
    });
  });

  if (audit.unmountedDevices.length > 0) {
    lines.push(``);
    lines.push(isEn ? `--- STANDALONE / UNMOUNTED MAP DEVICES ---` : `--- سایر تجهیزات مستقر در نقشه ---`);
    audit.unmountedDevices.forEach((dev) => {
      lines.push(`  • ${dev.name} (${dev.type} - ${dev.model}): ${dev.watts}W`);
    });
  }

  lines.push(`\n========================================================================\n`);
  return lines.join('\n');
}
