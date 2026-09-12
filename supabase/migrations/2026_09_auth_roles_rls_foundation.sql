-- Auth/RLS foundation for Husaini Mohallah
-- This migration intentionally establishes the role source and helper first.
-- Table-specific policies should be enabled only after verifying existing
-- Supabase policies for each table in the project.

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select ur.role from public.user_roles ur where ur.user_id = auth.uid()),
    'viewer'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin';
$$;

create or replace function public.can_edit()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'editor');
$$;

alter table public.user_roles enable row level security;

drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role"
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

-- Admin role assignment is intentionally left to a controlled server-side or
-- SQL-editor operation until all existing table policies have been audited.
-- Do not grant client-side insert/update/delete access to user_roles here.
