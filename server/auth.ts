import crypto from 'crypto';

// Secret key for signing session tokens (fallback to generated random key)
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'nettopology_super_secret_jwt_key_2026_cisco_ops';

// Rate Limiter Storage for Brute Force Protection
interface RateLimitRecord {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

const loginRateLimits = new Map<string, RateLimitRecord>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds

export interface UserSessionPayload {
  userId: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  userType: 'local' | 'ad';
  policyId?: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Hash password with a unique salt using PBKDF2-SHA512 (100,000 iterations)
 */
export function hashPassword(password: string, customSalt?: string): { hash: string; salt: string } {
  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Verify password against stored hash and salt
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  if (!password || !storedHash || !salt) return false;
  try {
    const { hash } = hashPassword(password, salt);
    // Timing-safe comparison to prevent side-channel timing attacks
    const bufferA = Buffer.from(hash, 'hex');
    const bufferB = Buffer.from(storedHash, 'hex');
    if (bufferA.length !== bufferB.length) return false;
    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch {
    return false;
  }
}

/**
 * Generate cryptographically signed token
 */
export function generateToken(payload: Omit<UserSessionPayload, 'issuedAt' | 'expiresAt'>, rememberMe: boolean = false): string {
  const issuedAt = Date.now();
  // 7 days if rememberMe, otherwise 12 hours
  const duration = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
  const expiresAt = issuedAt + duration;

  const fullPayload: UserSessionPayload = {
    ...payload,
    issuedAt,
    expiresAt,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payloadBase64).digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode session token
 */
export function verifyToken(token: string): UserSessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(payloadBase64).digest('base64url');

  try {
    const sigA = Buffer.from(signature);
    const sigB = Buffer.from(expectedSignature);
    if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
      return null;
    }

    const jsonStr = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const payload = JSON.parse(jsonStr) as UserSessionPayload;

    if (Date.now() > payload.expiresAt) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if identifier (IP or username) is currently locked by anti-brute-force
 */
export function checkRateLimit(key: string): { locked: boolean; remainingSec: number } {
  const record = loginRateLimits.get(key);
  if (!record) return { locked: false, remainingSec: 0 };

  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    const remainingSec = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    return { locked: true, remainingSec };
  }

  // Lock expired
  if (record.lockedUntil && Date.now() >= record.lockedUntil) {
    loginRateLimits.delete(key);
  }

  return { locked: false, remainingSec: 0 };
}

/**
 * Record a failed login attempt
 */
export function recordFailedLogin(key: string): { locked: boolean; remainingSec: number; attemptsLeft: number } {
  const now = Date.now();
  let record = loginRateLimits.get(key);

  if (!record) {
    record = { failedAttempts: 1, lockedUntil: null, lastAttempt: now };
    loginRateLimits.set(key, record);
    return { locked: false, remainingSec: 0, attemptsLeft: MAX_FAILED_ATTEMPTS - 1 };
  }

  // If previous attempt was more than 15 minutes ago, reset
  if (now - record.lastAttempt > 15 * 60 * 1000) {
    record.failedAttempts = 1;
    record.lockedUntil = null;
    record.lastAttempt = now;
    return { locked: false, remainingSec: 0, attemptsLeft: MAX_FAILED_ATTEMPTS - 1 };
  }

  record.failedAttempts += 1;
  record.lastAttempt = now;

  if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    return { locked: true, remainingSec: Math.ceil(LOCKOUT_DURATION_MS / 1000), attemptsLeft: 0 };
  }

  return {
    locked: false,
    remainingSec: 0,
    attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - record.failedAttempts),
  };
}

/**
 * Clear failed attempts after successful login
 */
export function clearRateLimit(key: string): void {
  loginRateLimits.delete(key);
}
