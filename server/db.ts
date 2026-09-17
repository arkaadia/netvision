import { Pool, PoolConfig, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { hashPassword } from './auth';

const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

// Load environment variables from candidate paths
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(currentDir, '.env'),
  path.resolve(currentDir, '..', '.env'),
  '/opt/nettopology/.env',
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
dotenv.config();

export interface DbStatus {
  connected: boolean;
  engine: 'postgresql' | 'fallback_json';
  host: string;
  port: number;
  database: string;
  user: string;
  tablesCount?: number;
  usersCount?: number;
  devicesCount?: number;
  customMapsCount?: number;
  error?: string | null;
  lastChecked: string;
}

export function getDbConfig(): PoolConfig {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 20,
    };
  }

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database = process.env.DB_NAME || 'nettopology_db';
  const user = process.env.DB_USER || 'nettopology_user';
  const password = process.env.DB_PASSWORD || '';

  return {
    host,
    port,
    database,
    user,
    password,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 20,
  };
}

let pool: Pool | null = null;
let isPostgresReady = false;
let lastError: string | null = null;

export async function ensurePostgresConnection(): Promise<boolean> {
  if (isPostgresReady && pool) {
    try {
      const pingClient = await pool.connect();
      pingClient.release();
      return true;
    } catch {
      isPostgresReady = false;
    }
  }

  try {
    const config = getDbConfig();
    if (!pool) {
      pool = new Pool(config);
      pool.on('error', (err) => {
        console.error('[PostgreSQL Pool Unexpected Error]', err);
        isPostgresReady = false;
      });
    }

    const client = await pool.connect();
    client.release();
    isPostgresReady = true;
    lastError = null;
    return true;
  } catch (err: any) {
    isPostgresReady = false;
    lastError = err.message || 'PostgreSQL not reachable';
    return false;
  }
}

// Local persistent file fallback (used if PostgreSQL is offline or unprovisioned)
const FALLBACK_FILE = path.join(process.cwd(), 'backend', 'database_store.json');

interface FallbackStore {
  users: any[];
  user_groups: any[];
  access_policies: any[];
  devices: any[];
  device_groups: any[];
  custom_maps: any[];
  topology_hierarchy: any[];
  node_positions: Record<string, Record<string, { x: number; y: number }>>;
  audit_logs: any[];
  ad_config: any;
  device_sticky_notes?: any[];
}

function loadInitialDevices(): any[] {
  try {
    const netPath = path.join(process.cwd(), 'backend', 'network_data.json');
    if (fs.existsSync(netPath)) {
      const parsed = JSON.parse(fs.readFileSync(netPath, 'utf-8'));
      if (Array.isArray(parsed.devices) && parsed.devices.length > 0) {
        return parsed.devices;
      }
    }
  } catch (e) {
    console.error('[DB] Failed to load devices from network_data.json', e);
  }
  return [];
}

const DEFAULT_USER_GROUPS = [
  {
    id: 'group-admin',
    name: 'مدیران ارشد شبکه (Super Administrators)',
    description: 'دسترسی نامحدود به تمامی منابع، نقشه‌ها، پیکربندی تجهیزات و احراز هویت',
    color: 'indigo',
    member_user_ids: ['user-admin'],
    is_builtin: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'group-noc',
    name: 'تیم پایش و عملیات NOC (NOC Operations)',
    description: 'پایش برخط وضعیت لینک‌ها، اجرای ابزارهای عیب‌یابی و مشاهده نقشه‌ها',
    color: 'cyan',
    member_user_ids: ['user-noc'],
    is_builtin: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'group-helpdesk-ops',
    name: 'کارشناسان پشتیبانی و هلپ‌دسک (Helpdesk Support)',
    description: 'پشتیبانی کاربران محلی، بررسی پورت‌ها و خطایابی کلاینت‌های شبکه',
    color: 'emerald',
    member_user_ids: ['user-helpdesk'],
    is_builtin: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'group-readonly',
    name: 'ناظران و مانیتورینگ فقط-خواندنی (Read-Only Auditors)',
    description: 'مشاهده گزارشات، نقشه‌های عمومی و ممیزی سیستم بدون امکان اعمال تغییرات',
    color: 'amber',
    member_user_ids: [],
    is_builtin: false,
    created_at: new Date().toISOString()
  }
];

const DEFAULT_ACCESS_POLICIES = [
  {
    id: 'policy-full',
    name: 'دسترسی کامل مدیریتی (Full Admin Policy)',
    description: 'دسترسی بی‌قید و شرط به تمام ماژول‌ها، تجهیزات، نقشه‌ها و تنظیمات',
    priority: 1,
    is_builtin: true,
    policy_data: {
      devices: ['*'],
      maps: ['*'],
      actions: ['create', 'read', 'update', 'delete', 'execute', 'manage'],
      modules: ['all']
    },
    created_at: new Date().toISOString()
  },
  {
    id: 'policy-operator',
    name: 'عملیات استاندارد شبکه (Network Operator Policy)',
    description: 'امکان اجرای دستورات عیب‌یابی، مشاهده توپولوژی و ایجاد نقشه‌های اختصاصی',
    priority: 10,
    is_builtin: false,
    policy_data: {
      devices: ['*'],
      maps: ['read', 'create_own'],
      actions: ['read', 'ping', 'traceroute', 'check_port'],
      modules: ['topology', 'tools', 'devices']
    },
    created_at: new Date().toISOString()
  },
  {
    id: 'policy-helpdesk',
    name: 'خطایابی هلپ‌دسک (Helpdesk Diagnostics Policy)',
    description: 'مشاهده وضعیت تجهیزات لایه دسترسی و اجرای ابزارهای پایه مانیتورینگ',
    priority: 20,
    is_builtin: false,
    policy_data: {
      devices: ['type:switch', 'role:Access Switch'],
      maps: ['read_public'],
      actions: ['read', 'ping', 'port_status'],
      modules: ['topology', 'tools']
    },
    created_at: new Date().toISOString()
  },
  {
    id: 'policy-readonly',
    name: 'سیاست فقط-خواندنی (Read-Only Observer Policy)',
    description: 'صرفاً مشاهده وضعیت کلی شبکه و نقشه‌های پابلیک',
    priority: 30,
    is_builtin: false,
    policy_data: {
      devices: ['*'],
      maps: ['read_public'],
      actions: ['read'],
      modules: ['topology']
    },
    created_at: new Date().toISOString()
  }
];

const DEFAULT_DEVICE_GROUPS = [
  {
    id: 'devgroup-core',
    name: 'سوییچ‌های لایه هسته و توزیع (Core & Distribution)',
    description: 'سوییچ‌های پرسرعت Catalyst و Nexus مسئول ترافیک اصلی ستون‌فقرات',
    color: 'indigo',
    icon: 'Layers',
    device_ids: ['dev-core-01', 'dev-dist-01', 'dev-core-02'],
    created_at: new Date().toISOString()
  },
  {
    id: 'devgroup-access',
    name: 'سوییچ‌های لایه دسترسی (Access Layer Switches)',
    description: 'سوییچ‌های ارتباط دهنده کلاینت‌ها، ایستگاه‌های کاری و اکسس‌پوینت‌ها',
    color: 'emerald',
    icon: 'Server',
    device_ids: ['dev-acc-01', 'dev-acc-02', 'dev-acc-03'],
    created_at: new Date().toISOString()
  },
  {
    id: 'devgroup-routers',
    name: 'روترها و لبه شبکه WAN (Edge & Gateways)',
    description: 'تجهیزات مرزی مسیریابی، گیت‌وی اینترنت و تانل‌های VPN',
    color: 'cyan',
    icon: 'Radio',
    device_ids: ['dev-router-gw', 'dev-wan-gw'],
    created_at: new Date().toISOString()
  }
];

const DEFAULT_HIERARCHY = [
  {
    id: 'bldg-central',
    type: 'building',
    name: 'ساختمان مرکزی (Central Bldg)',
    description: 'ساختمان اداری مرکزی و دیتاسنتر اصلی سازمان',
    parentId: null,
    metadata: { address: 'تهران، خیابان ولیعصر', floorsCount: 4 }
  },
  {
    id: 'bldg-west',
    type: 'building',
    name: 'شعبه غرب (West Branch)',
    description: 'ساختمان پشتیبان و شعبه توسعه نرم‌افزار',
    parentId: null,
    metadata: { address: 'شعبه غرب، پارک فناوری', floorsCount: 2 }
  },
  {
    id: 'floor-dc',
    type: 'floor',
    name: 'مرکز داده (DC Floor)',
    description: 'طبقه زیرهمکف اختصاصی مرکز داده و رک‌های سرور',
    parentId: 'bldg-central',
    metadata: { securityLevel: 'High', cooling: 'Precision AC' }
  },
  {
    id: 'floor-1',
    type: 'floor',
    name: 'طبقه ۱ (Floor 1)',
    description: 'طبقه اداری و اتاق کارشناسان شبکه',
    parentId: 'bldg-central',
    metadata: { usersCount: 45 }
  },
  {
    id: 'unit-server-room',
    type: 'unit',
    name: 'اتاق سرور اصلی (Main Server Room)',
    description: 'اتاق سرور مرکزی مجهز به سیستم اطفا حریق و کنترل تردد',
    parentId: 'floor-dc',
    metadata: { doorAccess: 'Biometric' }
  },
  {
    id: 'unit-idf-1',
    type: 'unit',
    name: 'اتاق رک طبقه ۱ (IDF-1)',
    description: 'رک‌های توزیع طبقه اول برای کلاینت‌ها',
    parentId: 'floor-1',
    metadata: {}
  },
  {
    id: 'rack-a01',
    type: 'rack',
    name: 'Rack-A01 (Core & WAN)',
    description: 'رک اختصاصی تجهیزات Core و Edge سازمان',
    parentId: 'unit-server-room',
    metadata: { totalU: 42, usedU: 14 }
  },
  {
    id: 'rack-a02',
    type: 'rack',
    name: 'Rack-A02 (Distribution)',
    description: 'رک سوییچ‌های لایه توزیع و ارتباطی شعب',
    parentId: 'unit-server-room',
    metadata: { totalU: 42, usedU: 10 }
  },
  {
    id: 'rack-b01',
    type: 'rack',
    name: 'Rack-B01 (Access Floor 1)',
    description: 'رک توزیع کابلی طبقه ۱',
    parentId: 'unit-idf-1',
    metadata: { totalU: 24, usedU: 8 }
  }
];

const DEFAULT_CUSTOM_MAPS = [
  {
    id: 'map-enterprise-core',
    name: 'شبکه ستون‌فقرات و دیتاسنتر (Backbone & Datacenter)',
    description: 'نقشه توپولوژی ارتباطی سوییچ‌های Core، روتر مرزی و سوییچ‌های توزیع',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deviceIds: ['dev-router-gw', 'dev-core-01', 'dev-dist-01', 'dev-acc-01', 'dev-acc-02'],
    devicePositions: {
      'dev-router-gw': { x: 480, y: 80 },
      'dev-core-01': { x: 480, y: 240 },
      'dev-dist-01': { x: 240, y: 420 },
      'dev-acc-01': { x: 120, y: 620 },
      'dev-acc-02': { x: 360, y: 620 }
    },
    links: [
      {
        id: 'link-gw-core',
        sourceDeviceId: 'dev-router-gw',
        targetDeviceId: 'dev-core-01',
        sourceInterface: 'GigabitEthernet0/0/0',
        targetInterface: 'FortyGigE1/0/1',
        color: '#3b82f6',
        type: 'fiber',
        speed: '40Gbps',
        status: 'connected'
      },
      {
        id: 'link-core-dist',
        sourceDeviceId: 'dev-core-01',
        targetDeviceId: 'dev-dist-01',
        sourceInterface: 'TenGigE1/0/1',
        targetInterface: 'TenGigE1/1/1',
        color: '#10b981',
        type: 'fiber',
        speed: '10Gbps',
        status: 'connected'
      },
      {
        id: 'link-dist-acc1',
        sourceDeviceId: 'dev-dist-01',
        targetDeviceId: 'dev-acc-01',
        sourceInterface: 'GigabitEthernet1/0/1',
        targetInterface: 'GigabitEthernet0/1',
        color: '#6366f1',
        type: 'copper',
        speed: '1Gbps',
        status: 'connected'
      },
      {
        id: 'link-dist-acc2',
        sourceDeviceId: 'dev-dist-01',
        targetDeviceId: 'dev-acc-02',
        sourceInterface: 'GigabitEthernet1/0/2',
        targetInterface: 'GigabitEthernet0/1',
        color: '#6366f1',
        type: 'copper',
        speed: '1Gbps',
        status: 'connected'
      }
    ],
    visibility: 'public',
    ownerId: 'user-admin',
    ownerName: 'admin',
    allowedUsers: []
  }
];

const DEFAULT_NODE_POSITIONS: Record<string, Record<string, { x: number; y: number }>> = {
  default: {
    'dev-router-gw': { x: 480, y: 80 },
    'dev-core-01': { x: 480, y: 240 },
    'dev-dist-01': { x: 240, y: 420 },
    'dev-core-02': { x: 720, y: 420 },
    'dev-acc-01': { x: 120, y: 620 },
    'dev-acc-02': { x: 360, y: 620 },
    'dev-acc-03': { x: 600, y: 620 },
    'dev-wan-gw': { x: 840, y: 620 }
  }
};

const DEFAULT_AD_CONFIG = {
  domain: 'corp.internal',
  server: '192.168.1.10',
  port: 389,
  use_ssl: false,
  base_dn: 'DC=corp,DC=internal',
  bind_user: 'CN=ldap_service,OU=ServiceAccounts,DC=corp,DC=internal',
  bind_password: 'encrypted_service_pass_2026',
  sync_interval_min: 15,
  auto_sync: true,
  role_mappings: {
    'Domain Admins': 'Super Administrator',
    'Network Engineers': 'NOC Analyst',
    'Helpdesk Staff': 'Helpdesk Specialist'
  },
  last_sync: new Date().toISOString(),
  status: 'configured'
};

function loadFallbackStore(): FallbackStore {
  let store: any = null;
  try {
    if (fs.existsSync(FALLBACK_FILE)) {
      const raw = fs.readFileSync(FALLBACK_FILE, 'utf-8');
      store = JSON.parse(raw);
    }
  } catch (err) {
    console.error('[DB Fallback] Error reading fallback store:', err);
  }

  const defaultAdminHash = hashPassword('admin123', 'seed_salt_admin_2026');
  const defaultHelpdeskHash = hashPassword('helpdesk123', 'seed_salt_helpdesk_2026');
  const defaultNocHash = hashPassword('noc123', 'seed_salt_noc_2026');

  const defaultUsers = [
    {
      id: 'user-admin',
      username: 'admin',
      password_hash: defaultAdminHash.hash,
      password_salt: defaultAdminHash.salt,
      full_name: 'مدیر ارشد شبکه (Network Administrator)',
      email: 'admin@nettopology.internal',
      role: 'Super Administrator',
      user_type: 'local',
      status: 'active',
      group_ids: ['group-admin'],
      is_builtin: true,
      created_at: '2026-09-14T00:00:00.000Z',
      last_login: new Date().toISOString()
    },
    {
      id: 'user-helpdesk',
      username: 'helpdesk_user',
      password_hash: defaultHelpdeskHash.hash,
      password_salt: defaultHelpdeskHash.salt,
      full_name: 'کاربر هلپ‌دسک محلی (Helpdesk Local)',
      email: 'helpdesk@nettopology.internal',
      role: 'Helpdesk Specialist',
      user_type: 'local',
      status: 'active',
      group_ids: ['group-helpdesk-ops'],
      is_builtin: false,
      created_at: '2026-09-14T00:00:00.000Z',
      last_login: null
    },
    {
      id: 'user-noc',
      username: 'noc_operator',
      password_hash: defaultNocHash.hash,
      password_salt: defaultNocHash.salt,
      full_name: 'اپراتور محلی NOC (Local NOC)',
      email: 'noc@nettopology.internal',
      role: 'NOC Analyst',
      user_type: 'local',
      status: 'active',
      group_ids: ['group-noc'],
      is_builtin: false,
      created_at: '2026-09-14T00:00:00.000Z',
      last_login: null
    }
  ];

  if (!store || typeof store !== 'object') {
    store = {};
  }

  if (Array.isArray(store.users)) {
    // Sanitize and filter out invalid/corrupted records that lack username
    store.users = store.users.filter(
      (u) => u && typeof u.username === 'string' && u.username.trim().length > 0
    );
  }
  if (!Array.isArray(store.users) || store.users.length === 0) {
    store.users = defaultUsers;
  }
  if (!Array.isArray(store.user_groups) || store.user_groups.length === 0) {
    store.user_groups = DEFAULT_USER_GROUPS;
  }
  if (!Array.isArray(store.access_policies) || store.access_policies.length === 0) {
    store.access_policies = DEFAULT_ACCESS_POLICIES;
  }
  if (!Array.isArray(store.devices) || store.devices.length === 0) {
    store.devices = loadInitialDevices();
  }
  if (!Array.isArray(store.device_groups) || store.device_groups.length === 0) {
    store.device_groups = DEFAULT_DEVICE_GROUPS;
  }
  if (!Array.isArray(store.custom_maps) || store.custom_maps.length === 0) {
    store.custom_maps = DEFAULT_CUSTOM_MAPS;
  }
  if (!Array.isArray(store.topology_hierarchy) || store.topology_hierarchy.length === 0) {
    store.topology_hierarchy = DEFAULT_HIERARCHY;
  }
  if (!store.node_positions || Object.keys(store.node_positions).length === 0) {
    store.node_positions = DEFAULT_NODE_POSITIONS;
  }
  if (!store.ad_config) {
    store.ad_config = DEFAULT_AD_CONFIG;
  }
  if (!Array.isArray(store.device_sticky_notes)) {
    store.device_sticky_notes = [];
  }
  if (!Array.isArray(store.audit_logs)) {
    store.audit_logs = [
      {
        id: `audit-init-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_name: 'System',
        action: 'Database Initialization',
        category: 'system',
        target: 'PostgreSQL Core',
        status: 'success',
        details: 'Enterprise PostgreSQL schemas & fallback tables initialized successfully.',
        ip_address: '127.0.0.1',
        user_agent: 'NetTopology Backend Service'
      }
    ];
  }

  return store;
}

function saveFallbackStore(data: FallbackStore): void {
  try {
    fs.mkdirSync(path.dirname(FALLBACK_FILE), { recursive: true });
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB Fallback] Error saving fallback store:', err);
  }
}

/**
 * Synchronize all entities from fallback store to PostgreSQL if PostgreSQL is missing records
 */
async function syncFallbackToPostgres(client: PoolClient, initialData: FallbackStore): Promise<void> {
  // 1. Sync Users
  try {
    const existingUsersRes = await client.query('SELECT id, username FROM users');
    const existingUsernames = new Set(existingUsersRes.rows.map((r: any) => (r.username || '').toLowerCase()));
    const existingIds = new Set(existingUsersRes.rows.map((r: any) => r.id));

    for (const u of initialData.users) {
      if (!u || !u.username) continue;
      const cleanUser = u.username.toLowerCase();
      if (!existingUsernames.has(cleanUser) && !existingIds.has(u.id)) {
        await client.query(
          `INSERT INTO users (id, username, password_hash, password_salt, full_name, email, role, user_type, status, group_ids, is_builtin, created_at, last_login)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (id) DO UPDATE SET
             username = EXCLUDED.username,
             full_name = EXCLUDED.full_name,
             email = EXCLUDED.email,
             role = EXCLUDED.role,
             user_type = EXCLUDED.user_type,
             status = EXCLUDED.status,
             group_ids = EXCLUDED.group_ids,
             is_builtin = EXCLUDED.is_builtin`,
          [
            u.id || `user-sync-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            u.username,
            u.password_hash || '',
            u.password_salt || '',
            (u.full_name || u.fullName || u.username).trim(),
            (u.email || `${cleanUser}@nettopology.internal`).trim(),
            u.role || 'Super Administrator',
            u.user_type || u.userType || 'local',
            u.status || 'active',
            JSON.stringify(u.group_ids || u.groupIds || []),
            Boolean(u.is_builtin ?? u.isBuiltin),
            u.created_at || u.createdAt || new Date().toISOString(),
            u.last_login || u.lastLogin || null,
          ]
        );
      }
    }
  } catch (err: any) {
    console.warn('[Database Sync Notice] Users sync notice:', err.message);
  }

  // 2. Sync Custom Maps
  try {
    const existingMapsRes = await client.query('SELECT id FROM custom_maps');
    const existingMapIds = new Set(existingMapsRes.rows.map((r: any) => r.id));
    const mapsToSync = (initialData.custom_maps && initialData.custom_maps.length > 0)
      ? initialData.custom_maps
      : DEFAULT_CUSTOM_MAPS;

    for (const m of mapsToSync) {
      if (!m || !m.id) continue;
      if (!existingMapIds.has(m.id)) {
        await client.query(
          `INSERT INTO custom_maps (
             id, name, description, map_type, nodes, connections, viewport, metadata, visibility, owner_id, owner_name, allowed_users, map_data, created_at, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             map_type = EXCLUDED.map_type,
             nodes = EXCLUDED.nodes,
             connections = EXCLUDED.connections,
             viewport = EXCLUDED.viewport,
             metadata = EXCLUDED.metadata,
             visibility = EXCLUDED.visibility,
             owner_id = EXCLUDED.owner_id,
             owner_name = EXCLUDED.owner_name,
             allowed_users = EXCLUDED.allowed_users,
             map_data = EXCLUDED.map_data,
             updated_at = EXCLUDED.updated_at`,
          [
            m.id,
            m.name || 'Untitled Map',
            m.description || '',
            m.type || m.map_type || 'schematic',
            JSON.stringify(m.devicePositions || m.nodes || {}),
            JSON.stringify(m.links || m.connections || []),
            JSON.stringify(m.viewport || { zoom: 1, pan: { x: 0, y: 0 } }),
            JSON.stringify(m.metadata || {}),
            m.visibility || 'public',
            m.ownerId || m.owner_id || 'user-admin',
            m.ownerName || m.owner_name || 'admin',
            JSON.stringify(m.allowedUsers || m.allowed_users || []),
            JSON.stringify(m),
            m.createdAt || m.created_at ? new Date(m.createdAt || m.created_at) : new Date(),
            new Date(),
          ]
        );
      }
    }
  } catch (err: any) {
    console.warn('[Database Sync Notice] Custom Maps sync notice:', err.message);
  }

  // 3. Sync User Groups
  try {
    const groupCountRes = await client.query('SELECT count(*) as count FROM user_groups');
    if (parseInt(groupCountRes.rows[0]?.count || '0', 10) === 0) {
      const groupsToSeed = (initialData.user_groups && initialData.user_groups.length > 0)
        ? initialData.user_groups
        : DEFAULT_USER_GROUPS;
      for (const g of groupsToSeed) {
        await client.query(
          `INSERT INTO user_groups (id, name, description, color, member_user_ids, is_builtin, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [g.id, g.name, g.description, g.color, JSON.stringify(g.memberUserIds || g.member_user_ids || []), g.isBuiltin ?? g.is_builtin ?? false, g.created_at || new Date().toISOString()]
        );
      }
    }
  } catch (err: any) {
    console.warn('[Database Sync Notice] User Groups sync notice:', err.message);
  }

  // 4. Sync Access Policies
  try {
    const policyCountRes = await client.query('SELECT count(*) as count FROM access_policies');
    if (parseInt(policyCountRes.rows[0]?.count || '0', 10) === 0) {
      const policiesToSeed = (initialData.access_policies && initialData.access_policies.length > 0)
        ? initialData.access_policies
        : DEFAULT_ACCESS_POLICIES;
      for (const p of policiesToSeed) {
        await client.query(
          `INSERT INTO access_policies (id, name, description, priority, is_builtin, policy_data, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [p.id, p.name, p.description, p.priority || 100, p.isBuiltin ?? p.is_builtin ?? false, JSON.stringify(p.policyData || p.policy_data || {}), p.created_at || new Date().toISOString()]
        );
      }
    }
  } catch (err: any) {
    console.warn('[Database Sync Notice] Access Policies sync notice:', err.message);
  }

  // 5. Sync Devices
  try {
    const devCountRes = await client.query('SELECT count(*) as count FROM devices');
    if (parseInt(devCountRes.rows[0]?.count || '0', 10) === 0) {
      const devicesToSeed = (initialData.devices && initialData.devices.length > 0)
        ? initialData.devices
        : loadInitialDevices();
      for (const d of devicesToSeed) {
        await client.query(
          `INSERT INTO devices (id, name, ip, type, model, platform, role, connection_mode, ssh_host, ssh_port, ssh_username, is_online, latency_ms, mac_address, uptime_str, ports)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT (id) DO NOTHING`,
          [
            d.id,
            d.name,
            d.ip,
            d.type || 'switch',
            d.model || '',
            d.platform || 'cisco_ios_xe',
            d.role || '',
            d.connection_mode || 'simulator',
            d.ssh_host || d.ip,
            d.ssh_port || 22,
            d.ssh_username || 'admin',
            d.is_online !== undefined ? d.is_online : true,
            d.latency_ms || 1.5,
            d.mac || d.mac_address || '',
            d.uptime || '',
            JSON.stringify(d.ports || []),
          ]
        );
      }
    }
  } catch (err: any) {
    console.warn('[Database Sync Notice] Devices sync notice:', err.message);
  }

  // 6. Sync Device Groups
  try {
    const devGroupCountRes = await client.query('SELECT count(*) as count FROM device_groups');
    if (parseInt(devGroupCountRes.rows[0]?.count || '0', 10) === 0) {
      const devGroupsToSeed = (initialData.device_groups && initialData.device_groups.length > 0)
        ? initialData.device_groups
        : DEFAULT_DEVICE_GROUPS;
      for (const dg of devGroupsToSeed) {
        await client.query(
          `INSERT INTO device_groups (id, name, description, color, icon, device_ids)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [dg.id, dg.name, dg.description, dg.color, dg.icon, JSON.stringify(dg.deviceIds || dg.device_ids || [])]
        );
      }
    }
  } catch (err: any) {
    console.warn('[Database Sync Notice] Device Groups sync notice:', err.message);
  }

  // 7. Sync Topology Hierarchy
  try {
    const hierCountRes = await client.query('SELECT count(*) as count FROM topology_hierarchy');
    if (parseInt(hierCountRes.rows[0]?.count || '0', 10) === 0) {
      const hierToSeed = (initialData.topology_hierarchy && initialData.topology_hierarchy.length > 0)
        ? initialData.topology_hierarchy
        : DEFAULT_HIERARCHY;
      for (const h of hierToSeed) {
        await client.query(
          `INSERT INTO topology_hierarchy (id, type, parent_id, name, description, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [h.id, h.type, h.parentId || h.parent_id || null, h.name, h.description, JSON.stringify(h.metadata || {})]
        );
      }
    }
  } catch (err: any) {
    console.warn('[Database Sync Notice] Topology Hierarchy sync notice:', err.message);
  }

  // 8. Sync Node Positions
  try {
    const nodePosCountRes = await client.query('SELECT count(*) as count FROM node_positions');
    if (parseInt(nodePosCountRes.rows[0]?.count || '0', 10) === 0) {
      const defaultPositions = (initialData.node_positions && initialData.node_positions['default']) || DEFAULT_NODE_POSITIONS['default'];
      for (const [nodeId, coords] of Object.entries(defaultPositions)) {
        await client.query(
          `INSERT INTO node_positions (map_id, node_id, x, y)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (map_id, node_id) DO NOTHING`,
          ['default', nodeId, (coords as any).x, (coords as any).y]
        );
      }
    }
  } catch (err: any) {
    console.warn('[Database Sync Notice] Node Positions sync notice:', err.message);
  }

  // 9. Sync Active Directory Config
  try {
    const adRes = await client.query('SELECT count(*) as count FROM ad_config');
    if (parseInt(adRes.rows[0]?.count || '0', 10) === 0) {
      const adToSeed = initialData.ad_config || DEFAULT_AD_CONFIG;
      await client.query(
        `INSERT INTO ad_config (id, config_data) VALUES ('primary', $1) ON CONFLICT (id) DO NOTHING`,
        [JSON.stringify(adToSeed)]
      );
    }
  } catch (err: any) {
    console.warn('[Database Sync Notice] AD Config sync notice:', err.message);
  }

  // 10. Sync Device Sticky Notes
  try {
    if (Array.isArray(initialData.device_sticky_notes) && initialData.device_sticky_notes.length > 0) {
      for (const n of initialData.device_sticky_notes) {
        if (!n || !n.id || (!n.linkedDeviceId && !n.device_id)) continue;
        await client.query(
          `INSERT INTO device_sticky_notes (id, device_id, title, content, color, x, y, width, view_mode, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO NOTHING`,
          [
            n.id,
            n.linkedDeviceId || n.device_id,
            n.title || '',
            n.content || '',
            n.color || 'yellow',
            Number(n.x) || 100,
            Number(n.y) || 100,
            Number(n.width) || 230,
            n.viewMode || n.view_mode || 'card',
            n.createdAt || n.created_at || new Date().toISOString(),
            n.updatedAt || n.updated_at || new Date().toISOString(),
          ]
        );
      }
    }
  } catch (err: any) {
    console.warn('[Database Sync Notice] Device Sticky Notes sync notice:', err.message);
  }
}

/**
 * Initialize PostgreSQL connection pool and run migration if needed
 */
export async function initDatabase(): Promise<void> {
  // Ensure fallback store exists and is thoroughly populated first
  const initialData = loadFallbackStore();
  saveFallbackStore(initialData);

  // Attempt PostgreSQL initialization
  try {
    const config = getDbConfig();
    pool = new Pool(config);
    pool.on('error', (err) => {
      console.error('[PostgreSQL Pool Unexpected Error]', err);
      isPostgresReady = false;
    });

    const client = await pool.connect();
    console.log(`[Database] Successfully connected to PostgreSQL server on ${(config as any).host}:${(config as any).port}/${(config as any).database}`);

    // Read and run schema.sql statement by statement safely
    try {
      const schemaPath = path.join(process.cwd(), 'backend', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf-8');
        const statements = sql
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
          try {
            await client.query(statement);
          } catch (stmtErr: any) {
            // Ignore benign notices (e.g. relation already exists, extension privileges)
            if (
              !stmtErr.message.includes('already exists') &&
              !stmtErr.message.includes('extension') &&
              !stmtErr.message.includes('duplicate')
            ) {
              console.warn('[Database Schema Notice]', stmtErr.message);
            }
          }
        }
        console.log('[Database] PostgreSQL schema verification and migration completed.');
      }
    } catch (schemaErr: any) {
      console.warn('[Database Schema Warning]', schemaErr.message);
    }

    // Synchronize all fallback records into PostgreSQL
    await syncFallbackToPostgres(client, initialData);
    console.log('[Database] Fallback store synchronization to PostgreSQL completed successfully.');

    client.release();
    isPostgresReady = true;
    lastError = null;
  } catch (err: any) {
    isPostgresReady = false;
    lastError = err.message || 'PostgreSQL not available';
    console.warn(`[Database Notice] PostgreSQL is not reachable (${lastError}). Using robust file-backed store for persistence.`);
  }
}

/**
 * Manually trigger bidirectional database sync
 */
export async function syncDatabase(): Promise<DbStatus> {
  const connected = await ensurePostgresConnection();
  if (connected && pool) {
    const client = await pool.connect();
    try {
      const store = loadFallbackStore();
      await syncFallbackToPostgres(client, store);
    } finally {
      client.release();
    }
  }
  return getDbStatus();
}

/**
 * Get current database status and metrics
 */
export async function getDbStatus(): Promise<DbStatus> {
  const cfg = getDbConfig();
  const status: DbStatus = {
    connected: isPostgresReady,
    engine: isPostgresReady ? 'postgresql' : 'fallback_json',
    host: (cfg as any).host || '127.0.0.1',
    port: (cfg as any).port || 5432,
    database: (cfg as any).database || 'nettopology_db',
    user: (cfg as any).user || 'nettopology_user',
    lastChecked: new Date().toISOString(),
    error: lastError,
  };

  if (isPostgresReady && pool) {
    try {
      const client = await pool.connect();
      const tablesRes = await client.query(`
        SELECT count(*) as count FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      const usersRes = await client.query('SELECT count(*) as count FROM users');
      const devicesRes = await client.query('SELECT count(*) as count FROM devices');
      const mapsRes = await client.query('SELECT count(*) as count FROM custom_maps');
      client.release();

      status.tablesCount = parseInt(tablesRes.rows[0]?.count || '0', 10);
      status.usersCount = parseInt(usersRes.rows[0]?.count || '0', 10);
      status.devicesCount = parseInt(devicesRes.rows[0]?.count || '0', 10);
      status.customMapsCount = parseInt(mapsRes.rows[0]?.count || '0', 10);
    } catch (e: any) {
      status.connected = false;
      status.error = e.message;
    }
  } else {
    const store = loadFallbackStore();
    status.tablesCount = 11;
    status.usersCount = store.users.length;
    status.devicesCount = (store.devices || []).length;
    status.customMapsCount = store.custom_maps.length;
  }

  return status;
}

// -------------------------------------------------------------
// Users CRUD
// -------------------------------------------------------------
export async function findUserByUsername(username: string): Promise<any | null> {
  const cleanUser = (username || '').trim().toLowerCase();
  if (!cleanUser) return null;

  await ensurePostgresConnection();
  if (isPostgresReady && pool) {
    try {
      const res = await pool.query('SELECT * FROM users WHERE LOWER(username) = $1 LIMIT 1', [cleanUser]);
      if (res.rows.length > 0) return res.rows[0];
    } catch (e) {
      console.error('[DB Query Error in findUserByUsername]', e);
    }
  }

  const store = loadFallbackStore();
  return (
    store.users.find(
      (u) => u && typeof u.username === 'string' && u.username.toLowerCase() === cleanUser
    ) || null
  );
}

export async function getAllUsers(): Promise<any[]> {
  await ensurePostgresConnection();
  if (isPostgresReady && pool) {
    try {
      const res = await pool.query('SELECT id, username, full_name, email, role, user_type, status, group_ids, is_builtin, last_login, created_at FROM users ORDER BY created_at ASC');
      if (res.rows.length > 0) {
        return res.rows.map((r) => ({
          id: r.id,
          username: r.username,
          fullName: r.full_name,
          email: r.email,
          role: r.role,
          userType: r.user_type,
          status: r.status,
          groupIds: typeof r.group_ids === 'string' ? JSON.parse(r.group_ids) : r.group_ids,
          isBuiltin: r.is_builtin,
          lastLogin: r.last_login,
          createdAt: r.created_at,
        }));
      } else {
        // If PostgreSQL is connected but users table is empty, auto-sync from fallback store!
        const client = await pool.connect();
        try {
          const store = loadFallbackStore();
          await syncFallbackToPostgres(client, store);
          const secondRes = await client.query('SELECT id, username, full_name, email, role, user_type, status, group_ids, is_builtin, last_login, created_at FROM users ORDER BY created_at ASC');
          if (secondRes.rows.length > 0) {
            return secondRes.rows.map((r) => ({
              id: r.id,
              username: r.username,
              fullName: r.full_name,
              email: r.email,
              role: r.role,
              userType: r.user_type,
              status: r.status,
              groupIds: typeof r.group_ids === 'string' ? JSON.parse(r.group_ids) : r.group_ids,
              isBuiltin: r.is_builtin,
              lastLogin: r.last_login,
              createdAt: r.created_at,
            }));
          }
        } finally {
          client.release();
        }
      }
    } catch (e) {
      console.error('[DB Query Error in getAllUsers]', e);
    }
  }

  const store = loadFallbackStore();
  return store.users
    .filter((u) => u && typeof u.username === 'string' && u.username.trim().length > 0)
    .map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.full_name,
      email: u.email,
      role: u.role,
      userType: u.user_type,
      status: u.status,
      groupIds: u.group_ids || [],
      isBuiltin: u.is_builtin,
      lastLogin: u.last_login,
      createdAt: u.created_at,
    }));
}

export async function saveUser(userData: any): Promise<any> {
  if (!userData || typeof userData !== 'object') {
    throw new Error('Invalid user payload: Expected an object');
  }

  const rawUsername = (userData.username || '').trim();
  if (!rawUsername) {
    throw new Error('Username is required and cannot be empty');
  }

  const store = loadFallbackStore();
  const cleanUser = rawUsername.toLowerCase();
  const existingIndex = store.users.findIndex(
    (u) =>
      u &&
      typeof u.username === 'string' &&
      ((userData.id && u.id === userData.id) || u.username.toLowerCase() === cleanUser)
  );

  let userRecord: any;
  if (existingIndex >= 0) {
    const prev = store.users[existingIndex];
    let pwdHash = prev.password_hash;
    let pwdSalt = prev.password_salt;
    if (userData.password && String(userData.password).trim().length > 0) {
      const p = hashPassword(String(userData.password).trim());
      pwdHash = p.hash;
      pwdSalt = p.salt;
    }
    userRecord = {
      ...prev,
      username: rawUsername,
      password_hash: pwdHash,
      password_salt: pwdSalt,
      full_name: (userData.fullName || prev.full_name || rawUsername).trim(),
      email: (userData.email || prev.email || `${cleanUser}@nettopology.internal`).trim(),
      role: userData.role || prev.role || 'NOC Analyst',
      user_type: userData.userType || prev.user_type || 'local',
      status: userData.status || prev.status || 'active',
      group_ids: Array.isArray(userData.groupIds) ? userData.groupIds : (prev.group_ids || []),
      is_builtin: prev.is_builtin ?? Boolean(userData.isBuiltin),
      updated_at: new Date().toISOString(),
    };
  } else {
    // New user creation
    const plainPassword =
      userData.password && String(userData.password).trim().length > 0
        ? String(userData.password).trim()
        : 'welcome123';
    const p = hashPassword(plainPassword);
    userRecord = {
      id: userData.id || `user-${Date.now()}`,
      username: rawUsername,
      password_hash: p.hash,
      password_salt: p.salt,
      full_name: (userData.fullName || rawUsername).trim(),
      email: (userData.email || `${cleanUser}@nettopology.internal`).trim(),
      role: userData.role || 'NOC Analyst',
      user_type: userData.userType || 'local',
      status: userData.status || 'active',
      group_ids: Array.isArray(userData.groupIds) ? userData.groupIds : [],
      is_builtin: Boolean(userData.isBuiltin),
      last_login: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Update fallback store immediately
  if (existingIndex >= 0) {
    store.users[existingIndex] = { ...store.users[existingIndex], ...userRecord };
  } else {
    store.users.push(userRecord);
  }
  saveFallbackStore(store);

  // Persist to PostgreSQL with robust UPSERT
  await ensurePostgresConnection();
  if (isPostgresReady && pool) {
    try {
      const checkRes = await pool.query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR id = $2 LIMIT 1',
        [userRecord.username, userRecord.id]
      );

      if (checkRes.rows.length > 0) {
        const matchedId = checkRes.rows[0].id;
        userRecord.id = matchedId;
        await pool.query(
          `UPDATE users SET
             username = $1,
             password_hash = COALESCE($2, password_hash),
             password_salt = COALESCE($3, password_salt),
             full_name = $4,
             email = $5,
             role = $6,
             user_type = $7,
             status = $8,
             group_ids = $9,
             is_builtin = $10,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $11`,
          [
            userRecord.username,
            userRecord.password_hash,
            userRecord.password_salt,
            userRecord.full_name,
            userRecord.email,
            userRecord.role,
            userRecord.user_type,
            userRecord.status,
            JSON.stringify(userRecord.group_ids),
            userRecord.is_builtin,
            matchedId,
          ]
        );
        console.log(`[Database] Successfully updated user "${userRecord.username}" (ID: ${matchedId}) in PostgreSQL.`);
      } else {
        await pool.query(
          `INSERT INTO users (id, username, password_hash, password_salt, full_name, email, role, user_type, status, group_ids, is_builtin, last_login, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (id) DO UPDATE SET
             username = EXCLUDED.username,
             password_hash = EXCLUDED.password_hash,
             password_salt = EXCLUDED.password_salt,
             full_name = EXCLUDED.full_name,
             email = EXCLUDED.email,
             role = EXCLUDED.role,
             user_type = EXCLUDED.user_type,
             status = EXCLUDED.status,
             group_ids = EXCLUDED.group_ids,
             updated_at = EXCLUDED.updated_at`,
          [
            userRecord.id,
            userRecord.username,
            userRecord.password_hash,
            userRecord.password_salt,
            userRecord.full_name,
            userRecord.email,
            userRecord.role,
            userRecord.user_type,
            userRecord.status,
            JSON.stringify(userRecord.group_ids),
            userRecord.is_builtin,
            userRecord.last_login,
            userRecord.created_at,
            userRecord.updated_at,
          ]
        );
        console.log(`[Database] Successfully created new user "${userRecord.username}" in PostgreSQL users table.`);
      }
    } catch (e) {
      console.error('[DB Query Error in saveUser]', e);
    }
  }

  return {
    id: userRecord.id,
    username: userRecord.username,
    fullName: userRecord.full_name,
    email: userRecord.email,
    role: userRecord.role,
    userType: userRecord.user_type,
    status: userRecord.status,
    groupIds: userRecord.group_ids,
    isBuiltin: userRecord.is_builtin,
    lastLogin: userRecord.last_login,
    createdAt: userRecord.created_at,
    updatedAt: userRecord.updated_at,
  };
}

export async function saveUsersBatch(usersList: any[]): Promise<any[]> {
  if (!Array.isArray(usersList)) return [];
  const results: any[] = [];
  for (const item of usersList) {
    if (!item || typeof item !== 'object' || !item.username) continue;
    try {
      const saved = await saveUser(item);
      results.push(saved);
    } catch (err) {
      console.error('[DB saveUsersBatch item error]', err);
    }
  }
  return results;
}

export async function deleteUser(userIdOrUsername: string): Promise<boolean> {
  const target = (userIdOrUsername || '').trim().toLowerCase();
  if (!target || target === 'user-admin' || target === 'admin') {
    return false; // Root administrator cannot be deleted
  }

  const store = loadFallbackStore();
  const index = store.users.findIndex(
    (u) =>
      u &&
      typeof u.username === 'string' &&
      (u.id.toLowerCase() === target || u.username.toLowerCase() === target)
  );

  let deleted = false;
  if (index >= 0) {
    const deletedUser = store.users[index];
    if (deletedUser.is_builtin || deletedUser.username.toLowerCase() === 'admin') {
      return false;
    }
    store.users.splice(index, 1);
    saveFallbackStore(store);
    deleted = true;
  }

  await ensurePostgresConnection();
  if (isPostgresReady && pool) {
    try {
      await pool.query('DELETE FROM users WHERE LOWER(id) = $1 OR LOWER(username) = $1', [target]);
      console.log(`[Database] Successfully deleted user "${target}" from PostgreSQL.`);
      deleted = true;
    } catch (e) {
      console.error('[DB Query Error in deleteUser]', e);
    }
  }

  return deleted;
}

export async function updateLastLogin(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await ensurePostgresConnection();
  if (isPostgresReady && pool) {
    try {
      await pool.query('UPDATE users SET last_login = $1 WHERE id = $2', [now, userId]);
    } catch (e) {
      console.error('[DB Query Error in updateLastLogin]', e);
    }
  }
  const store = loadFallbackStore();
  const user = store.users.find((u) => u.id === userId);
  if (user) {
    user.last_login = now;
    saveFallbackStore(store);
  }
}

// -------------------------------------------------------------
// Custom Maps with Granular Access Control (Public, Private, Restricted)
// -------------------------------------------------------------
export interface MapUserFilter {
  userId?: string;
  username?: string;
  role?: string;
}

export async function getCustomMaps(userFilter?: MapUserFilter): Promise<any[]> {
  let allMaps: any[] = [];
  await ensurePostgresConnection();
  if (isPostgresReady && pool) {
    try {
      const res = await pool.query('SELECT * FROM custom_maps ORDER BY created_at ASC');
      if (res.rows.length === 0) {
        // If connected but table is empty, auto-sync from fallback store
        const client = await pool.connect();
        try {
          const store = loadFallbackStore();
          await syncFallbackToPostgres(client, store);
          const secondRes = await client.query('SELECT * FROM custom_maps ORDER BY created_at ASC');
          res.rows = secondRes.rows;
        } finally {
          client.release();
        }
      }

      allMaps = res.rows.map((r) => {
        const rawMapData = typeof r.map_data === 'string' ? JSON.parse(r.map_data) : (r.map_data || {});
        const allowedUsers = Array.isArray(r.allowed_users)
          ? r.allowed_users
          : (typeof r.allowed_users === 'string' ? JSON.parse(r.allowed_users) : (rawMapData.allowedUsers || []));

        return {
          devicePositions: rawMapData.devicePositions || (typeof r.nodes === 'string' ? JSON.parse(r.nodes) : r.nodes) || {},
          physicalPositions: rawMapData.physicalPositions || {},
          deviceIds: rawMapData.deviceIds || [],
          links: rawMapData.links || (typeof r.connections === 'string' ? JSON.parse(r.connections) : r.connections) || [],
          racks: rawMapData.racks || [],
          towers: rawMapData.towers || [],
          stickyNotes: rawMapData.stickyNotes || [],
          deviceDisplayModes: rawMapData.deviceDisplayModes || {},
          ...rawMapData,
          id: r.id,
          name: r.name,
          description: r.description,
          type: r.map_type || rawMapData.type || 'schematic',
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : (rawMapData.createdAt || new Date().toISOString()),
          updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : (rawMapData.updatedAt || new Date().toISOString()),
          visibility: r.visibility || rawMapData.visibility || 'public',
          ownerId: r.owner_id || rawMapData.ownerId || 'user-admin',
          ownerName: r.owner_name || rawMapData.ownerName || 'admin',
          allowedUsers,
        };
      });
    } catch (e) {
      console.error('[DB Query Error in getCustomMaps]', e);
      allMaps = loadFallbackStore().custom_maps || [];
    }
  } else {
    allMaps = loadFallbackStore().custom_maps || [];
  }

  // Synchronize sticky notes from device_sticky_notes table into custom maps
  try {
    const dbNotes = await getDeviceStickyNotes();
    if (Array.isArray(dbNotes) && dbNotes.length > 0) {
      const notesByDev = new Map<string, any>();
      for (const dn of dbNotes) {
        if (dn.linkedDeviceId) {
          notesByDev.set(dn.linkedDeviceId, dn);
          notesByDev.set(dn.linkedDeviceId.replace(/^hw-/, ''), dn);
          notesByDev.set('hw-' + dn.linkedDeviceId.replace(/^hw-/, ''), dn);
        }
        if (dn.id) notesByDev.set(dn.id, dn);
      }

      for (const m of allMaps) {
        const currentNotes = Array.isArray(m.stickyNotes) ? m.stickyNotes : [];
        const existingNoteIds = new Set<string>();

        const mergedNotes = currentNotes.map((sn: any) => {
          const match =
            (sn.linkedDeviceId && notesByDev.get(sn.linkedDeviceId)) ||
            notesByDev.get(sn.id);
          if (match) {
            existingNoteIds.add(match.id);
            if (match.linkedDeviceId) existingNoteIds.add(match.linkedDeviceId);
            return {
              ...sn,
              id: match.id || sn.id,
              title: match.title,
              content: match.content,
              color: match.color || sn.color,
              updatedAt: match.updatedAt || sn.updatedAt,
            };
          }
          return sn;
        });

        // If map contains a device that has a sticky note in DB, ensure it is attached
        const devIds: string[] = Array.isArray(m.deviceIds) ? m.deviceIds : Object.keys(m.devicePositions || {});
        for (const dId of devIds) {
          const match = notesByDev.get(dId);
          if (match && !existingNoteIds.has(match.id) && !existingNoteIds.has(dId)) {
            const devPos = m.devicePositions?.[dId] || { x: 200, y: 150 };
            mergedNotes.push({
              ...match,
              x: (devPos.x || 200) + 80,
              y: (devPos.y || 150) + 40,
            });
            existingNoteIds.add(match.id);
            existingNoteIds.add(dId);
          }
        }

        m.stickyNotes = mergedNotes;
      }
    }
  } catch (syncErr) {
    console.warn('[Custom Maps Note Sync Notice]', syncErr);
  }

  // If no user filter supplied, return all maps
  if (!userFilter || !userFilter.username) {
    return allMaps;
  }

  const currentRole = (userFilter.role || '').toLowerCase();
  const currentUsername = (userFilter.username || '').toLowerCase();
  const currentUserId = userFilter.userId || '';

  // Super Admin can view all maps
  if (currentRole.includes('super admin') || currentRole.includes('admin') || currentUsername === 'admin') {
    return allMaps;
  }

  // Filter based on map privacy
  return allMaps.filter((map) => {
    const visibility = map.visibility || 'public';
    // 1. Public map: visible to all authenticated users
    if (visibility === 'public') {
      return true;
    }

    // 2. Private map: visible only to creator/owner
    const isOwner =
      (currentUserId && map.ownerId === currentUserId) ||
      (currentUsername && (map.ownerName || '').toLowerCase() === currentUsername);
    if (visibility === 'private') {
      return isOwner;
    }

    // 3. Restricted map: visible to owner + specified users
    if (visibility === 'restricted') {
      if (isOwner) return true;
      const allowed = Array.isArray(map.allowedUsers) ? map.allowedUsers : [];
      return allowed.some(
        (u: string) =>
          u.toLowerCase() === currentUsername || (currentUserId && u === currentUserId)
      );
    }

    return true;
  });
}

export async function saveCustomMaps(maps: any[], currentUser?: any): Promise<void> {
  // Normalize each map with required fields
  const normalizedMaps = maps.map((m) => {
    const ownerId = m.ownerId || (currentUser?.userId ? currentUser.userId : 'user-admin');
    const ownerName = m.ownerName || (currentUser?.username ? currentUser.username : 'admin');
    const visibility = m.visibility || 'public';
    const allowedUsers = Array.isArray(m.allowedUsers) ? m.allowedUsers : [];

    return {
      ...m,
      ownerId,
      ownerName,
      visibility,
      allowedUsers,
      updatedAt: new Date().toISOString(),
    };
  });

  const store = loadFallbackStore();
  store.custom_maps = normalizedMaps;
  saveFallbackStore(store);

  await ensurePostgresConnection();
  if (isPostgresReady && pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const m of normalizedMaps) {
        await client.query(
          `INSERT INTO custom_maps (
             id, name, description, map_type, building_id, floor_id, unit_id, rack_id,
             nodes, connections, viewport, metadata, visibility, owner_id, owner_name, allowed_users, map_data, created_at, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             map_type = EXCLUDED.map_type,
             building_id = EXCLUDED.building_id,
             floor_id = EXCLUDED.floor_id,
             unit_id = EXCLUDED.unit_id,
             rack_id = EXCLUDED.rack_id,
             nodes = EXCLUDED.nodes,
             connections = EXCLUDED.connections,
             viewport = EXCLUDED.viewport,
             metadata = EXCLUDED.metadata,
             visibility = EXCLUDED.visibility,
             owner_id = EXCLUDED.owner_id,
             owner_name = EXCLUDED.owner_name,
             allowed_users = EXCLUDED.allowed_users,
             map_data = EXCLUDED.map_data,
             updated_at = EXCLUDED.updated_at`,
          [
            m.id,
            m.name || 'Untitled Map',
            m.description || '',
            m.type || m.map_type || 'schematic',
            m.buildingId || m.building_id || null,
            m.floorId || m.floor_id || null,
            m.unitId || m.unit_id || null,
            m.rackId || m.rack_id || null,
            JSON.stringify(m.devicePositions || m.nodes || {}),
            JSON.stringify(m.links || m.connections || []),
            JSON.stringify(m.viewport || { zoom: 1, pan: { x: 0, y: 0 } }),
            JSON.stringify(m.metadata || {}),
            m.visibility || 'public',
            m.ownerId || m.owner_id || 'user-admin',
            m.ownerName || m.owner_name || 'admin',
            JSON.stringify(m.allowedUsers || m.allowed_users || []),
            JSON.stringify(m),
            m.createdAt || m.created_at ? new Date(m.createdAt || m.created_at) : new Date(),
            new Date(),
          ]
        );
      }
      await client.query('COMMIT');
      console.log(`[Database] Successfully persisted ${normalizedMaps.length} custom maps to PostgreSQL.`);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[DB Query Error in saveCustomMaps]', e);
    } finally {
      client.release();
    }
  }
}

export async function deleteCustomMap(mapId: string): Promise<boolean> {
  if (!mapId) return false;
  const store = loadFallbackStore();
  let deleted = false;
  const idx = (store.custom_maps || []).findIndex((m) => m.id === mapId);
  if (idx >= 0) {
    store.custom_maps.splice(idx, 1);
    saveFallbackStore(store);
    deleted = true;
  }

  await ensurePostgresConnection();
  if (isPostgresReady && pool) {
    try {
      await pool.query('DELETE FROM custom_maps WHERE id = $1', [mapId]);
      console.log(`[Database] Successfully deleted custom map "${mapId}" from PostgreSQL.`);
      deleted = true;
    } catch (e) {
      console.error('[DB Query Error in deleteCustomMap]', e);
    }
  }
  return deleted;
}

// -------------------------------------------------------------
// Node Canvas Coordinates (Default & Custom Maps)
// -------------------------------------------------------------
export async function getNodePositions(mapId: string = 'default'): Promise<Record<string, { x: number; y: number }>> {
  if (isPostgresReady && pool) {
    try {
      const res = await pool.query('SELECT node_id, x, y FROM node_positions WHERE map_id = $1', [mapId]);
      const mapPos: Record<string, { x: number; y: number }> = {};
      for (const row of res.rows) {
        mapPos[row.node_id] = { x: parseFloat(row.x), y: parseFloat(row.y) };
      }
      if (Object.keys(mapPos).length > 0) {
        return mapPos;
      }
    } catch (e) {
      console.error('[DB Query Error]', e);
    }
  }

  const store = loadFallbackStore();
  return (store.node_positions && store.node_positions[mapId]) || {};
}

export async function saveNodePositions(
  mapId: string = 'default',
  positions: Record<string, { x: number; y: number }>
): Promise<void> {
  const store = loadFallbackStore();
  if (!store.node_positions) store.node_positions = {};
  store.node_positions[mapId] = { ...(store.node_positions[mapId] || {}), ...positions };
  saveFallbackStore(store);

  if (isPostgresReady && pool) {
    try {
      const client = await pool.connect();
      await client.query('BEGIN');
      for (const [nodeId, coords] of Object.entries(positions)) {
        await client.query(
          `INSERT INTO node_positions (map_id, node_id, x, y)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (map_id, node_id) DO UPDATE SET
             x = EXCLUDED.x,
             y = EXCLUDED.y`,
          [mapId, nodeId, coords.x, coords.y]
        );
      }
      await client.query('COMMIT');
      client.release();
    } catch (e) {
      console.error('[DB Query Error]', e);
    }
  }
}

export async function deleteNodePositions(mapId: string = 'default'): Promise<void> {
  const store = loadFallbackStore();
  if (store.node_positions && store.node_positions[mapId]) {
    delete store.node_positions[mapId];
    saveFallbackStore(store);
  }

  if (isPostgresReady && pool) {
    try {
      await pool.query('DELETE FROM node_positions WHERE map_id = $1', [mapId]);
    } catch (e) {
      console.error('[DB Query Error]', e);
    }
  }
}

// -------------------------------------------------------------
// Hierarchy Storage (Buildings, Floors, Units, Racks)
// -------------------------------------------------------------
export async function getHierarchy(): Promise<any[]> {
  if (isPostgresReady && pool) {
    try {
      const res = await pool.query('SELECT * FROM topology_hierarchy ORDER BY created_at ASC');
      return res.rows.map((r) => ({
        id: r.id,
        type: r.type,
        parentId: r.parent_id,
        name: r.name,
        description: r.description,
        metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
      }));
    } catch (e) {
      console.error('[DB Query Error]', e);
    }
  }
  return loadFallbackStore().topology_hierarchy;
}

export async function saveHierarchy(items: any[]): Promise<void> {
  const store = loadFallbackStore();
  store.topology_hierarchy = items;
  saveFallbackStore(store);

  if (isPostgresReady && pool) {
    try {
      const client = await pool.connect();
      await client.query('BEGIN');
      await client.query('DELETE FROM topology_hierarchy');
      for (const item of items) {
        await client.query(
          `INSERT INTO topology_hierarchy (id, type, parent_id, name, description, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            item.id,
            item.type,
            item.parentId || item.parent_id || null,
            item.name,
            item.description || '',
            JSON.stringify(item.metadata || {}),
          ]
        );
      }
      await client.query('COMMIT');
      client.release();
    } catch (e) {
      console.error('[DB Query Error]', e);
    }
  }
}

// -------------------------------------------------------------
// User Groups
// -------------------------------------------------------------
export async function getUserGroups(): Promise<any[]> {
  if (isPostgresReady && pool) {
    try {
      const res = await pool.query('SELECT * FROM user_groups ORDER BY created_at ASC');
      return res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        color: r.color,
        memberUserIds: typeof r.member_user_ids === 'string' ? JSON.parse(r.member_user_ids) : r.member_user_ids,
        isBuiltin: r.is_builtin,
      }));
    } catch (e) {
      console.error('[DB Query Error]', e);
    }
  }
  return loadFallbackStore().user_groups;
}

export async function saveUserGroups(groups: any[]): Promise<void> {
  const store = loadFallbackStore();
  store.user_groups = groups;
  saveFallbackStore(store);

  if (isPostgresReady && pool) {
    try {
      const client = await pool.connect();
      await client.query('BEGIN');
      await client.query('DELETE FROM user_groups');
      for (const g of groups) {
        await client.query(
          `INSERT INTO user_groups (id, name, description, color, member_user_ids, is_builtin)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [g.id, g.name, g.description, g.color, JSON.stringify(g.memberUserIds || g.member_user_ids || []), g.isBuiltin || false]
        );
      }
      await client.query('COMMIT');
      client.release();
    } catch (e) {
      console.error('[DB Query Error]', e);
    }
  }
}

// -------------------------------------------------------------
// Access Policies (RBAC)
// -------------------------------------------------------------
export async function getAccessPolicies(): Promise<any[]> {
  if (isPostgresReady && pool) {
    try {
      const res = await pool.query('SELECT * FROM access_policies ORDER BY priority ASC, created_at ASC');
      return res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        priority: r.priority,
        isBuiltin: r.is_builtin,
        policyData: typeof r.policy_data === 'string' ? JSON.parse(r.policy_data) : r.policy_data,
      }));
    } catch (e) {
      console.error('[DB Query Error]', e);
    }
  }
  return loadFallbackStore().access_policies;
}

export async function saveAccessPolicies(policies: any[]): Promise<void> {
  const store = loadFallbackStore();
  store.access_policies = policies;
  saveFallbackStore(store);

  if (isPostgresReady && pool) {
    try {
      const client = await pool.connect();
      await client.query('BEGIN');
      await client.query('DELETE FROM access_policies');
      for (const p of policies) {
        await client.query(
          `INSERT INTO access_policies (id, name, description, priority, is_builtin, policy_data)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [p.id, p.name, p.description, p.priority || 100, p.isBuiltin || false, JSON.stringify(p.policyData || p.policy_data || {})]
        );
      }
      await client.query('COMMIT');
      client.release();
    } catch (e) {
      console.error('[DB Query Error]', e);
    }
  }
}

// -------------------------------------------------------------
// Device Groups
// -------------------------------------------------------------
export async function getDeviceGroups(): Promise<any[]> {
  if (isPostgresReady && pool) {
    try {
      const res = await pool.query('SELECT * FROM device_groups ORDER BY created_at ASC');
      return res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        color: r.color,
        icon: r.icon,
        deviceIds: typeof r.device_ids === 'string' ? JSON.parse(r.device_ids) : r.device_ids,
      }));
    } catch (e) {
      console.error('[DB Query Error]', e);
    }
  }
  return loadFallbackStore().device_groups;
}

export async function saveDeviceGroups(groups: any[]): Promise<void> {
  const store = loadFallbackStore();
  store.device_groups = groups;
  saveFallbackStore(store);

  if (isPostgresReady && pool) {
    try {
      const client = await pool.connect();
      await client.query('BEGIN');
      await client.query('DELETE FROM device_groups');
      for (const g of groups) {
        await client.query(
          `INSERT INTO device_groups (id, name, description, color, icon, device_ids)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [g.id, g.name, g.description, g.color, g.icon, JSON.stringify(g.deviceIds || g.device_ids || [])]
        );
      }
      await client.query('COMMIT');
      client.release();
    } catch (e) {
      console.error('[DB Query Error]', e);
    }
  }
}

// -------------------------------------------------------------
// Active Directory Config
// -------------------------------------------------------------
export async function getActiveDirectoryConfig(): Promise<any> {
  if (isPostgresReady && pool) {
    try {
      const res = await pool.query("SELECT config_data FROM ad_config WHERE id = 'primary' LIMIT 1");
      if (res.rows.length > 0) {
        const raw = res.rows[0].config_data;
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      }
    } catch (e) {
      console.error('[DB Query Error]', e);
    }
  }
  return loadFallbackStore().ad_config || DEFAULT_AD_CONFIG;
}

export async function saveActiveDirectoryConfig(config: any): Promise<void> {
  const store = loadFallbackStore();
  store.ad_config = config;
  saveFallbackStore(store);

  if (isPostgresReady && pool) {
    try {
      await pool.query(
        `INSERT INTO ad_config (id, config_data, updated_at)
         VALUES ('primary', $1, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           config_data = EXCLUDED.config_data,
           updated_at = CURRENT_TIMESTAMP`,
        [JSON.stringify(config)]
      );
    } catch (e) {
      console.error('[DB Query Error]', e);
    }
  }
}

// -------------------------------------------------------------
// Audit Logs Storage
// -------------------------------------------------------------
export async function getAuditLogs(limit: number = 100): Promise<any[]> {
  if (isPostgresReady && pool) {
    try {
      const res = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT $1', [limit]);
      return res.rows;
    } catch (e) {
      console.error('[DB Query Error]', e);
    }
  }
  const store = loadFallbackStore();
  return store.audit_logs.slice(-limit).reverse();
}

export async function addAuditLog(log: any): Promise<void> {
  const record = {
    id: log.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: log.timestamp || new Date().toISOString(),
    user_name: log.userName || log.user_name || 'System',
    action: log.action || 'Event',
    category: log.category || 'general',
    target: log.target || '',
    status: log.status || 'info',
    details: typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || ''),
    ip_address: log.ipAddress || log.ip_address || '127.0.0.1',
    user_agent: log.userAgent || log.user_agent || '',
  };

  const store = loadFallbackStore();
  store.audit_logs.push(record);
  if (store.audit_logs.length > 500) {
    store.audit_logs = store.audit_logs.slice(-500);
  }
  saveFallbackStore(store);

  if (isPostgresReady && pool) {
    try {
      await pool.query(
        `INSERT INTO audit_logs (id, timestamp, user_name, action, category, target, status, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          record.id,
          record.timestamp,
          record.user_name,
          record.action,
          record.category,
          record.target,
          record.status,
          record.details,
          record.ip_address,
          record.user_agent,
        ]
      );
    } catch (e) {
      console.error('[DB Query Error]', e);
    }
  }
}

// -------------------------------------------------------------
// 12. Device Sticky Notes & Canvas Map Linking
// -------------------------------------------------------------
export async function getDeviceStickyNotes(): Promise<any[]> {
  let pgNotes: any[] = [];
  await ensurePostgresConnection();
  if (isPostgresReady && pool) {
    try {
      const res = await pool.query('SELECT * FROM device_sticky_notes ORDER BY updated_at DESC');
      pgNotes = res.rows.map((r: any) => ({
        id: r.id,
        linkedDeviceId: r.device_id,
        title: r.title || '',
        content: r.content || '',
        color: r.color || 'yellow',
        x: Number(r.x) || 100,
        y: Number(r.y) || 100,
        width: Number(r.width) || 230,
        viewMode: r.view_mode || 'card',
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      }));
    } catch (e) {
      console.error('[DB Query Error in getDeviceStickyNotes]', e);
    }
  }

  const store = loadFallbackStore();
  const fallbackNotes = Array.isArray(store.device_sticky_notes) ? store.device_sticky_notes : [];

  // Also collect any sticky notes in custom maps that have a linkedDeviceId
  const maps = Array.isArray(store.custom_maps) ? store.custom_maps : [];
  const mapNotes: any[] = [];
  for (const m of maps) {
    if (Array.isArray(m.stickyNotes)) {
      for (const sn of m.stickyNotes) {
        if (sn && sn.linkedDeviceId) {
          mapNotes.push({
            id: sn.id,
            linkedDeviceId: sn.linkedDeviceId,
            title: sn.title || '',
            content: sn.content || '',
            color: sn.color || 'yellow',
            x: Number(sn.x) || 100,
            y: Number(sn.y) || 100,
            width: Number(sn.width) || 230,
            viewMode: sn.viewMode || 'card',
            createdAt: sn.createdAt || new Date().toISOString(),
            updatedAt: sn.updatedAt || new Date().toISOString(),
          });
        }
      }
    }
  }

  // Deduplicate and prioritize most recent
  const noteMap = new Map<string, any>();
  for (const n of mapNotes) {
    if (n && (n.linkedDeviceId || n.id)) {
      noteMap.set(n.linkedDeviceId || n.id, n);
    }
  }
  for (const n of fallbackNotes) {
    if (n && (n.linkedDeviceId || n.id)) {
      noteMap.set(n.linkedDeviceId || n.id, n);
    }
  }
  for (const n of pgNotes) {
    if (n && (n.linkedDeviceId || n.id)) {
      noteMap.set(n.linkedDeviceId || n.id, n);
    }
  }

  return Array.from(noteMap.values());
}

export async function saveDeviceStickyNote(note: any, previousDeviceId?: string): Promise<any> {
  if (!note) throw new Error('Invalid note data');
  const id = note.id || `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const deviceId = note.linkedDeviceId || note.deviceId;
  if (!deviceId) throw new Error('Device ID is required for device sticky note');

  const cleanDeviceId = deviceId.replace(/^hw-/, '');
  const hwDeviceId = 'hw-' + cleanDeviceId;

  const cleanPrev = previousDeviceId ? previousDeviceId.replace(/^hw-/, '') : undefined;
  const hwPrev = cleanPrev ? 'hw-' + cleanPrev : undefined;

  const normalizedNote = {
    id,
    linkedDeviceId: deviceId,
    title: note.title || '',
    content: note.content || '',
    color: note.color || 'yellow',
    x: Number(note.x) || 100,
    y: Number(note.y) || 100,
    width: Number(note.width) || 230,
    viewMode: note.viewMode || 'card',
    createdAt: note.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const store = loadFallbackStore();
  if (!Array.isArray(store.device_sticky_notes)) {
    store.device_sticky_notes = [];
  }

  // If reassigning from another device, clean up old device record in fallback store
  if (previousDeviceId && previousDeviceId !== deviceId) {
    store.device_sticky_notes = store.device_sticky_notes.filter(
      (n: any) =>
        n &&
        n.linkedDeviceId !== previousDeviceId &&
        n.linkedDeviceId !== cleanPrev &&
        n.linkedDeviceId !== hwPrev
    );
  }

  const existingIdx = store.device_sticky_notes.findIndex(
    (n: any) =>
      n.id === id ||
      n.linkedDeviceId === deviceId ||
      n.linkedDeviceId === cleanDeviceId ||
      n.linkedDeviceId === hwDeviceId
  );
  if (existingIdx >= 0) {
    normalizedNote.id = store.device_sticky_notes[existingIdx].id || normalizedNote.id;
    store.device_sticky_notes[existingIdx] = normalizedNote;
  } else {
    store.device_sticky_notes.push(normalizedNote);
  }

  // Update or attach in custom maps in fallback store
  if (Array.isArray(store.custom_maps)) {
    for (const m of store.custom_maps) {
      if (!Array.isArray(m.stickyNotes)) m.stickyNotes = [];
      const snIdx = m.stickyNotes.findIndex(
        (sn: any) =>
          sn.id === normalizedNote.id ||
          sn.linkedDeviceId === deviceId ||
          sn.linkedDeviceId === cleanDeviceId ||
          sn.linkedDeviceId === hwDeviceId
      );
      if (snIdx >= 0) {
        m.stickyNotes[snIdx] = {
          ...m.stickyNotes[snIdx],
          id: normalizedNote.id,
          title: normalizedNote.title,
          content: normalizedNote.content,
          color: normalizedNote.color,
          linkedDeviceId: normalizedNote.linkedDeviceId,
          updatedAt: normalizedNote.updatedAt,
        };
      } else {
        const hasDevice =
          (Array.isArray(m.deviceIds) &&
            (m.deviceIds.includes(deviceId) || m.deviceIds.includes(cleanDeviceId) || m.deviceIds.includes(hwDeviceId))) ||
          (m.devicePositions &&
            (m.devicePositions[deviceId] || m.devicePositions[cleanDeviceId] || m.devicePositions[hwDeviceId]));

        if (hasDevice) {
          const devPos =
            (m.devicePositions &&
              (m.devicePositions[deviceId] || m.devicePositions[cleanDeviceId] || m.devicePositions[hwDeviceId])) ||
            { x: 200, y: 150 };
          m.stickyNotes.push({
            ...normalizedNote,
            x: (devPos.x || 200) + 80,
            y: (devPos.y || 150) + 40,
          });
        }
      }
    }
  }

  saveFallbackStore(store);

  await ensurePostgresConnection();
  if (isPostgresReady && pool) {
    try {
      // If reassigning from another device, clean up old device record in PostgreSQL
      if (previousDeviceId && previousDeviceId !== deviceId) {
        await pool.query(
          'DELETE FROM device_sticky_notes WHERE device_id = $1 OR device_id = $2',
          [previousDeviceId, cleanPrev]
        );
      }

      // Find if this device or id already has a record in device_sticky_notes table
      const existingRes = await pool.query(
        'SELECT id FROM device_sticky_notes WHERE id = $1 OR device_id = $2 OR device_id = $3 LIMIT 1',
        [id, deviceId, cleanDeviceId]
      );
      const targetId = existingRes.rows.length > 0 ? existingRes.rows[0].id : normalizedNote.id;
      normalizedNote.id = targetId;

      await pool.query(
        `INSERT INTO device_sticky_notes (id, device_id, title, content, color, x, y, width, view_mode, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           device_id = EXCLUDED.device_id,
           title = EXCLUDED.title,
           content = EXCLUDED.content,
           color = EXCLUDED.color,
           x = EXCLUDED.x,
           y = EXCLUDED.y,
           width = EXCLUDED.width,
           view_mode = EXCLUDED.view_mode,
           updated_at = EXCLUDED.updated_at`,
        [
          targetId,
          normalizedNote.linkedDeviceId,
          normalizedNote.title,
          normalizedNote.content,
          normalizedNote.color,
          normalizedNote.x,
          normalizedNote.y,
          normalizedNote.width,
          normalizedNote.viewMode,
          normalizedNote.createdAt,
          normalizedNote.updatedAt,
        ]
      );

      // Also synchronize PostgreSQL custom_maps table
      try {
        const mapsRes = await pool.query('SELECT id, map_data FROM custom_maps');
        for (const row of mapsRes.rows) {
          const mapData = typeof row.map_data === 'string' ? JSON.parse(row.map_data) : (row.map_data || {});
          let stickyNotes = Array.isArray(mapData.stickyNotes) ? mapData.stickyNotes : [];
          const snIdx = stickyNotes.findIndex(
            (sn: any) =>
              sn.id === normalizedNote.id ||
              sn.linkedDeviceId === deviceId ||
              sn.linkedDeviceId === cleanDeviceId ||
              sn.linkedDeviceId === hwDeviceId
          );

          let updated = false;
          if (snIdx >= 0) {
            stickyNotes[snIdx] = {
              ...stickyNotes[snIdx],
              id: normalizedNote.id,
              title: normalizedNote.title,
              content: normalizedNote.content,
              color: normalizedNote.color,
              linkedDeviceId: normalizedNote.linkedDeviceId,
              updatedAt: normalizedNote.updatedAt,
            };
            updated = true;
          } else {
            const hasDev =
              (Array.isArray(mapData.deviceIds) &&
                (mapData.deviceIds.includes(deviceId) || mapData.deviceIds.includes(cleanDeviceId) || mapData.deviceIds.includes(hwDeviceId))) ||
              (mapData.devicePositions &&
                (mapData.devicePositions[deviceId] || mapData.devicePositions[cleanDeviceId] || mapData.devicePositions[hwDeviceId]));
            if (hasDev) {
              const devPos =
                (mapData.devicePositions &&
                  (mapData.devicePositions[deviceId] || mapData.devicePositions[cleanDeviceId] || mapData.devicePositions[hwDeviceId])) ||
                { x: 200, y: 150 };
              stickyNotes.push({
                ...normalizedNote,
                x: (devPos.x || 200) + 80,
                y: (devPos.y || 150) + 40,
              });
              updated = true;
            }
          }

          if (updated) {
            mapData.stickyNotes = stickyNotes;
            mapData.updatedAt = new Date().toISOString();
            await pool.query(
              'UPDATE custom_maps SET map_data = $1, updated_at = NOW() WHERE id = $2',
              [JSON.stringify(mapData), row.id]
            );
          }
        }
      } catch (mapSyncErr) {
        console.warn('[PostgreSQL custom_maps sync warning in saveDeviceStickyNote]', mapSyncErr);
      }
    } catch (e) {
      console.error('[DB Save Error in saveDeviceStickyNote]', e);
    }
  }

  return normalizedNote;
}

export async function deleteDeviceStickyNote(noteId: string, deviceId?: string, keepInMap: boolean = false): Promise<void> {
  const store = loadFallbackStore();
  let effectiveDeviceId = deviceId;

  // If effectiveDeviceId not provided, check fallbackStore and DB for matching note
  if (!effectiveDeviceId && Array.isArray(store.device_sticky_notes)) {
    const found = store.device_sticky_notes.find((n: any) => n.id === noteId);
    if (found?.linkedDeviceId) {
      effectiveDeviceId = found.linkedDeviceId;
    }
  }

  const cleanDeviceId = effectiveDeviceId ? effectiveDeviceId.replace(/^hw-/, '') : undefined;
  const hwDeviceId = cleanDeviceId ? 'hw-' + cleanDeviceId : undefined;

  const matchesTarget = (sn: any) => {
    if (!sn) return false;
    if (noteId && sn.id === noteId) return true;
    if (effectiveDeviceId && (sn.linkedDeviceId === effectiveDeviceId || sn.linkedDeviceId === cleanDeviceId || sn.linkedDeviceId === hwDeviceId)) return true;
    if (noteId && sn.linkedDeviceId === noteId) return true;
    return false;
  };

  if (Array.isArray(store.device_sticky_notes)) {
    store.device_sticky_notes = store.device_sticky_notes.filter((n: any) => !matchesTarget(n));
  }

  if (Array.isArray(store.custom_maps)) {
    for (const m of store.custom_maps) {
      if (Array.isArray(m.stickyNotes)) {
        if (keepInMap) {
          // Only unlink the note from device, retain the sticky note on the canvas
          m.stickyNotes = m.stickyNotes.map((sn: any) => {
            if (matchesTarget(sn)) {
              const updated = { ...sn };
              delete updated.linkedDeviceId;
              delete updated.device_id;
              return updated;
            }
            return sn;
          });
        } else {
          // Permanently remove the sticky note from the map
          m.stickyNotes = m.stickyNotes.filter((sn: any) => !matchesTarget(sn));
        }
      }
    }
  }
  saveFallbackStore(store);

  await ensurePostgresConnection();
  if (isPostgresReady && pool) {
    try {
      if (!effectiveDeviceId) {
        try {
          const lookup = await pool.query('SELECT device_id FROM device_sticky_notes WHERE id = $1 LIMIT 1', [noteId]);
          if (lookup.rows.length > 0 && lookup.rows[0].device_id) {
            effectiveDeviceId = lookup.rows[0].device_id;
          }
        } catch {}
      }

      const cleanDev = effectiveDeviceId ? effectiveDeviceId.replace(/^hw-/, '') : null;
      const hwDev = cleanDev ? 'hw-' + cleanDev : null;

      await pool.query(
        `DELETE FROM device_sticky_notes 
         WHERE id = $1 
            OR device_id = $1 
            OR ($2::text IS NOT NULL AND (device_id = $2 OR device_id = $3 OR device_id = $4))`,
        [noteId, effectiveDeviceId || null, cleanDev || null, hwDev || null]
      );

      // Also synchronize PostgreSQL custom_maps table
      try {
        const mapsRes = await pool.query('SELECT id, map_data FROM custom_maps');
        for (const row of mapsRes.rows) {
          const mapData = typeof row.map_data === 'string' ? JSON.parse(row.map_data) : (row.map_data || {});
          if (Array.isArray(mapData.stickyNotes)) {
            let changed = false;
            if (keepInMap) {
              mapData.stickyNotes = mapData.stickyNotes.map((sn: any) => {
                if (matchesTarget(sn)) {
                  changed = true;
                  const updated = { ...sn };
                  delete updated.linkedDeviceId;
                  delete updated.device_id;
                  return updated;
                }
                return sn;
              });
            } else {
              const origLen = mapData.stickyNotes.length;
              mapData.stickyNotes = mapData.stickyNotes.filter((sn: any) => !matchesTarget(sn));
              if (mapData.stickyNotes.length !== origLen) changed = true;
            }

            if (changed) {
              mapData.updatedAt = new Date().toISOString();
              await pool.query(
                'UPDATE custom_maps SET map_data = $1, updated_at = NOW() WHERE id = $2',
                [JSON.stringify(mapData), row.id]
              );
            }
          }
        }
      } catch (mapErr) {
        console.warn('[PostgreSQL custom_maps cleanup warning in deleteDeviceStickyNote]', mapErr);
      }
    } catch (e) {
      console.error('[DB Delete Error in deleteDeviceStickyNote]', e);
    }
  }
}
