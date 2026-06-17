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

/** A shuttle product: a brand + model with a per-barrel cost. */
export interface Product {
  id: string
  brand: string
  model: string
  shuttlesPerBarrel: number
  costPerBarrel: number
  barrels: number // full barrels currently in stock
  looseShuttles: number // leftover individual shuttles
}

/** A purchase of barrels for a product (reduces the fund). */
export interface Purchase {
  id: string
  productId: string
  barrels: number
  unitCost: number // cost per barrel at the time of purchase
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
