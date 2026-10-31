-- Keep entrant registration independent of voting. Existing ballots remain locked.
begin;
create or replace function public.manage_side_contest(p_event_id uuid,p_action text,p_data jsonb default '{}')
returns uuid language plpgsql security definer set search_path=public as $$
declare c side_contests%rowtype; cat text; i integer:=0; entry_number integer; result_id uuid;
begin
 if not exists(select 1 from events e join account_users au on au.account_id=e.account_id where e.id=p_event_id and au.user_id=auth.uid()) then
  raise exception 'Only this show host can manage the contest.';
 end if;
 -- Serialize creation and changes for this show.
 perform 1 from events where id=p_event_id for update;
 select * into c from side_contests where event_id=p_event_id for update;
 if p_action='create' then
  if c.id is not null then raise exception 'This show already has a contest.'; end if;
  insert into side_contests(event_id,title,mode) values(p_event_id,trim(p_data->>'title'),p_data->>'mode') returning * into c;
  if c.mode='overall' then
   insert into side_contest_categories(contest_id,name,position) values(c.id,'Overall Winner',0);
  else
   if jsonb_typeof(p_data->'categories') is distinct from 'array' or jsonb_array_length(p_data->'categories') not between 1 and 10 then
    raise exception 'Add between one and ten categories.';
   end if;
   for cat in select trim(value) from jsonb_array_elements_text(p_data->'categories') loop
    insert into side_contest_categories(contest_id,name,position) values(c.id,cat,i);
    i:=i+1;
   end loop;
  end if;
 elsif c.id is null then raise exception 'Create the contest first.';
 elsif p_action='add_entry' then
  if c.status not in ('draft','open') then raise exception 'The contest has ended.'; end if;
  select coalesce(max(contestant_number),0)+1 into entry_number from side_contest_entries where contest_id=c.id;
  if nullif(p_data->>'photo_url','') is not null and p_data->>'photo_url' !~ '^https://' then raise exception 'Photo must use an HTTPS URL.'; end if;
  insert into side_contest_entries(contest_id,contestant_number,name,costume,photo_url)
  values(c.id,entry_number,trim(p_data->>'name'),coalesce(trim(p_data->>'costume'),''),nullif(p_data->>'photo_url',''));
 elsif p_action='remove_entry' then
  if c.status<>'draft' then raise exception 'Contestants are locked once voting begins.'; end if;
  delete from side_contest_entries where contest_id=c.id and id=(p_data->>'entry_id')::uuid;
 elsif p_action='registrations' then
  if c.status not in ('draft','open') then raise exception 'Entries are closed after voting ends.'; end if;
  update side_contests set registrations_open=coalesce((p_data->>'open')::boolean,false) where id=c.id;
 elsif p_action='approve_entry' then
  if c.status not in ('draft','open') then raise exception 'Voting has ended.'; end if;
  update side_contest_entries set approval_status='approved' where contest_id=c.id and id=(p_data->>'entry_id')::uuid and approval_status='pending';
  if not found then raise exception 'This entry is no longer pending.'; end if;
 elsif p_action='reject_entry' then
  if c.status not in ('draft','open') then raise exception 'Voting has ended.'; end if;
  update side_contest_entries set approval_status='rejected' where contest_id=c.id and id=(p_data->>'entry_id')::uuid and approval_status='pending';
  if not found then raise exception 'This entry is no longer pending.'; end if;
 elsif p_action='open' then
  if exists(select 1 from side_contest_entries where contest_id=c.id and approval_status='pending') then raise exception 'Review all pending entries before opening voting.'; end if;
  if not exists(select 1 from side_contest_entries where contest_id=c.id and approval_status='approved') then raise exception 'Add contestants before opening voting.'; end if;
  update side_contests set status='open',results_visible=false where id=c.id;
 elsif p_action='close' then
  if c.status<>'open' then raise exception 'Voting is not open.'; end if;
  update side_contests set status='closed',results_visible=false,registrations_open=false where id=c.id;
 elsif p_action='reveal' then
  if c.status<>'closed' then raise exception 'Close voting before revealing results.'; end if;
  update side_contests set results_visible=coalesce((p_data->>'visible')::boolean,true) where id=c.id;
 else raise exception 'Unknown contest action.';
 end if;
 return c.id;
end;
$$;


create or replace function public.side_contest_snapshot(p_contest_id uuid,p_voter_key uuid default null)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare c side_contests%rowtype; show_counts boolean; is_host boolean;
begin
 select * into c from side_contests where id=p_contest_id;
 if c.id is null then raise exception 'Contest not found.'; end if;
 is_host := exists(
  select 1 from events e join account_users au on au.account_id=e.account_id where e.id=c.event_id and au.user_id=auth.uid());
 show_counts := (c.status='closed' and c.results_visible) or is_host;
 return jsonb_build_object(
  'id',c.id,'title',c.title,'mode',c.mode,'status',c.status,'results_visible',c.results_visible,'registrations_open',(c.registrations_open and c.status in ('draft','open')),
  'pending_entries',case when is_host then coalesce((select jsonb_agg(jsonb_build_object('id',en.id,'number',en.contestant_number,'name',en.name,'costume',en.costume,'photo_url',en.photo_url) order by en.contestant_number) from side_contest_entries en where en.contest_id=c.id and en.approval_status='pending'),'[]'::jsonb) else '[]'::jsonb end,
  'categories',coalesce((select jsonb_agg(jsonb_build_object('id',cat.id,'name',cat.name) order by cat.position) from side_contest_categories cat where cat.contest_id=c.id),'[]'::jsonb),
  'entries',coalesce((select jsonb_agg(jsonb_build_object('id',en.id,'number',en.contestant_number,'name',en.name,'costume',en.costume,'photo_url',en.photo_url) order by en.contestant_number) from side_contest_entries en where en.contest_id=c.id and en.approval_status='approved'),'[]'::jsonb),
  'selections',coalesce((select jsonb_object_agg(v.category_id::text,v.entry_id) from side_contest_votes v where v.contest_id=c.id and v.voter_key=p_voter_key),'{}'::jsonb),
  'counts',case when show_counts then coalesce((select jsonb_agg(jsonb_build_object('category_id',v.category_id,'entry_id',v.entry_id,'votes',v.total)) from (select category_id,entry_id,count(*) total from side_contest_votes where contest_id=c.id group by category_id,entry_id) v),'[]'::jsonb) else null end
 );
end;
$$;

create or replace function public.submit_side_contest_entry(
 p_contest_id uuid,p_entry_key uuid,p_name text,p_costume text default ''
)
returns uuid language plpgsql security definer set search_path=public as $$
declare c side_contests%rowtype; new_id uuid; entry_number integer;
begin
 select * into c from side_contests where id=p_contest_id for update;
 if c.id is null or c.status not in ('draft','open') or not c.registrations_open then raise exception 'Contest entries are closed.'; end if;
 if not exists(select 1 from events where id=c.event_id and is_show_ended=false and is_archived=false) then raise exception 'This show has ended.'; end if;
 if p_entry_key is null or p_name is null or length(trim(p_name)) not between 1 and 100 or length(coalesce(p_costume,''))>200 then raise exception 'Enter a name and keep the costume description within 200 characters.'; end if;
 if exists(select 1 from side_contest_entries where contest_id=c.id and entry_key=p_entry_key) then raise exception 'You already entered this contest. Ask the host if you need changes.'; end if;
 select coalesce(max(contestant_number),0)+1 into entry_number from side_contest_entries where contest_id=c.id;
 insert into side_contest_entries(contest_id,contestant_number,name,costume,entry_key,approval_status)
 values(c.id,entry_number,trim(p_name),trim(coalesce(p_costume,'')),p_entry_key,'pending') returning id into new_id;
 return new_id;
end;
$$;

commit;
