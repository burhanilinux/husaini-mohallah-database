-- mumin_data.family_id references families.family_id, while families.hof_its_id
-- references mumin_data.its_id. During Excel imports, mumin_data rows may be
-- written before the family rows exist. Ensure the referenced family exists
-- before PostgreSQL checks the mumin_data.family_id foreign key.

create or replace function public.ensure_family_for_mumin_import()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.family_id is not null then
    insert into public.families (family_id, hof_its_id, sabil_no)
    values (new.family_id, null, null)
    on conflict (family_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ensure_family_for_mumin_import on public.mumin_data;

create trigger trg_ensure_family_for_mumin_import
before insert or update of family_id on public.mumin_data
for each row
execute function public.ensure_family_for_mumin_import();
