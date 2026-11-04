begin;
drop policy if exists contest_photos_host_insert on storage.objects;
create policy contest_photos_host_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'contest-photos'
  and exists (
    select 1
    from public.events e
    join public.account_users au on au.account_id = e.account_id
    where e.id::text = (storage.foldername(storage.objects.name))[1]
      and au.user_id = auth.uid()
  )
);
commit;
