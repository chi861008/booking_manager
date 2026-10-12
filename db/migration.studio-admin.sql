-- 工作室由獨立行政後台管理，不再要求任何老師擔任負責人。
alter table studios alter column owner_teacher_id drop not null;
alter table studios alter column owner_teacher_id drop default;
alter table studio_invitations alter column created_by drop not null;
update studios set owner_teacher_id = null;
update studio_memberships set role = 'member' where role in ('owner', 'manager');

create or replace function studio_admin_remove_member(p_target uuid) returns int language plpgsql as $$
declare affected uuid[]; removed_count int;
begin
  if not exists(select 1 from studio_memberships where teacher_id=p_target) then raise exception '找不到工作室老師'; end if;
  select coalesce(array_agg(id),'{}'::uuid[]) into affected from lessons
    where (substitute_teacher_id=p_target or (teacher_id=p_target and substitute_teacher_id is not null))
      and status in ('active','leave_pending')
      and (date::timestamp + start_min * interval '1 minute') at time zone 'Asia/Taipei' > now();
  insert into unassigned(period_id,student_id,week_start,reason)
    select distinct l.period_id,l.student_id,date_trunc('week',l.date::timestamp)::date,'substitute_removed'
    from lessons l where l.id=any(affected)
      and not exists(select 1 from unassigned u where u.period_id=l.period_id and u.student_id=l.student_id
        and u.week_start=date_trunc('week',l.date::timestamp)::date and u.reason='substitute_removed');
  update leave_requests set state='deferred',resolved_at=now() where lesson_id=any(affected) and state='pending';
  delete from unassigned u using leave_requests lr where lr.lesson_id=any(affected)
    and u.period_id=lr.period_id and u.student_id=lr.student_id and u.week_start=lr.week_start and u.reason='leave_requested';
  update lessons set status='cancelled' where id=any(affected);
  delete from studio_memberships where teacher_id=p_target;
  removed_count := cardinality(affected);
  return removed_count;
end $$;
revoke all on function studio_admin_remove_member(uuid) from public, anon, authenticated;
grant execute on function studio_admin_remove_member(uuid) to service_role;
