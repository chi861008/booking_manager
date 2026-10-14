import { NextResponse } from 'next/server';
import { isStudioAdmin } from '@/lib/studioAdminAuth';

export async function proxyAdminRequest(path: string, method: string, body?: unknown) {
  if (!await isStudioAdmin()) return NextResponse.json({ error: '請先登入行政管理頁' }, { status: 401 });
  const base = process.env.PILATES_BACKEND_URL; const secret = process.env.STUDIO_ADMIN_API_SECRET;
  if (!base || !secret) return NextResponse.json({ error: '尚未設定排課系統連線' }, { status: 503 });
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}${path}`, {
      method, cache: 'no-store', headers: { Authorization: `Bearer ${secret}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 401) return NextResponse.json({ error: '排課系統的行政連線驗證失敗，請管理者確認兩站的連線設定。' }, { status: 502 });
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: '連線排課系統失敗' }, { status: 502 }); }
}
