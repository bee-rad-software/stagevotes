-- New shows accept audience photos and shout-outs by default.
-- Existing shows and any host-selected off setting remain unchanged.
begin;
alter table public.events alter column photo_sharing_enabled set default true;
alter table public.show_shoutout_settings alter column enabled set default true;

create or replace function public.initialize_show_audience_features()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.show_shoutout_settings(event_id,enabled)
  values(new.id,true)
  on conflict(event_id) do nothing;
  return new;
end;
$$;
revoke all on function public.initialize_show_audience_features() from public,anon,authenticated;
drop trigger if exists initialize_show_audience_features on public.events;
create trigger initialize_show_audience_features after insert on public.events
for each row execute function public.initialize_show_audience_features();

-- Approval, upload limits, and show-ended guards are unchanged.
notify pgrst, 'reload schema';
commit;
