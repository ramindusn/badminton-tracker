import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { euro, todayISO, usageForDate } from '../lib/calc'
import { Card } from './Card'
import { Button } from './Button'
import { Modal } from './Modal'
import { Field } from './Field'

export function TodayUsage() {
  const { state, recordUsage } = useApp()
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)

  const today = todayISO()
  const totals = usageForDate(state, today)

  return (
    <Card
      title="Today's Usage"
      icon="📅"
      accent="border-amber-400"
      action={
        isAuthenticated ? (
          <Button onClick={() => setOpen(true)}>+ Record usage</Button>
        ) : undefined
      }
    >
      <ul className="divide-y divide-slate-100">
        {totals.perProduct.map(({ product, shuttlesUsed }) => (
          <li key={product.id} className="flex justify-between py-2 text-sm">
            <span className="text-slate-600">
              {product.brand} {product.model}
            </span>
            <strong className="text-slate-800">{shuttlesUsed} shuttles used</strong>
          </li>
        ))}
        {totals.perProduct.length === 0 && (
          <li className="py-2 text-sm text-slate-500">No products yet.</li>
        )}
      </ul>
      <div className="mt-3 border-t-2 border-dashed border-slate-200 pt-3 text-right text-base font-bold text-slate-800">
        Cost for today: {euro(totals.totalCost)}
      </div>

      {open && (
        <RecordUsageModal
          onClose={() => setOpen(false)}
          onSave={(items) => {
            recordUsage(today, items)
            setOpen(false)
          }}
          products={state.products}
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
  products: { id: string; brand: string; model: string }[]
  onClose: () => void
  onSave: (items: { productId: string; shuttlesUsed: number }[]) => void
}) {
  const [counts, setCounts] = useState<Record<string, string>>({})

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const items = products.map((p) => ({
      productId: p.id,
      shuttlesUsed: Number(counts[p.id] ?? 0),
    }))
    onSave(items)
  }

  return (
    <Modal open title="Record today's usage" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
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
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save usage</Button>
        </div>
      </form>
    </Modal>
  )
}
