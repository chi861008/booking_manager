import { NextResponse } from 'next/server';
import { createStudioAdminSession, isStudioAdmin, sessionCookieOptions, STUDIO_ADMIN_COOKIE, verifyStudioAdminCredentials } from '@/lib/studioAdminAuth';

export const dynamic = 'force-dynamic';
export async function GET() { return NextResponse.json({ authenticated: await isStudioAdmin() }); }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (typeof body.username !== 'string' || typeof body.password !== 'string' || !verifyStudioAdminCredentials(body.username, body.password))
    return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 });
  const token = createStudioAdminSession();
  if (!token) return NextResponse.json({ error: '行政登入尚未設定完整' }, { status: 503 });
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(STUDIO_ADMIN_COOKIE, token, sessionCookieOptions());
  return response;
}
export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(STUDIO_ADMIN_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
