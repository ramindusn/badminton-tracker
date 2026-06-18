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
  return state.purchases.reduce((sum, p) => sum + p.barrels * p.pricePerBarrel, 0)
}

/** Total spent on other expenses. */
export function totalExpenses(state: AppState): number {
  return state.expenses.reduce((sum, e) => sum + e.amount, 0)
}

/** Total money spent (purchases + expenses). */
export function totalSpent(state: AppState): number {
  return totalPurchases(state) + totalExpenses(state)
}

/**
 * Money paid back into the fund by members for shuttles they have used.
 * Valued at each product's average batch cost-per-shuttle.
 */
export function totalUsageIncome(state: AppState): number {
  const byId = new Map(state.products.map((p) => [p.id, p]))
  let sum = 0
  for (const entry of state.usage) {
    for (const item of entry.items) {
      const product = byId.get(item.productId)
      if (product) sum += item.shuttlesUsed * costPerShuttle(state, product)
    }
  }
  return sum
}

/**
 * Remaining fund balance.
 * = cash collected + payments for used shuttles − stock purchases − expenses.
 */
export function remainingFund(state: AppState): number {
  return totalCollected(state) + totalUsageIncome(state) - totalSpent(state)
}

/**
 * Weighted-average price per barrel for a product, blended across every
 * purchase batch (each batch keeps its own fixed price).
 */
export function avgBarrelPrice(state: AppState, productId: string): number {
  const batches = state.purchases.filter((p) => p.productId === productId)
  const totalBarrels = batches.reduce((s, b) => s + b.barrels, 0)
  if (totalBarrels <= 0) return 0
  const totalCost = batches.reduce((s, b) => s + b.barrels * b.pricePerBarrel, 0)
  return totalCost / totalBarrels
}

/** Average cost of a single shuttle for a product (from its batch prices). */
export function costPerShuttle(state: AppState, product: Product): number {
  if (product.shuttlesPerBarrel <= 0) return 0
  return avgBarrelPrice(state, product.id) / product.shuttlesPerBarrel
}

/** Total shuttles in stock for a product (barrels * perBarrel + loose). */
export function productShuttleCount(product: Product): number {
  return product.barrels * product.shuttlesPerBarrel + product.looseShuttles
}

/** Default threshold (in shuttles) below which a product is "low stock". */
export const LOW_STOCK_THRESHOLD = 24

/** Whether a product is running low on shuttles. */
export function isLowStock(product: Product, threshold = LOW_STOCK_THRESHOLD): boolean {
  return productShuttleCount(product) < threshold
}

/** Total shuttles in stock across all products. */
export function totalShuttlesInStock(state: AppState): number {
  return state.products.reduce((sum, p) => sum + productShuttleCount(p), 0)
}

export interface MemberBalance {
  id: string
  name: string
  starting: number
  spent: number
  left: number
}

/**
 * Per-member balances. **Net** spending — stock + expenses minus game-day usage
 * income — is split equally across all current members. Crediting usage income
 * keeps the balances summing to the remaining fund, so logging a game day is
 * reflected in every member's `left`.
 */
export function memberBalances(state: AppState): MemberBalance[] {
  const netSpent = totalSpent(state) - totalUsageIncome(state)
  const count = state.members.length || 1
  const share = netSpent / count
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
  // Compare on the YYYY-MM-DD prefix so both date-only and date-time entries
  // are matched against a date-only query.
  const key = date ? date.slice(0, 10) : undefined
  const entries = key
    ? state.usage.filter((u) => u.date.slice(0, 10) === key)
    : state.usage
  const map = new Map<string, number>()
  for (const entry of entries) {
    for (const item of entry.items) {
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.shuttlesUsed)
    }
  }
  const perProduct = state.products.map((product) => {
    const shuttlesUsed = map.get(product.id) ?? 0
    return { product, shuttlesUsed, cost: shuttlesUsed * costPerShuttle(state, product) }
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

/** Current local date-time formatted for a <input type="datetime-local"> value. */
export function nowLocalInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
}

/** Format a stored date or date-time string for display. */
export function formatDateTime(value: string): string {
  const hasTime = value.includes('T')
  const d = new Date(hasTime ? value : value + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return value
  if (!hasTime) {
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export interface UsageDay {
  id: string
  date: string
  totalShuttles: number
  totalCost: number
  parts: { name: string; shuttlesUsed: number }[]
}

/**
 * Game-day usage history, newest first, with per-day cost computed from the
 * current product prices.
 */
export function usageHistory(state: AppState): UsageDay[] {
  const productById = new Map(state.products.map((p) => [p.id, p]))
  return state.usage
    .map((entry) => {
      let totalShuttles = 0
      let totalCost = 0
      const parts: { name: string; shuttlesUsed: number }[] = []
      for (const item of entry.items) {
        const product = productById.get(item.productId)
        totalShuttles += item.shuttlesUsed
        if (product) {
          totalCost += item.shuttlesUsed * costPerShuttle(state, product)
          parts.push({
            name: `${product.brand} ${product.model}`,
            shuttlesUsed: item.shuttlesUsed,
          })
        }
      }
      return { id: entry.id, date: entry.date, totalShuttles, totalCost, parts }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Format an ISO date as a short human label. */
export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
