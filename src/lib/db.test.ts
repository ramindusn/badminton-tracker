import { describe, it, expect } from 'vitest'
import { emptyState, fromDbDate, rowsFromState } from './db'
import type { AppState } from '../types'

const CLUB = 'club-1'

const sample: AppState = {
  members: [
    {
      id: 'm1',
      name: 'Uditha',
      contributions: [{ id: 'c1', amount: 200, date: '2026-06-15T13:00' }],
    },
  ],
  products: [
    { id: 'p1', brand: 'RSL', model: 'Classic', shuttlesPerBarrel: 12, barrels: 20, looseShuttles: 0 },
  ],
  purchases: [
    { id: 'pu1', productId: 'p1', barrels: 20, pricePerBarrel: 24.5, date: '2026-06-15T18:00', note: 'batch' },
  ],
  usage: [{ id: 'u1', date: '2026-06-16T19:00', items: [{ productId: 'p1', shuttlesUsed: 4 }] }],
  expenses: [{ id: 'e1', description: 'box', amount: 16.67, date: '2026-06-16T19:00' }],
}

describe('fromDbDate', () => {
  it('slices a timestamptz ISO string back to the app wall-clock format', () => {
    expect(fromDbDate('2026-06-15T13:00:00+00:00')).toBe('2026-06-15T13:00')
    expect(fromDbDate('2026-06-15T13:00:00Z')).toBe('2026-06-15T13:00')
  })
})

describe('rowsFromState', () => {
  const rows = rowsFromState(sample, CLUB)

  it('stamps club_id onto every top-level table', () => {
    expect(rows.members[0].club_id).toBe(CLUB)
    expect(rows.products[0].club_id).toBe(CLUB)
    expect(rows.purchases[0].club_id).toBe(CLUB)
    expect(rows.usageEntries[0].club_id).toBe(CLUB)
    expect(rows.expenses[0].club_id).toBe(CLUB)
  })

  it('flattens member contributions with their member_id', () => {
    expect(rows.contributions).toEqual([
      { id: 'c1', member_id: 'm1', amount: 200, occurred_at: '2026-06-15T13:00' },
    ])
  })

  it('maps products to snake_case columns', () => {
    expect(rows.products[0]).toMatchObject({
      id: 'p1',
      shuttles_per_barrel: 12,
      barrels: 20,
      loose_shuttles: 0,
    })
  })

  it('flattens usage items keyed by usage and product', () => {
    expect(rows.usageItems).toEqual([
      { usage_id: 'u1', product_id: 'p1', shuttles_used: 4 },
    ])
  })

  it('produces no rows for an empty state', () => {
    const empty = rowsFromState(emptyState(), CLUB)
    expect(empty.members).toHaveLength(0)
    expect(empty.contributions).toHaveLength(0)
    expect(empty.usageItems).toHaveLength(0)
  })
})
