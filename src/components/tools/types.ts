export type NetworkToolId =
  | 'ip_subnetting'
  | 'password_gen'
  | 'port_scanner'
  | 'net_utils'
  | 'trace_tools'
  | 'cert_lookup'
  | 'header_analyzer'
  | 'ups_calculator'
  | 'host_checker';

export interface ActiveToolState {
  id: NetworkToolId;
  isMinimized: boolean;
  labelEn: string;
  labelFa: string;
  badge?: string;
}

export interface CheckHostNodeMeta {
  countryCode: string;
  countryName: string;
  city: string;
  ip: string;
  asn: string;
}

export type PingItem =
  | ['OK', number, string?]
  | ['TIMEOUT', number?, string?]
  | ['MALFORMED', number?, string?]
  | null;

export interface NodeCheckResult {
  nodeKey: string;
  meta: CheckHostNodeMeta;
  status: 'pending' | 'ok' | 'partial_loss' | 'timeout' | 'dns_error';
  pings: PingItem[];
  resolvedIp?: string;
  sentCount: number;
  receivedCount: number;
  packetLossPercent: number;
  avgLatencyMs?: number;
  minLatencyMs?: number;
  maxLatencyMs?: number;
}

