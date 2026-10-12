import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { isStudioAdmin } from '@/lib/studioAdminAuth';
import { inviteHash } from '@/lib/studio';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  if (!await isStudioAdmin()) return NextResponse.json({ error: '請先登入行政管理頁' }, { status: 401 });
  const supabase = getSupabaseAdmin(); if (!supabase) return NextResponse.json({ error: '資料庫尚未設定' }, { status: 503 });
  const { studioId } = await req.json().catch(() => ({}));
  if (typeof studioId !== 'string') return NextResponse.json({ error: '請選擇工作室' }, { status: 400 });
  const token = crypto.randomBytes(24).toString('base64url'); const expiresAt = new Date(Date.now() + 7 * 24 * 3600e3).toISOString();
  const { data, error } = await supabase.from('studio_invitations').insert({ studio_id: studioId, token_hash: inviteHash(token), expires_at: expiresAt })
    .select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const schedulerUrl = process.env.SCHEDULER_URL || new URL(req.url).origin;
  return NextResponse.json({ id: data.id, url: `${schedulerUrl.replace(/\/$/, '')}/studio/join?token=${token}`, expiresAt });
}
export async function DELETE(req: Request) {
  if (!await isStudioAdmin()) return NextResponse.json({ error: '請先登入行政管理頁' }, { status: 401 });
  const supabase = getSupabaseAdmin(); if (!supabase) return NextResponse.json({ error: '資料庫尚未設定' }, { status: 503 });
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== 'string') return NextResponse.json({ error: '邀請資料不正確' }, { status: 400 });
  const { data, error } = await supabase.from('studio_invitations').update({ revoked_at: new Date().toISOString() }).eq('id', id)
    .is('accepted_at', null).is('revoked_at', null).select('id').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: '邀請已失效' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
