import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import {
  euro,
  formatDate,
  todayISO,
  usageForDate,
  usageHistory,
} from '../lib/calc'
import type { Product } from '../types'
import { Card } from './Card'
import { Button } from './Button'
import { Modal } from './Modal'
import { Field } from './Field'

export function TodayUsage() {
  const { state, recordUsage, deleteTransaction } = useApp()
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)

  const today = todayISO()
  const totals = usageForDate(state, today)
  const history = usageHistory(state)

  function handleDeleteDay(day: { id: string; date: string; totalShuttles: number }) {
    if (
      confirm(
        `Are you sure you want to delete this game day?\n\n${formatDate(day.date)} — ${
          day.totalShuttles
        } shuttles\n\nThis returns those shuttles to inventory and undoes the members' payment.`,
      )
    ) {
      deleteTransaction({ kind: 'usage', id: day.id })
    }
  }

  return (
    <Card
      title="Game-day Usage"
      icon="📅"
      accent="border-amber-400"
      action={
        isAuthenticated ? (
          <Button onClick={() => setOpen(true)}>+ Record game-day usage</Button>
        ) : undefined
      }
    >
      {/* Today's tally */}
      <div className="rounded-lg bg-amber-50 p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
          Today · {formatDate(today)}
        </div>
        <ul className="divide-y divide-amber-100">
          {totals.perProduct.map(({ product, shuttlesUsed }) => (
            <li key={product.id} className="flex justify-between py-1.5 text-sm">
              <span className="text-slate-600">
                {product.brand} {product.model}
              </span>
              <strong className="text-slate-800">{shuttlesUsed} used</strong>
            </li>
          ))}
          {totals.perProduct.length === 0 && (
            <li className="py-1.5 text-sm text-slate-500">No products yet.</li>
          )}
        </ul>
        <div className="mt-2 border-t border-amber-200 pt-2 text-right text-base font-bold text-slate-800">
          Cost today: {euro(totals.totalCost)}
        </div>
      </div>

      {/* Game-day history */}
      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold text-slate-500">
          Recent game days
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400">
            No game days logged yet. {isAuthenticated ? 'Record one above.' : ''}
          </p>
        ) : (
          <ul className="space-y-2">
            {history.slice(0, 6).map((day) => (
              <li
                key={day.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium text-slate-700">
                    {formatDate(day.date)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {day.parts
                      .filter((p) => p.shuttlesUsed > 0)
                      .map((p) => `${p.name}: ${p.shuttlesUsed}`)
                      .join(' · ') || 'no shuttles'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-700">
                    {day.totalShuttles} shuttles
                  </div>
                  <div className="text-xs text-slate-400">{euro(day.totalCost)}</div>
                </div>
                {isAuthenticated && (
                  <button
                    type="button"
                    aria-label="Delete game day"
                    onClick={() => handleDeleteDay(day)}
                    className="ml-2 rounded p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && (
        <RecordUsageModal
          products={state.products}
          onClose={() => setOpen(false)}
          onSave={(date, items) => {
            recordUsage(date, items)
            setOpen(false)
          }}
        />
      )}
    </Card>
  )
}

function RecordUsageModal({
  products,
  onClose,
  onSave,
}: {
  products: Product[]
  onClose: () => void
  onSave: (date: string, items: { productId: string; shuttlesUsed: number }[]) => void
}) {
  const [date, setDate] = useState(todayISO())
  const [counts, setCounts] = useState<Record<string, string>>({})

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const items = products.map((p) => ({
      productId: p.id,
      shuttlesUsed: Number(counts[p.id] ?? 0),
    }))
    onSave(date, items)
  }

  return (
    <Modal open title="Record game-day usage" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Game day"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {products.map((p) => (
          <Field
            key={p.id}
            label={`${p.brand} ${p.model} — shuttles used`}
            type="number"
            min={0}
            value={counts[p.id] ?? ''}
            onChange={(e) => setCounts((c) => ({ ...c, [p.id]: e.target.value }))}
            placeholder="0"
          />
        ))}
        {products.length === 0 && (
          <p className="text-sm text-slate-500">Add a product first.</p>
        )}
        <p className="text-xs text-slate-400">
          Shuttles used are deducted from stock. Cost is split equally across members.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={products.length === 0}>
            Save usage
          </Button>
        </div>
      </form>
    </Modal>
  )
}
