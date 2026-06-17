# 🏸 Badminton Budget & Shuttle Tracker

A single-page React app to track a badminton group's shared fund, shuttle
inventory, and member balances. Built as a pet project, designed to be hosted
for free on **GitHub Pages**.

## Features

- **Read-only dashboard** anyone can view:
  - Today's shuttle usage and cost
  - Fund summary with a transaction log and remaining balance
  - Inventory left (per brand/model)
  - Per-member cash balances
- **Admin login** (Supabase magic link) unlocks editing:
  - Add / edit / delete shuttle products as fixed-price purchase batches
  - Record today's shuttle usage (auto-deducts inventory & computes cost)
  - Add other expenses
  - Add new members and add cash to the shared fund
- **Persistence:** data lives in **Supabase (Postgres)**, shared across devices,
  with Row Level Security scoping everything to club admins. A `localStorage`
  fallback keeps the app working in tests / unconfigured builds.

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth) for shared state, with a localStorage fallback
- Vitest + Testing Library (unit/component) and Playwright (e2e)
- Docker (nginx) and GitHub Actions CI/CD

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build locally
```

## Testing

```bash
npm run lint       # TypeScript type-check
npm run test       # Vitest unit & component tests
npm run test:e2e   # Playwright end-to-end tests (builds + previews first)
```

Use `data-testid` attributes (e.g. `login-button`, `add-product-button`) as the
stable selectors for e2e tests.

## Running with Docker

```bash
docker compose up --build   # serves the app at http://localhost:8080
```

The multi-stage `Dockerfile` builds the static site and serves it with nginx
(built with `--base=/` so it runs at the container root).

## Supabase backend (setup)

The app is being moved off `localStorage` onto Supabase (Postgres + Auth). The
schema and wiring live under `supabase/`:

- `supabase/migrations/0001_init.sql` — multi-club, role-aware schema with Row
  Level Security on every table, plus a trigger that promotes allowlisted emails
  to club admin on first login.
- `supabase/seed.sql` — the founding club, members, products, batches and the
  box expense, plus the admin email allowlist.

### One-time project setup

1. Create a free Supabase project in an EU region (this project uses
   **West EU — Ireland / `eu-west-1`**).
2. **Auth → Providers → Email**: enable it and turn on magic links. Set the
   **Site URL** and **Redirect URLs** to the Pages URL
   (`https://ramindusn.github.io/badminton-tracker/`) and, for local dev,
   `http://localhost:5173/badminton-tracker/`.
3. Install the CLI: `brew install supabase/tap/supabase`.
4. Add these **repo secrets** (Settings → Secrets and variables → Actions):
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PROJECT_REF`,
   `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`.
5. Edit `supabase/seed.sql` so `allowed_admins` holds the real admin email(s).
6. Apply the schema: run the **“DB push (manual)”** GitHub Action
   (`.github/workflows/db-push.yml`), or locally:
   `supabase link --project-ref <ref> && supabase db push`.

### Local env

Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` from **Project Settings → API**. The anon key is meant
to ship in the client bundle — **RLS is the real guard**, not key secrecy.

## Login

Editing is gated by **Supabase magic-link auth** — admins sign in with their
email and click a one-time link (no passwords). Only emails on the
`allowed_admins` list (seeded in `supabase/seed.sql`) get admin access; everyone
else is signed in but locked out of the data.

- Sessions persist and auto-refresh, so admins stay logged in across restarts.
- Magic-link emails are sent via **Resend** custom SMTP from `badmintonduo.club`
  (configured in the Supabase dashboard).
- When Supabase env vars are absent, or in the e2e build (`VITE_E2E=1`), the app
  falls back to local data with a synchronous test login — so the suite needs no
  live database.

## Continuous integration & deployment

Trunk-based development with `main` as the trunk:

- `.github/workflows/ci.yml` runs on every push and pull request to `main`:
  type-check, unit/component tests, production build, Playwright e2e tests, and
  a Docker image build.
- `.github/workflows/deploy.yml` deploys to GitHub Pages **only after CI
  succeeds on `main`** (triggered via `workflow_run`).

## Deploying to GitHub Pages

1. Create a GitHub repo named **`badminton-tracker`** and push this project.
   (The repo name must match `base` in `vite.config.ts`. If you use a
   different name, update `base: '/<repo-name>/'`.)
2. In the repo: **Settings → Pages → Build and deployment → Source = GitHub Actions**.
3. Push to `main`. CI runs first; once it passes, the deploy workflow builds and
   publishes automatically.
4. Your site will be live at:
   `https://<your-username>.github.io/badminton-tracker/`

## Project structure

```
src/
  main.tsx              # app entry, wraps providers
  App.tsx               # page layout
  types.ts              # domain types
  lib/
    supabase.ts         # Supabase client singleton
    db.ts               # Supabase data layer (hydrate + diff sync)
    storage.ts          # localStorage fallback + seed data
    calc.ts             # derived totals (fund, balances, usage)
  context/
    AuthContext.tsx     # Supabase magic-link auth + admin check
    AppContext.tsx      # app state + all edit actions (cloud or local)
  components/
    Header, TodayUsage, FundSummary, Inventory, MemberBalances
    Login, Card, Modal, Button, Field
```

## Roadmap (later)

- ✅ Real database backend (Supabase Postgres, shared/multi-device)
- ✅ Proper authentication (Supabase magic link)
- Player profiles + rankings
- Game-day match scheduling
- See `AGENTS.md` §10 for the full phased roadmap
