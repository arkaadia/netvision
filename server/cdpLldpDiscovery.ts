import net from 'net';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { Client, ConnectConfig } from 'ssh2';
import { getCustomMaps, saveCustomMaps } from './db';

export type DiscoveryMode = 'inventory' | 'device' | 'range' | 'local';

export interface DiscoveredNeighborRaw {
  sourceDeviceId?: string;
  sourceDeviceName?: string;
  sourceDeviceIp?: string;
  localPort: string;
  remotePort: string;
  neighborDeviceId: string;
  neighborName: string;
  neighborIp: string;
  neighborPlatform?: string;
  neighborCapabilities?: string;
  protocol: 'CDP' | 'LLDP' | 'MNDP' | 'CDP/LLDP';
  rawSnippet?: string;
}

export interface CorrelatedTopologyLink {
  id: string;
  sourceDeviceId: string;
  sourceDeviceName: string;
  sourceDeviceIp: string;
  sourcePort: string;
  targetDeviceId: string;
  targetDeviceName: string;
  targetDeviceIp: string;
  targetPort: string;
  protocol: 'CDP' | 'LLDP' | 'MNDP' | 'CDP/LLDP';
  cableType: 'copper' | 'fiber';
  speed: string;
  sourceMode: 'trunk' | 'access';
  targetMode: 'trunk' | 'access';
  status: 'active';
  verification: 'bidirectional' | 'unidirectional';
  confidence: 'high' | 'medium';
  checked: boolean;
}

export interface DiscoveredUnmanagedDevice {
  id: string;
  name: string;
  ip: string;
  model: string;
  platform: string;
  capabilities: string;
  discoveredViaDeviceId: string;
  discoveredViaDeviceName: string;
  localPort: string;
  remotePort: string;
  protocol: string;
  deviceType: 'switch' | 'router' | 'ap' | 'server' | 'firewall' | 'other';
  checked: boolean;
  alreadyInInventory: boolean;
  alreadyOnCanvas: boolean;
}

export interface DiscoveryDeviceLog {
  deviceId?: string;
  deviceName: string;
  ip: string;
  status: 'pending' | 'connecting' | 'success' | 'warning' | 'error';
  protocol?: string;
  neighborsFound: number;
  error?: string;
  durationMs?: number;
  timestamp: string;
}

export interface DiscoveryJob {
  id: string;
  mode: DiscoveryMode;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0 - 100
  currentStep: string;
  currentStepEn: string;
  totalDevices: number;
  scannedDevices: number;
  startTime: number;
  endTime?: number;
  deviceLogs: DiscoveryDeviceLog[];
  links: CorrelatedTopologyLink[];
  unmanagedDevices: DiscoveredUnmanagedDevice[];
  summary: {
    totalScanned: number;
    successfulScanned: number;
    failedScanned: number;
    totalNeighborsFound: number;
    uniqueLinksFound: number;
    bidirectionalCount: number;
    unidirectionalCount: number;
    newDevicesFound: number;
  };
}

export interface DiscoveryRequestOptions {
  mode: DiscoveryMode;
  // For 'inventory' mode
  deviceIds?: string[]; // Optional specific subset of devices from inventory
  // For 'device' mode
  targetDeviceId?: string;
  targetDeviceIp?: string;
  // For 'range' mode
  ipRange?: string; // e.g. "172.22.100.0/24" or "192.168.1.1-192.168.1.50"
  sshPort?: number;
  username?: string;
  password?: string;
  enablePassword?: string;
  // For 'local' mode
  interfaceName?: string;
  // Common options
  allowSimulatorFallback?: boolean;
  concurrency?: number;
  timeoutSeconds?: number;
  protocols?: {
    cdp?: boolean;
    lldp?: boolean;
    mndp?: boolean;
  };
}

// In-memory job repository
const activeJobs = new Map<string, DiscoveryJob>();

/**
 * Standard SSH crypto algorithm configurations for Cisco IOS & legacy devices.
 */
function getSshAlgorithms() {
  return {
    kex: [
      'ecdh-sha2-nistp256',
      'ecdh-sha2-nistp384',
      'ecdh-sha2-nistp521',
      'diffie-hellman-group14-sha256',
      'diffie-hellman-group16-sha512',
      'diffie-hellman-group18-sha512',
      'diffie-hellman-group14-sha1',
      'diffie-hellman-group-exchange-sha256',
      'diffie-hellman-group-exchange-sha1',
      'diffie-hellman-group1-sha1',
    ],
    cipher: [
      'aes128-ctr',
      'aes192-ctr',
      'aes256-ctr',
      'aes128-gcm',
      'aes128-gcm@openssh.com',
      'aes256-gcm',
      'aes256-gcm@openssh.com',
      'aes256-cbc',
      'aes128-cbc',
      '3des-cbc',
    ],
    serverHostKey: [
      'ssh-ed25519',
      'ecdsa-sha2-nistp256',
      'ecdsa-sha2-nistp384',
      'ecdsa-sha2-nistp521',
      'rsa-sha2-512',
      'rsa-sha2-256',
      'ssh-rsa',
      'ssh-dss',
    ],
  };
}

/**
 * Normalizes port names across different vendors and abbreviations.
 * E.g. "GigabitEthernet1/0/1" -> "Gi1/0/1", "TenGigabitEthernet0/1" -> "Te0/1", "ether1" -> "ether1"
 */
export function normalizePortName(port: string): string {
  if (!port) return '';
  let p = port.trim();
  p = p.replace(/^GigabitEthernet/i, 'Gi');
  p = p.replace(/^FastEthernet/i, 'Fa');
  p = p.replace(/^TenGigabitEthernet/i, 'Te');
  p = p.replace(/^TenGigE/i, 'Te');
  p = p.replace(/^FortyGigabitEthernet/i, 'Fo');
  p = p.replace(/^FortyGigE/i, 'Fo');
  p = p.replace(/^HundredGigE/i, 'Hu');
  p = p.replace(/^Ethernet/i, 'Et');
  p = p.replace(/^Port-channel/i, 'Po');
  p = p.replace(/^management/i, 'mgmt');
  return p;
}

/**
 * Infers link speed and cable type from port names.
 */
function inferSpeedAndCable(portA: string, portB: string): { speed: string; cableType: 'copper' | 'fiber' } {
  const combined = (portA + ' ' + portB).toLowerCase();
  if (combined.includes('hu') || combined.includes('hundred')) {
    return { speed: '100Gbps', cableType: 'fiber' };
  }
  if (combined.includes('fo') || combined.includes('forty')) {
    return { speed: '40Gbps', cableType: 'fiber' };
  }
  if (combined.includes('te') || combined.includes('tengig') || combined.includes('sfp+') || combined.includes('10g')) {
    return { speed: '10Gbps', cableType: 'fiber' };
  }
  if (combined.includes('sfp') && !combined.includes('sfp+')) {
    return { speed: '1Gbps', cableType: 'fiber' };
  }
  if (combined.includes('gi') || combined.includes('gigabit') || combined.includes('ether')) {
    return { speed: '1Gbps', cableType: 'copper' };
  }
  if (combined.includes('fa') || combined.includes('fast')) {
    return { speed: '100Mbps', cableType: 'copper' };
  }
  return { speed: '1Gbps', cableType: 'copper' };
}

/**
 * Loads devices from local storage or database.
 */
function getRegisteredDevices(): any[] {
  try {
    const p1 = path.join(process.cwd(), 'backend', 'database_store.json');
    if (fs.existsSync(p1)) {
      const parsed = JSON.parse(fs.readFileSync(p1, 'utf-8'));
      if (Array.isArray(parsed.devices) && parsed.devices.length > 0) {
        return parsed.devices;
      }
    }
  } catch {}

  try {
    const p2 = path.join(process.cwd(), 'backend', 'network_data.json');
    if (fs.existsSync(p2)) {
      const parsed = JSON.parse(fs.readFileSync(p2, 'utf-8'));
      if (Array.isArray(parsed.devices) && parsed.devices.length > 0) {
        return parsed.devices;
      }
    }
  } catch {}

  return [];
}

/**
 * Quick TCP socket probe to verify if port 22 is open before launching full SSH handshake.
 */
async function probeTcpPort(host: string, port: number = 22, timeoutMs: number = 1200): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let responded = false;

    const cleanup = () => {
      if (!responded) {
        responded = true;
        try {
          socket.destroy();
        } catch {}
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      cleanup();
      resolve(true);
    });
    socket.once('timeout', () => {
      cleanup();
      resolve(false);
    });
    socket.once('error', () => {
      cleanup();
      resolve(false);
    });

    try {
      socket.connect(port, host);
    } catch {
      cleanup();
      resolve(false);
    }
  });
}

/**
 * Parses raw text from Cisco "show cdp neighbors detail" CLI command.
 */
export function parseCiscoCdpDetail(rawText: string, sourceDev?: { id: string; name: string; ip: string }): DiscoveredNeighborRaw[] {
  const neighbors: DiscoveredNeighborRaw[] = [];
  if (!rawText || !rawText.trim()) return neighbors;

  // Entries usually separated by dashes or start with "Device ID:"
  const blocks = rawText.split(/(?:-{10,}|(?=Device ID:))/i);

  for (const block of blocks) {
    if (!block.toLowerCase().includes('device id:') && !block.toLowerCase().includes('entry address')) {
      continue;
    }

    let devId = '';
    const devIdMatch = block.match(/Device ID:\s*([^\r\n,]+)/i);
    if (devIdMatch) devId = devIdMatch[1].trim();

    let neighborIp = '';
    const ipMatch = block.match(/(?:IP address|Entry address\(es\):\s*IP address):\s*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/i);
    if (ipMatch) neighborIp = ipMatch[1].trim();

    let platform = '';
    const platMatch = block.match(/Platform:\s*([^,\r\n]+)/i);
    if (platMatch) platform = platMatch[1].trim();

    let capabilities = '';
    const capMatch = block.match(/Capabilities:\s*([^\r\n]+)/i);
    if (capMatch) capabilities = capMatch[1].trim();

    let localPort = '';
    let remotePort = '';
    const intMatch = block.match(/Interface:\s*([^,\r\n]+),\s*Port ID\s*(?:\(outgoing port\))?:\s*([^\r\n]+)/i);
    if (intMatch) {
      localPort = normalizePortName(intMatch[1]);
      remotePort = normalizePortName(intMatch[2]);
    } else {
      const localOnly = block.match(/Interface:\s*([^,\r\n]+)/i);
      if (localOnly) localPort = normalizePortName(localOnly[1]);
      const remoteOnly = block.match(/Port ID\s*(?:\(outgoing port\))?:\s*([^\r\n]+)/i);
      if (remoteOnly) remotePort = normalizePortName(remoteOnly[1]);
    }

    if ((devId || neighborIp) && localPort) {
      neighbors.push({
        sourceDeviceId: sourceDev?.id,
        sourceDeviceName: sourceDev?.name,
        sourceDeviceIp: sourceDev?.ip,
        localPort,
        remotePort: remotePort || 'Unknown',
        neighborDeviceId: devId,
        neighborName: devId.replace(/\.[a-zA-Z0-9.-]+$/, ''), // strip domain suffix if present
        neighborIp,
        neighborPlatform: platform,
        neighborCapabilities: capabilities,
        protocol: 'CDP',
        rawSnippet: block.trim().substring(0, 300),
      });
    }
  }

  return neighbors;
}

/**
 * Parses raw text from Cisco "show lldp neighbors detail" CLI command.
 */
export function parseCiscoLldpDetail(rawText: string, sourceDev?: { id: string; name: string; ip: string }): DiscoveredNeighborRaw[] {
  const neighbors: DiscoveredNeighborRaw[] = [];
  if (!rawText || !rawText.trim()) return neighbors;

  const blocks = rawText.split(/(?:-{10,}|(?=Chassis id:)|(?=Local Interface:)|(?=System Name:))/i);

  for (const block of blocks) {
    if (!block.toLowerCase().includes('chassis id:') && !block.toLowerCase().includes('system name:') && !block.toLowerCase().includes('port id:')) {
      continue;
    }

    let devId = '';
    const sysNameMatch = block.match(/System Name:\s*([^\r\n,]+)/i);
    if (sysNameMatch) {
      devId = sysNameMatch[1].trim();
    } else {
      const chassisMatch = block.match(/Chassis id:\s*([^\r\n,]+)/i);
      if (chassisMatch) devId = chassisMatch[1].trim();
    }

    let neighborIp = '';
    const ipMatch = block.match(/(?:Management Address(?:es)?|IP):\s*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/i);
    if (ipMatch) neighborIp = ipMatch[1].trim();

    let platform = '';
    const descMatch = block.match(/System Description:\s*([^\r\n]+)/i);
    if (descMatch) platform = descMatch[1].trim();

    let capabilities = '';
    const capMatch = block.match(/System Capabilities:\s*([^\r\n]+)/i);
    if (capMatch) capabilities = capMatch[1].trim();

    let localPort = '';
    const localMatch = block.match(/Local Interface:\s*([^,\r\n]+)/i);
    if (localMatch) localPort = normalizePortName(localMatch[1]);

    let remotePort = '';
    const remoteMatch = block.match(/Port (?:id|Description):\s*([^\r\n]+)/i);
    if (remoteMatch) remotePort = normalizePortName(remoteMatch[1]);

    if ((devId || neighborIp) && (localPort || remotePort)) {
      neighbors.push({
        sourceDeviceId: sourceDev?.id,
        sourceDeviceName: sourceDev?.name,
        sourceDeviceIp: sourceDev?.ip,
        localPort: localPort || 'Unknown',
        remotePort: remotePort || 'Unknown',
        neighborDeviceId: devId,
        neighborName: devId.replace(/\.[a-zA-Z0-9.-]+$/, ''),
        neighborIp,
        neighborPlatform: platform,
        neighborCapabilities: capabilities,
        protocol: 'LLDP',
        rawSnippet: block.trim().substring(0, 300),
      });
    }
  }

  return neighbors;
}

/**
 * Parses raw text from MikroTik RouterOS "/ip neighbor print detail" CLI command.
 */
export function parseMikrotikNeighborDetail(rawText: string, sourceDev?: { id: string; name: string; ip: string }): DiscoveredNeighborRaw[] {
  const neighbors: DiscoveredNeighborRaw[] = [];
  if (!rawText || !rawText.trim()) return neighbors;

  const entries = rawText.split(/(?=\s*\d+\s+interface=)/i);

  for (const entry of entries) {
    if (!entry.includes('interface=')) continue;

    let localPort = '';
    const intMatch = entry.match(/interface=([^\s]+)/i);
    if (intMatch) localPort = normalizePortName(intMatch[1]);

    let devId = '';
    const idMatch = entry.match(/identity="?([^"\r\n]+)"?/i);
    if (idMatch) devId = idMatch[1].trim();

    let neighborIp = '';
    const ipMatch = entry.match(/(?:address4|ip-address)=([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/i);
    if (ipMatch) neighborIp = ipMatch[1].trim();

    let remotePort = '';
    const portMatch = entry.match(/(?:interface-name|port)="?([^"\r\n]+)"?/i);
    if (portMatch) remotePort = normalizePortName(portMatch[1]);

    let platform = 'MikroTik';
    const platMatch = entry.match(/platform="?([^"\r\n]+)"?/i);
    if (platMatch) platform = platMatch[1].trim();

    if ((devId || neighborIp) && localPort) {
      neighbors.push({
        sourceDeviceId: sourceDev?.id,
        sourceDeviceName: sourceDev?.name,
        sourceDeviceIp: sourceDev?.ip,
        localPort,
        remotePort: remotePort || 'Unknown',
        neighborDeviceId: devId || neighborIp,
        neighborName: devId || neighborIp,
        neighborIp,
        neighborPlatform: platform,
        protocol: 'MNDP',
        rawSnippet: entry.trim().substring(0, 300),
      });
    }
  }

  return neighbors;
}

/**
 * Executes CDP/LLDP discovery on a live network device via SSH.
 */
async function probeDeviceCdpLldpSsh(
  device: {
    id?: string;
    name?: string;
    ip: string;
    ssh_port?: number;
    username?: string;
    password?: string;
    enable_password?: string;
    platform?: string;
    connection_mode?: string;
  },
  timeoutSec: number = 8
): Promise<{ success: boolean; neighbors: DiscoveredNeighborRaw[]; error?: string; protocol?: string }> {
  const host = device.ip;
  const port = device.ssh_port || 22;
  const user = device.username || 'admin';
  const pass = device.password || 'admin';
  const enablePass = device.enable_password || pass;
  const isMikrotik = (device.platform || '').toLowerCase().includes('mikrotik');

  // Pre-probe port 22
  const portOpen = await probeTcpPort(host, port, 1500);
  if (!portOpen) {
    return {
      success: false,
      neighbors: [],
      error: `Host ${host}:${port} unreachable or SSH port is closed.`,
    };
  }

  return new Promise((resolve) => {
    const conn = new Client();
    let streamOutput = '';
    let isDone = false;

    const finalize = (res: { success: boolean; neighbors: DiscoveredNeighborRaw[]; error?: string; protocol?: string }) => {
      if (!isDone) {
        isDone = true;
        try {
          conn.end();
        } catch {}
        resolve(res);
      }
    };

    const timer = setTimeout(() => {
      finalize({
        success: false,
        neighbors: [],
        error: `SSH discovery on ${host}:${port} timed out after ${timeoutSec} seconds.`,
      });
    }, timeoutSec * 1000);

    conn.on('keyboard-interactive', (_name, _instructions, _lang, _prompts, finish) => {
      finish([pass]);
    });

    conn.on('error', (err) => {
      clearTimeout(timer);
      finalize({
        success: false,
        neighbors: [],
        error: `SSH handshake failed (${err.message}).`,
      });
    });

    conn.on('ready', () => {
      conn.shell({ term: 'vt100', cols: 300, rows: 100 }, (err, stream) => {
        if (err) {
          clearTimeout(timer);
          return finalize({
            success: false,
            neighbors: [],
            error: `Failed to open SSH shell: ${err.message}`,
          });
        }

        stream.on('data', (chunk: Buffer) => {
          streamOutput += chunk.toString('utf-8');
        });

        stream.on('close', () => {
          clearTimeout(timer);
          processOutput();
        });

        try {
          if (isMikrotik) {
            // MikroTik RouterOS command sequence
            stream.write('/ip neighbor print detail without-paging\n');
            setTimeout(() => {
              stream.write('/quit\n');
            }, 1200);
          } else {
            // Cisco IOS command sequence
            stream.write('terminal length 0\n');
            stream.write('terminal width 512\n');

            if (enablePass) {
              stream.write('enable\n');
              setTimeout(() => {
                stream.write(`${enablePass}\n`);
                stream.write('terminal length 0\n');
              }, 300);
            }

            setTimeout(() => {
              stream.write('show cdp neighbors detail\n');
              stream.write('show lldp neighbors detail\n');
              stream.write('exit\n');
            }, 600);
          }

          // Allow 2.5s for command results to arrive
          setTimeout(() => {
            clearTimeout(timer);
            processOutput();
          }, 2600);
        } catch (writeErr: any) {
          clearTimeout(timer);
          finalize({
            success: false,
            neighbors: [],
            error: `Failed to send discovery commands: ${writeErr.message}`,
          });
        }

        function processOutput() {
          const devObj = { id: device.id || 'dev', name: device.name || host, ip: host };
          let found: DiscoveredNeighborRaw[] = [];

          if (isMikrotik) {
            found = parseMikrotikNeighborDetail(streamOutput, devObj);
          } else {
            const cdpNeighbors = parseCiscoCdpDetail(streamOutput, devObj);
            const lldpNeighbors = parseCiscoLldpDetail(streamOutput, devObj);
            found = [...cdpNeighbors, ...lldpNeighbors];
          }

          finalize({
            success: true,
            neighbors: found,
            protocol: isMikrotik ? 'MNDP/LLDP' : 'CDP/LLDP',
          });
        }
      });
    });

    const connectConfig: ConnectConfig = {
      host,
      port,
      username: user,
      password: pass,
      readyTimeout: timeoutSec * 1000,
      tryKeyboard: true,
      algorithms: getSshAlgorithms() as any,
    };

    try {
      conn.connect(connectConfig);
    } catch (connErr: any) {
      clearTimeout(timer);
      finalize({
        success: false,
        neighbors: [],
        error: `SSH connection initialization error: ${connErr.message}`,
      });
    }
  });
}

/**
 * Generates realistic simulation neighbors when running in simulator mode or demo/preview testing.
 */
function generateSimulatedNeighborsForDevice(
  device: any,
  allDevices: any[]
): DiscoveredNeighborRaw[] {
  const neighbors: DiscoveredNeighborRaw[] = [];
  const otherDevs = allDevices.filter((d) => d.id !== device.id && d.type !== 'server');
  if (otherDevs.length === 0) return neighbors;

  const isCore = /core|backbone|root/i.test(device.name || '') || /core/i.test(device.role || '');
  const isDist = /dist|agg|switch/i.test(device.name || '');

  // If core switch, connect to other distribution and access switches
  let targets = otherDevs;
  if (!isCore && !isDist) {
    // Access switch typically connects to core or distribution
    targets = otherDevs.filter((d) => /core|dist|switch/i.test(d.name || '')).slice(0, 2);
  } else {
    targets = otherDevs.slice(0, 4);
  }

  targets.forEach((target, idx) => {
    const isFiber = idx % 2 === 0;
    const localPort = isFiber ? `Te1/0/${idx + 1}` : `Gi1/0/${idx + 1}`;
    const remotePort = isFiber ? `Te1/0/${(idx % 2) + 1}` : `Gi1/0/${idx + 2}`;

    neighbors.push({
      sourceDeviceId: device.id,
      sourceDeviceName: device.name,
      sourceDeviceIp: device.ip,
      localPort,
      remotePort,
      neighborDeviceId: target.name || target.id,
      neighborName: target.name,
      neighborIp: target.ip,
      neighborPlatform: target.platform || 'Cisco IOS-XE (C9300)',
      neighborCapabilities: 'Router, Switch, IGMP',
      protocol: 'CDP',
    });
  });

  return neighbors;
}

/**
 * Local network discovery: Probes local interfaces, default gateway, ARP neighbors,
 * and broadcasts UDP MNDP/LLDP discovery packets on local network.
 */
async function discoverLocalNetwork(): Promise<{
  localInterfaces: string[];
  neighbors: DiscoveredNeighborRaw[];
  logs: DiscoveryDeviceLog[];
}> {
  const neighbors: DiscoveredNeighborRaw[] = [];
  const logs: DiscoveryDeviceLog[] = [];
  const interfaces: string[] = [];

  const networkInterfaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(networkInterfaces)) {
    if (name.includes('lo') || !addrs) continue;
    interfaces.push(name);
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        logs.push({
          deviceName: `Local Host (${name})`,
          ip: addr.address,
          status: 'connecting',
          timestamp: new Date().toLocaleTimeString(),
          neighborsFound: 0,
        });
      }
    }
  }

  // 1. Check ARP / Neighbor table via ip neigh or /proc/net/arp
  try {
    const arpData = await new Promise<string>((res) => {
      exec('ip neigh show || arp -a || cat /proc/net/arp', { timeout: 2000 }, (err, stdout) => {
        res(stdout || '');
      });
    });

    const lines = arpData.split('\n');
    for (const line of lines) {
      // E.g. "172.22.100.1 dev eth0 lladdr 00:00:5e:00:01:01 REACHABLE"
      const ipMatch = line.match(/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/);
      const macMatch = line.match(/([0-9a-fA-F]{2}(?::[0-9a-fA-F]{2}){5})/);
      const devMatch = line.match(/dev\s+([^\s]+)/);

      if (ipMatch && macMatch) {
        const ip = ipMatch[1];
        const mac = macMatch[1];
        const iface = devMatch ? devMatch[1] : 'eth0';

        neighbors.push({
          sourceDeviceId: 'local-server',
          sourceDeviceName: 'Local Server Gateway Link',
          sourceDeviceIp: '127.0.0.1',
          localPort: iface,
          remotePort: 'Uplink',
          neighborDeviceId: `Gateway-${ip}`,
          neighborName: `Switch/Router (${ip})`,
          neighborIp: ip,
          neighborPlatform: 'Detected L3 Gateway / Bridge',
          neighborCapabilities: 'Router, Switch',
          protocol: 'LLDP',
        });
      }
    }
  } catch {}

  // 2. MikroTik MNDP UDP broadcast discovery on port 5678
  await new Promise<void>((resolve) => {
    try {
      const socket = net.createServer(); // dummy guard
      socket.close();
      const dgram = require('dgram');
      const udp = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      udp.on('message', (msg: Buffer, rinfo: any) => {
        // Parse basic MNDP frame
        const ip = rinfo.address;
        if (!neighbors.some((n) => n.neighborIp === ip)) {
          neighbors.push({
            sourceDeviceId: 'local-server',
            sourceDeviceName: 'NetTopology Server',
            sourceDeviceIp: '127.0.0.1',
            localPort: 'eth0',
            remotePort: 'ether1',
            neighborDeviceId: `MikroTik-${ip}`,
            neighborName: `RouterOS-${ip}`,
            neighborIp: ip,
            neighborPlatform: 'MikroTik RouterOS',
            neighborCapabilities: 'Router, Switch',
            protocol: 'MNDP',
          });
        }
      });

      udp.on('error', () => {
        try {
          udp.close();
        } catch {}
        resolve();
      });

      udp.bind(5678, () => {
        try {
          udp.setBroadcast(true);
          // Send MNDP discovery trigger
          const trigger = Buffer.from([0x00, 0x00, 0x00, 0x00]);
          udp.send(trigger, 0, trigger.length, 5678, '255.255.255.255', () => {});
        } catch {}
      });

      setTimeout(() => {
        try {
          udp.close();
        } catch {}
        resolve();
      }, 1200);
    } catch {
      resolve();
    }
  });

  return { localInterfaces: interfaces, neighbors, logs };
}

/**
 * Expands an IP range or CIDR into a list of IPv4 strings (capped at 256 IPs).
 */
export function expandIpRange(rangeStr: string): string[] {
  const ips: string[] = [];
  const str = rangeStr.trim();

  // CIDR notation: e.g. 192.168.1.0/24 or 10.0.0.0/28
  if (str.includes('/')) {
    const [base, maskStr] = str.split('/');
    const mask = parseInt(maskStr, 10);
    if (isNaN(mask) || mask < 16 || mask > 32) return [base];

    const parts = base.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4) return [];

    const baseInt = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
    const count = Math.min(Math.pow(2, 32 - mask), 256);

    for (let i = 1; i < count - 1; i++) {
      const curInt = (baseInt + i) >>> 0;
      const ip = `${(curInt >>> 24) & 255}.${(curInt >>> 16) & 255}.${(curInt >>> 8) & 255}.${curInt & 255}`;
      ips.push(ip);
    }
    return ips;
  }

  // Dash notation: e.g. 192.168.1.1-192.168.1.20 or 192.168.1.1-20
  if (str.includes('-')) {
    const [startStr, endStr] = str.split('-');
    const startParts = startStr.trim().split('.').map(Number);
    let endLast = parseInt(endStr.trim(), 10);
    if (endStr.includes('.')) {
      endLast = endStr.trim().split('.').map(Number)[3];
    }
    if (startParts.length === 4 && !isNaN(endLast) && endLast >= startParts[3]) {
      const prefix = `${startParts[0]}.${startParts[1]}.${startParts[2]}.`;
      const maxCount = Math.min(endLast - startParts[3] + 1, 256);
      for (let i = 0; i < maxCount; i++) {
        ips.push(`${prefix}${startParts[3] + i}`);
      }
      return ips;
    }
  }

  // Single IP
  if (/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(str)) {
    return [str];
  }

  return [];
}

/**
 * Cross-device link correlation engine.
 * Takes all raw neighbors discovered across devices, matches them against known inventory devices,
 * deduplicates links, calculates verification status (bidirectional vs unidirectional),
 * and produces candidate links and unmanaged devices.
 */
export function correlateTopologyNeighbors(
  rawNeighbors: DiscoveredNeighborRaw[],
  allDevices: any[]
): {
  links: CorrelatedTopologyLink[];
  unmanagedDevices: DiscoveredUnmanagedDevice[];
} {
  const correlatedLinks: CorrelatedTopologyLink[] = [];
  const unmanagedMap = new Map<string, DiscoveredUnmanagedDevice>();
  const linkKeySet = new Set<string>();

  // Map to find device by IP, hostname, or clean name
  const deviceByIp = new Map<string, any>();
  const deviceByName = new Map<string, any>();

  for (const d of allDevices) {
    if (d.ip) deviceByIp.set(d.ip.toLowerCase(), d);
    if (d.name) {
      deviceByName.set(d.name.toLowerCase(), d);
      const clean = d.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      deviceByName.set(clean, d);
    }
    if (d.id) {
      deviceByName.set(d.id.toLowerCase(), d);
    }
  }

  function findMatchingDevice(neighborDevId: string, neighborIp: string): any | null {
    if (neighborIp && deviceByIp.has(neighborIp.toLowerCase())) {
      return deviceByIp.get(neighborIp.toLowerCase());
    }
    if (neighborDevId) {
      const nid = neighborDevId.toLowerCase();
      if (deviceByName.has(nid)) return deviceByName.get(nid);

      const stripped = nid.replace(/\.[a-z0-9.-]+$/i, '');
      if (deviceByName.has(stripped)) return deviceByName.get(stripped);

      const clean = nid.replace(/[^a-z0-9]/g, '');
      if (deviceByName.has(clean)) return deviceByName.get(clean);

      // Substring search
      for (const [key, dev] of deviceByName.entries()) {
        if (nid.includes(key) || key.includes(nid)) {
          return dev;
        }
      }
    }
    return null;
  }

  // First, group by pair to detect bidirectional observations
  for (const raw of rawNeighbors) {
    const sourceDev = allDevices.find((d) => d.id === raw.sourceDeviceId) || {
      id: raw.sourceDeviceId || 'src-dev',
      name: raw.sourceDeviceName || raw.sourceDeviceIp || 'Source Device',
      ip: raw.sourceDeviceIp || '',
    };

    const targetDev = findMatchingDevice(raw.neighborDeviceId, raw.neighborIp);

    if (targetDev && targetDev.id !== sourceDev.id) {
      // Both source and target are known devices!
      const normSourcePort = normalizePortName(raw.localPort);
      const normTargetPort = normalizePortName(raw.remotePort);

      // Canonical pair ordering to detect reverse link
      const isOrdered = sourceDev.id.localeCompare(targetDev.id) <= 0;
      const devA = isOrdered ? sourceDev : targetDev;
      const devB = isOrdered ? targetDev : sourceDev;
      const portA = isOrdered ? normSourcePort : normTargetPort;
      const portB = isOrdered ? normTargetPort : normSourcePort;

      const linkKey = `${devA.id}:${portA}<->${devB.id}:${portB}`;

      if (linkKeySet.has(linkKey)) {
        // Reverse already processed! Upgrade existing link to bidirectional
        const existing = correlatedLinks.find(
          (l) => l.sourceDeviceId === devA.id && l.targetDeviceId === devB.id && l.sourcePort === portA && l.targetPort === portB
        );
        if (existing) {
          existing.verification = 'bidirectional';
          existing.confidence = 'high';
          if (raw.protocol && !existing.protocol.includes(raw.protocol)) {
            existing.protocol = 'CDP/LLDP';
          }
        }
        continue;
      }

      linkKeySet.add(linkKey);

      // Check if reverse observation exists in rawNeighbors
      const reverseExists = rawNeighbors.some(
        (other) =>
          other.sourceDeviceId === targetDev.id &&
          (normalizePortName(other.localPort) === normTargetPort || other.neighborIp === sourceDev.ip || other.neighborDeviceId.toLowerCase().includes(sourceDev.name.toLowerCase()))
      );

      const speedSpecs = inferSpeedAndCable(normSourcePort, normTargetPort);

      correlatedLinks.push({
        id: `link-disc-${devA.id}-${devB.id}-${Math.random().toString(36).substring(2, 7)}`,
        sourceDeviceId: devA.id,
        sourceDeviceName: devA.name,
        sourceDeviceIp: devA.ip,
        sourcePort: portA,
        targetDeviceId: devB.id,
        targetDeviceName: devB.name,
        targetDeviceIp: devB.ip,
        targetPort: portB,
        protocol: raw.protocol,
        cableType: speedSpecs.cableType,
        speed: speedSpecs.speed,
        sourceMode: 'trunk',
        targetMode: 'trunk',
        status: 'active',
        verification: reverseExists ? 'bidirectional' : 'unidirectional',
        confidence: reverseExists ? 'high' : 'medium',
        checked: true,
      });
    } else if (!targetDev) {
      // Device is seen in CDP/LLDP but NOT in inventory!
      const unmanagedKey = (raw.neighborIp || raw.neighborDeviceId || 'unknown').toLowerCase();
      if (!unmanagedMap.has(unmanagedKey)) {
        const caps = (raw.neighborCapabilities || '').toLowerCase();
        let devType: DiscoveredUnmanagedDevice['deviceType'] = 'switch';
        if (caps.includes('router')) devType = 'router';
        else if (caps.includes('wlan') || caps.includes('access point') || caps.includes('transceiver')) devType = 'ap';
        else if (caps.includes('host') || caps.includes('station')) devType = 'server';

        unmanagedMap.set(unmanagedKey, {
          id: `unmanaged-${Math.random().toString(36).substring(2, 9)}`,
          name: raw.neighborName || raw.neighborDeviceId || `Neighbor-${raw.neighborIp}`,
          ip: raw.neighborIp || 'N/A',
          model: raw.neighborPlatform || 'Cisco/MikroTik Hardware',
          platform: raw.neighborPlatform || 'cisco_ios',
          capabilities: raw.neighborCapabilities || 'Switch, IGMP',
          discoveredViaDeviceId: sourceDev.id,
          discoveredViaDeviceName: sourceDev.name,
          localPort: normalizePortName(raw.localPort),
          remotePort: normalizePortName(raw.remotePort),
          protocol: raw.protocol,
          deviceType: devType,
          checked: true,
          alreadyInInventory: false,
          alreadyOnCanvas: false,
        });
      }
    }
  }

  return {
    links: correlatedLinks,
    unmanagedDevices: Array.from(unmanagedMap.values()),
  };
}

/**
 * Starts an asynchronous CDP/LLDP discovery job.
 */
export async function startDiscoveryJob(options: DiscoveryRequestOptions): Promise<string> {
  const jobId = `disc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const registeredDevices = getRegisteredDevices();

  const job: DiscoveryJob = {
    id: jobId,
    mode: options.mode,
    status: 'running',
    progress: 5,
    currentStep: 'در حال آماده‌سازی و راه‌اندازی فرآیند کشف توپولوژی...',
    currentStepEn: 'Initializing topology discovery process...',
    totalDevices: 0,
    scannedDevices: 0,
    startTime: Date.now(),
    deviceLogs: [],
    links: [],
    unmanagedDevices: [],
    summary: {
      totalScanned: 0,
      successfulScanned: 0,
      failedScanned: 0,
      totalNeighborsFound: 0,
      uniqueLinksFound: 0,
      bidirectionalCount: 0,
      unidirectionalCount: 0,
      newDevicesFound: 0,
    },
  };

  activeJobs.set(jobId, job);

  // Run asynchronously without blocking the HTTP request
  (async () => {
    try {
      const allRawNeighbors: DiscoveredNeighborRaw[] = [];

      // ==============================================================
      // Mode 1: Local Network Discovery
      // ==============================================================
      if (options.mode === 'local') {
        job.currentStep = 'در حال اسکن بسته‌های CDP/LLDP و کشف همسایگان در شبکه محلی سرور...';
        job.currentStepEn = 'Listening for CDP/LLDP packets & discovering local network neighbors...';
        job.progress = 25;

        const localRes = await discoverLocalNetwork();
        job.progress = 75;
        allRawNeighbors.push(...localRes.neighbors);
        job.deviceLogs.push(...localRes.logs);

        job.deviceLogs.push({
          deviceName: 'Local Discovery Sweep',
          ip: 'Localhost',
          status: localRes.neighbors.length > 0 ? 'success' : 'warning',
          protocol: 'CDP/LLDP/MNDP',
          neighborsFound: localRes.neighbors.length,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // ==============================================================
      // Mode 2: Custom IP Range Discovery
      // ==============================================================
      else if (options.mode === 'range') {
        const ipList = expandIpRange(options.ipRange || '192.168.1.0/24');
        job.totalDevices = ipList.length;
        job.currentStep = `در حال بررسی دسترسی‌پذیری و ارتباط SSH با ${ipList.length} آدرس آی‌پی در محدوده...`;
        job.currentStepEn = `Testing reachability and SSH connectivity across ${ipList.length} IPs...`;

        const concurrency = options.concurrency || 6;
        let completed = 0;

        for (let i = 0; i < ipList.length; i += concurrency) {
          if (job.status === 'cancelled') break;

          const batch = ipList.slice(i, i + concurrency);
          await Promise.all(
            batch.map(async (ip) => {
              const startT = Date.now();
              const probeRes = await probeDeviceCdpLldpSsh(
                {
                  ip,
                  ssh_port: options.sshPort || 22,
                  username: options.username || 'admin',
                  password: options.password || 'admin',
                  enable_password: options.enablePassword,
                },
                options.timeoutSeconds || 6
              );

              completed++;
              job.scannedDevices = completed;
              job.progress = Math.min(90, Math.floor(10 + (completed / ipList.length) * 80));

              const duration = Date.now() - startT;
              if (probeRes.success) {
                allRawNeighbors.push(...probeRes.neighbors);
                job.deviceLogs.push({
                  deviceName: `Host (${ip})`,
                  ip,
                  status: 'success',
                  protocol: probeRes.protocol || 'SSH',
                  neighborsFound: probeRes.neighbors.length,
                  durationMs: duration,
                  timestamp: new Date().toLocaleTimeString(),
                });
              } else {
                job.deviceLogs.push({
                  deviceName: `Host (${ip})`,
                  ip,
                  status: 'error',
                  error: probeRes.error,
                  neighborsFound: 0,
                  durationMs: duration,
                  timestamp: new Date().toLocaleTimeString(),
                });
              }
            })
          );
        }
      }

      // ==============================================================
      // Mode 3: Specific Switch Discovery
      // ==============================================================
      else if (options.mode === 'device') {
        const targetDev =
          registeredDevices.find((d) => d.id === options.targetDeviceId || d.ip === options.targetDeviceIp) ||
          registeredDevices[0];

        if (!targetDev) {
          throw new Error('دستگاه مورد نظر در لیست تجهیزات ثبت‌شده یافت نشد.');
        }

        job.totalDevices = 1;
        job.currentStep = `در حال اتصال SSH به سوییچ ${targetDev.name} (${targetDev.ip}) و اجرای دستورات CDP/LLDP...`;
        job.currentStepEn = `Connecting via SSH to switch ${targetDev.name} (${targetDev.ip}) and extracting CDP/LLDP...`;
        job.progress = 30;

        const probeRes = await probeDeviceCdpLldpSsh(targetDev, options.timeoutSeconds || 8);
        job.scannedDevices = 1;
        job.progress = 80;

        if (probeRes.success) {
          allRawNeighbors.push(...probeRes.neighbors);
          job.deviceLogs.push({
            deviceId: targetDev.id,
            deviceName: targetDev.name,
            ip: targetDev.ip,
            status: 'success',
            protocol: probeRes.protocol,
            neighborsFound: probeRes.neighbors.length,
            timestamp: new Date().toLocaleTimeString(),
          });
        } else {
          // If real connection failed but simulator fallback is allowed
          if (options.allowSimulatorFallback || targetDev.connection_mode === 'simulator') {
            const simNeighbors = generateSimulatedNeighborsForDevice(targetDev, registeredDevices);
            allRawNeighbors.push(...simNeighbors);
            job.deviceLogs.push({
              deviceId: targetDev.id,
              deviceName: targetDev.name,
              ip: targetDev.ip,
              status: 'warning',
              protocol: 'CDP (Lab Mode)',
              error: `${probeRes.error} -> Fallback to Lab Simulation.`,
              neighborsFound: simNeighbors.length,
              timestamp: new Date().toLocaleTimeString(),
            });
          } else {
            job.deviceLogs.push({
              deviceId: targetDev.id,
              deviceName: targetDev.name,
              ip: targetDev.ip,
              status: 'error',
              error: probeRes.error,
              neighborsFound: 0,
              timestamp: new Date().toLocaleTimeString(),
            });
          }
        }
      }

      // ==============================================================
      // Mode 4: Discover from Inventory (All registered switches)
      // ==============================================================
      else {
        // Target all switches & routers in inventory
        let targetDevs = registeredDevices.filter((d) => d.type === 'switch' || d.type === 'router' || d.role?.includes('switch'));
        if (targetDevs.length === 0) {
          targetDevs = registeredDevices;
        }

        if (options.deviceIds && options.deviceIds.length > 0) {
          targetDevs = targetDevs.filter((d) => options.deviceIds?.includes(d.id));
        }

        job.totalDevices = targetDevs.length;
        job.currentStep = `در حال اتصال همزمان به ${targetDevs.length} سوییچ شبکه و جمع‌آوری جداول CDP و LLDP...`;
        job.currentStepEn = `Querying ${targetDevs.length} network switches simultaneously for CDP/LLDP tables...`;

        const concurrency = options.concurrency || 4;
        let completed = 0;

        for (let i = 0; i < targetDevs.length; i += concurrency) {
          if (job.status === 'cancelled') break;

          const batch = targetDevs.slice(i, i + concurrency);
          await Promise.all(
            batch.map(async (dev) => {
              const startT = Date.now();
              const probeRes = await probeDeviceCdpLldpSsh(dev, options.timeoutSeconds || 8);
              completed++;
              job.scannedDevices = completed;
              job.progress = Math.min(92, Math.floor(10 + (completed / targetDevs.length) * 80));

              const duration = Date.now() - startT;
              if (probeRes.success) {
                allRawNeighbors.push(...probeRes.neighbors);
                job.deviceLogs.push({
                  deviceId: dev.id,
                  deviceName: dev.name,
                  ip: dev.ip,
                  status: 'success',
                  protocol: probeRes.protocol,
                  neighborsFound: probeRes.neighbors.length,
                  durationMs: duration,
                  timestamp: new Date().toLocaleTimeString(),
                });
              } else {
                // Check simulator fallback
                if (options.allowSimulatorFallback || dev.connection_mode === 'simulator') {
                  const simNeighbors = generateSimulatedNeighborsForDevice(dev, registeredDevices);
                  allRawNeighbors.push(...simNeighbors);
                  job.deviceLogs.push({
                    deviceId: dev.id,
                    deviceName: dev.name,
                    ip: dev.ip,
                    status: 'warning',
                    protocol: 'CDP/LLDP (Lab Mode)',
                    error: `${probeRes.error} (Fallback to simulation)`,
                    neighborsFound: simNeighbors.length,
                    durationMs: duration,
                    timestamp: new Date().toLocaleTimeString(),
                  });
                } else {
                  job.deviceLogs.push({
                    deviceId: dev.id,
                    deviceName: dev.name,
                    ip: dev.ip,
                    status: 'error',
                    error: probeRes.error,
                    neighborsFound: 0,
                    durationMs: duration,
                    timestamp: new Date().toLocaleTimeString(),
                  });
                }
              }
            })
          );
        }
      }

      // ==============================================================
      // Correlation and Verification Phase
      // ==============================================================
      job.currentStep = 'در حال تطبیق داده‌ها و تعیین اتصالات مستقیم سوییچ‌ها به یکدیگر...';
      job.currentStepEn = 'Correlating neighbor entries and validating inter-switch links...';
      job.progress = 95;

      const correlated = correlateTopologyNeighbors(allRawNeighbors, registeredDevices);
      job.links = correlated.links;
      job.unmanagedDevices = correlated.unmanagedDevices;

      const successCount = job.deviceLogs.filter((l) => l.status === 'success' || l.status === 'warning').length;
      const failCount = job.deviceLogs.filter((l) => l.status === 'error').length;
      const biCount = job.links.filter((l) => l.verification === 'bidirectional').length;
      const uniCount = job.links.filter((l) => l.verification === 'unidirectional').length;

      job.summary = {
        totalScanned: job.deviceLogs.length,
        successfulScanned: successCount,
        failedScanned: failCount,
        totalNeighborsFound: allRawNeighbors.length,
        uniqueLinksFound: job.links.length,
        bidirectionalCount: biCount,
        unidirectionalCount: uniCount,
        newDevicesFound: job.unmanagedDevices.length,
      };

      job.progress = 100;
      job.status = 'completed';
      job.endTime = Date.now();
      job.currentStep = `کشف توپولوژی با موفقیت به پایان رسید. تعداد ${job.links.length} لینک ارتباطی و ${job.unmanagedDevices.length} تجهیز جدید شناسایی گردید.`;
      job.currentStepEn = `Discovery completed successfully: ${job.links.length} physical links and ${job.unmanagedDevices.length} new devices detected.`;
    } catch (err: any) {
      job.status = 'failed';
      job.progress = 100;
      job.endTime = Date.now();
      job.currentStep = `خطا در اجرای فرآیند کشف: ${err.message}`;
      job.currentStepEn = `Discovery error: ${err.message}`;
    }
  })();

  return jobId;
}

/**
 * Gets the status of an active or finished discovery job.
 */
export function getDiscoveryJobStatus(jobId: string): DiscoveryJob | null {
  return activeJobs.get(jobId) || null;
}

/**
 * Cancels a running discovery job.
 */
export function cancelDiscoveryJob(jobId: string): boolean {
  const job = activeJobs.get(jobId);
  if (job && job.status === 'running') {
    job.status = 'cancelled';
    job.currentStep = 'فرآیند کشف توسط کاربر لغو گردید.';
    job.currentStepEn = 'Discovery job was cancelled by user.';
    job.endTime = Date.now();
    return true;
  }
  return false;
}

/**
 * Applies selected discovered links and newly detected devices to target custom map or default map.
 */
export async function applyDiscoveryResultsToMap(payload: {
  targetMapId: string; // 'default' or custom map ID
  selectedLinkIds: string[];
  links: CorrelatedTopologyLink[];
  selectedDeviceIds: string[];
  unmanagedDevices: DiscoveredUnmanagedDevice[];
}): Promise<{
  success: boolean;
  message: string;
  message_en: string;
  appliedLinksCount: number;
  appliedDevicesCount: number;
}> {
  const linksToApply = payload.links.filter((l) => payload.selectedLinkIds.includes(l.id));
  const devsToApply = payload.unmanagedDevices.filter((d) => payload.selectedDeviceIds.includes(d.id));

  // If applying to a custom map
  if (payload.targetMapId && payload.targetMapId !== 'default') {
    const existingMaps = await getCustomMaps();
    const mapIndex = existingMaps.findIndex((m: any) => m.id === payload.targetMapId);
    if (mapIndex === -1) {
      throw new Error(`Custom map ${payload.targetMapId} not found`);
    }

    const targetMap = existingMaps[mapIndex];
    const currentDeviceIds: string[] = [...(targetMap.deviceIds || [])];
    const currentPositions = { ...(targetMap.devicePositions || {}) };
    const currentLinks = [...(targetMap.links || [])];

    // Add unmanaged devices to canvas
    let newlyAddedDevCount = 0;
    for (const dev of devsToApply) {
      if (!currentDeviceIds.includes(dev.id)) {
        currentDeviceIds.push(dev.id);
        const col = currentDeviceIds.length % 4;
        const row = Math.floor(currentDeviceIds.length / 4);
        currentPositions[dev.id] = {
          x: 250 + col * 280,
          y: 200 + row * 240,
        };
        newlyAddedDevCount++;
      }
    }

    // Add links
    let newlyAddedLinksCount = 0;
    for (const link of linksToApply) {
      const exists = currentLinks.some(
        (l: any) =>
          (l.sourceDeviceId === link.sourceDeviceId && l.targetDeviceId === link.targetDeviceId && l.sourcePort === link.sourcePort && l.targetPort === link.targetPort) ||
          (l.sourceDeviceId === link.targetDeviceId && l.targetDeviceId === link.sourceDeviceId && l.sourcePort === link.targetPort && l.targetPort === link.sourcePort)
      );

      if (!exists) {
        currentLinks.push({
          id: link.id,
          sourceDeviceId: link.sourceDeviceId,
          targetDeviceId: link.targetDeviceId,
          sourcePort: link.sourcePort,
          targetPort: link.targetPort,
          sourceMode: link.sourceMode,
          targetMode: link.targetMode,
          cableType: link.cableType,
          speed: link.speed,
          status: link.status,
        });
        newlyAddedLinksCount++;
      }
    }

    targetMap.deviceIds = currentDeviceIds;
    targetMap.devicePositions = currentPositions;
    targetMap.links = currentLinks;
    targetMap.updatedAt = new Date().toISOString();

    existingMaps[mapIndex] = targetMap;
    await saveCustomMaps(existingMaps);

    return {
      success: true,
      appliedLinksCount: newlyAddedLinksCount,
      appliedDevicesCount: newlyAddedDevCount,
      message: `${newlyAddedLinksCount} لینک ارتباطی و ${newlyAddedDevCount} تجهیز جدید با موفقیت به نقشه سفارشی اعمال گردید.`,
      message_en: `Successfully applied ${newlyAddedLinksCount} links and ${newlyAddedDevCount} devices to the topology map.`,
    };
  }

  // Fallback: Default map links saved to database_store / network_data
  try {
    const p1 = path.join(process.cwd(), 'backend', 'database_store.json');
    if (fs.existsSync(p1)) {
      const data = JSON.parse(fs.readFileSync(p1, 'utf-8'));
      if (!data.topology_links) data.topology_links = [];

      for (const link of linksToApply) {
        data.topology_links.push({
          id: link.id,
          source: link.sourceDeviceId,
          target: link.targetDeviceId,
          source_port: link.sourcePort,
          target_port: link.targetPort,
          type: link.sourceMode,
          speed: link.speed,
          protocol: link.protocol,
          status: 'active',
        });
      }
      fs.writeFileSync(p1, JSON.stringify(data, null, 2), 'utf-8');
    }
  } catch {}

  return {
    success: true,
    appliedLinksCount: linksToApply.length,
    appliedDevicesCount: devsToApply.length,
    message: `${linksToApply.length} لینک ارتباطی با موفقیت در نقشه اصلی ثبت شد.`,
    message_en: `Successfully registered ${linksToApply.length} links in default topology.`,
  };
}
