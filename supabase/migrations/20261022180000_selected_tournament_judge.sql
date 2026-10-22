-- Optional explicit judge selection. NULL preserves every existing show's scoring.
begin;
alter table public.events add column if not exists selected_judge_device_id text;
do $$
declare definition text;
begin
 select pg_get_viewdef('public.scoring_votes'::regclass,true) into definition;
 -- Wrap the existing weighted score projection without changing its columns or types.
 if position('selected_judge_device_id' in definition)=0 then
  definition:=regexp_replace(definition,';[[:space:]]*$','');
  execute 'create or replace view public.scoring_votes with (security_invoker=true) as select scoped.* from ('||definition||') scoped join public.events chosen_event on chosen_event.id=scoped.event_id where chosen_event.selected_judge_device_id is null or scoped.device_id=chosen_event.selected_judge_device_id';
 end if;
end $$;
notify pgrst,'reload schema';
commit;
