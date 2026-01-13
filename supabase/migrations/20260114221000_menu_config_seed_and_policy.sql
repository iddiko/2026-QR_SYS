-- Seed default menu visibility + expand MAIN management scope

-- MAIN should be able to manage SUB menus as well (server uses service role,
-- but we keep RLS consistent for future client writes)
drop policy if exists "main can write guard_resident menu_configurations" on public.menu_configurations;
drop policy if exists "main can write sub_guard_resident menu_configurations" on public.menu_configurations;
create policy "main can write sub_guard_resident menu_configurations"
on public.menu_configurations
for all
using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'MAIN'
  and owner_role = 'MAIN'
  and target_role in ('SUB', 'GUARD', 'RESIDENT')
)
with check (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'MAIN'
  and owner_role = 'MAIN'
  and target_role in ('SUB', 'GUARD', 'RESIDENT')
);

-- Default: deny-by-default in UI, so we seed visible menus here.
-- SUPER는 제약이 없으므로, 여기 seed는 "하위 역할"에 대한 기본 메뉴 노출만 담당합니다.
insert into public.menu_configurations (owner_role, target_role, menu_key, is_enabled)
values
  -- MAIN 기본 노출
  ('SUPER','MAIN','dashboard', true),
  ('SUPER','MAIN','management', true),
  ('SUPER','MAIN','complexes', true),
  ('SUPER','MAIN','buildings', true),
  ('SUPER','MAIN','resident-qr', true),
  ('SUPER','MAIN','menus', true),
  ('SUPER','MAIN','gas', true),
  ('SUPER','MAIN','ads', true),
  ('SUPER','MAIN','news', true),
  ('SUPER','MAIN','ads-board', true),
  ('SUPER','MAIN','logs', true),
  ('SUPER','MAIN','settings', true),

  -- SUB 기본 노출 (단지 관리 제외)
  ('SUPER','SUB','dashboard', true),
  ('SUPER','SUB','management', true),
  ('SUPER','SUB','buildings', true),
  ('SUPER','SUB','resident-qr', true),
  ('SUPER','SUB','menus', true),
  ('SUPER','SUB','gas', true),
  ('SUPER','SUB','ads', true),
  ('SUPER','SUB','news', true),
  ('SUPER','SUB','ads-board', true),
  ('SUPER','SUB','logs', true),
  ('SUPER','SUB','settings', true),

  -- GUARD 기본 노출
  ('SUPER','GUARD','dashboard', true),
  ('SUPER','GUARD','resident-qr', true),
  ('SUPER','GUARD','ads', true),
  ('SUPER','GUARD','news', true),

  -- RESIDENT 기본 노출
  ('SUPER','RESIDENT','dashboard', true),
  ('SUPER','RESIDENT','ads', true),
  ('SUPER','RESIDENT','news', true)
on conflict (owner_role, target_role, menu_key) do nothing;

