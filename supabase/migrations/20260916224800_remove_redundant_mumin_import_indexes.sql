-- Remove indexes that are already supplied by earlier Mumin hardening migrations.
-- The final schema keeps the existing canonical indexes and the additional
-- spouse/sub-sector/status/area/family-HOF indexes from the prior migration.

drop index if exists public.mumin_data_its_number_unique_idx;
drop index if exists public.mumin_data_family_id_idx;
