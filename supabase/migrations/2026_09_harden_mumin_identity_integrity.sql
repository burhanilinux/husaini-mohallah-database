-- Strengthen the identity key used by Excel/Mumin synchronization.
-- The current production data has no duplicate or blank ITS numbers.

create unique index if not exists mumin_data_its_number_unique
  on public.mumin_data (its_number)
  where its_number is not null and btrim(its_number) <> '';

-- Foreign-key and filter indexes used by family/sector integrity checks and imports.
create index if not exists families_hof_its_id_idx
  on public.families (hof_its_id)
  where hof_its_id is not null;

create index if not exists mumin_data_family_id_idx
  on public.mumin_data (family_id)
  where family_id is not null;

create index if not exists mumin_data_sub_sector_id_idx
  on public.mumin_data (sub_sector_id)
  where sub_sector_id is not null;

create index if not exists mumin_data_area_sector_idx
  on public.mumin_data (area_sector)
  where area_sector is not null;
