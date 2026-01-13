-- Content & admin management tables (idempotent)

create extension if not exists pgcrypto;

-- 1) Content tables
create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid references public.complexes(id) on delete set null,
  title text not null,
  content text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_posts_complex_id_created_at_idx on public.news_posts(complex_id, created_at desc);

create table if not exists public.ads_items (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid references public.complexes(id) on delete set null,
  title text not null,
  image_url text not null,
  link_url text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ads_items_complex_id_created_at_idx on public.ads_items(complex_id, created_at desc);

-- 2) Minimal helper to auto-update updated_at on news_posts
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_news_posts_updated_at on public.news_posts;
create trigger trg_news_posts_updated_at
before update on public.news_posts
for each row execute function public.set_updated_at();

-- 3) Storage bucket for public assets (ads images, etc.)
-- Note: storage schema exists in Supabase projects.
insert into storage.buckets (id, name, public)
values ('public-assets', 'public-assets', true)
on conflict (id) do update set public = excluded.public;

