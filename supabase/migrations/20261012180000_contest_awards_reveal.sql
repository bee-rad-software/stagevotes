begin;
alter table public.side_contests add column if not exists awards_category_id uuid references public.side_contest_categories(id) on delete set null;
alter table public.side_contests add column if not exists awards_step integer not null default 0 check(awards_step between 0 and 3);

create or replace function public.set_contest_awards(p_contest_id uuid,p_category_id uuid,p_step integer)
returns void language plpgsql security definer set search_path=public as $$
declare c side_contests%rowtype;
begin
 select * into c from side_contests where id=p_contest_id for update;
 if c.id is null or not exists(select 1 from events e join account_users au on au.account_id=e.account_id where e.id=c.event_id and au.user_id=auth.uid()) then raise exception 'Only this show host can reveal awards.'; end if;
 if c.status<>'closed' then raise exception 'Close voting before presenting awards.'; end if;
 if p_step is null or p_step not between 0 and 3 or not exists(select 1 from side_contest_categories where id=p_category_id and contest_id=c.id) then raise exception 'Select a valid category and reveal step.'; end if;
 update side_contests set awards_category_id=p_category_id,awards_step=p_step,results_visible=false where id=c.id;
end;
$$;

create or replace function public.contest_awards_snapshot(p_contest_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare c side_contests%rowtype; category_name text;
begin
 select * into c from side_contests where id=p_contest_id;
 if c.id is null then raise exception 'Contest not found.'; end if;
 select name into category_name from side_contest_categories where id=c.awards_category_id and contest_id=c.id;
 return jsonb_build_object(
 'title',c.title,'category',coalesce(category_name,'People''s Choice'),
 'category_id',c.awards_category_id,
 'step',case when c.status='closed' then c.awards_step else 0 end,
 'closed',(c.status='closed'),
 'winners',case when c.status='closed' and c.awards_step>0 then coalesce((
  select jsonb_agg(jsonb_build_object('id',r.id,'number',r.contestant_number,'name',r.name,'costume',r.costume,'photo_url',r.photo_url,'votes',r.total,'rank',r.placing) order by r.placing,r.contestant_number)
  from (
   select en.*,count(v.entry_id) total,rank() over(order by count(v.entry_id) desc) placing
   from side_contest_entries en left join side_contest_votes v on v.entry_id=en.id and v.category_id=c.awards_category_id
   where en.contest_id=c.id and en.approval_status='approved'
   group by en.id
  ) r where r.total>0 and r.placing between 4-c.awards_step and 3
 ),'[]'::jsonb) else '[]'::jsonb end);
end;
$$;
revoke all on function public.set_contest_awards(uuid,uuid,integer),public.contest_awards_snapshot(uuid) from public;
grant execute on function public.set_contest_awards(uuid,uuid,integer) to authenticated;
grant execute on function public.contest_awards_snapshot(uuid) to anon,authenticated;
commit;
