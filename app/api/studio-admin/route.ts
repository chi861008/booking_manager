import { NextResponse } from 'next/server';
import { isStudioAdmin } from '@/lib/studioAdminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export async function GET() {
  if (!await isStudioAdmin()) return NextResponse.json({ error: '請先登入行政管理頁' }, { status: 401 });
  const supabase = getSupabaseAdmin(); if (!supabase) return NextResponse.json({ error: '資料庫尚未設定' }, { status: 503 });
  const { data: studios, error } = await supabase.from('studios').select('id,name,created_at').order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ids = (studios ?? []).map(row => row.id);
  const [{ data: memberships, error: memberError }, { data: invitations, error: inviteError }] = ids.length ? await Promise.all([
    supabase.from('studio_memberships').select('teacher_id,studio_id,joined_at').in('studio_id', ids),
    supabase.from('studio_invitations').select('id,studio_id,created_at,expires_at,accepted_at,revoked_at').in('studio_id', ids).order('created_at', { ascending: false }),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (memberError || inviteError) return NextResponse.json({ error: (memberError ?? inviteError)?.message }, { status: 500 });
  const teacherIds = [...new Set((memberships ?? []).map(row => row.teacher_id))];
  const { data: teachers, error: teacherError } = teacherIds.length ? await supabase.from('teachers').select('id,name').in('id', teacherIds) : { data: [], error: null };
  if (teacherError) return NextResponse.json({ error: teacherError.message }, { status: 500 });
  const names = new Map((teachers ?? []).map(row => [row.id, row.name]));
  return NextResponse.json({ studios: (studios ?? []).map(studio => ({ ...studio,
    members: (memberships ?? []).filter(member => member.studio_id === studio.id).map(member => ({ id: member.teacher_id, name: names.get(member.teacher_id) ?? '老師', joinedAt: member.joined_at })),
    invitations: (invitations ?? []).filter(invite => invite.studio_id === studio.id).map(invite => ({ id: invite.id, expiresAt: invite.expires_at, acceptedAt: invite.accepted_at, revokedAt: invite.revoked_at })),
  })) }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(req: Request) {
  if (!await isStudioAdmin()) return NextResponse.json({ error: '請先登入行政管理頁' }, { status: 401 });
  const supabase = getSupabaseAdmin(); if (!supabase) return NextResponse.json({ error: '資料庫尚未設定' }, { status: 503 });
  const body = await req.json().catch(() => ({})); const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 2 || name.length > 60) return NextResponse.json({ error: '工作室名稱請輸入 2–60 字' }, { status: 400 });
  const { data, error } = await supabase.from('studios').insert({ name }).select('id,name').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
