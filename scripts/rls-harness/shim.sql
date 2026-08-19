-- TEST HARNESS SHIM. NOT part of the product schema and never applied to a
-- Supabase project: on Supabase these roles, the auth schema, and the default
-- table privileges already exist. The local harness (plain PostgreSQL)
-- creates them so the repo migrations apply as-is.
-- Pattern borrowed from wingate-platform/scripts/test-shim.sql.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

create schema if not exists auth;

-- Minimal stub of auth.users so migrations that reference it or attach
-- triggers to it apply unchanged. Real GoTrue owns this table on Supabase.
create table if not exists auth.users (
  id uuid primary key,
  instance_id uuid,
  aud text,
  role text,
  email text unique,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Mirrors Supabase's auth.uid(): reads the JWT claims GUC. Tests simulate a
-- signed-in user with:  set_config('request.jwt.claims', '{"sub":"<uuid>"}', true)
create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

-- Minimal stub of auth.identities (provider inventory queries).
create table if not exists auth.identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  provider text not null,
  created_at timestamptz default now()
);

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Supabase grants these implicitly on hosted projects; older migrations in
-- this repo rely on them (newer ones carry explicit GRANTs, and their
-- explicit REVOKEs still win because they run AFTER table creation).
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
