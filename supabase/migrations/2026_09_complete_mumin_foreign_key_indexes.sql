-- Complete indexes for foreign keys flagged by the Supabase performance advisor.
create index if not exists attachments_file_id_idx
  on public.attachments (file_id)
  where file_id is not null;

create index if not exists mumin_data_spouse_its_id_idx
  on public.mumin_data (spouse_its_id)
  where spouse_its_id is not null;

create index if not exists sectors_incharge_its_id_idx
  on public.sectors (incharge_its_id)
  where incharge_its_id is not null;

create index if not exists sub_sectors_incharge_its_id_idx
  on public.sub_sectors (incharge_its_id)
  where incharge_its_id is not null;

-- Avoid re-evaluating auth.uid() once per row in the user-role read policy.
drop policy if exists "users read own role" on public.user_roles;
create policy "users read own role" on public.user_roles
  for select
  using ((user_id = (select auth.uid())) or (current_app_role() = 'admin'::text));
