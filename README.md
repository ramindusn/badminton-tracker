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
- **Simple login** (hardcoded password) unlocks editing:
  - Add / edit / restock / delete shuttle products (brand, model, cost, count)
  - Record today's shuttle usage (auto-deducts inventory & computes cost)
  - Add other expenses
  - Add new members and add cash to the shared fund
- **Persistence:** everything is saved in the browser via `localStorage`.
  > Data is per-browser only and not shared between devices yet. A real
  > database (Firebase/Supabase) can be added later.

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS
- localStorage for state

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build locally
```

## Login

The edit password is hardcoded in `src/context/AuthContext.tsx`:

```
shuttle2026
```

> ⚠️ This is **not** real security — the password ships in the JS bundle. It
> only keeps casual visitors from editing. Swap for a real auth provider when
> you add a backend.

## Deploying to GitHub Pages

1. Create a GitHub repo named **`badminton-tracker`** and push this project.
   (The repo name must match `base` in `vite.config.ts`. If you use a
   different name, update `base: '/<repo-name>/'`.)
2. In the repo: **Settings → Pages → Build and deployment → Source = GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and
   deploys automatically.
4. Your site will be live at:
   `https://<your-username>.github.io/badminton-tracker/`

## Project structure

```
src/
  main.tsx              # app entry, wraps providers
  App.tsx               # page layout
  types.ts              # domain types
  lib/
    storage.ts          # localStorage load/save + seed data
    calc.ts             # derived totals (fund, balances, usage)
  context/
    AuthContext.tsx     # login state
    AppContext.tsx      # app state + all edit actions
  components/
    Header, TodayUsage, FundSummary, Inventory, MemberBalances
    Login, Card, Modal, Button, Field
```

## Roadmap (later)

- Real database backend (shared, multi-device)
- Proper authentication
- Docker, Playwright E2E tests, and GitHub Actions CI
