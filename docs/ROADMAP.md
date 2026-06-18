# Badminton Tracker — Roadmap & Status

> Snapshot of where the project is and what's left. For detailed architecture,
> conventions, and decision history see [`AGENTS.md`](../AGENTS.md) (the canonical
> source of truth); this file is the scannable overview.

The app began as a shared shuttle-inventory + money-fund tracker for a small
(dynamic, not fixed) badminton group. It is evolving toward bringing **game-day
data in-house** and producing an **individual ranking derived from doubles
results** — the group plays doubles primarily.

---

## Where we are — shipped & verified

**Core app (fund + inventory)** — complete and stable:
- Batch-priced shuttle inventory, weighted-average cost-per-shuttle, game-day usage charging.
- Money flow: contributions (+), purchases (−), expenses (−), usage income (+);
  `remainingFund = collected + usageIncome − spent`.
- Single `+ Add transaction` entry point, dual-render mobile/desktop, paginated log.

**Supabase (Phase 0 + 1)** — live:
- Postgres is source of truth when configured; `localStorage` fallback for tests/unconfigured builds.
- Schema (`supabase/migrations/0001_init.sql`): `clubs`, `club_members` (role-aware),
  `allowed_admins`, `members`, `contributions`, `products`, `purchases`,
  `usage_entries`, `usage_items`, `expenses` — **RLS on every table**, admin
  bootstrap via the `handle_new_user()` trigger.
- Magic-link admin auth; `VITE_E2E=1` bypass for Playwright.
- Diff-sync (`db.ts`) with a **serialized `runSync`** to avoid overlapping-write races.

**DevOps** — complete:
- CI: lint + unit + build + e2e + docker; Pages deploy gated by `workflow_run`;
  both inject `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- Manual `db-push` migration gate.

**Phase 1 — complete:** the live `badmintonduo.club` build is verified talking to
Supabase end-to-end (magic-link sign-in + data hydrate/sync round-trip confirmed).

---

## What's left — remaining phases

> Greenfield: no schema, types, or UI exist yet for profiles, sessions, matches,
> or ratings. Each phase below is net-new.

### Phase 2 — Player Profiles  ← next milestone
Players as first-class entities, linkable to existing `members`.
- `profiles` table (FK to `auth.users` / `club_members`), display name + avatar (Supabase Storage).
- `PlayerProfile` type added to `src/types.ts` + `AppState`; row builder/hydrate/sync in `src/lib/db.ts`.
- UI reuses `Card`/`Modal`/`Field`/`Button`, mirroring `MemberBalances.tsx`'s add/edit modal.

### Phase 3 — Sessions + Attendance (game-day data in-house)
- `sessions`, `session_attendees`. Usage becomes per-session, charging only
  attendees — unlocks per-attendee charging (today it splits equally across all members).
- New `QuickAdd` "game day / session" flow.

### Phase 4 — Matches + Scores (doubles-first)
- `matches` table, **doubles-native**: `team_a`/`team_b` each reference two players +
  per-game scores; singles as a degenerate one-per-side case. Score-entry flow tied to a session.

### Phase 5 — Ranking (individual, from doubles)
The hard part: an **individual** rating from 2v2 outcomes. Open modelling decisions:
- Opponent strength = combined/avg of the two opponents; both teammates updated from the same match.
- Whether/how to credit partner strength (rotating vs. fixed pairs changes fairness).
- Glicko-2 (preferred) vs. Elo.

Implementation: Postgres trigger maintaining `member_ratings` on each `matches`
insert/update; standings via a pure fn in `src/lib/calc.ts` + a leaderboard component.

### Phase 6 — Match Generation
Round-robin / king-of-the-court / rating-balanced; suggested-matches UI for game-day scheduling.

**Cross-cutting deferred (no blockers):** header polish < 360px; transaction-log
filters/search/CSV/month-grouping; build-tooling audit warnings (acknowledged).

---

## Reusable patterns (so new phases don't reinvent)
- **New entity recipe:** type in `src/types.ts` → field on `AppState` → action in
  `AppContext.tsx` (setState callback) → row builder + hydrate + sync rules in
  `src/lib/db.ts` (parents upsert first, children delete first) → UI from
  `Card`/`Modal`/`Field`/`Button`.
- **New transaction-like flow:** extend `QuickAdd.tsx`'s chooser `Kind` + a dedicated modal.
- **Computations:** pure functions in `src/lib/calc.ts` (ratings/standings live here).
- **Lists:** dual-render mobile-card/desktop-table per `MemberBalances.tsx` / `Inventory.tsx`.

---

## Verification (any phase)
- Gate before every push: `npm run lint && npm run test && npm run test:e2e`.
- New DB work: add a migration under `supabase/migrations/`, apply via the manual
  `db-push` gate, add `db.ts` mapper unit tests, keep RLS on every new table.
- Manual: sign in as admin on a preview/dev build, exercise the new flow, and
  confirm it round-trips through Supabase (reload hydrates the same state).
