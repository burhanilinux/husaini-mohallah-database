-- Phase 1: dedicated, multi-year Survey Management.
-- Additive only: existing mohallah_survey_families rows are untouched.
create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 160),
  description text not null default '',
  status text not null default 'draft' check (status in ('draft','active','closed')),
  start_date date, end_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create table if not exists public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  question_text text not null check (length(trim(question_text)) between 1 and 500),
  question_type text not null default 'text' check (question_type in ('text','number','yes_no','single_choice','multiple_choice','date')),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  is_required boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);
create index if not exists survey_questions_survey_sort_idx on public.survey_questions(survey_id, sort_order);
create table if not exists public.survey_assignments (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  hof_its_id bigint not null references public.mumin_data(its_id) on delete restrict,
  sector_id bigint references public.sectors(id) on delete set null,
  sub_sector_id bigint references public.sub_sectors(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','in_progress','completed','not_available')),
  assigned_at timestamptz not null default now(),
  unique (survey_id, hof_its_id)
);
create index if not exists survey_assignments_survey_status_idx on public.survey_assignments(survey_id, status);
create index if not exists survey_assignments_hof_idx on public.survey_assignments(hof_its_id);
create table if not exists public.survey_visits (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  assignment_id uuid not null references public.survey_assignments(id) on delete cascade,
  visit_date date not null default current_date,
  surveyor text not null default '',
  remarks text not null default '',
  status text not null default 'draft' check (status in ('draft','submitted')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists survey_visits_assignment_date_idx on public.survey_visits(assignment_id, visit_date desc);
create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.survey_visits(id) on delete cascade,
  question_id uuid not null references public.survey_questions(id) on delete restrict,
  answer jsonb not null default 'null'::jsonb,
  created_at timestamptz not null default now(),
  unique (visit_id, question_id)
);
-- Access is tied to public.user_roles; viewers are read-only.
do $$
declare tbl text;
begin
  foreach tbl in array array['surveys','survey_questions','survey_assignments','survey_visits','survey_responses'] loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_select_authenticated', tbl);
    execute format('create policy %I on public.%I for select to authenticated using (true)', tbl || '_select_authenticated', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_insert_editors', tbl);
    execute format('create policy %I on public.%I for insert to authenticated with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in (''admin'',''editor'')))', tbl || '_insert_editors', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_update_editors', tbl);
    execute format('create policy %I on public.%I for update to authenticated using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in (''admin'',''editor''))) with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in (''admin'',''editor'')))', tbl || '_update_editors', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_delete_admins', tbl);
    execute format('create policy %I on public.%I for delete to authenticated using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = ''admin''))', tbl || '_delete_admins', tbl);
    execute format('grant select, insert, update, delete on public.%I to authenticated', tbl);
  end loop;
end $$;
grant usage on schema public to authenticated;
