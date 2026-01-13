-- Admin (SUPER) global customization storage

create table if not exists public.admin_customizations (
  id text primary key,
  menus jsonb not null default '[]'::jsonb,
  pages jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.trg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_customizations_updated_at on public.admin_customizations;
create trigger trg_admin_customizations_updated_at
before update on public.admin_customizations
for each row execute function public.trg_set_updated_at();

alter table public.admin_customizations enable row level security;

drop policy if exists "super can read admin_customizations" on public.admin_customizations;
create policy "super can read admin_customizations"
on public.admin_customizations
for select
using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPER');

drop policy if exists "super can write admin_customizations" on public.admin_customizations;
create policy "super can write admin_customizations"
on public.admin_customizations
for all
using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPER')
with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPER');

insert into public.admin_customizations (id, menus, pages)
values ('global', '[]'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;

