import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export type StudioRole = 'owner' | 'manager' | 'member';
export interface StudioMembership { teacherId: string; studioId: string; role: StudioRole }
export interface StudioCandidate { id: string; name: string; status: 'available' | 'unknown' }

export const inviteHash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export async function getStudioMembership(supabase: SupabaseClient, teacherId: string): Promise<StudioMembership | null> {
  const { data, error } = await supabase.from('studio_memberships').select('teacher_id,studio_id,role')
    .eq('teacher_id', teacherId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { teacherId: data.teacher_id, studioId: data.studio_id, role: data.role as StudioRole } : null;
}

export async function getStudioCandidates(
  supabase: SupabaseClient, teacherId: string, date: string, start: number, ignoreLessonId?: string,
): Promise<{ studioId: string; candidates: StudioCandidate[] } | null> {
  const membership = await getStudioMembership(supabase, teacherId);
  if (!membership) return null;
  const { data: rows, error: membersError } = await supabase.from('studio_memberships')
    .select('teacher_id').eq('studio_id', membership.studioId);
  if (membersError) throw new Error(membersError.message);
  const ids = (rows ?? []).map(row => row.teacher_id as string);
  if (!ids.length) return { studioId: membership.studioId, candidates: [] };

  const [teachers, periods, slots, busy, blocks] = await Promise.all([
    supabase.from('teachers').select('id,name').in('id', ids),
    supabase.from('periods').select('teacher_id,hours_submitted_at').in('teacher_id', ids).eq('ym', date.slice(0, 7)),
    supabase.from('slots').select('owner_id').eq('owner_type', 'teacher').in('owner_id', ids).eq('date', date).eq('start_min', start),
    supabase.from('lesson_teacher_occupancy').select('teacher_id,lesson_id').in('teacher_id', ids).eq('date', date).eq('start_min', start),
    supabase.from('weekly_blocks').select('teacher_id,weekday,start_min,end_min').in('teacher_id', ids)
      .eq('weekday', new Date(`${date}T12:00:00+08:00`).getUTCDay()),
  ]);
  for (const result of [teachers, periods, slots, busy, blocks]) if (result.error) throw new Error(result.error.message);

  const submitted = new Set((periods.data ?? []).filter(row => row.hours_submitted_at).map(row => row.teacher_id));
  const working = new Set((slots.data ?? []).map(row => row.owner_id));
  const occupied = new Set((busy.data ?? []).filter(row => row.lesson_id !== ignoreLessonId).map(row => row.teacher_id));
  const blocked = new Set((blocks.data ?? []).filter(row => row.start_min <= start && row.end_min > start).map(row => row.teacher_id));
  const candidates: StudioCandidate[] = [];
  for (const teacher of teachers.data ?? []) {
    if (occupied.has(teacher.id) || blocked.has(teacher.id)) continue;
    if (submitted.has(teacher.id)) {
      if (working.has(teacher.id)) candidates.push({ id: teacher.id, name: teacher.name, status: 'available' });
    } else if (teacher.id !== teacherId) {
      candidates.push({ id: teacher.id, name: teacher.name, status: 'unknown' });
    }
  }
  return { studioId: membership.studioId, candidates: candidates.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant')) };
}

export async function validateStudioCandidate(
  supabase: SupabaseClient, ownerId: string, substituteId: string | null, date: string,
  start: number, manualConfirmed: boolean, ignoreLessonId?: string,
): Promise<{ name: string | null; error: string | null }> {
  const result = await getStudioCandidates(supabase, ownerId, date, start, ignoreLessonId);
  if (!result) return { name: null, error: '你尚未加入工作室。' };
  const candidate = result.candidates.find(row => row.id === (substituteId ?? ownerId));
  if (!candidate) return { name: null, error: '這位老師在所選時段無法代課，請重新選擇。' };
  if (candidate.status === 'unknown' && !manualConfirmed) return { name: null, error: '請先確認已私下核實老師可以代課。' };
  return { name: substituteId ? candidate.name : null, error: null };
}
