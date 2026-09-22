begin;

alter table public.accounts
  alter column subscription_status
  set default 'incomplete';

comment on column public.accounts.subscription_status is
  'Stripe subscription status. New accounts remain incomplete until a verified Stripe webhook provisions trialing or active access.';

commit;
