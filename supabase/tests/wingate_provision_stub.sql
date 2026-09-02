create extension if not exists pgcrypto;
create schema if not exists auth;

do $$ begin
  create role anon nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin;
exception when duplicate_object then null; end $$;

create type public.app_role as enum ('student', 'teacher', 'admin', 'super_admin');

create table auth.users (
  id uuid primary key,
  email text unique
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  linked_student_id uuid,
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  subject_name text not null unique
);

create table public.learning_tasks (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id),
  external_app text not null,
  active boolean not null default true
);

create table public.learning_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject_id uuid not null references public.subjects(id),
  grade_code text,
  academic_year_start smallint not null,
  status text not null default 'active',
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.learning_group_teachers (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.learning_groups(id) on delete cascade,
  teacher_user_id uuid not null references auth.users(id) on delete cascade,
  role_in_group text not null default 'teacher',
  added_by uuid,
  left_at timestamptz,
  unique (group_id, teacher_user_id)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  class_name text not null,
  sport text not null,
  overall_status text not null default 'green',
  completion_percent integer not null default 0
);

alter table public.profiles
  add constraint profiles_linked_student_fkey
  foreign key (linked_student_id) references public.students(id);

create table public.learning_group_students (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.learning_groups(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  added_by uuid,
  left_at timestamptz,
  unique (group_id, student_id)
);

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
