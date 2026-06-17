# Badminton Tracker — Agent Context

> **Purpose of this file.** Any AI coding agent (OpenCode, Codex, future tools) that opens this repo should read this file first. It captures the project's goal, conventions, decisions, current state, and roadmap so a fresh session can continue work without re-deriving everything from the code.
>
> **Maintenance rule (read §14 first):** keep this file current — update it whenever you make a non-obvious architectural decision, ship/defer a phase, or change a working convention.

---

## 1. Project goal & scope

A single-page web app to track a small badminton group's shared shuttle inventory and money fund:

- Members contribute cash to a shared fund.
- The fund is used to buy shuttle barrels (per-batch pricing) and the occasional shared expense (e.g. storage boxes).
- On game days, members "pay" the fund the cost of the shuttles they actually used (computed from the weighted-average cost per shuttle).
- The app shows: current inventory, fund summary, member balances, today's usage, and a paginated transaction log.

Current user base: **~4 friends** (single club, no multi-tenancy). It is a personal/pet project, not a commercial product. Sensitive-data exposure is acceptable at this scale.

The project doubles as a learning sandbox for full-cycle web + DevOps work (Vite + React + TS, testing pyramid, Docker, GitHub Actions CI/CD, and — planned — Supabase + Postgres).

---

## 2. Live URLs & repo

| Thing | Value |
|---|---|
| Live site (GitHub Pages) | `https://ramindusn.github.io/badminton-tracker/` |
| GitHub repo (public) | `https://github.com/ramindusn/badminton-tracker` |
| Local Git remote | `origin` |
| SSH alias (personal account) | `github-personal` → `git@github-personal:ramindusn/badminton-tracker.git` |
| Local working directory | `/Users/ramnana/Documents/PP/badminton-tracker` |
| Local Docker run | `http://localhost:8080` (via `docker compose up --build`) |

Repo identity used for commits: `ramindusn <ramindusn@users.noreply.github.com>` (set per-repo; office identity is intentionally not used here).

---

## 3. Stack & tooling

### Runtime / build
- **Vite** + **React 18** + **TypeScript** (strict).
- **Tailwind CSS** for styling (no UI lib).
- Vite `base: '/badminton-tracker/'` for Pages; Docker build overrides with `--base=/` so the container serves at root.

### State / persistence
- React Context (`AppProvider`, `AuthProvider`).
- **Supabase (Postgres) is the source of truth when configured.** `src/lib/db.ts` hydrates `AppState` on admin sign-in and diff-syncs each mutation back (upserts/deletes per table). The synchronous reducers in `AppContext` are unchanged — they remain the single source of truth for logic; `db.ts` just mirrors the resulting state.
- **Fallback:** when Supabase env vars are absent **or** in the e2e build (`VITE_E2E=1`), the app uses the legacy `localStorage` path (`src/lib/storage.ts`, key `badminton-tracker-state-v2`). `AppContext` picks the path via `USE_SUPABASE`. This keeps the test suite and any non-configured build working with no live DB.
- A load-time `migrateSeedDates` shim in `src/lib/storage.ts` rewrites legacy seed timestamps (localStorage path only).
- Dates: the app stores naive `YYYY-MM-DDTHH:mm` strings; `db.ts` persists them verbatim into `timestamptz` (UTC) and slices the first 16 chars back on read, so they round-trip unchanged.

### Testing
- **Vitest** + **@testing-library/react** + **jsdom** for unit/component tests. `src/test/setup.ts` registers jest-dom matchers and `cleanup`. Fixtures in `src/test/fixtures.ts`.
- **Playwright** for e2e. Two projects: `chromium` (Desktop Chrome) and `mobile-chrome` (Pixel 5). Web server: `npm run build && npm run preview -- --port 4173 --strictPort`; `baseURL` includes `/badminton-tracker/`.
- `tsconfig.json` excludes `e2e/` and `playwright.config.ts` so they don't leak into the SPA type-check.

### Containerisation
- Multi-stage `Dockerfile` (node:20-alpine → nginx:1.27-alpine).
- `nginx.conf` adds SPA history fallback + asset caching.
- `docker-compose.yml` maps to `localhost:8080`.

### CI/CD (GitHub Actions)
- `.github/workflows/ci.yml`: lint + unit + build + e2e + docker build on push/PR to `main`. Concurrency-cancelled.
- `.github/workflows/deploy.yml`: Pages deploy gated by `workflow_run` after CI succeeds — Pages never deploys directly on push.

### Auth (Supabase magic link)
- **Supabase Auth, passwordless magic link** gates "editing" mode (`src/context/AuthContext.tsx`). The old hardcoded password is removed.
- `isAuthenticated` = has a session **AND** is a club admin (an admin row in `club_members`, checked via RLS). Signed-in non-admins get a "not an admin" notice and no data access.
- Admins are bootstrapped by the `allowed_admins` allowlist + an `on auth.users insert` trigger (see migration). Add an admin = insert their email into `allowed_admins`.
- Sessions persist + auto-refresh (Supabase default) — admins stay logged in across restarts.
- **Email delivery:** custom SMTP via **Resend** (domain `badmintonduo.club`), configured in the Supabase dashboard (not in repo). Removes the built-in ~2–3/hour email cap.
- **e2e bypass:** the `VITE_E2E=1` build authenticates synchronously without sending email, so Playwright can exercise the editing UI. Never set in a normal build.

### Planned additions (see §10 roadmap)
- ✅ `@supabase/supabase-js` + Supabase Auth + Postgres — **done** (Phase 0 + Phase 1a).
- Possible `@tanstack/react-query` for caching.

---

## 4. Local commands

All commands assume working directory = repo root.

```bash
# Dev server
npm run dev

# Build (tsc --noEmit then vite build)
npm run build

# Lint == type-check only (project has no ESLint config; tsc is the gate)
npm run lint

# Unit / component tests (vitest, jsdom)
npm run test          # one shot
npm run test:watch    # interactive

# End-to-end tests (Playwright, builds + previews automatically)
npm run test:e2e

# Container — serves the SPA on localhost:8080
docker compose up --build
```

### Expected green outcomes
- `npm run lint`: no output (exit 0).
- `npm run test`: **22 tests passing** across 3 files (`src/lib/calc.test.ts` 15, `src/lib/db.test.ts` 6, `src/components/StatCard.test.tsx` 1).
- `npm run test:e2e`: **10 tests passing** (5 desktop + 5 mobile Pixel 5). The Playwright build sets `VITE_E2E=1` for the auth bypass.

---

## 5. Working conventions

### 5.1 Plan mode vs Build mode
This project is worked on with a strict two-mode discipline:

- **Plan mode** — read-only. The agent may inspect files, run read-only shell commands, and propose plans. It must not modify files or run mutating commands.
- **Build mode** — full tool access. The agent edits files, runs the verification gate, commits and pushes.

Always be explicit which mode you are in. Switch to build only when the user says "build", "go", or equivalent.

### 5.2 Commits
- **Conventional commits**, no JIRA numbers, no scope acronyms.
- Allowed types in this repo so far: `feat`, `fix`, `refactor`, `docs`, `test`, `ci`, `chore`, `perf`.
- Subject line short and imperative; body explains *why* not *what* when non-trivial.
- Examples actually in the history:
  - `feat(usage): record game-day usage with date & time`
  - `fix(seed): box expense bought on 16 Jun, not 17 Jun`
  - `refactor: remove duplicate transaction entry points`
  - `docs(agents): add AGENTS.md to bootstrap future agent sessions`

### 5.3 Trunk-based dev
- Single long-lived branch: `main`.
- No PRs for solo work — commit straight to `main` after the verification gate passes.
- Branch protection is **not** configured (deferred follow-up — see §9).

### 5.4 Verification gate (mandatory before any push)
Before every push, run **all three**:
```bash
npm run lint && npm run test && npm run test:e2e
```
If any fail, fix and re-run; never push red.

### 5.5 Push
- Push via `origin` (already wired to the personal SSH alias).
- Never `--force` push to `main`. Never `git config` changes here. Never `--no-verify`.

### 5.6 Tool preferences (when an agent is doing the work)
- Prefer specialised tools over `bash` for file ops (Read, Edit, Write, Grep, Glob).
- Parallelise independent reads/searches.
- Keep changes small and reviewable.

---

## 6. Architectural decisions (with reasoning)

| # | Decision | Why |
|---|---|---|
| 6.1 | **Single-page Vite + React SPA hosted on GitHub Pages** | Free, simple, fits the audience. |
| 6.2 | **Batch-based pricing for shuttles** (each purchase is a `Purchase` with fixed `pricePerBarrel`) | Members pay the *real* weighted-average cost; price changes over time don't retroactively distort old usage. |
| 6.3 | **`looseShuttles` separate from `barrels`** | Reflects reality (a barrel might be partially used) and lets us deplete an opened barrel without phantom decimals. |
| 6.4 | **Stock added only in barrels via Add product**; `shuttlesPerBarrel` defaults to 12. Edit product can change loose/barrels/shuttles-per-barrel. No standalone "Restock". | Simplest UX matching how the group actually buys. |
| 6.5 | **Inventory renders one row per batch**, with loose+total shown only on a product's first batch row | Shows real per-batch pricing without double-counting totals. |
| 6.6 | **Cascading delete on `purchase`** — deleting the *last* batch of a product also removes the product and any usage entries that referenced it | Otherwise you'd be left with a phantom product and meaningless usage rows. |
| 6.7 | **Hardcoded password** in `AuthContext` for now, with `sessionStorage` flag | Pet-project scope; will be replaced by Supabase Auth in Phase 1. The literal value lives in `src/context/AuthContext.tsx` only. |
| 6.8 | **Dual-render**: mobile (`< sm`) shows stacked cards with header/body/footer bands and divided rows; desktop (`≥ sm`) shows tables | Tried column-hiding first — fragile. Dual-render scales better long-term. |
| 6.9 | **Single header `+ Add transaction` button is the sole money-flow entry point.** Cards no longer have per-row `+ Add cash`, no `+ Add expense` in Fund Summary, no `Record game day` CTA in Today's Usage | Removed three overlapping paths; one obvious place to log money in/out. |
| 6.10 | **Cards still own pure entity creation:** Inventory `+ Add product`, MemberBalances `+ Add member` | Member/product creation is one-time setup tied to that domain, not a recurring transaction. |
| 6.11 | **Transaction Log: `PAGE_SIZE = 10`, sorted newest-first by full timestamp string** | Latest activity in view without scrolling. Lexicographic compare works because all dates are ISO. |
| 6.12 | **`datetime-local` inputs everywhere** (contributions, purchases, expenses, usage), seeded with `nowLocalInput()` | Minute-level precision; sorts predictably in the log. |
| 6.13 | **`usageForDate` compares on `YYYY-MM-DD` prefix** | Backwards-compatible with legacy date-only entries while supporting new datetime entries. |
| 6.14 | **Fund Summary grouped into "Money in" / "Money out" with subtotals** | Game-day usage income is visually unmistakable as inbound money, not buried in a single line. |
| 6.15 | **GitHub Pages deploy gated via `workflow_run`** | Pages only deploys after CI succeeds on `main`; broken builds can't ship. |
| 6.16 | **Docker build uses `--base=/`** | Container serves at root; Pages serves under `/badminton-tracker/`. Same artifact, two base paths. |
| 6.17 | **Member spending split equally** across *all current members* in `memberBalances` | Simplest sensible default. Per-attendee charging is deferred to Phase 3 (sessions). |
| 6.18 | **`migrateSeedDates` shim runs on every load**, idempotent, only touches rows whose date *exactly* matches a known legacy value | Lets us correct seed mistakes without forcing a Reset. Anything user-edited is preserved. |
| 6.19 | **Two SSH identities cleanly separated**: office key `~/.ssh/macbook-pro-rb` for `Host github.com`; personal key `~/.ssh/id_ed25519_personal_github` for `Host github-personal` (`IdentitiesOnly yes`) | Office work and this repo never cross-pollinate Git identities. |

---

## 7. Domain model & invariants

### 7.1 Types (`src/types.ts`)
- `Member { id, name, contributions: Contribution[] }`
- `Contribution { id, amount, date }` (date is ISO `YYYY-MM-DDTHH:mm`)
- `Product { id, brand, model, shuttlesPerBarrel, barrels, looseShuttles }`
- `Purchase { id, productId, barrels, pricePerBarrel, date, note? }`
- `Expense { id, description, amount, date }`
- `Usage { id, date, items: { productId, shuttlesUsed }[] }`
- `AppState { members, products, purchases, usage, expenses }`

### 7.2 Money flow (sign conventions used in the Transaction Log)
| Kind | Sign | Effect on `remainingFund` | Effect on inventory |
|---|---|---|---|
| `contribution` (cash) | + | Increases `totalCollected` | none |
| `purchase` (shuttles bought) | − | Increases `totalSpent` | Adds to product `barrels` |
| `expense` (other costs) | − | Increases `totalSpent` | none |
| `usage` (game day) | + | Increases `totalUsageIncome` | Deducts from `barrels`/`looseShuttles` |

`remainingFund = totalCollected + totalUsageIncome − totalSpent`.

### 7.3 Invariants enforced in `AppContext`
- A new product with `barrels > 0` always produces a matching first `Purchase` row.
- Deleting any `Purchase` reverses its fund effect.
- Deleting the *last* purchase of a product also deletes the product and prunes empty usage entries.
- `updateBatchPrice` rejects negative prices silently (no throw).
- `addCash` requires a positive amount; `addExpense` requires a non-empty description.
- All mutating actions are guarded by `isAuthenticated` at the UI layer (not at the data layer — see §12).

### 7.4 Test IDs (do not rename without grepping all e2e specs)
- `app-root`, `editing-badge`, `login-button`, `logout-button`, `quick-add-button`.
- `transaction-log`, `log-range`, `fund-remaining`.
- Stat cards carry both `data-testid` and a `-value` variant (`StatCard` `testId` prop).
- Inventory/login forms also carry test IDs added explicitly to support Playwright.

---

## 8. UI conventions

- **Layout**: `max-w-6xl` container. Top row = `TodayUsage` (2/3 width on `sm+`) + `FundSummary` (1/3). Full-width below: `Inventory` → `TransactionLog` → `MemberBalances`.
- **Header**: dark slate band. When authenticated it shows: editing badge, `<QuickAdd />` button, Log out. Wraps on narrow screens.
- **Cards** (`src/components/Card.tsx`): icon + title + optional action slot. Coloured left-border accent per card.
- **Primitives** (`Button`, `Field`, `Modal`): `Button` has no default `type` (so native form-submit works); `Field` forwards input props.
- **Mobile cards** (below `sm` breakpoint, 640px) have three visually distinct bands:
  - Header (light slate background) — primary identifier + key number.
  - Body (white) — divided rows: small uppercase grey label on the left, right-aligned value with stronger contrast.
  - Footer (light slate background) — date + actions, full-width buttons where appropriate.
- **Transaction Log**: paginated 10/page, newest-first; pagination controls stack vertically on mobile.
- **Single source for new money-flow entries**: the header `+ Add transaction` opens a chooser with three colour-coded choices — Cash in (sky), Expense (amber), Game-day usage (emerald) — each routing to a dedicated focused modal in `src/components/QuickAdd.tsx`.

---

## 9. Current state

### Shipped
- Batch pricing model end-to-end (types, storage v2, calc, AppContext, Inventory, FundSummary, TodayUsage).
- Cascading `deleteTransaction('purchase')`.
- DevOps stack: vitest unit/component tests (16), Playwright e2e (10 incl. mobile), Docker multi-stage + nginx + compose, GitHub Actions CI, gated Pages deploy.
- Responsive overhaul: dual-render across TransactionLog / Inventory / MemberBalances; mobile cards with clear header/body/footer hierarchy.
- Transaction Log: 10/page, newest-first, type badges, edit-batch / delete actions.
- Personal GitHub SSH/identity isolation (`github-personal` alias).
- Unified `+ Add transaction` header button replacing three duplicate per-card paths; Fund Summary & Today's Usage simplified accordingly.
- Fund Summary grouped into "Money in" / "Money out" with subtotals.
- All record timestamps use `datetime-local`; `usageForDate` made prefix-aware.
- Seed dates split: cash 2026-06-15 13:00; shuttles 2026-06-15 18:00; box 2026-06-16 19:00. Backwards-migration in `loadState`.
- README + this file (AGENTS.md).
- **Supabase Phase 0 + Phase 1a:** Postgres schema (`supabase/migrations/0001_init.sql`) — multi-club, RLS on every table, `allowed_admins` bootstrap trigger; seed (`supabase/seed.sql`); `db-push.yml` manual workflow. **Magic-link admin auth** replacing the hardcoded password. **Data layer** (`src/lib/db.ts`) hydrating/diff-syncing `AppState` to Postgres, with a localStorage fallback for tests/unconfigured builds. Custom SMTP (Resend, `badmintonduo.club`). Live project region: **West EU / Ireland (`eu-west-1`)**.

### In progress
- (none — Supabase Phase 0 + 1a just shipped. Next: Phase 1 finish (Pages secrets + verify deployed build), then Phase 2 profiles.)

### Deferred / follow-ups (no blockers)
- Per-attendee usage charging (currently split equally across all members; needs the sessions model from Phase 3).
- Header polish on very narrow screens (badge/buttons can crowd at < ~360px).
- Transaction log: type filters, full-text search, CSV export, month grouping.
- Branch protection on `main` requiring CI checks.
- `npm install` reports vulnerabilities in build tooling — left as-is for a pet project.

---

## 10. Roadmap

### Phase 0 — Supabase account, schema, repo wiring (next up)
- Create free Supabase project (region likely EU-West Frankfurt).
- Add `supabase/migrations/0001_init.sql` (full schema, RLS enabled on every table, indexes).
- Add `supabase/seed.sql` (current seed data ported).
- Install Supabase CLI; document in README.
- Add GitHub Actions `workflow_dispatch` job to run `supabase db push` (manual gate at first).
- New repo secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`.

### Phase 1 — Auth + data layer
- Add `@supabase/supabase-js`.
- New `src/lib/supabase.ts` client singleton from env vars.
- Refactor `src/lib/storage.ts` → `src/lib/db.ts` keeping the existing public surface but persisting via Supabase. Keep localStorage as a read-through cache only.
- Replace `AuthContext` (hardcoded password) with Supabase Auth — magic-link by default (decision pending — see §11).
- One-time **"Import from this browser"** button: reads existing `localStorage`, posts to Supabase, then clears it.
- Update tests with a Supabase mock so CI does not require a live DB.

### Phase 2 — Profiles
- `profiles` table linked to `auth.users`. Display name + avatar (Supabase Storage).
- Members can be linked to a profile or remain as guest entries.

### Phase 3 — Sessions + attendance
- `sessions`, `session_attendees`. Usage becomes per-session and charges only attendees — unlocks the deferred per-member usage charging.

### Phase 4 — Matches + scores
- `matches` table (singles/doubles, team_a/b, scores). Score entry UI.

### Phase 5 — Ranking
- Glicko-2 (preferred) or Elo via a Postgres trigger maintaining a `member_ratings` table on each `matches` insert/update. Leaderboard component on the SPA.

### Phase 6 — Match generation
- Algorithm options: round-robin, king-of-the-court, rating-balanced. Suggested-matches UI.

### Hardware track (decoupled)
- A future Mac mini (or Linux mini PC) for *other* pet projects is being considered for DevOps learning (k3s on local / Oracle Always Free). It is **not** a dependency of this app once Phase 1 lands.

---

## 11. Decisions made (were open questions)

All five Phase-0 questions are now resolved:

1. **Auth method** — ✅ **Magic link** (Supabase Auth). Admins only this phase; restricted via `allowed_admins`.
2. **Tenancy** — ✅ **Multi-club ready**: `clubs` + `club_members` + `club_id` on every domain table, RLS scoped per club. (Only one club exists today; no club-switcher UI yet.)
3. **Migration on first login** — ✅ **Seeded the DB** directly from `seedState()` via `supabase/seed.sql`. No localStorage auto-import button was needed.
4. **Backups** — ✅ **Deferred to Phase 2**. Supabase free tier already does daily backups.
5. **Region** — ✅ **West EU / Ireland (`eu-west-1`)** (chosen at project creation; close enough to the intended Frankfurt default).

Product direction (from the user, for later phases): **admin** role = budget + shuttle/inventory management (today's app); **player** role = own profile, ranking status, and auto-generated game-day match schedules. The schema's role layer (`club_members.role`) is the hook for this.

---

## 12. Anti-patterns / things not to redo

- ❌ Do not reintroduce per-card transaction buttons (`+ Add cash` per row, `+ Add expense` in Fund Summary, `Record game day` in Today's Usage). The single header button is now the canonical entry point.
- ❌ Do not drop time precision from any transaction date. Use `datetime-local` and `nowLocalInput()`.
- ❌ Do not regress mobile cards back to flat lists or 2-column grids without clear header/body/footer bands and divided rows.
- ❌ Do not restore `PAGE_SIZE = 20` in `TransactionLog.tsx`.
- ❌ Do not put real secrets or passwords in this file (or anywhere in source going forward). Reference where the secret lives (env var, GitHub secret) instead of the value.
- ❌ Do not commit auto-deploy of Supabase migrations until the manual `workflow_dispatch` gate has been live and trusted for a while.
- ❌ Do not enable Pages "Deploy from branch"; the only path is the `workflow_run`-gated `deploy.yml`.
- ❌ Do not run `cd <dir> && cmd` patterns in tooling; use `workdir` parameter / explicit paths.
- ❌ Do not skip the verification gate (`lint && test && test:e2e`) before pushing — even for a "trivial" change.
- ❌ Do not weaken Row Level Security once the Supabase schema is in place; relying only on the anon key being "secret" is wrong.
- ❌ Do not fire Supabase writes "fire-and-forget" or advance the sync diff baseline (`lastSyncedRef`) before a write confirms. Persist must stay **serialized** via `runSync` in `AppContext` — two overlapping syncs (e.g. record a game day then delete it) race and corrupt state (stock deducted but usage row already gone). This bug shipped once; don't reintroduce it.

---

## 13. Critical context

### Repo & remote
- Repo: `ramindusn/badminton-tracker` (public).
- Remote URL (SSH): `git@github-personal:ramindusn/badminton-tracker.git`.
- SSH config alias `github-personal` resolves to `github.com` with `IdentityFile ~/.ssh/id_ed25519_personal_github` and `IdentitiesOnly yes`.
- Per-repo Git identity: `ramindusn <ramindusn@users.noreply.github.com>` (configured locally; office identity is global default).

### Live + container URLs
- Live (Pages): `https://ramindusn.github.io/badminton-tracker/`.
- Local Docker: `http://localhost:8080` (`docker compose up --build`).
- Vite dev: typically `http://localhost:5173/badminton-tracker/`.
- Playwright preview: `http://localhost:4173/badminton-tracker/`.

### Seed data (initial state for fresh browsers)
- Members: Uditha, Sahan, Nilusha, Ramindu — each starting 200 € contributed on **2026-06-15 13:00**.
- Products:
  - RSL Classic Academy — 20 barrels × 12 shuttles, batch price 24.50 €/barrel, bought **2026-06-15 18:00**.
  - Victor New Carbonsonic Pro — 10 × 12, batch price 27.85 €/barrel, bought **2026-06-15 18:00**.
- Expense: 2 Bergen 60L boxes pro-rated 16.67 €, bought **2026-06-16 19:00**.
- localStorage key: `badminton-tracker-state-v2`.
- Quick math sanity check: cash 800 € − spent 785.17 € = remaining 14.83 € (before any usage).

### Test counts
- Unit/component (vitest): **22** across `src/lib/calc.test.ts` (15), `src/lib/db.test.ts` (6) and `src/components/StatCard.test.tsx` (1).
- E2E (Playwright): **10** = 5 desktop chromium + 5 mobile Pixel 5, in `e2e/app.spec.ts`. Auth via the `VITE_E2E=1` bypass (no real email).

### Playwright quirks worth knowing
- `webServer` runs `npm run build && npm run preview -- --port 4173 --strictPort`.
- `baseURL` includes the `BASE_PATH` `/badminton-tracker/`.
- `tsconfig.json` excludes `e2e/` so Playwright's types don't conflict with the SPA's.

### npm / build hygiene
- `npm audit` reports a handful of vulnerabilities in transitive build tooling. Acknowledged for now; not fixed because they don't impact runtime or the public surface.

### Auth & secrets
- Auth is **Supabase magic link** (`src/context/AuthContext.tsx`) — the hardcoded password is gone.
- Client uses `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (the `sb_publishable_…` key). These are **public by design** — they ship in the bundle; RLS is the guard. Stored in `.env.local` (git-ignored) for dev and GitHub repo secrets (`SUPABASE_URL`/`SUPABASE_ANON_KEY`) for CI/deploy builds.
- **Never** put the Supabase **secret key** (`sb_secret_…`), DB password, or the Resend API key in client code or any `VITE_`-prefixed var — those go in GitHub secrets / the Supabase dashboard only.
- Repo secrets needed: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`.

### Headers / primitives that other code depends on
- `Button` has no default `type`. Forms rely on the native submit behaviour. Don't change this without auditing every form.
- `StatCard` accepts a `testId` prop and emits both `data-testid={testId}` and `data-testid={`${testId}-value`}`. Used by e2e selectors.

### Key files map (entry points to remember)
| File | Why it matters |
|---|---|
| `src/App.tsx` | Layout shell. |
| `src/types.ts` | Domain types. |
| `src/lib/calc.ts` | Pure money/inventory math (fully unit-tested). |
| `src/lib/storage.ts` | localStorage persistence + `migrateSeedDates` shim (fallback path). |
| `src/lib/supabase.ts` | Supabase client singleton (null when env absent). |
| `src/lib/db.ts` | Supabase data layer: `hydrate` + diff `syncState` + `emptyState`. Pure mappers unit-tested in `db.test.ts`. |
| `src/context/AppContext.tsx` | All mutating actions + cascading delete logic. `USE_SUPABASE` picks cloud vs localStorage. |
| `src/context/AuthContext.tsx` | Supabase magic-link auth + admin check + `VITE_E2E` bypass. |
| `supabase/migrations/0001_init.sql` | Schema, RLS, admin-bootstrap trigger. |
| `supabase/seed.sql` | Seed data + `allowed_admins` allowlist. |
| `src/components/Header.tsx` | Hosts `<QuickAdd />` when authenticated. |
| `src/components/QuickAdd.tsx` | The single transaction entry point (chooser + 3 modals). |
| `src/components/Inventory.tsx` | Per-batch rows; Add/Edit product. |
| `src/components/TransactionLog.tsx` | Paginated log, edit-batch / delete actions. |
| `src/components/MemberBalances.tsx` | Member rows; `+ Add member` (no per-row Add cash). |
| `src/components/FundSummary.tsx` | Read-only totals, grouped Money in / Money out. |
| `src/components/TodayUsage.tsx` | Live today tally + history; no Record button (header owns it). |
| `vite.config.ts` | Vite + Vitest config (jsdom, setupFiles, base path). |
| `playwright.config.ts` | Desktop + mobile projects. |
| `.github/workflows/ci.yml` | Full verification gate. |
| `.github/workflows/deploy.yml` | Gated Pages deploy. |
| `Dockerfile` / `nginx.conf` / `docker-compose.yml` | Container path. |

---

## 14. Maintenance rule

This file is only useful if it stays true. Update it whenever you:

1. Make a **non-obvious architectural decision** — add it to §6 with the *why*.
2. **Ship or defer a roadmap phase** — move it between §9 and §10.
3. **Resolve an open question** — remove it from §11 and reflect the decision elsewhere.
4. **Change a working convention** (commit style, mode discipline, verification gate, push target, …) — update §5.
5. **Introduce or rename a test ID, file, or primitive** that other code depends on — update §7.4 and/or §13.
6. **Hit a footgun** worth warning the next agent about — add it to §12.

When in doubt: write it down. Future you (or the next agent under a different account) will thank you.
