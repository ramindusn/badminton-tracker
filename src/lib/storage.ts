import type { AppState } from '../types'

const STORAGE_KEY = 'badminton-tracker-state-v2'

/** Generate a short unique id (good enough for a localStorage app). */
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

const cashDate = '2026-06-15T13:00'
const shuttlesDate = '2026-06-15T18:00'
const boxDate = '2026-06-16T19:00'

/** Initial seed data ported from the original mock dashboard. */
export function seedState(): AppState {
  const rsl = {
    id: 'prod-rsl',
    brand: 'RSL',
    model: 'Classic Academy',
    shuttlesPerBarrel: 12,
    barrels: 20,
    looseShuttles: 0,
  }
  const victor = {
    id: 'prod-victor',
    brand: 'Victor',
    model: 'New Carbonsonic Pro',
    shuttlesPerBarrel: 12,
    barrels: 10,
    looseShuttles: 0,
  }

  return {
    members: ['Uditha', 'Sahan', 'Nilusha', 'Ramindu'].map((name) => ({
      id: 'mem-' + name.toLowerCase(),
      name,
      contributions: [{ id: uid(), amount: 200, date: cashDate }],
    })),
    products: [rsl, victor],
    purchases: [
      {
        id: uid(),
        productId: rsl.id,
        barrels: 20,
        pricePerBarrel: 24.5,
        date: shuttlesDate,
        note: 'Initial RSL batch',
      },
      {
        id: uid(),
        productId: victor.id,
        barrels: 10,
        pricePerBarrel: 27.85,
        date: shuttlesDate,
        note: 'Initial Victor batch',
      },
    ],
    usage: [],
    expenses: [
      {
        id: uid(),
        description: '2 Bergen 60L boxes (pro-rated 3-for-25€ offer)',
        amount: 16.67,
        date: boxDate,
      },
    ],
  }
}

/** Load state from localStorage, falling back to the seed. */
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedState()
    const parsed = JSON.parse(raw) as AppState
    // minimal shape guard
    if (!parsed.members || !parsed.products) return seedState()
    return migrateSeedDates(parsed)
  } catch {
    return seedState()
  }
}

/**
 * Rewrites legacy records that still carry the original single seed timestamp
 * ('2026-06-16T12:00') to the corrected per-kind timestamps. Safe to run on
 * every load: it only touches rows whose date exactly matches the old value,
 * so anything the user has edited or added is left untouched.
 */
const LEGACY_SEED_DATE = '2026-06-16T12:00'
function migrateSeedDates(state: AppState): AppState {
  let touched = false
  const remap = (date: string, target: string, legacy: string = LEGACY_SEED_DATE) => {
    if (date === legacy) {
      touched = true
      return target
    }
    return date
  }
  const next: AppState = {
    ...state,
    members: state.members.map((m) => ({
      ...m,
      contributions: m.contributions.map((c) => ({
        ...c,
        date: remap(c.date, cashDate),
      })),
    })),
    purchases: state.purchases.map((p) => ({
      ...p,
      date: remap(p.date, shuttlesDate),
    })),
    expenses: state.expenses.map((e) => ({
      ...e,
      // First migrate from the original single seed date, then correct the
      // previously-wrong box date (17 Jun 19:00) to its real value (16 Jun 19:00).
      date: remap(remap(e.date, boxDate), boxDate, '2026-06-17T19:00'),
    })),
  }
  if (touched) saveState(next)
  return next
}

/** Persist state to localStorage. */
export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore quota / serialization errors for this pet project
  }
}

/** Wipe stored state (used by the "reset to seed" action). */
export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY)
}
