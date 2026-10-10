-- Tighten Survey Management authorization and index foreign-key lookup paths.
do $$
declare tbl text;
begin
  foreach tbl in array array['surveys','survey_questions','survey_assignments','survey_visits','survey_responses'] loop
    execute format('drop policy if exists %I on public.%I', tbl || '_select_authenticated', tbl);
    execute format('create policy %I on public.%I for select to authenticated using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid())))', tbl || '_select_authenticated', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_insert_editors', tbl);
    execute format('create policy %I on public.%I for insert to authenticated with check (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in (''admin'',''editor'')))', tbl || '_insert_editors', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_update_editors', tbl);
    execute format('create policy %I on public.%I for update to authenticated using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in (''admin'',''editor''))) with check (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in (''admin'',''editor'')))', tbl || '_update_editors', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_delete_admins', tbl);
    execute format('create policy %I on public.%I for delete to authenticated using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = ''admin''))', tbl || '_delete_admins', tbl);
  end loop;
end $$;
create index if not exists survey_assignments_sector_idx on public.survey_assignments(sector_id);
create index if not exists survey_assignments_sub_sector_idx on public.survey_assignments(sub_sector_id);
create index if not exists survey_responses_question_idx on public.survey_responses(question_id);
create index if not exists survey_visits_survey_idx on public.survey_visits(survey_id);
create index if not exists survey_visits_created_by_idx on public.survey_visits(created_by);
create index if not exists surveys_created_by_idx on public.surveys(created_by);
