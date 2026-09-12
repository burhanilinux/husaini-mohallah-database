-- Unique keys required by the Excel Mumin sync upserts.
-- Existing production data was checked for duplicates before applying.

create unique index if not exists sectors_name_unique
  on public.sectors (name);

create unique index if not exists sub_sectors_sector_name_unique
  on public.sub_sectors (sector_id, name);
