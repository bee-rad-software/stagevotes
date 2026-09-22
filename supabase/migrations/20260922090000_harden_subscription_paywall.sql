begin;

create or replace function public.has_active_stagevotes_subscription(
  requested_account_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.account_users
    join public.accounts
      on accounts.id = account_users.account_id
    where account_users.user_id = auth.uid()
      and account_users.account_id = requested_account_id
      and accounts.subscription_status in ('active', 'trialing')
  );
$$;

revoke all on function public.has_active_stagevotes_subscription(uuid)
  from public;
grant execute on function public.has_active_stagevotes_subscription(uuid)
  to authenticated;

drop policy if exists "events are publicly insertable"
  on public.events;
drop policy if exists "events are publicly updateable"
  on public.events;
drop policy if exists "Subscribed account members can create events"
  on public.events;
drop policy if exists "Subscribed account members can update events"
  on public.events;
drop policy if exists "Subscribed account members can delete events"
  on public.events;

create policy "Subscribed account members can create events"
  on public.events
  for insert
  to authenticated
  with check (
    public.has_active_stagevotes_subscription(account_id)
  );

create policy "Subscribed account members can update events"
  on public.events
  for update
  to authenticated
  using (
    public.has_active_stagevotes_subscription(account_id)
  )
  with check (
    public.has_active_stagevotes_subscription(account_id)
  );

create policy "Subscribed account members can delete events"
  on public.events
  for delete
  to authenticated
  using (
    public.has_active_stagevotes_subscription(account_id)
  );

commit;
