import { prisma, withDbRetry } from '@/lib/prisma';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface SessionPayload {
  user: AuthUser;
  exp: number; // expiration timestamp in seconds
}

export const COOKIE_NAME = 'koa_session';

// Secret key for HMAC-SHA256 signing
const SECRET = process.env.SESSION_SECRET || 'koa-living-inventory-super-secret-key-2026';

function base64UrlEncode(str: string): string {
  if (typeof btoa === 'function') {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  if (typeof atob === 'function') {
    return atob(base64);
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Sign a session token into a JWT-like format: header.payload.signature
 */
export async function signSessionToken(user: AuthUser, maxAgeSeconds: number = 7 * 24 * 60 * 60): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const payload: SessionPayload = { user, exp };

  const encHeader = base64UrlEncode(JSON.stringify(header));
  const encPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encHeader}.${encPayload}`;

  const key = await getCryptoKey();
  const signatureBuffer = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(data)
  );

  const signatureBytes = new Uint8Array(signatureBuffer);
  let binary = '';
  for (let i = 0; i < signatureBytes.byteLength; i++) {
    binary += String.fromCharCode(signatureBytes[i]);
  }
  const encSignature = base64UrlEncode(binary);

  return `${data}.${encSignature}`;
}

/**
 * Verify a session token and return the payload if valid and not expired
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encHeader, encPayload, encSignature] = parts;
    const data = `${encHeader}.${encPayload}`;

    const key = await getCryptoKey();

    // Decode signature
    const sigBinary = base64UrlDecode(encSignature);
    const sigBytes = new Uint8Array(sigBinary.length);
    for (let i = 0; i < sigBinary.length; i++) {
      sigBytes[i] = sigBinary.charCodeAt(i);
    }

    const isValid = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(data)
    );

    if (!isValid) return null;

    const payloadJson = base64UrlDecode(encPayload);
    const payload = JSON.parse(payloadJson) as SessionPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Hash password with salt using Web Crypto API SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
  const saltBytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(saltBytes);
  const salt = Array.from(saltBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

  const enc = new TextEncoder();
  const data = enc.encode(salt + password);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return `${salt}:${hashHex}`;
}

/**
 * Verify password against stored salt:hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, expectedHash] = storedHash.split(':');
    if (!salt || !expectedHash) return false;

    const enc = new TextEncoder();
    const data = enc.encode(salt + password);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const actualHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return actualHash === expectedHash;
  } catch {
    return false;
  }
}

export type AuthResult =
  | { success: true; user: AuthUser }
  | { success: false; error: string; status: number };

/**
 * Authenticates user credentials with support for database accounts,
 * pending approval checks, account disabled checks, and automatic
 * deactivation of the temporary bootstrap admin once an original admin exists.
 */
export async function authenticateUser(emailInput: string, passInput: string): Promise<AuthResult> {
  const email = emailInput.toLowerCase().trim();
  const pass = passInput.trim();

  // 1. Check database for registered user first
  try {
    const dbUser = await withDbRetry(async () => {
      return await prisma.user.findUnique({
        where: { email },
      });
    });

    if (dbUser) {
      const isPasswordCorrect = await verifyPassword(pass, dbUser.password);
      if (!isPasswordCorrect) {
        return { success: false, error: 'Invalid email or password.', status: 401 };
      }

      if (dbUser.status === 'PENDING') {
        return {
          success: false,
          error: 'Your account is pending administrator approval. An admin must approve your registration before you can log in.',
          status: 403,
        };
      }

      if (dbUser.status === 'DISABLED') {
        return {
          success: false,
          error: 'Your account has been disabled. Please contact your system administrator.',
          status: 403,
        };
      }

      return {
        success: true,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
        },
      };
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('DB authentication error:', error);
    if (error?.message?.includes('waking up')) {
      return {
        success: false,
        error: 'The database is currently waking up from suspend mode. Please wait a few seconds and try again.',
        status: 503,
      };
    }
  }

  // 2. Fallback check for temporary bootstrap admin
  // "our temp admin id will be removed after original admin have been made"
  try {
    const activeAdminCount = await withDbRetry(async () => {
      return await prisma.user.count({
        where: { role: 'ADMIN', status: 'ACTIVE' },
      });
    });

    // If an original real admin exists in the database, the temp admin is PERMANENTLY DISABLED
    if (activeAdminCount > 0) {
      return { success: false, error: 'Invalid email or password.', status: 401 };
    }

    // Only when NO active admin exists yet in the database: allow bootstrap admin
    const tempAdminEmail = (process.env.ADMIN_EMAIL || 'admin@koaliving.com').toLowerCase().trim();
    const tempAdminPass = (process.env.ADMIN_PASSWORD || 'admin123').trim();

    if (email === tempAdminEmail && pass === tempAdminPass) {
      return {
        success: true,
        user: {
          id: 'temp-bootstrap-admin',
          email: tempAdminEmail,
          name: 'Temporary Administrator (Bootstrap)',
          role: 'ADMIN',
        },
      };
    }
  } catch {
    // If DB count fails, allow bootstrap admin as emergency fallback
    const tempAdminEmail = (process.env.ADMIN_EMAIL || 'admin@koaliving.com').toLowerCase().trim();
    const tempAdminPass = (process.env.ADMIN_PASSWORD || 'admin123').trim();

    if (email === tempAdminEmail && pass === tempAdminPass) {
      return {
        success: true,
        user: {
          id: 'temp-bootstrap-admin',
          email: tempAdminEmail,
          name: 'Temporary Administrator (Bootstrap)',
          role: 'ADMIN',
        },
      };
    }
  }

  return { success: false, error: 'Invalid email or password.', status: 401 };
}
