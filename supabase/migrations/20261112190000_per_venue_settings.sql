begin;
-- Snapshot current account configuration once; later changes are independent per venue.
alter table public.venues add column if not exists settings jsonb;
update public.venues v set settings = jsonb_build_object(
 'singa_enabled',coalesce(a.singa_enabled,false),
 'karafun_channel',coalesce(a.karafun_channel,''),
 'tips_enabled',coalesce(a.tips_enabled,false),
 'venmo_url',coalesce(a.venmo_url,''),
 'cashapp_url',coalesce(a.cashapp_url,''),
 'apple_pay_url',coalesce(a.apple_pay_url,''),
 'static_signup_qr',coalesce(a.static_signup_qr,true),
 'static_judge_qr',coalesce(a.static_judge_qr,true),
 'static_people_qr',coalesce(a.static_people_qr,true),
 'max_songs_per_singer',coalesce(a.max_songs_per_singer,3)
) from public.accounts a where v.account_id=a.id and v.settings is null;
alter table public.venues alter column settings set default '{"singa_enabled":false,"karafun_channel":"","tips_enabled":false,"venmo_url":"","cashapp_url":"","apple_pay_url":"","static_signup_qr":true,"static_judge_qr":true,"static_people_qr":true,"max_songs_per_singer":3}'::jsonb;
comment on column public.venues.settings is 'Venue-specific karaoke provider, remote access, tips, static QR and singer limits. Account settings remain only a legacy fallback.';

-- Guests can read a show's allowed configuration without publishing the venue profile.
create or replace function public.stagevotes_event_venue_settings(p_event_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
 select jsonb_build_object(
  'venue_id',v.id,'account_id',v.account_id,'logo_url',v.logo_url,
  'settings',(select jsonb_object_agg(key,value) from jsonb_each(v.settings)
    where key = any(array['singa_enabled','karafun_channel','tips_enabled','venmo_url','cashapp_url','apple_pay_url','static_signup_qr','static_judge_qr','static_people_qr','max_songs_per_singer']))
 ) from public.events e join public.venues v on v.id=e.venue_id and v.account_id=e.account_id
 where e.id=p_event_id;
$$;
revoke all on function public.stagevotes_event_venue_settings(uuid) from public;
grant execute on function public.stagevotes_event_venue_settings(uuid) to anon,authenticated;

commit;
