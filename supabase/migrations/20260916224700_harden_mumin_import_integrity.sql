-- Database integrity and import reliability hardening.
-- Applied to the Husaini Mohallah Supabase project.

do $
begin
  if not exists (select 1 from pg_constraint where conname = 'mumin_data_age_range_check' and conrelid = 'public.mumin_data'::regclass) then
    alter table public.mumin_data
      add constraint mumin_data_age_range_check
      check (age is null or (age >= 0 and age <= 130));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'mumin_data_spouse_not_self_check' and conrelid = 'public.mumin_data'::regclass) then
    alter table public.mumin_data
      add constraint mumin_data_spouse_not_self_check
      check (spouse_its_id is null or spouse_its_id <> its_id);
  end if;
end $;

create unique index if not exists mumin_data_its_number_unique_idx
  on public.mumin_data (its_number)
  where its_number is not null and btrim(its_number) <> '';

create index if not exists mumin_data_family_id_idx
  on public.mumin_data (family_id);

create index if not exists mumin_data_spouse_its_id_idx
  on public.mumin_data (spouse_its_id);

create index if not exists mumin_data_sub_sector_id_idx
  on public.mumin_data (sub_sector_id);

create index if not exists families_hof_its_id_idx
  on public.families (hof_its_id)
  where hof_its_id is not null;

create index if not exists mumin_data_status_idx
  on public.mumin_data (status);

create index if not exists mumin_data_area_sector_idx
  on public.mumin_data (area_sector)
  where area_sector is not null;

alter table public.import_log
  add column if not exists status text not null default 'completed';

alter table public.import_log
  add column if not exists warning_count integer not null default 0;

alter table public.import_log
  add column if not exists error_message text;

do $
begin
  if not exists (select 1 from pg_constraint where conname = 'import_log_status_check' and conrelid = 'public.import_log'::regclass) then
    alter table public.import_log
      add constraint import_log_status_check
      check (status in ('running','completed','failed','cancelled'));
  end if;
end $;

create or replace view public.mumin_integrity_summary
with (security_invoker = true) as
select
  (select count(*) from public.mumin_data) as mumin_count,
  (select count(*) from public.families) as family_count,
  (select count(*) from public.mumin_data where its_id is null) as missing_its_id,
  (select count(*) from public.mumin_data m left join public.families f on f.family_id=m.family_id where m.family_id is not null and f.family_id is null) as orphan_family_links,
  (select count(*) from public.mumin_data m left join public.mumin_data s on s.its_id=m.spouse_its_id where m.spouse_its_id is not null and s.its_id is null) as orphan_spouse_links,
  (select count(*) from public.families f left join public.mumin_data m on m.its_id=f.hof_its_id where f.hof_its_id is not null and m.its_id is null) as orphan_hof_links,
  (select count(*) from public.sub_sectors ss left join public.sectors s on s.id=ss.sector_id where ss.sector_id is not null and s.id is null) as orphan_subsector_links,
  (select count(*) from public.mumin_data where age is not null and (age < 0 or age > 130)) as invalid_age_values,
  (select count(*) from public.mumin_data where spouse_its_id is not null and spouse_its_id=its_id) as self_spouse_values;
