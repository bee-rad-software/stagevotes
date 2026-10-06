begin;
alter table public.events add column if not exists share_judge_notes boolean not null default false;

create or replace function public.get_my_judge_notes(p_event_id uuid)
returns table(performance_id uuid,song_title text,artist text,judge_name text,note text,submitted_at timestamptz)
language sql stable security definer set search_path=public as $$
  select p.id,p.song_title::text,p.artist::text,n.judge_name,n.note,n.submitted_at
  from judge_ballot_notes n
  join performances p on p.id=n.performance_id and p.event_id=n.event_id
  join events e on e.id=n.event_id
  join singer_profiles sp on sp.id=p.singer_profile_id
  where e.id=p_event_id and e.share_judge_notes=true
    and sp.user_id=auth.uid() and p.status='completed' and length(trim(n.note))>0
  order by n.submitted_at;
$$;
revoke all on function public.get_my_judge_notes(uuid) from public;
grant execute on function public.get_my_judge_notes(uuid) to authenticated;
commit;
