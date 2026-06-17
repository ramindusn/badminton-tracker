import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AppState, Product } from '../types'
import { loadState, saveState, seedState, uid } from '../lib/storage'
import { emptyState, hydrate, syncState } from '../lib/db'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { nowLocalInput, productShuttleCount } from '../lib/calc'

// Use Supabase when it's configured and we're not in the e2e build (which
// always exercises the offline localStorage path so tests need no live DB).
const USE_SUPABASE = isSupabaseConfigured && import.meta.env.VITE_E2E !== '1'

interface NewProductInput {
  brand: string
  model: string
  shuttlesPerBarrel: number
  pricePerBarrel: number
  barrels: number
  note?: string
  when?: string
}

/** Editable fields of a product (descriptive + manual stock counts, no pricing). */
type ProductDetails = Pick<
  Product,
  'brand' | 'model' | 'shuttlesPerBarrel' | 'barrels' | 'looseShuttles'
>

/** Identifies a single deletable transaction in the fund log. */
export type TxRef =
  | { kind: 'contribution'; memberId: string; id: string }
  | { kind: 'purchase'; id: string }
  | { kind: 'expense'; id: string }
  | { kind: 'usage'; id: string }

interface AppContextValue {
  state: AppState
  // products
  addProduct: (input: NewProductInput) => void
  updateProduct: (id: string, details: ProductDetails) => void
  deleteProduct: (id: string) => void
  /** Update the fixed price of an existing purchase batch. */
  updateBatchPrice: (purchaseId: string, pricePerBarrel: number) => void
  // usage
  recordUsage: (date: string, items: { productId: string; shuttlesUsed: number }[]) => void
  // members & fund
  addMember: (name: string, initialCash: number, when?: string) => void
  addCash: (memberId: string, amount: number, when?: string) => void
  addExpense: (description: string, amount: number, when?: string) => void
  /** Delete any single transaction, reversing its effect on fund and inventory. */
  deleteTransaction: (ref: TxRef) => void
  // misc
  resetAll: () => void
  /** True when state is backed by Supabase (vs local-only localStorage). */
  cloudBacked: boolean
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

function now(): string {
  return nowLocalInput()
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [state, setState] = useState<AppState>(() =>
    USE_SUPABASE ? emptyState() : loadState(),
  )

  // Supabase persistence bookkeeping. clubId is the admin's club; prevRef holds
  // the last-synced snapshot so the persist effect can diff against it; hydrated
  // gates writes until the initial load completes.
  const clubIdRef = useRef<string | null>(null)
  const prevRef = useRef<AppState>(state)
  const hydratedRef = useRef(false)

  // Hydrate from Supabase when an admin signs in; clear on sign-out.
  useEffect(() => {
    if (!USE_SUPABASE) return
    if (!isAuthenticated) {
      hydratedRef.current = false
      clubIdRef.current = null
      prevRef.current = emptyState()
      setState(emptyState())
      return
    }
    let active = true
    hydrate()
      .then((res) => {
        if (!active || !res) return
        clubIdRef.current = res.clubId
        prevRef.current = res.state
        hydratedRef.current = true
        setState(res.state)
      })
      .catch((err) => console.error('Supabase hydrate failed:', err))
    return () => {
      active = false
    }
  }, [isAuthenticated])

  // Persist every change: diff to Supabase when cloud-backed, else localStorage.
  useEffect(() => {
    if (USE_SUPABASE) {
      if (!hydratedRef.current || !clubIdRef.current) return
      const prev = prevRef.current
      prevRef.current = state
      syncState(clubIdRef.current, prev, state).catch((err) =>
        console.error('Supabase sync failed:', err),
      )
    } else {
      saveState(state)
    }
  }, [state])

  function addProduct(input: NewProductInput): void {
    setState((s) => {
      const product: Product = {
        id: uid(),
        brand: input.brand.trim(),
        model: input.model.trim(),
        shuttlesPerBarrel: input.shuttlesPerBarrel,
        barrels: input.barrels,
        looseShuttles: 0,
      }
      const purchase = {
        id: uid(),
        productId: product.id,
        barrels: input.barrels,
        pricePerBarrel: input.pricePerBarrel,
        date: input.when || now(),
        note: input.note?.trim() || 'New product stock',
      }
      return {
        ...s,
        products: [...s.products, product],
        purchases: input.barrels > 0 ? [...s.purchases, purchase] : s.purchases,
      }
    })
  }

  function updateProduct(id: string, details: ProductDetails): void {
    setState((s) => ({
      ...s,
      products: s.products.map((p) =>
        p.id === id
          ? {
              ...p,
              brand: details.brand.trim(),
              model: details.model.trim(),
              shuttlesPerBarrel: details.shuttlesPerBarrel,
              barrels: details.barrels,
              looseShuttles: details.looseShuttles,
            }
          : p,
      ),
    }))
  }

  function updateBatchPrice(purchaseId: string, pricePerBarrel: number): void {
    if (pricePerBarrel < 0) return
    setState((s) => ({
      ...s,
      purchases: s.purchases.map((p) =>
        p.id === purchaseId ? { ...p, pricePerBarrel } : p,
      ),
    }))
  }

  function deleteProduct(id: string): void {
    setState((s) => ({
      ...s,
      products: s.products.filter((p) => p.id !== id),
      purchases: s.purchases.filter((p) => p.productId !== id),
      usage: s.usage
        .map((u) => ({ ...u, items: u.items.filter((i) => i.productId !== id) }))
        .filter((u) => u.items.length > 0),
    }))
  }

  function recordUsage(
    date: string,
    items: { productId: string; shuttlesUsed: number }[],
  ): void {
    const used = items.filter((i) => i.shuttlesUsed > 0)
    if (used.length === 0) return
    setState((s) => {
      // deduct shuttles from inventory
      const products = s.products.map((p) => {
        const item = used.find((i) => i.productId === p.id)
        if (!item) return p
        const remaining = Math.max(0, productShuttleCount(p) - item.shuttlesUsed)
        return {
          ...p,
          barrels: Math.floor(remaining / p.shuttlesPerBarrel),
          looseShuttles: remaining % p.shuttlesPerBarrel,
        }
      })
      return {
        ...s,
        products,
        usage: [...s.usage, { id: uid(), date, items: used }],
      }
    })
  }

  function addMember(name: string, initialCash: number, when?: string): void {
    setState((s) => ({
      ...s,
      members: [
        ...s.members,
        {
          id: uid(),
          name: name.trim(),
          contributions:
            initialCash > 0
              ? [{ id: uid(), amount: initialCash, date: when || now() }]
              : [],
        },
      ],
    }))
  }

  function addCash(memberId: string, amount: number, when?: string): void {
    if (amount <= 0) return
    setState((s) => ({
      ...s,
      members: s.members.map((m) =>
        m.id === memberId
          ? {
              ...m,
              contributions: [
                ...m.contributions,
                { id: uid(), amount, date: when || now() },
              ],
            }
          : m,
      ),
    }))
  }

  function addExpense(description: string, amount: number, when?: string): void {
    if (amount <= 0) return
    setState((s) => ({
      ...s,
      expenses: [
        ...s.expenses,
        { id: uid(), description: description.trim(), amount, date: when || now() },
      ],
    }))
  }

  /**
   * Delete any single transaction and reverse its effect so the fund and
   * inventory stay consistent:
   *  - contribution → removes the member's cash (fund down)
   *  - expense      → removes the expense (fund up)
   *  - purchase     → removes the batch and its barrels from stock (fund up,
   *                   stock down); if it was the product's last batch, the
   *                   product (its inventory row) is removed entirely
   *  - usage        → removes the usage and returns those shuttles to stock
   *                   (fund down because the members' payment is undone)
   */
  function deleteTransaction(ref: TxRef): void {
    setState((s) => {
      switch (ref.kind) {
        case 'contribution':
          return {
            ...s,
            members: s.members.map((m) =>
              m.id === ref.memberId
                ? { ...m, contributions: m.contributions.filter((c) => c.id !== ref.id) }
                : m,
            ),
          }
        case 'expense':
          return { ...s, expenses: s.expenses.filter((e) => e.id !== ref.id) }
        case 'purchase': {
          const purchase = s.purchases.find((p) => p.id === ref.id)
          const purchases = s.purchases.filter((p) => p.id !== ref.id)
          if (!purchase) return { ...s, purchases }
          // Does the product still have any batches left after this delete?
          const hasRemainingBatch = purchases.some(
            (p) => p.productId === purchase.productId,
          )
          if (!hasRemainingBatch) {
            // Last batch removed → drop the product (its inventory row) and any
            // usage entries that referenced it, so nothing lingers as "—".
            return {
              ...s,
              purchases,
              products: s.products.filter((p) => p.id !== purchase.productId),
              usage: s.usage
                .map((u) => ({
                  ...u,
                  items: u.items.filter((i) => i.productId !== purchase.productId),
                }))
                .filter((u) => u.items.length > 0),
            }
          }
          // Other batches remain → just remove this batch's barrels from stock.
          return {
            ...s,
            purchases,
            products: s.products.map((p) =>
              p.id === purchase.productId
                ? { ...p, barrels: Math.max(0, p.barrels - purchase.barrels) }
                : p,
            ),
          }
        }
        case 'usage': {
          const entry = s.usage.find((u) => u.id === ref.id)
          const products = entry
            ? s.products.map((p) => {
                const item = entry.items.find((i) => i.productId === p.id)
                if (!item) return p
                const total = productShuttleCount(p) + item.shuttlesUsed
                return {
                  ...p,
                  barrels: Math.floor(total / p.shuttlesPerBarrel),
                  looseShuttles: total % p.shuttlesPerBarrel,
                }
              })
            : s.products
          return {
            ...s,
            products,
            usage: s.usage.filter((u) => u.id !== ref.id),
          }
        }
      }
    })
  }

  function resetAll(): void {
    if (USE_SUPABASE) {
      // Reseeding makes no sense against the shared DB — reload from it,
      // discarding any unsynced local edits.
      hydrate()
        .then((res) => {
          if (!res) return
          prevRef.current = res.state
          setState(res.state)
        })
        .catch((err) => console.error('Supabase reload failed:', err))
      return
    }
    setState(seedState())
  }

  return (
    <AppContext.Provider
      value={{
        state,
        addProduct,
        updateProduct,
        deleteProduct,
        updateBatchPrice,
        recordUsage,
        addMember,
        addCash,
        addExpense,
        deleteTransaction,
        resetAll,
        cloudBacked: USE_SUPABASE,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
