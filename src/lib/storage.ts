import type { AppState } from '../types'

const STORAGE_KEY = 'badminton-tracker-state-v2'

/** Generate a short unique id (good enough for a localStorage app). */
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

const seedDate = '2026-06-16T12:00'

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
      contributions: [{ id: uid(), amount: 200, date: seedDate }],
    })),
    products: [rsl, victor],
    purchases: [
      {
        id: uid(),
        productId: rsl.id,
        barrels: 20,
        pricePerBarrel: 24.5,
        date: seedDate,
        note: 'Initial RSL batch',
      },
      {
        id: uid(),
        productId: victor.id,
        barrels: 10,
        pricePerBarrel: 27.85,
        date: seedDate,
        note: 'Initial Victor batch',
      },
    ],
    usage: [],
    expenses: [
      {
        id: uid(),
        description: '2 Bergen 60L boxes (pro-rated 3-for-25€ offer)',
        amount: 16.67,
        date: seedDate,
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
    return parsed
  } catch {
    return seedState()
  }
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
