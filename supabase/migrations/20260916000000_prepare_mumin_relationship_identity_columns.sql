-- Prepare identity columns referenced by the immediately following integrity
-- migration. This file sorts after 20260911_* and before 20260916224700_*.
-- Additive and safe for databases where these columns already exist.

alter table public.mumin_data
  add column if not exists its_id bigint,
  add column if not exists spouse_its_id bigint;

alter table public.families
  add column if not exists hof_its_id bigint;

-- Backfill numeric relationship identifiers only. Keep non-numeric legacy
-- values in their original *_its_number columns; never coerce them to zero.
update public.mumin_data
set its_id = nullif(its_number, '')::bigint
where its_id is null
  and its_number ~ '^[0-9]+$';

update public.mumin_data
set spouse_its_id = nullif(spouse_its_number, '')::bigint
where spouse_its_id is null
  and spouse_its_number ~ '^[0-9]+$';

update public.families
set hof_its_id = nullif(hof_its_number, '')::bigint
where hof_its_id is null
  and hof_its_number ~ '^[0-9]+$';
