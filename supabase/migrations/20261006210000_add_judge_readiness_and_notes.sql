begin;

create table if not exists public.judge_sessions (
  event_id uuid not null references public.events(id) on delete cascade,
  device_id text not null,
  session_token uuid not null,
  judge_name text not null check (length(judge_name) between 1 and 80),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (event_id, device_id)
);
create table if not exists public.judge_ballot_notes (
  event_id uuid not null references public.events(id) on delete cascade,
  performance_id uuid not null references public.performances(id) on delete cascade,
  device_id text not null,
  judge_name text not null,
  note text not null default '' check (length(note) <= 2000),
  submitted_at timestamptz not null default now(),
  primary key (performance_id, device_id)
);
alter table public.judge_sessions enable row level security;
alter table public.judge_ballot_notes enable row level security;
revoke all on public.judge_sessions, public.judge_ballot_notes from anon;
grant select on public.judge_ballot_notes to authenticated;
grant select (event_id, device_id, judge_name, last_seen_at, created_at) on public.judge_sessions to authenticated;
drop policy if exists judge_sessions_host_read on public.judge_sessions;
create policy judge_sessions_host_read on public.judge_sessions for select to authenticated
using (exists (select 1 from public.events e join public.account_users au on au.account_id=e.account_id where e.id=judge_sessions.event_id and au.user_id=auth.uid()));
drop policy if exists judge_notes_host_read on public.judge_ballot_notes;
create policy judge_notes_host_read on public.judge_ballot_notes for select to authenticated
using (exists (select 1 from public.events e join public.account_users au on au.account_id=e.account_id where e.id=judge_ballot_notes.event_id and au.user_id=auth.uid()));

create or replace function public.check_in_judge(p_event_id uuid, p_device_id text, p_token uuid, p_name text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if p_token is null or p_device_id is null or length(p_device_id) not between 1 and 100 or p_name is null or length(trim(p_name)) not between 1 and 80 then
    raise exception 'Enter your judge name.';
  end if;
  if not exists (select 1 from events where id=p_event_id and coalesce(is_show_ended,false)=false and judging_enabled=true) then
    raise exception 'This show is not accepting judges.';
  end if;
  insert into judge_sessions(event_id,device_id,session_token,judge_name)
  values(p_event_id,p_device_id,p_token,trim(p_name))
  on conflict(event_id,device_id) do update
  set judge_name=excluded.judge_name,last_seen_at=now()
  where judge_sessions.session_token=p_token;
  if not found then raise exception 'Judge session does not match this device.'; end if;
end;
$$;

create or replace function public.submit_judge_ballot(p_event_id uuid, p_performance_id uuid, p_device_id text, p_token uuid, p_scores jsonb, p_note text default '')
returns void language plpgsql security definer set search_path=public as $$
declare
  ev events%rowtype;
  judge_label text;
  expected_categories integer;
begin
  -- Serialize ballots with advancement on the event row.
  select * into ev from events where id=p_event_id for update;
  if not found or ev.is_voting_open is not true or ev.current_performance_id is distinct from p_performance_id or coalesce(ev.is_show_ended,false) then
    raise exception 'This performance is no longer accepting ballots.';
  end if;
  select judge_name into judge_label from judge_sessions
  where event_id=p_event_id and device_id=p_device_id and session_token=p_token;
  if judge_label is null then raise exception 'Check in as a judge before submitting.'; end if;
  if length(coalesce(p_note,''))>2000 then raise exception 'Keep notes within 2000 characters.'; end if;
  if jsonb_typeof(p_scores) is distinct from 'object' then raise exception 'Invalid scores.'; end if;
  select count(*) into expected_categories from vote_categories where event_id=p_event_id;
  if expected_categories=0 or (select count(*) from jsonb_object_keys(p_scores))<>expected_categories
    or exists (select 1 from vote_categories c where c.event_id=p_event_id and
      (not (p_scores ? c.id::text) or coalesce(p_scores->>c.id::text,'') !~ '^[1-5]$')) then
    raise exception 'Score every category from 1 to 5.';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_performance_id::text),hashtext(p_device_id));
  if exists(select 1 from votes where performance_id=p_performance_id and device_id=p_device_id) then
    raise exception 'Your ballot was already submitted.';
  end if;
  insert into judge_ballot_notes(event_id,performance_id,device_id,judge_name,note)
  values(p_event_id,p_performance_id,p_device_id,judge_label,trim(coalesce(p_note,'')));
  insert into votes(event_id,account_id,performance_id,voter_key,device_id,category_id,score)
  select p_event_id,ev.account_id,p_performance_id,p_token::text,p_device_id,c.id,(p_scores->>c.id::text)::integer
  from vote_categories c where c.event_id=p_event_id;
  update judge_sessions set last_seen_at=now() where event_id=p_event_id and device_id=p_device_id;
end;
$$;
revoke all on function public.check_in_judge(uuid,text,uuid,text) from public;
revoke all on function public.submit_judge_ballot(uuid,uuid,text,uuid,jsonb,text) from public;
grant execute on function public.check_in_judge(uuid,text,uuid,text) to anon,authenticated;
grant execute on function public.submit_judge_ballot(uuid,uuid,text,uuid,jsonb,text) to anon,authenticated;
commit;
