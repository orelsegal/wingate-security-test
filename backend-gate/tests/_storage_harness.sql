-- Harness מקומי בלבד · מדמה את סכימת Storage של Supabase כדי שאפשר יהיה
-- להריץ את בדיקות האחסון מחוץ ל-Production. לעולם לא מורץ על Production.
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text not null, public boolean not null default false,
  file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now()
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null, owner uuid, metadata jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant usage on schema storage to public;
grant select, insert on storage.objects to public;
grant select on storage.buckets to public;
