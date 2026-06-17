-- seed.sql — initial data ported from src/lib/storage.ts seedState()
--
-- One club, the four founding members (200 € each), the two shuttle products
-- and their first purchase batches, and the storage-box expense. Plus the
-- admin allowlist that bootstraps club admins on first magic-link login.
--
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING so re-running is safe.
-- Timestamps are stored as the original wall-clock values (treated as UTC by
-- the app's date mapping in src/lib/db.ts).

-- Club -----------------------------------------------------------------------
insert into clubs (id, name, created_at) values
  ('00000000-0000-0000-0000-000000000001', 'Badminton Group', '2026-06-15T13:00:00Z')
on conflict (id) do nothing;

-- Admin allowlist ------------------------------------------------------------
-- REPLACE / EXTEND with the real admin email(s). Anyone here becomes a club
-- admin automatically the first time they sign in.
insert into allowed_admins (email, club_id) values
  ('ramindusn@gmail.com', '00000000-0000-0000-0000-000000000001')
on conflict (email) do nothing;

-- Members + contributions (200 € each, 2026-06-15 13:00) ----------------------
insert into members (id, club_id, name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000001', 'Uditha'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000001', 'Sahan'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000001', 'Nilusha'),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000001', 'Ramindu')
on conflict (id) do nothing;

insert into contributions (id, member_id, amount, occurred_at) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 200, '2026-06-15T13:00:00Z'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a2', 200, '2026-06-15T13:00:00Z'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a3', 200, '2026-06-15T13:00:00Z'),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a4', 200, '2026-06-15T13:00:00Z')
on conflict (id) do nothing;

-- Products -------------------------------------------------------------------
insert into products (id, club_id, brand, model, shuttles_per_barrel, barrels, loose_shuttles) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001', 'RSL', 'Classic Academy', 12, 20, 0),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000001', 'Victor', 'New Carbonsonic Pro', 12, 10, 0)
on conflict (id) do nothing;

-- Purchase batches (2026-06-15 18:00) ----------------------------------------
insert into purchases (id, club_id, product_id, barrels, price_per_barrel, occurred_at, note) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 20, 24.50, '2026-06-15T18:00:00Z', 'Initial RSL batch'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 10, 27.85, '2026-06-15T18:00:00Z', 'Initial Victor batch')
on conflict (id) do nothing;

-- Expense (2026-06-16 19:00) -------------------------------------------------
insert into expenses (id, club_id, description, amount, occurred_at) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000001', '2 Bergen 60L boxes (pro-rated 3-for-25€ offer)', 16.67, '2026-06-16T19:00:00Z')
on conflict (id) do nothing;
