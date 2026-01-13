-- Core schema for QR Parking SYS (safe idempotent)

create extension if not exists pgcrypto;

create table if not exists public.complexes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text,
  created_at timestamptz default now()
);

create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid references public.complexes(id) on delete cascade,
  name text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists public.roles (
  id text primary key,
  label text not null,
  hierarchy_level int not null
);

insert into public.roles (id, label, hierarchy_level) values
  ('SUPER', '최고관리자', 0),
  ('MAIN', '메인관리자', 1),
  ('SUB', '서브관리자', 2),
  ('GUARD', '경비', 3),
  ('RESIDENT', '입주민', 3)
on conflict (id) do update
set label = excluded.label,
    hierarchy_level = excluded.hierarchy_level;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role_id text references public.roles(id),
  complex_id uuid references public.complexes(id),
  building_id uuid references public.buildings(id),
  display_name text,
  phone text,
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.users(id) on delete cascade,
  type text,
  payload jsonb,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists buildings_complex_id_idx on public.buildings(complex_id);
create index if not exists users_role_id_idx on public.users(role_id);
create index if not exists users_complex_id_idx on public.users(complex_id);
create index if not exists qr_codes_owner_id_created_at_idx on public.qr_codes(owner_id, created_at desc);

