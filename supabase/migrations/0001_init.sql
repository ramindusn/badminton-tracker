-- 0001_init.sql — Badminton Tracker schema
--
-- Multi-club, role-aware foundation with Row Level Security on every table.
-- Mirrors the in-app domain types (src/types.ts) and adds the club + role
-- layer that future player / ranking / match phases (AGENTS.md §10) build on.
--
-- This phase only admins authenticate; players are modelled but not yet wired
-- into the UI.

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Clubs & roles
-- ---------------------------------------------------------------------------

create table clubs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- Which auth users belong to which club, and in what role.
create table club_members (
  club_id    uuid not null references clubs(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin', 'player')),
  created_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

-- Pre-seeded allowlist: an email here is auto-promoted to club admin on first
-- login (see handle_new_user trigger below). This is how "restrict signups +
-- pre-add admin emails" is enforced.
create table allowed_admins (
  email   text primary key,
  club_id uuid not null references clubs(id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Domain tables (one row-per-entity, club_id denormalised for simple RLS)
-- ---------------------------------------------------------------------------

create table members (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references clubs(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create table contributions (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  amount      numeric(10, 2) not null check (amount > 0),
  occurred_at timestamptz not null
);

create table products (
  id                  uuid primary key default gen_random_uuid(),
  club_id             uuid not null references clubs(id) on delete cascade,
  brand               text not null,
  model               text not null,
  shuttles_per_barrel integer not null default 12 check (shuttles_per_barrel > 0),
  barrels             integer not null default 0 check (barrels >= 0),
  loose_shuttles      integer not null default 0 check (loose_shuttles >= 0)
);

create table purchases (
  id               uuid primary key default gen_random_uuid(),
  club_id          uuid not null references clubs(id) on delete cascade,
  product_id       uuid not null references products(id) on delete cascade,
  barrels          integer not null check (barrels >= 0),
  price_per_barrel numeric(10, 2) not null check (price_per_barrel >= 0),
  occurred_at      timestamptz not null,
  note             text
);

create table usage_entries (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  occurred_at timestamptz not null
);

create table usage_items (
  usage_id      uuid not null references usage_entries(id) on delete cascade,
  product_id    uuid not null references products(id) on delete cascade,
  shuttles_used integer not null check (shuttles_used > 0),
  primary key (usage_id, product_id)
);

create table expenses (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  description text not null,
  amount      numeric(10, 2) not null check (amount > 0),
  occurred_at timestamptz not null
);

-- FK / lookup indexes
create index members_club_id_idx        on members(club_id);
create index contributions_member_id_idx on contributions(member_id);
create index products_club_id_idx       on products(club_id);
create index purchases_club_id_idx      on purchases(club_id);
create index purchases_product_id_idx   on purchases(product_id);
create index usage_entries_club_id_idx  on usage_entries(club_id);
create index usage_items_usage_id_idx   on usage_items(usage_id);
create index usage_items_product_id_idx on usage_items(product_id);
create index expenses_club_id_idx       on expenses(club_id);

-- ---------------------------------------------------------------------------
-- Auth helpers (SECURITY DEFINER so they can read club_members without
-- recursing through that table's own RLS policies)
-- ---------------------------------------------------------------------------

create or replace function is_club_member(target_club uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from club_members
    where club_id = target_club and user_id = auth.uid()
  );
$$;

create or replace function is_club_admin(target_club uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from club_members
    where club_id = target_club
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Bootstrap: promote allowlisted emails to club admin on first login
-- ---------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into club_members (club_id, user_id, role)
  select aa.club_id, new.id, 'admin'
  from allowed_admins aa
  where lower(aa.email) = lower(new.email)
  on conflict (club_id, user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
--   read  = any member of the row's club
--   write = admins of the row's club
-- ---------------------------------------------------------------------------

alter table clubs          enable row level security;
alter table club_members   enable row level security;
alter table allowed_admins enable row level security;
alter table members        enable row level security;
alter table contributions  enable row level security;
alter table products       enable row level security;
alter table purchases      enable row level security;
alter table usage_entries  enable row level security;
alter table usage_items    enable row level security;
alter table expenses       enable row level security;

-- clubs: visible to its members; only admins may modify.
create policy clubs_select on clubs
  for select using (is_club_member(id));
create policy clubs_write on clubs
  for all using (is_club_admin(id)) with check (is_club_admin(id));

-- club_members: a user can see their own memberships; admins manage the rest.
create policy club_members_select on club_members
  for select using (user_id = auth.uid() or is_club_admin(club_id));
create policy club_members_write on club_members
  for all using (is_club_admin(club_id)) with check (is_club_admin(club_id));

-- allowed_admins: admin-only (managed via seed / dashboard otherwise).
create policy allowed_admins_admin on allowed_admins
  for all using (is_club_admin(club_id)) with check (is_club_admin(club_id));

-- Generic club-scoped tables: member read, admin write.
create policy members_select on members
  for select using (is_club_member(club_id));
create policy members_write on members
  for all using (is_club_admin(club_id)) with check (is_club_admin(club_id));

create policy contributions_select on contributions
  for select using (
    exists (select 1 from members m where m.id = member_id and is_club_member(m.club_id))
  );
create policy contributions_write on contributions
  for all using (
    exists (select 1 from members m where m.id = member_id and is_club_admin(m.club_id))
  ) with check (
    exists (select 1 from members m where m.id = member_id and is_club_admin(m.club_id))
  );

create policy products_select on products
  for select using (is_club_member(club_id));
create policy products_write on products
  for all using (is_club_admin(club_id)) with check (is_club_admin(club_id));

create policy purchases_select on purchases
  for select using (is_club_member(club_id));
create policy purchases_write on purchases
  for all using (is_club_admin(club_id)) with check (is_club_admin(club_id));

create policy usage_entries_select on usage_entries
  for select using (is_club_member(club_id));
create policy usage_entries_write on usage_entries
  for all using (is_club_admin(club_id)) with check (is_club_admin(club_id));

create policy usage_items_select on usage_items
  for select using (
    exists (select 1 from usage_entries u where u.id = usage_id and is_club_member(u.club_id))
  );
create policy usage_items_write on usage_items
  for all using (
    exists (select 1 from usage_entries u where u.id = usage_id and is_club_admin(u.club_id))
  ) with check (
    exists (select 1 from usage_entries u where u.id = usage_id and is_club_admin(u.club_id))
  );

create policy expenses_select on expenses
  for select using (is_club_member(club_id));
create policy expenses_write on expenses
  for all using (is_club_admin(club_id)) with check (is_club_admin(club_id));
