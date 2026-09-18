import {
  Device,
  SwitchPort,
  CdpLldpNeighbor,
  TopologyData,
  VlanInfo,
  ConfigTemplate,
  TemplateApplyResult,
  DeviceConfigExtractRequest,
  DeviceConfigExtractResult,
  DeviceGroup,
  ActiveDirectoryConfig,
  AccessPolicy
} from '../types';

const API_BASE = '/api';

export async function fetchHealth(): Promise<any> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchDevices(): Promise<{ devices: Device[]; total: number; online_count: number; offline_count: number }> {
  const res = await fetch(`${API_BASE}/devices`);
  if (!res.ok) throw new Error('Failed to fetch devices');
  return res.json();
}

export async function addDevice(device: Partial<Device>): Promise<{ device: Device; message: string }> {
  const res = await fetch(`${API_BASE}/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(device),
  });
  if (!res.ok) throw new Error('Failed to add device');
  return res.json();
}

export async function updateDevice(id: string, updates: Partial<Device>): Promise<{ device: Device; message: string }> {
  const res = await fetch(`${API_BASE}/devices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update device');
  return res.json();
}

export async function deleteDevice(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/devices/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete device');
  return res.json();
}

export async function fetchDeviceCapabilities(deviceId: string): Promise<import('../types').DevicePlatformInfo> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/capabilities`);
  if (!res.ok) throw new Error('Failed to fetch device capabilities');
  return res.json();
}

export async function fetchDeviceConnection(deviceId: string): Promise<{
  connected: boolean;
  platform: string;
  protocol: string;
  latency_ms?: number;
  sessionId?: string;
  isReal?: boolean;
  banner?: string;
  mode?: string;
}> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/connection`);
  if (!res.ok) throw new Error('Failed to fetch device connection state');
  return res.json();
}

export async function connectDevice(deviceId: string): Promise<{
  success: boolean;
  connected: boolean;
  sessionId: string;
  platform: string;
  isReal: boolean;
  latency_ms: number;
  banner: string;
  mode?: string;
}> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to connect to device');
  return res.json();
}

export async function disconnectDevice(deviceId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/connection`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to disconnect device');
  return res.json();
}

export async function executeDeviceOperation(
  deviceId: string,
  operation: string,
  iface?: string,
  params?: Record<string, any>,
  userRole?: string
): Promise<{
  success: boolean;
  cli_command: string;
  output: string;
  isReal: boolean;
  durationMs: number;
  port?: SwitchPort;
  message?: string;
}> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/operations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userRole ? { 'X-User-Role': userRole } : {}),
    },
    body: JSON.stringify({ operation, interface: iface, params, user_role: userRole }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Operation failed on device');
  }
  return res.json();
}

export async function executeDeviceTerminal(
  deviceId: string,
  command: string,
  userRole?: string
): Promise<{
  success: boolean;
  output: string;
  isReal: boolean;
  durationMs: number;
  exitCode?: number;
}> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/terminal/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userRole ? { 'X-User-Role': userRole } : {}),
    },
    body: JSON.stringify({ command, user_role: userRole }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to execute command on device');
  }
  return res.json();
}

export async function fetchDevicePorts(deviceId: string): Promise<{
  device: Device;
  ports: SwitchPort[];
  active_count: number;
  inactive_count: number;
  admin_disabled_count: number;
  is_live?: boolean;
  cached?: boolean;
  mode?: string;
  error?: string;
  message?: string;
}> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/ports`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to fetch ports');
  }
  return res.json();
}

export async function syncDevicePorts(deviceId: string): Promise<{
  device: Device;
  ports: SwitchPort[];
  active_count: number;
  inactive_count: number;
  admin_disabled_count: number;
  is_live: boolean;
  sync_source: string;
  error?: string;
  message?: string;
}> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/ports/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    return fetchDevicePorts(deviceId) as any;
  }
  return res.json();
}

export async function updateSwitchPort(
  deviceId: string,
  portId: string,
  updates: Partial<SwitchPort>
): Promise<{ port: SwitchPort; message: string; success?: boolean; cli_output?: string }> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/ports/${encodeURIComponent(portId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || errData.message || 'Failed to update port');
  }
  return res.json();
}

export async function batchUpdateSwitchPorts(
  deviceId: string,
  portIds: string[],
  updates: Partial<SwitchPort>
): Promise<{ success: boolean; updatedCount: number; message: string; ports: SwitchPort[] }> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/ports/batch`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port_ids: portIds, updates }),
  });
  if (!res.ok) throw new Error('Failed to batch update ports');
  return res.json();
}

export interface DiscoveredHardware {
  hostname?: string;
  model?: string;
  serial_number?: string;
  mac_address?: string;
  os_version?: string;
  uptime?: string;
  cpu_model?: string;
  total_ports?: number;
  memory_total_mb?: number;
  memory_free_mb?: number;
  device_type?: 'switch' | 'router' | 'access_point';
  platform_detected?: string;
}

export interface DiscoveredPower {
  power_supplies: number;
  power_watts: number;
  source: string;
}

export async function testDeviceConnection(data: {
  ip: string;
  ssh_host?: string;
  ssh_port?: number;
  ssh_username?: string;
  ssh_password?: string;
  enable_password?: string;
  protocol?: 'ssh' | 'telnet';
  connection_protocol?: 'ssh' | 'telnet';
  platform?: string;
  connection_mode?: string;
  simulate?: boolean;
  lang?: string;
}): Promise<{
  success: boolean;
  message: string;
  message_en?: string;
  message_fa?: string;
  latency_ms?: number;
  banner?: string;
  protocol?: string;
  error?: string;
  hostname?: string;
  model?: string;
  total_ports?: number;
  ports?: SwitchPort[];
  raw_status_output?: string;
  live_discovery?: boolean;
  simulated?: boolean;
  hardware?: DiscoveredHardware;
  power?: DiscoveredPower;
  master_session_id?: string;
  serial_number?: string;
  mac?: string;
  uptime?: string;
  firmware?: string;
}> {
  const res = await fetch(`${API_BASE}/devices/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export function getTerminalWebSocketUrl(
  deviceId: string,
  protocol?: 'ssh' | 'telnet',
  role?: string,
  deviceInfo?: {
    ip?: string;
    ssh_host?: string;
    ssh_port?: number;
    ssh_username?: string;
    ssh_password?: string;
    password?: string;
    enable_password?: string;
    platform?: string;
  }
): string {
  const loc = window.location;
  const wsProto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  const query = new URLSearchParams();
  query.set('deviceId', deviceId);
  if (protocol) query.set('protocol', protocol);
  if (role) query.set('role', role);
  if (deviceInfo) {
    const h = deviceInfo.ssh_host || deviceInfo.ip;
    if (h) query.set('host', h);
    if (deviceInfo.ssh_port) query.set('port', String(deviceInfo.ssh_port));
    if (deviceInfo.ssh_username) query.set('username', deviceInfo.ssh_username);
    const pass = deviceInfo.ssh_password || deviceInfo.password;
    if (pass) query.set('password', pass);
    if (deviceInfo.enable_password) query.set('enable_password', deviceInfo.enable_password);
    if (deviceInfo.platform) query.set('platform', deviceInfo.platform);
  }
  return `${wsProto}//${loc.host}/ws/ssh/${encodeURIComponent(deviceId)}?${query.toString()}`;
}

export const getSshWebSocketUrl = getTerminalWebSocketUrl;

export async function closeDeviceTerminalSession(deviceId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/terminal`, {
    method: 'DELETE',
  });
  return res.json().catch(() => ({ success: true, message: 'Terminal closed' }));
}

export interface DeviceUnsavedChangesInfo {
  has_unsaved_changes: boolean;
  pending_changes?: Array<{
    port_id?: string;
    type?: string;
    description?: string;
    command?: string;
    timestamp?: string;
  }>;
  modified_ports?: Array<{
    port_id: string;
    mode: string;
    vlan: number;
    status: string;
    admin_status?: string;
    description: string;
    port_security_enabled?: boolean;
    change_summary?: string;
  }>;
  last_modified_time?: string;
  cli_diff?: string;
}

export async function fetchDeviceUnsavedChanges(deviceId: string): Promise<DeviceUnsavedChangesInfo> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/unsaved-changes`);
  if (!res.ok) {
    return { has_unsaved_changes: true, pending_changes: [] };
  }
  return res.json();
}

export async function writeMemory(deviceId: string): Promise<{ success: boolean; device: Device; message: string }> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/write-memory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to write memory');
  return res.json();
}

export async function fetchTopology(): Promise<TopologyData> {
  const res = await fetch(`${API_BASE}/topology`);
  if (!res.ok) throw new Error('Failed to fetch topology');
  return res.json();
}

export async function fetchCdpLldpNeighbors(protocol?: 'CDP' | 'LLDP'): Promise<{
  neighbors: CdpLldpNeighbor[];
  total: number;
  cdp_count: number;
  lldp_count: number;
}> {
  const url = protocol ? `${API_BASE}/cdp-lldp/neighbors?protocol=${protocol}` : `${API_BASE}/cdp-lldp/neighbors`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch CDP/LLDP neighbors');
  return res.json();
}

export async function runCdpLldpScan(): Promise<{
  success: boolean;
  message: string;
  neighbors: CdpLldpNeighbor[];
  links: any[];
  timestamp: string;
}> {
  const res = await fetch(`${API_BASE}/scan/cdp-lldp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to run CDP/LLDP scan');
  return res.json();
}

export async function pingAllDevices(): Promise<{ message: string; results: any[] }> {
  const res = await fetch(`${API_BASE}/ping-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to ping devices');
  return res.json();
}

export async function pingDevice(id: string): Promise<{ device: Device; ping_result: any }> {
  const res = await fetch(`${API_BASE}/ping/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to ping device');
  return res.json();
}

export async function pingHost(host: string, count: number = 2, timeout: number = 2): Promise<{ success: boolean; latency_ms?: number; packet_loss?: number; message?: string; output?: string; is_online?: boolean }> {
  const res = await fetch(`${API_BASE}/tools/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, count, timeout }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Ping failed' }));
    throw new Error(err.error || err.message || 'Ping failed');
  }
  return res.json();
}

export async function fetchVlans(): Promise<{ vlans: VlanInfo[] }> {
  const res = await fetch(`${API_BASE}/vlans`);
  if (!res.ok) throw new Error('Failed to fetch VLANs');
  return res.json();
}

export async function fetchDeviceVlans(deviceId: string): Promise<{ vlans: VlanInfo[]; device_id?: string; device_name?: string }> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/vlans`);
  if (!res.ok) throw new Error('Failed to fetch device VLANs');
  return res.json();
}

export async function resetDemoData(): Promise<any> {
  const res = await fetch(`${API_BASE}/reset-demo`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset demo');
  return res.json();
}

export async function fetchTemplates(): Promise<{ templates: ConfigTemplate[]; total: number }> {
  const res = await fetch(`${API_BASE}/templates`);
  if (!res.ok) throw new Error('Failed to fetch templates');
  return res.json();
}

export async function fetchTemplate(id: string): Promise<{ template: ConfigTemplate }> {
  const res = await fetch(`${API_BASE}/templates/${id}`);
  if (!res.ok) throw new Error('Failed to fetch template');
  return res.json();
}

export async function createTemplate(template: Partial<ConfigTemplate>): Promise<{ template: ConfigTemplate; message: string }> {
  const res = await fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
  if (!res.ok) throw new Error('Failed to create template');
  return res.json();
}

export async function updateTemplate(
  id: string,
  updates: Partial<ConfigTemplate>
): Promise<{ template: ConfigTemplate; message: string }> {
  const res = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update template');
  return res.json();
}

export async function deleteTemplate(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete template');
  return res.json();
}

export async function applyTemplateToDevice(params: {
  device_id: string;
  template_id: string;
  resolved_variables: Record<string, string | number>;
}): Promise<TemplateApplyResult> {
  const res = await fetch(`${API_BASE}/templates/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to apply template to device');
  }
  return res.json();
}

export async function extractConfigFromDevice(
  params: DeviceConfigExtractRequest
): Promise<DeviceConfigExtractResult> {
  const res = await fetch(`${API_BASE}/templates/extract-from-device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'خطا در اتصال به تجهیز و استخراج کانفیگ');
  }
  return res.json();
}

export async function sshConnect(params: {
  host: string;
  port?: number;
  username?: string;
  password?: string;
  enable_password?: string;
  deviceId?: string;
  protocol?: 'ssh' | 'telnet';
  timeout?: number;
}): Promise<{
  success: boolean;
  sessionId?: string;
  session_id?: string;
  mode: 'real_ssh' | 'unreachable';
  isReal?: boolean;
  banner?: string;
  cipher?: string;
  latency_ms?: number;
  error?: string;
  code?: string;
  message?: string;
}> {
  const res = await fetch(`${API_BASE}/ssh/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function sshExecute(params: {
  deviceId?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  command: string;
  sessionId?: string;
  timeout?: number;
}): Promise<{
  success: boolean;
  output: string;
  isReal: boolean;
  exitCode?: number;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/ssh/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function sshDisconnect(params: {
  sessionId?: string;
  deviceId?: string;
  host?: string;
  port?: number;
}): Promise<{
  success: boolean;
  closed_sessions?: string[];
  message: string;
}> {
  const res = await fetch(`${API_BASE}/ssh/disconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function fetchActiveSshSessions(): Promise<{
  total_active: number;
  sessions: Array<{
    session_id: string;
    sessionId: string;
    host: string;
    port: number;
    username: string;
    device_id?: string;
    mode: string;
    is_real: boolean;
    connected_at: string;
    last_activity: number;
    latency_ms: number;
    status: string;
    banner: string;
  }>;
}> {
  const res = await fetch(`${API_BASE}/ssh/sessions`);
  if (!res.ok) throw new Error('Failed to fetch active SSH sessions');
  return res.json();
}

// ---------------------------------------------------------------------------
// Settings & Access Control (Device Groups, Active Directory & RBAC) APIs
// ---------------------------------------------------------------------------

export async function fetchDeviceGroups(): Promise<{ groups: DeviceGroup[]; total: number }> {
  const res = await fetch(`${API_BASE}/device-groups`);
  if (!res.ok) throw new Error('Failed to fetch device groups');
  return res.json();
}

export async function saveDeviceGroupsApi(groups: DeviceGroup[]): Promise<{ success: boolean; groups: DeviceGroup[] }> {
  const res = await fetch(`${API_BASE}/device-groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groups }),
  });
  if (!res.ok) throw new Error('Failed to save device groups');
  return res.json();
}

export async function fetchActiveDirectoryConfig(): Promise<{ config: ActiveDirectoryConfig }> {
  const res = await fetch(`${API_BASE}/active-directory`);
  if (!res.ok) throw new Error('Failed to fetch active directory config');
  return res.json();
}

export async function saveActiveDirectoryConfigApi(config: ActiveDirectoryConfig): Promise<{ success: boolean; config: ActiveDirectoryConfig }> {
  const res = await fetch(`${API_BASE}/active-directory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  });
  if (!res.ok) throw new Error('Failed to save active directory config');
  return res.json();
}

export async function testActiveDirectoryConnectionApi(config: ActiveDirectoryConfig): Promise<{
  success: boolean;
  latency_ms: number;
  message: string;
  serverBanner: string;
  logs: string[];
}> {
  const res = await fetch(`${API_BASE}/active-directory/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  });
  if (!res.ok) throw new Error('Active directory test probe failed');
  return res.json();
}

export async function fetchAccessPolicies(): Promise<{ policies: AccessPolicy[]; total: number }> {
  const res = await fetch(`${API_BASE}/access-policies`);
  if (!res.ok) throw new Error('Failed to fetch access policies');
  return res.json();
}

export async function saveAccessPoliciesApi(policies: AccessPolicy[]): Promise<{ success: boolean; policies: AccessPolicy[] }> {
  const res = await fetch(`${API_BASE}/access-policies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ policies }),
  });
  if (!res.ok) throw new Error('Failed to save access policies');
  return res.json();
}

// -------------------------------------------------------------
// MikroTik VPN Management Suite APIs
// -------------------------------------------------------------

export async function fetchMikroTikVPNCapabilities(deviceId: string): Promise<import('../types').MikroTikVPNCapabilities> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/vpn/capabilities`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch VPN capabilities');
  }
  return res.json();
}

export async function fetchMikroTikVPNList(deviceId: string): Promise<{
  device_id: string;
  platform: string;
  connection_mode: string;
  is_real: boolean;
  total: number;
  vpns: import('../types').MikroTikVPNItem[];
}> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/vpn`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to query VPN status (${res.status})`);
  }
  return res.json();
}

export async function validateMikroTikVPN(
  deviceId: string,
  vpnType: string,
  mode: string,
  config: Record<string, any>
): Promise<import('../types').VPNValidationResult> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/vpn/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vpn_type: vpnType, mode, config }),
  });
  const data = await res.json().catch(() => ({ valid: false, errors: ['Request failed'], warnings: [] }));
  return data;
}

export async function previewMikroTikVPN(
  deviceId: string,
  vpnType: string,
  mode: string,
  config: Record<string, any>
): Promise<import('../types').VPNPreviewResult> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/vpn/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vpn_type: vpnType, mode, config }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.errors?.join(', ') || 'Failed to generate VPN configuration preview');
  }
  return res.json();
}

export async function applyMikroTikVPN(
  deviceId: string,
  vpnType: string,
  mode: string,
  config: Record<string, any>,
  userRole?: string
): Promise<import('../types').VPNApplyResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (userRole) {
    headers['X-User-Role'] = userRole;
  }
  const res = await fetch(`${API_BASE}/devices/${deviceId}/vpn/apply`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ vpn_type: vpnType, mode, config, user_role: userRole }),
  });
  const data = await res.json().catch(() => ({ success: false, error: 'Failed to parse response' }));
  if (!res.ok && data.success === undefined) {
    data.success = false;
  }
  return data;
}

export async function verifyMikroTikVPN(
  deviceId: string,
  vpnId: string,
  vpnType?: string,
  config?: Record<string, any>
): Promise<import('../types').VPNVerificationDetails> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/vpn/${encodeURIComponent(vpnId)}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vpn_type: vpnType, config }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Verification query failed on router');
  }
  return res.json();
}

export async function deleteMikroTikVPN(
  deviceId: string,
  vpnId: string,
  vpnType?: string,
  userRole?: string
): Promise<import('../types').VPNDeleteResult> {
  const headers: Record<string, string> = {};
  if (userRole) {
    headers['X-User-Role'] = userRole;
  }
  const q = vpnType ? `?vpn_type=${encodeURIComponent(vpnType)}` : '';
  const res = await fetch(`${API_BASE}/devices/${deviceId}/vpn/${encodeURIComponent(vpnId)}${q}`, {
    method: 'DELETE',
    headers,
  });
  const data = await res.json().catch(() => ({ success: false, message: 'Delete request failed' }));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to delete VPN configuration from router');
  }
  return data;
}

