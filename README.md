# 🏸 Badminton Tracker

Track a badminton group's shared fund, shuttle inventory, and member balances.
A single-page React app — **live at [badmintonduo.club](https://badmintonduo.club)**.

## What it does

- **Dashboard** — fund summary, inventory, member balances, and game-day usage.
- **Admin login** (passwordless magic link) unlocks editing: log cash, expenses,
  shuttle purchases (batch pricing), and game days (auto-deducts stock & charges members).
- **Shared data** in Supabase (Postgres), protected by Row Level Security. Falls back
  to local sample data when no database is configured.

## Tech stack

Vite · React · TypeScript · Tailwind · Supabase (Postgres + Auth) · Vitest +
Playwright · Docker · GitHub Actions.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173 — runs on local sample data, no DB needed
```

## Tests

```bash
npm run lint && npm run test && npm run test:e2e
```

## Docs

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — setup, the PR flow, and conventions.
- **[AGENTS.md](AGENTS.md)** — architecture, decisions, roadmap, and ops (Supabase, deploy, DNS).
- **`supabase/`** — database schema + seed.
