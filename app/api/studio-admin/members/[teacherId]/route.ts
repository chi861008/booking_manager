import { NextResponse } from 'next/server';
import { isStudioAdmin } from '@/lib/studioAdminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function DELETE(_req: Request, { params }: { params: Promise<{ teacherId: string }> }) {
  if (!await isStudioAdmin()) return NextResponse.json({ error: '請先登入行政管理頁' }, { status: 401 });
  const { teacherId } = await params; const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: '資料庫尚未設定' }, { status: 503 });
  const { data, error } = await supabase.rpc('studio_admin_remove_member', { p_target: teacherId });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true, futureLessonsToReassign: data });
}
