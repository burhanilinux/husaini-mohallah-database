-- Private storage for legacy survey HTML containing personal information.
insert into storage.buckets (id, name, public)
values ('survey-legacy', 'survey-legacy', false)
on conflict (id) do update set public = false;

drop policy if exists "survey-legacy: signed-in users can read" on storage.objects;
create policy "survey-legacy: signed-in users can read"
on storage.objects for select to authenticated
using (bucket_id = 'survey-legacy');

-- No upload/update/delete policy is granted to ordinary authenticated users.
-- Administrators upload approved survey files from Supabase Storage dashboard.
