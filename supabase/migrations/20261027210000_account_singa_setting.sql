-- Existing accounts retain their current KaraFun or custom catalog behavior.
alter table public.accounts add column if not exists singa_enabled boolean not null default false;
