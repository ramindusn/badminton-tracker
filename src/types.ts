// ---- Core domain types -------------------------------------------------

/** A single cash contribution a member made into the fund. */
export interface Contribution {
  id: string
  amount: number
  date: string // ISO date
}

/** A club member who puts cash into the shared fund. */
export interface Member {
  id: string
  name: string
  contributions: Contribution[]
}

/** A shuttle product: a brand + model. Price is tracked per purchase batch. */
export interface Product {
  id: string
  brand: string
  model: string
  shuttlesPerBarrel: number
  barrels: number // full barrels currently in stock
  looseShuttles: number // leftover individual shuttles (created by usage)
}

/**
 * A purchase of barrels for a product = one batch.
 * The price is fixed for the whole batch and never changes per unit.
 */
export interface Purchase {
  id: string
  productId: string
  barrels: number
  pricePerBarrel: number // fixed price for this batch
  date: string
  note?: string
}

/** A single day's shuttle usage across products. */
export interface UsageEntry {
  id: string
  date: string
  items: { productId: string; shuttlesUsed: number }[]
}

/** Any other expense (e.g. storage boxes). */
export interface Expense {
  id: string
  description: string
  amount: number
  date: string
}

/** The full persisted application state. */
export interface AppState {
  members: Member[]
  products: Product[]
  purchases: Purchase[]
  usage: UsageEntry[]
  expenses: Expense[]
}
