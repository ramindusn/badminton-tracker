# Contributing

Thanks for helping with Badminton Tracker! 🏸 Here's the short version.

## Setup

```bash
git clone https://github.com/ramindusn/badminton-tracker.git
cd badminton-tracker
npm install
npm run dev          # http://localhost:5173
```

The app runs on local sample data out of the box — no database needed to develop.

## Making a change

1. **Branch** off `main`:
   ```bash
   git switch -c feat/your-change
   ```
2. Make your change — keep it small and focused.
3. **Run the gate** (must be green before you push):
   ```bash
   npm run lint && npm run test && npm run test:e2e
   ```
4. **Commit** with a [Conventional Commit](https://www.conventionalcommits.org) message:
   ```
   feat(usage): add per-player charges
   fix(fund): correct rounding in member balances
   ```
5. **Push** your branch and **open a Pull Request** to `main`. The PR template guides you.

## What happens next

- **CI** runs automatically — lint + unit tests, e2e, and a Docker build. All three must pass.
- **@ramindusn** is auto-requested as reviewer and must approve.
- Once green and approved, **merge**. Merging to `main` auto-deploys to
  https://badmintonduo.club.

> Direct pushes to `main` are blocked — everything goes through a PR.

## House rules

- **Never commit secrets.** `.env.local` is git-ignored; only `VITE_`-prefixed
  (public) values belong in client code.
- **Match the surrounding style** — TypeScript (strict) + React + Tailwind.
- Changed a convention or made an architectural call? Note it in `AGENTS.md`.

## Handy commands

| Command | What |
|---|---|
| `npm run dev` | Dev server |
| `npm run lint` | Type-check |
| `npm run test` | Unit / component tests |
| `npm run test:e2e` | End-to-end tests |
| `npm run build` | Production build |

Questions? Ping Ramindu. 🏸
