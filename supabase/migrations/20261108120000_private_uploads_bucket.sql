-- Member photos contain personal images: keep the bucket private and let only
-- signed-in users read objects (the app requests short-lived signed URLs).
update storage.buckets set public = false where id = 'uploads';

drop policy if exists "uploads: signed-in users can read" on storage.objects;
create policy "uploads: signed-in users can read"
on storage.objects for select to authenticated
using (bucket_id = 'uploads');

-- Uploads already work through the existing insert policy; none is added here.
