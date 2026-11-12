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
commit;
