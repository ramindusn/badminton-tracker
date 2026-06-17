import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { AppState, Product } from '../types'
import { loadState, saveState, seedState, uid } from '../lib/storage'
import { productShuttleCount } from '../lib/calc'

interface NewProductInput {
  brand: string
  model: string
  shuttlesPerBarrel: number
  costPerBarrel: number
  barrels: number
  note?: string
}

type ProductDetails = Pick<
  Product,
  'brand' | 'model' | 'shuttlesPerBarrel' | 'costPerBarrel' | 'barrels' | 'looseShuttles'
>

interface AppContextValue {
  state: AppState
  // products
  addProduct: (input: NewProductInput) => void
  updateProduct: (id: string, details: ProductDetails) => void
  restockProduct: (id: string, barrels: number, unitCost: number, note?: string) => void
  deleteProduct: (id: string) => void
  // usage
  recordUsage: (date: string, items: { productId: string; shuttlesUsed: number }[]) => void
  // members & fund
  addMember: (name: string, initialCash: number) => void
  addCash: (memberId: string, amount: number) => void
  addExpense: (description: string, amount: number) => void
  // misc
  resetAll: () => void
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())

  useEffect(() => {
    saveState(state)
  }, [state])

  function addProduct(input: NewProductInput): void {
    setState((s) => {
      const product: Product = {
        id: uid(),
        brand: input.brand.trim(),
        model: input.model.trim(),
        shuttlesPerBarrel: input.shuttlesPerBarrel,
        costPerBarrel: input.costPerBarrel,
        barrels: input.barrels,
        looseShuttles: 0,
      }
      const purchase = {
        id: uid(),
        productId: product.id,
        barrels: input.barrels,
        unitCost: input.costPerBarrel,
        date: today(),
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
              costPerBarrel: details.costPerBarrel,
              barrels: details.barrels,
              looseShuttles: details.looseShuttles,
            }
          : p,
      ),
    }))
  }

  function restockProduct(id: string, barrels: number, unitCost: number, note?: string): void {
    if (barrels <= 0) return
    setState((s) => ({
      ...s,
      products: s.products.map((p) =>
        p.id === id ? { ...p, barrels: p.barrels + barrels } : p,
      ),
      purchases: [
        ...s.purchases,
        {
          id: uid(),
          productId: id,
          barrels,
          unitCost,
          date: today(),
          note: note?.trim() || 'Restock',
        },
      ],
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

  function addMember(name: string, initialCash: number): void {
    setState((s) => ({
      ...s,
      members: [
        ...s.members,
        {
          id: uid(),
          name: name.trim(),
          contributions:
            initialCash > 0 ? [{ id: uid(), amount: initialCash, date: today() }] : [],
        },
      ],
    }))
  }

  function addCash(memberId: string, amount: number): void {
    if (amount <= 0) return
    setState((s) => ({
      ...s,
      members: s.members.map((m) =>
        m.id === memberId
          ? {
              ...m,
              contributions: [
                ...m.contributions,
                { id: uid(), amount, date: today() },
              ],
            }
          : m,
      ),
    }))
  }

  function addExpense(description: string, amount: number): void {
    if (amount <= 0) return
    setState((s) => ({
      ...s,
      expenses: [
        ...s.expenses,
        { id: uid(), description: description.trim(), amount, date: today() },
      ],
    }))
  }

  function resetAll(): void {
    setState(seedState())
  }

  return (
    <AppContext.Provider
      value={{
        state,
        addProduct,
        updateProduct,
        restockProduct,
        deleteProduct,
        recordUsage,
        addMember,
        addCash,
        addExpense,
        resetAll,
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
