import type { AppState, Product } from '../types'

/** Format a number as euros. */
export function euro(n: number): string {
  return `${n.toFixed(2)} €`
}

/** Total cash collected from all members. */
export function totalCollected(state: AppState): number {
  return state.members.reduce(
    (sum, m) => sum + m.contributions.reduce((s, c) => s + c.amount, 0),
    0,
  )
}

/** Total spent on barrel purchases. */
export function totalPurchases(state: AppState): number {
  return state.purchases.reduce((sum, p) => sum + p.barrels * p.unitCost, 0)
}

/** Total spent on other expenses. */
export function totalExpenses(state: AppState): number {
  return state.expenses.reduce((sum, e) => sum + e.amount, 0)
}

/** Total money spent (purchases + expenses). */
export function totalSpent(state: AppState): number {
  return totalPurchases(state) + totalExpenses(state)
}

/** Remaining fund balance. */
export function remainingFund(state: AppState): number {
  return totalCollected(state) - totalSpent(state)
}

/** Cost of a single shuttle for a product. */
export function costPerShuttle(product: Product): number {
  if (product.shuttlesPerBarrel <= 0) return 0
  return product.costPerBarrel / product.shuttlesPerBarrel
}

/** Total shuttles in stock for a product (barrels * perBarrel + loose). */
export function productShuttleCount(product: Product): number {
  return product.barrels * product.shuttlesPerBarrel + product.looseShuttles
}

export interface MemberBalance {
  id: string
  name: string
  starting: number
  spent: number
  left: number
}

/**
 * Per-member balances. Spending is split equally across all current members.
 */
export function memberBalances(state: AppState): MemberBalance[] {
  const spent = totalSpent(state)
  const count = state.members.length || 1
  const share = spent / count
  return state.members.map((m) => {
    const starting = m.contributions.reduce((s, c) => s + c.amount, 0)
    return {
      id: m.id,
      name: m.name,
      starting,
      spent: share,
      left: starting - share,
    }
  })
}

export interface UsageTotals {
  perProduct: { product: Product; shuttlesUsed: number; cost: number }[]
  totalCost: number
}

/** Aggregate usage for a specific date (defaults to all usage). */
export function usageForDate(state: AppState, date?: string): UsageTotals {
  const entries = date ? state.usage.filter((u) => u.date === date) : state.usage
  const map = new Map<string, number>()
  for (const entry of entries) {
    for (const item of entry.items) {
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.shuttlesUsed)
    }
  }
  const perProduct = state.products.map((product) => {
    const shuttlesUsed = map.get(product.id) ?? 0
    return { product, shuttlesUsed, cost: shuttlesUsed * costPerShuttle(product) }
  })
  return {
    perProduct,
    totalCost: perProduct.reduce((s, p) => s + p.cost, 0),
  }
}

/** Today's date as an ISO date string (YYYY-MM-DD). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
