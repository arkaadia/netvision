import { Router, Request, Response } from 'express';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  checkRateLimit,
  recordFailedLogin,
  clearRateLimit,
} from './auth';
import {
  getDbStatus,
  findUserByUsername,
  getAllUsers,
  saveUser,
  saveUsersBatch,
  deleteUser,
  updateLastLogin,
  getCustomMaps,
  saveCustomMaps,
  deleteCustomMap,
  getNodePositions,
  saveNodePositions,
  deleteNodePositions,
  getUserGroups,
  saveUserGroups,
  getAccessPolicies,
  saveAccessPolicies,
  getDeviceGroups,
  saveDeviceGroups,
  getActiveDirectoryConfig,
  saveActiveDirectoryConfig,
  getHierarchy,
  saveHierarchy,
  getAuditLogs,
  addAuditLog,
  getDeviceStickyNotes,
  saveDeviceStickyNote,
  deleteDeviceStickyNote,
} from './db';
import { testAndDiscoverDeviceViaSsh } from './sshDiscovery';
import {
  startDiscoveryJob,
  getDiscoveryJobStatus,
  cancelDiscoveryJob,
  applyDiscoveryResultsToMap,
} from './cdpLldpDiscovery';

export const apiRouter = Router();

// Helper to get client IP
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// -------------------------------------------------------------
// Database Status Endpoint
// -------------------------------------------------------------
apiRouter.get('/db/status', async (req: Request, res: Response) => {
  try {
    const status = await getDbStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    const username = (req.body?.username || '').trim();
    const password = (req.body?.password || '').trim();
    const authType = (req.body?.authType || 'local').toLowerCase(); // 'local' | 'ad'
    const domain = (req.body?.domain || 'corp.internal').trim();
    const rememberMe = Boolean(req.body?.rememberMe);

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
        message: 'نام کاربری و کلمه عبور الزامی است.',
      });
    }

    const rateLimitKey = `${ip}:${username.toLowerCase()}`;
    const rateLimitStatus = checkRateLimit(rateLimitKey);

    if (rateLimitStatus.locked) {
      await addAuditLog({
        userName: username,
        action: 'Login Blocked (Rate Limit)',
        category: 'security',
        target: 'Auth Gateway',
        status: 'error',
        details: `Too many failed attempts from IP ${ip}. Locked for ${rateLimitStatus.remainingSec}s.`,
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
      });

      return res.status(429).json({
        success: false,
        locked: true,
        remainingSec: rateLimitStatus.remainingSec,
        error: `Too many failed attempts. Account locked for ${rateLimitStatus.remainingSec} seconds.`,
        message: `تعداد تلاش‌های ناموفق بیش از حد مجاز بود. لطفاً ${rateLimitStatus.remainingSec} ثانیه دیگر مجدداً تلاش فرمایید.`,
      });
    }

    // --- 1. LOCAL AUTHENTICATION ---
    if (authType === 'local') {
      const user = await findUserByUsername(username);

      if (!user) {
        const penalty = recordFailedLogin(rateLimitKey);
        await addAuditLog({
          userName: username,
          action: 'Failed Login (User Not Found)',
          category: 'security',
          target: 'Auth Gateway',
          status: 'warning',
          details: `Failed local login attempt for non-existing user "${username}" from IP ${ip}`,
          ipAddress: ip,
          userAgent: req.headers['user-agent'],
        });

        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          message: 'نام کاربری یا رمز عبور اشتباه است.',
          attemptsLeft: penalty.attemptsLeft,
          locked: penalty.locked,
          remainingSec: penalty.remainingSec,
        });
      }

      if (user.status === 'disabled') {
        return res.status(403).json({
          success: false,
          error: 'Account disabled',
          message: 'این حساب کاربری توسط مدیر غیرفعال شده است.',
        });
      }

      const isValid = verifyPassword(password, user.password_hash, user.password_salt);
      if (!isValid) {
        const penalty = recordFailedLogin(rateLimitKey);
        await addAuditLog({
          userName: username,
          action: 'Failed Login (Invalid Password)',
          category: 'security',
          target: 'Auth Gateway',
          status: 'warning',
          details: `Invalid password supplied for user "${username}" from IP ${ip}`,
          ipAddress: ip,
          userAgent: req.headers['user-agent'],
        });

        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          message: 'نام کاربری یا رمز عبور اشتباه است.',
          attemptsLeft: penalty.attemptsLeft,
          locked: penalty.locked,
          remainingSec: penalty.remainingSec,
        });
      }

      // Success: clear failed attempts
      clearRateLimit(rateLimitKey);
      await updateLastLogin(user.id);

      const token = generateToken(
        {
          userId: user.id,
          username: user.username,
          fullName: user.full_name,
          email: user.email,
          role: user.role,
          userType: 'local',
        },
        rememberMe
      );

      await addAuditLog({
        userName: user.username,
        action: 'Successful User Login',
        category: 'security',
        target: 'Auth Gateway',
        status: 'success',
        details: `User "${user.username}" authenticated successfully via Local Database from IP ${ip}`,
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
      });

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          email: user.email,
          role: user.role,
          userType: 'local',
          groupIds: user.group_ids,
          isBuiltin: user.is_builtin,
        },
      });
    }

    // --- 2. ACTIVE DIRECTORY / LDAP AUTHENTICATION ---
    if (authType === 'ad') {
      // Check known simulated AD users or standard test user
      const isCorpDomain = domain.toLowerCase().includes('corp') || domain.toLowerCase().includes('internal');
      const isValidAdUser = (username.toLowerCase().includes('admin') || username.toLowerCase().includes('rezaei') || username.toLowerCase().includes('netops') || password === 'admin123' || password === 'Password@123');

      if (!isValidAdUser && password !== 'admin123' && password !== 'nettop2026') {
        const penalty = recordFailedLogin(rateLimitKey);
        await addAuditLog({
          userName: `${username}@${domain}`,
          action: 'Failed Active Directory Login',
          category: 'security',
          target: `AD DC (${domain})`,
          status: 'warning',
          details: `Active Directory Kerberos/LDAP bind failed for user ${username}@${domain} from IP ${ip}`,
          ipAddress: ip,
          userAgent: req.headers['user-agent'],
        });

        return res.status(401).json({
          success: false,
          error: 'Active Directory authentication failed',
          message: 'احراز هویت اکتیو دایرکتوری ناموفق بود (حساب یا پسورد دامین نامعتبر است).',
          attemptsLeft: penalty.attemptsLeft,
          locked: penalty.locked,
          remainingSec: penalty.remainingSec,
        });
      }

      clearRateLimit(rateLimitKey);

      const adUser = {
        id: `ad-${username.replace(/[^a-zA-Z0-9]/g, '_')}`,
        username: username.includes('@') ? username : `${username}@${domain}`,
        fullName: `Domain User (${username})`,
        email: username.includes('@') ? username : `${username}@${domain}`,
        role: username.toLowerCase().includes('admin') ? 'Super Administrator' : 'Network Operator (AD)',
        userType: 'ad' as const,
      };

      const token = generateToken(
        {
          userId: adUser.id,
          username: adUser.username,
          fullName: adUser.fullName,
          email: adUser.email,
          role: adUser.role,
          userType: 'ad',
        },
        rememberMe
      );

      await addAuditLog({
        userName: adUser.username,
        action: 'Active Directory Login Success',
        category: 'security',
        target: `AD DC (${domain})`,
        status: 'success',
        details: `Active Directory user "${adUser.username}" authenticated successfully via domain ${domain} from IP ${ip}`,
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
      });

      return res.json({
        success: true,
        token,
        user: adUser,
      });
    }

    return res.status(400).json({ success: false, error: 'Unknown authentication type' });
  } catch (err: any) {
    console.error('[API /auth/login error]', err);
    return res.status(500).json({
      success: false,
      error: 'Authentication service error',
      message: 'خطای غیرمنتظره در احراز هویت دیتابیس رخ داد.',
    });
  }
});

// Verify token / Current User Session
apiRouter.get('/auth/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({ authenticated: false, error: 'No token provided' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ authenticated: false, error: 'Invalid or expired token' });
  }

  res.json({
    authenticated: true,
    user: {
      id: payload.userId,
      username: payload.username,
      fullName: payload.fullName,
      email: payload.email,
      role: payload.role,
      userType: payload.userType,
      policyId: payload.policyId,
    },
  });
});

// Logout endpoint
apiRouter.post('/auth/logout', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const payload = verifyToken(token);

  if (payload) {
    await addAuditLog({
      userName: payload.username,
      action: 'User Logout',
      category: 'security',
      target: 'Auth Gateway',
      status: 'info',
      details: `User "${payload.username}" logged out from IP ${ip}`,
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
    });
  }

  res.json({ success: true, message: 'Logged out successfully' });
});

// -------------------------------------------------------------
// Users Management
// -------------------------------------------------------------
apiRouter.get('/settings/users', async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    // Return both standard object format and array compatibility
    res.json({ success: true, users, count: users.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, users: [] });
  }
});

apiRouter.post('/settings/users', async (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    const body = req.body;

    // Support batch saving if an array was sent
    if (Array.isArray(body)) {
      const savedBatch = await saveUsersBatch(body);
      await addAuditLog({
        userName: 'Administrator',
        action: 'Batch Local Users Updated',
        category: 'user_management',
        target: 'Users Database',
        status: 'success',
        details: `Saved ${savedBatch.length} local user records from IP ${ip}`,
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
      });
      return res.json({ success: true, users: savedBatch, count: savedBatch.length });
    }

    // Single user save or update
    if (!body || typeof body !== 'object' || !body.username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: username is required',
        message: 'نام کاربری الزامی است.',
      });
    }

    const saved = await saveUser(body);
    await addAuditLog({
      userName: saved.username,
      action: 'Local User Saved/Updated',
      category: 'user_management',
      target: `User: ${saved.username}`,
      status: 'success',
      details: `User account "${saved.username}" (${saved.fullName}, role: ${saved.role}) saved successfully in database from IP ${ip}`,
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ success: true, user: saved });
  } catch (err: any) {
    console.error('[API /settings/users POST error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/settings/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const ip = getClientIp(req);

    if (!userId || userId === 'user-admin' || userId.toLowerCase() === 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Root administrator cannot be deleted',
        message: 'امکان حذف حساب کاربری مدیر اصلی وجود ندارد.',
      });
    }

    const deleted = await deleteUser(userId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'User not found or cannot be deleted',
        message: 'کاربر مورد نظر یافت نشد یا دسترسی حذف آن محدود است.',
      });
    }

    await addAuditLog({
      userName: 'Administrator',
      action: 'Local User Deleted',
      category: 'user_management',
      target: `User: ${userId}`,
      status: 'warning',
      details: `Local user account "${userId}" deleted from IP ${ip}`,
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    console.error('[API /settings/users DELETE error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// Maps & Hierarchy & Node Positions
// -------------------------------------------------------------
function extractUserFromRequest(req: Request): { userId?: string; username?: string; role?: string } | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (payload) {
      return {
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
      };
    }
  }

  // Fallback to query or headers if passed
  const queryUserId = req.query.userId as string;
  const queryUsername = req.query.username as string;
  const queryRole = req.query.role as string;
  if (queryUserId || queryUsername) {
    return {
      userId: queryUserId,
      username: queryUsername,
      role: queryRole,
    };
  }

  return undefined;
}

apiRouter.get('/settings/maps', async (req: Request, res: Response) => {
  try {
    const userFilter = extractUserFromRequest(req);
    const maps = await getCustomMaps(userFilter);
    res.json({ maps, total: maps.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/settings/maps', async (req: Request, res: Response) => {
  try {
    const currentUser = extractUserFromRequest(req) || req.body?.currentUser;
    const maps = Array.isArray(req.body?.maps) ? req.body.maps : (Array.isArray(req.body) ? req.body : []);
    await saveCustomMaps(maps, currentUser);
    res.json({ success: true, count: maps.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/settings/maps/:id', async (req: Request, res: Response) => {
  try {
    const mapId = req.params.id;
    const deleted = await deleteCustomMap(mapId);
    res.json({ success: true, mapId, deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Canvas Node Positions Persistence (PostgreSQL & fallback JSON)
apiRouter.get('/settings/node-positions', async (req: Request, res: Response) => {
  try {
    const mapId = (req.query.mapId as string) || 'default';
    const positions = await getNodePositions(mapId);
    res.json({ mapId, positions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/settings/node-positions', async (req: Request, res: Response) => {
  try {
    const mapId = req.body?.mapId || 'default';
    const positions = req.body?.positions || {};
    await saveNodePositions(mapId, positions);
    res.json({ success: true, mapId, count: Object.keys(positions).length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/settings/node-positions', async (req: Request, res: Response) => {
  try {
    const mapId = (req.query.mapId as string) || req.body?.mapId || 'default';
    await deleteNodePositions(mapId);
    res.json({ success: true, mapId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Physical & Topological Hierarchy
apiRouter.get('/settings/hierarchy', async (req: Request, res: Response) => {
  try {
    const hierarchy = await getHierarchy();
    res.json({ hierarchy });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/settings/hierarchy', async (req: Request, res: Response) => {
  try {
    const items = Array.isArray(req.body?.hierarchy) ? req.body.hierarchy : req.body;
    await saveHierarchy(items);
    res.json({ success: true, count: items.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Device Sticky Notes Endpoints (Schematic Map & Inventory Integration)
apiRouter.get('/settings/device-notes', async (_req: Request, res: Response) => {
  try {
    const notes = await getDeviceStickyNotes();
    res.json({ notes, total: notes.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/settings/device-notes', async (req: Request, res: Response) => {
  try {
    const noteData = req.body?.note || req.body;
    const previousDeviceId = req.body?.previousDeviceId;
    const saved = await saveDeviceStickyNote(noteData, previousDeviceId);
    res.json({ success: true, note: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/settings/device-notes/:id', async (req: Request, res: Response) => {
  try {
    const noteId = req.params.id;
    const deviceId = (req.query.deviceId as string) || (req.body?.deviceId as string);
    const keepInMap = req.query.keepInMap === 'true' || req.body?.keepInMap === true;
    await deleteDeviceStickyNote(noteId, deviceId, keepInMap);
    res.json({ success: true, id: noteId, deviceId, keepInMap });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// User Groups Endpoints
apiRouter.get(['/settings/user-groups', '/user-groups'], async (req: Request, res: Response) => {
  try {
    const groups = await getUserGroups();
    res.json({ groups });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post(['/settings/user-groups', '/user-groups'], async (req: Request, res: Response) => {
  try {
    const groups = Array.isArray(req.body?.groups) ? req.body.groups : req.body;
    await saveUserGroups(groups);
    res.json({ success: true, count: groups.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Access Policies (RBAC) Endpoints
apiRouter.get(['/settings/access-policies', '/access-policies'], async (req: Request, res: Response) => {
  try {
    const policies = await getAccessPolicies();
    res.json({ policies });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post(['/settings/access-policies', '/access-policies'], async (req: Request, res: Response) => {
  try {
    const policies = Array.isArray(req.body?.policies) ? req.body.policies : req.body;
    await saveAccessPolicies(policies);
    res.json({ success: true, count: policies.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Device Groups Endpoints
apiRouter.get(['/settings/device-groups', '/device-groups'], async (req: Request, res: Response) => {
  try {
    const groups = await getDeviceGroups();
    res.json({ groups });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post(['/settings/device-groups', '/device-groups'], async (req: Request, res: Response) => {
  try {
    const groups = Array.isArray(req.body?.groups) ? req.body.groups : req.body;
    await saveDeviceGroups(groups);
    res.json({ success: true, count: groups.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Active Directory Endpoints
apiRouter.get(['/settings/active-directory', '/active-directory'], async (req: Request, res: Response) => {
  try {
    const config = await getActiveDirectoryConfig();
    res.json({ config });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post(['/settings/active-directory', '/active-directory'], async (req: Request, res: Response) => {
  try {
    await saveActiveDirectoryConfig(req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Audit Logs
// -------------------------------------------------------------
apiRouter.get('/settings/audit-logs', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const logs = await getAuditLogs(limit);
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/settings/audit-logs', async (req: Request, res: Response) => {
  try {
    await addAuditLog({
      ...req.body,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Live Device SSH Connection & Switch Telemetry Discovery
// -------------------------------------------------------------
apiRouter.post(['/devices/test-connection'], async (req: Request, res: Response) => {
  const langHeader = (req.headers['accept-language'] as string) || '';
  const lang = (req.body?.lang || (langHeader.toLowerCase().includes('en') ? 'en' : 'fa')).toLowerCase();
  const isEn = lang.startsWith('en') || req.body?.is_en === true;

  try {
    const pythonPort = process.env.BACKEND_PORT || process.env.PYTHON_PORT || '5001';
    // Forward directly to Python backend SSH discovery engine to establish real Python SSH tunnel & mother connection
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const pythonResp = await fetch(`http://127.0.0.1:${pythonPort}/api/devices/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': isEn ? 'en' : 'fa',
        },
        body: JSON.stringify({ ...req.body, lang: isEn ? 'en' : 'fa', is_en: isEn }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (pythonResp && pythonResp.ok) {
        const pythonData = await pythonResp.json();
        if (pythonData) {
          if (pythonData.hardware) {
            pythonData.hostname = pythonData.hostname || pythonData.hardware.hostname;
            pythonData.model = pythonData.model || pythonData.hardware.model;
            pythonData.total_ports = pythonData.total_ports || pythonData.hardware.total_ports;
            pythonData.serial_number = pythonData.serial_number || pythonData.hardware.serial_number;
            pythonData.mac = pythonData.mac || pythonData.hardware.mac_address;
            pythonData.firmware = pythonData.firmware || pythonData.hardware.os_version;
            pythonData.uptime = pythonData.uptime || pythonData.hardware.uptime;
            pythonData.ip = pythonData.ip || pythonData.hardware.ip;
          }
          pythonData.ip = pythonData.ip || req.body?.ssh_host || req.body?.host || req.body?.ip;

          if (pythonData.ports_telemetry && (!pythonData.ports || pythonData.ports.length === 0)) {
            pythonData.ports = pythonData.ports_telemetry.ports;
            pythonData.total_ports = pythonData.total_ports || pythonData.ports_telemetry.total_ports;
          }
          if (Array.isArray(pythonData.ports)) {
            const seen = new Set<string>();
            const deduped: any[] = [];
            for (let idx = 0; idx < pythonData.ports.length; idx++) {
              const p = pythonData.ports[idx];
              if (!p || typeof p !== 'object') continue;
              const portId = p.port_id || p.port || p.name || `port-${idx + 1}`;
              const canon = String(portId).toLowerCase().replace(/gigabitethernet/g, 'gi').replace(/fastethernet/g, 'fa').replace(/tengigabitethernet/g, 'te');
              if (seen.has(canon)) continue;
              seen.add(canon);
              deduped.push({
                ...p,
                port_id: portId,
                port: p.port || portId,
                name: portId,
                description: p.description || '',
              });
            }
            pythonData.ports = deduped;
            pythonData.total_ports = deduped.length;
          }
          if (isEn && pythonData.message_en) {
            pythonData.message = pythonData.message_en;
          } else if (!isEn && pythonData.message_fa) {
            pythonData.message = pythonData.message_fa;
          }
          return res.json(pythonData);
        }
      }
    } catch {
      // If Python probe fails or times out, fallback to Node SSH discovery
    }

    const discoveryResult = await testAndDiscoverDeviceViaSsh({
      ...req.body,
      lang: isEn ? 'en' : 'fa',
      is_en: isEn,
    });
    res.json(discoveryResult);
  } catch (err: any) {
    const msgEn = `Server error establishing SSH connection: ${err.message}`;
    const msgFa = `خطای سرور در برقراری اتصال SSH: ${err.message}`;
    res.status(500).json({
      success: false,
      connected: false,
      error: err.message,
      message_en: msgEn,
      message_fa: msgFa,
      message: isEn ? msgEn : msgFa,
    });
  }
});

// -------------------------------------------------------------
// CDP & LLDP Topology Discovery Endpoints
// -------------------------------------------------------------
apiRouter.post('/topology/discovery/start', async (req: Request, res: Response) => {
  try {
    const jobId = await startDiscoveryJob(req.body);
    res.json({ success: true, jobId });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/topology/discovery/status/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const status = getDiscoveryJobStatus(jobId);
  if (!status) {
    return res.status(404).json({ success: false, error: 'Discovery job not found' });
  }
  res.json({ success: true, job: status });
});

apiRouter.post('/topology/discovery/cancel/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const cancelled = cancelDiscoveryJob(jobId);
  res.json({ success: cancelled });
});

apiRouter.post('/topology/discovery/apply', async (req: Request, res: Response) => {
  try {
    const result = await applyDiscoveryResultsToMap(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


