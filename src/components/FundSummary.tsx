import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import {
  euro,
  remainingFund,
  totalCollected,
  totalSpent,
} from '../lib/calc'
import { Card } from './Card'
import { Button } from './Button'
import { Modal } from './Modal'
import { Field } from './Field'

interface LogRow {
  label: string
  amount: number // positive = into fund, negative = out
  date: string
}

export function FundSummary() {
  const { state, addExpense } = useApp()
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)

  const productName = (id: string) => {
    const p = state.products.find((x) => x.id === id)
    return p ? `${p.brand} ${p.model}` : 'product'
  }

  const rows: LogRow[] = [
    ...state.members.flatMap((m) =>
      m.contributions.map((c) => ({
        label: `Cash from ${m.name}`,
        amount: c.amount,
        date: c.date,
      })),
    ),
    ...state.purchases.map((p) => ({
      label: `Purchased ${p.barrels} × ${productName(p.productId)} barrels`,
      amount: -(p.barrels * p.unitCost),
      date: p.date,
    })),
    ...state.expenses.map((e) => ({
      label: e.description,
      amount: -e.amount,
      date: e.date,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const remaining = remainingFund(state)

  return (
    <Card
      title="Fund Summary (Transaction Logs)"
      icon="💰"
      accent="border-emerald-500"
      action={
        isAuthenticated ? (
          <Button onClick={() => setOpen(true)}>+ Add expense</Button>
        ) : undefined
      }
    >
      <ul className="divide-y divide-slate-100">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="text-slate-600">{r.label}</span>
            <span
              className={`whitespace-nowrap font-bold ${
                r.amount >= 0 ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {r.amount >= 0 ? '+' : '−'} {euro(Math.abs(r.amount))}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 space-y-1 border-t-2 border-dashed border-slate-200 pt-3 text-sm">
        <div className="flex justify-between text-slate-500">
          <span>Total collected</span>
          <span>{euro(totalCollected(state))}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Total spent</span>
          <span>{euro(totalSpent(state))}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-slate-800">
          <span>Remaining fund (cash)</span>
          <span className={remaining >= 0 ? 'text-emerald-600' : 'text-red-500'}>
            {euro(remaining)}
          </span>
        </div>
      </div>

      {open && (
        <AddExpenseModal
          onClose={() => setOpen(false)}
          onSave={(desc, amount) => {
            addExpense(desc, amount)
            setOpen(false)
          }}
        />
      )}
    </Card>
  )
}

function AddExpenseModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (description: string, amount: number) => void
}) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim() || Number(amount) <= 0) return
    onSave(description, Number(amount))
  }

  return (
    <Modal open title="Add an expense" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. New net"
          autoFocus
        />
        <Field
          label="Amount (€)"
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add expense</Button>
        </div>
      </form>
    </Modal>
  )
}
