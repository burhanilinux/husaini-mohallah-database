-- Restore the canonical family lookup index after the historical cleanup
-- migration, and keep authenticated viewers able to read survey data.
create index if not exists mumin_data_family_id_idx
  on public.mumin_data (family_id);

do $$
declare
  tbl text;
begin
  foreach tbl in array array['surveys','survey_questions','survey_assignments','survey_visits','survey_responses'] loop
    execute format('drop policy if exists %I on public.%I', tbl || '_select_authenticated', tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      tbl || '_select_authenticated',
      tbl
    );
  end loop;
end $$;
