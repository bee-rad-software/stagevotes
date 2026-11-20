-- Enable the host-tip option for new venues. Existing venue choices are preserved.
-- The singer tip card still requires at least one saved payment link.
begin;
alter table public.venues alter column settings set default
'{"singa_enabled":false,"karafun_channel":"","tips_enabled":true,"venmo_url":"","cashapp_url":"","apple_pay_url":"","static_signup_qr":true,"static_judge_qr":true,"static_people_qr":true,"max_songs_per_singer":3}'::jsonb;
commit;
