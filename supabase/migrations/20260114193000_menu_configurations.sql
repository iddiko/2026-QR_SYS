-- Menu visibility configuration per role (persisted)

create extension if not exists pgcrypto;

create table if not exists public.menu_configurations (
  id uuid primary key default gen_random_uuid(),
  owner_role text not null references public.roles(id),
  target_role text not null references public.roles(id),
  menu_key text not null,
  is_enabled boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create unique index if not exists menu_configurations_owner_target_key_uniq
  on public.menu_configurations(owner_role, target_role, menu_key);

create or replace function public.trg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_menu_configurations_updated_at on public.menu_configurations;
create trigger trg_menu_configurations_updated_at
before update on public.menu_configurations
for each row execute function public.trg_set_updated_at();

alter table public.menu_configurations enable row level security;

-- anyone authenticated can read menu configuration (it's not sensitive)
drop policy if exists "authenticated can read menu_configurations" on public.menu_configurations;
create policy "authenticated can read menu_configurations"
on public.menu_configurations
for select
using (auth.role() = 'authenticated');

-- owner_role based write policies (optional; server uses service role)
drop policy if exists "super can write menu_configurations" on public.menu_configurations;
create policy "super can write menu_configurations"
on public.menu_configurations
for all
using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPER')
with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPER');

drop policy if exists "main can write guard_resident menu_configurations" on public.menu_configurations;
create policy "main can write guard_resident menu_configurations"
on public.menu_configurations
for all
using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'MAIN'
  and owner_role = 'MAIN'
  and target_role in ('GUARD', 'RESIDENT')
)
with check (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'MAIN'
  and owner_role = 'MAIN'
  and target_role in ('GUARD', 'RESIDENT')
);

drop policy if exists "sub can write guard_resident menu_configurations" on public.menu_configurations;
create policy "sub can write guard_resident menu_configurations"
on public.menu_configurations
for all
using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'SUB'
  and owner_role = 'SUB'
  and target_role in ('GUARD', 'RESIDENT')
)
with check (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'SUB'
  and owner_role = 'SUB'
  and target_role in ('GUARD', 'RESIDENT')
);

