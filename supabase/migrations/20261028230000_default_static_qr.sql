-- Permanent QR codes are the default for new host accounts.
-- Existing accounts retain their saved preferences.
alter table public.accounts
 alter column static_signup_qr set default true,
 alter column static_judge_qr set default true,
 alter column static_people_qr set default true;
