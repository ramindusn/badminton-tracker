import { useState } from 'react'
import { useApp } from '../context/AppContext'
import type { TxRef } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import {
  euro,
  formatDateTime,
  nowLocalInput,
  remainingFund,
  totalCollected,
  totalSpent,
  totalUsageIncome,
  usageHistory,
} from '../lib/calc'
import { Card } from './Card'
import { Button } from './Button'
import { Modal } from './Modal'
import { Field } from './Field'

interface LogRow {
  ref: TxRef
  label: string
  amount: number // positive = into fund, negative = out
  date: string
  batch?: { id: string; pricePerBarrel: number; barrels: number }
}

export function FundSummary() {
  const { state, addExpense, deleteTransaction, updateBatchPrice } = useApp()
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<LogRow['batch'] | null>(null)

  const productName = (id: string) => {
    const p = state.products.find((x) => x.id === id)
    return p ? `${p.brand} ${p.model}` : 'product'
  }

  const rows: LogRow[] = [
    ...state.members.flatMap((m) =>
      m.contributions.map((c) => ({
        ref: { kind: 'contribution', memberId: m.id, id: c.id } as TxRef,
        label: `Cash from ${m.name}`,
        amount: c.amount,
        date: c.date,
      })),
    ),
    ...state.purchases.map((p) => ({
      ref: { kind: 'purchase', id: p.id } as TxRef,
      label: `Bought ${p.barrels} × ${productName(p.productId)} barrels @ ${euro(
        p.pricePerBarrel,
      )}`,
      amount: -(p.barrels * p.pricePerBarrel),
      date: p.date,
      batch: { id: p.id, pricePerBarrel: p.pricePerBarrel, barrels: p.barrels },
    })),
    ...state.expenses.map((e) => ({
      ref: { kind: 'expense', id: e.id } as TxRef,
      label: e.description,
      amount: -e.amount,
      date: e.date,
    })),
    ...usageHistory(state).map((u) => ({
      ref: { kind: 'usage', id: u.id } as TxRef,
      label: `Members paid for ${u.totalShuttles} shuttles used`,
      amount: u.totalCost,
      date: u.date,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const remaining = remainingFund(state)

  function handleDelete(row: LogRow) {
    const sign = row.amount >= 0 ? '+' : '−'
    const msg =
      `Are you sure you want to delete this entry?\n\n` +
      `"${row.label}"  (${sign} ${euro(Math.abs(row.amount))})\n\n` +
      (row.ref.kind === 'purchase'
        ? 'This also removes those barrels from inventory.'
        : row.ref.kind === 'usage'
          ? 'This returns those shuttles to inventory and undoes the payment.'
          : 'This updates the fund accordingly.')
    if (confirm(msg)) deleteTransaction(row.ref)
  }

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
          <li key={i} className="flex items-center justify-between gap-2 py-2 text-sm">
            <div className="min-w-0">
              <div className="truncate text-slate-600">{r.label}</div>
              <div className="text-xs text-slate-400">{formatDateTime(r.date)}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`whitespace-nowrap font-bold ${
                  r.amount >= 0 ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {r.amount >= 0 ? '+' : '−'} {euro(Math.abs(r.amount))}
              </span>
              {isAuthenticated && r.batch && (
                <button
                  type="button"
                  aria-label="Edit batch price"
                  title="Edit batch price"
                  onClick={() => setEditingBatch(r.batch)}
                  className="rounded p-1 text-slate-300 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                >
                  ✎
                </button>
              )}
              {isAuthenticated && (
                <button
                  type="button"
                  aria-label="Delete entry"
                  onClick={() => handleDelete(r)}
                  className="rounded p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  ✕
                </button>
              )}
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="py-2 text-sm text-slate-500">No transactions yet.</li>
        )}
      </ul>

      <div className="mt-3 space-y-1 border-t-2 border-dashed border-slate-200 pt-3 text-sm">
        <div className="flex justify-between text-slate-500">
          <span>Cash collected</span>
          <span>{euro(totalCollected(state))}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Paid for shuttles used</span>
          <span className="text-emerald-600">+ {euro(totalUsageIncome(state))}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Spent on stock &amp; expenses</span>
          <span className="text-red-500">− {euro(totalSpent(state))}</span>
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
          onSave={(desc, amount, when) => {
            addExpense(desc, amount, when)
            setOpen(false)
          }}
        />
      )}

      {editingBatch && (
        <EditBatchPriceModal
          batch={editingBatch}
          onClose={() => setEditingBatch(null)}
          onSave={(price) => {
            updateBatchPrice(editingBatch.id, price)
            setEditingBatch(null)
          }}
        />
      )}
    </Card>
  )
}

function EditBatchPriceModal({
  batch,
  onClose,
  onSave,
}: {
  batch: { id: string; pricePerBarrel: number; barrels: number }
  onClose: () => void
  onSave: (pricePerBarrel: number) => void
}) {
  const [price, setPrice] = useState(String(batch.pricePerBarrel))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (Number(price) < 0) return
    onSave(Number(price))
  }

  return (
    <Modal open title="Edit batch price" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Price per barrel (€)"
          type="number"
          min={0}
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          autoFocus
        />
        <p className="text-xs text-slate-400">
          This changes the fixed price for this whole batch of {batch.barrels}{' '}
          barrel{batch.barrels === 1 ? '' : 's'}. The fund and average prices update
          accordingly. Other batches are unaffected.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save price</Button>
        </div>
      </form>
    </Modal>
  )
}

function AddExpenseModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (description: string, amount: number, when: string) => void
}) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [when, setWhen] = useState(nowLocalInput())

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim() || Number(amount) <= 0) return
    onSave(description, Number(amount), when)
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
        <Field
          label="Date & time"
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
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
