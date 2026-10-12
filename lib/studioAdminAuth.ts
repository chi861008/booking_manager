import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export const STUDIO_ADMIN_COOKIE = 'studio_admin_session';
const SESSION_MAX_AGE = 60 * 60 * 12;

function secret() { return process.env.STUDIO_ADMIN_SESSION_SECRET || process.env.LINE_LOGIN_CHANNEL_SECRET || null; }
function safeEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function verifyStudioAdminCredentials(username: string, password: string) {
  const expectedUser = process.env.STUDIO_ADMIN_USERNAME;
  const expectedPassword = process.env.STUDIO_ADMIN_PASSWORD;
  return !!expectedUser && !!expectedPassword && safeEqual(username, expectedUser) && safeEqual(password, expectedPassword);
}
export function createStudioAdminSession() {
  const key = secret(); if (!key) return null;
  const payload = Buffer.from(JSON.stringify({ role: 'studio-admin', exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE })).toString('base64url');
  const signature = crypto.createHmac('sha256', key).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
export function verifyStudioAdminSession(value?: string | null) {
  const key = secret(); if (!key || !value) return false;
  const [payload, signature] = value.split('.'); if (!payload || !signature) return false;
  const expected = crypto.createHmac('sha256', key).update(payload).digest('base64url');
  if (!safeEqual(signature, expected)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return decoded.role === 'studio-admin' && Number(decoded.exp) > Date.now() / 1000;
  } catch { return false; }
}
export async function isStudioAdmin() {
  const store = await cookies();
  return verifyStudioAdminSession(store.get(STUDIO_ADMIN_COOKIE)?.value);
}
export function sessionCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: SESSION_MAX_AGE };
}
