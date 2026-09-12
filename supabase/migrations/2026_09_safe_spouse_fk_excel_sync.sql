-- Excel imports can contain spouse ITS IDs that are not present in the
-- imported dataset (or in mumin_data at the time a chunk is written).
-- Keep the FK intact, but normalize stale spouse references to NULL before
-- the FK is checked.

create or replace function public.normalize_mumin_spouse_its_id()
returns trigger
language plpgsql
as $$
begin
  if new.spouse_its_id is not null
     and not exists (
       select 1
       from public.mumin_data m
       where m.its_id = new.spouse_its_id
     ) then
    new.spouse_its_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_normalize_mumin_spouse_its_id on public.mumin_data;

create trigger trg_normalize_mumin_spouse_its_id
before insert or update of spouse_its_id
on public.mumin_data
for each row
execute function public.normalize_mumin_spouse_its_id();
