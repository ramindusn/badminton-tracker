import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import {
  euro,
  nowLocalInput,
  remainingFund,
  totalCollected,
  totalSpent,
  totalUsageIncome,
} from '../lib/calc'
import { Card } from './Card'
import { Button } from './Button'
import { Modal } from './Modal'
import { Field } from './Field'

export function FundSummary() {
  const { state, addExpense } = useApp()
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)

  const remaining = remainingFund(state)

  return (
    <Card
      title="Fund Summary"
      icon="💰"
      accent="border-emerald-500"
      action={
        isAuthenticated ? (
          <Button onClick={() => setOpen(true)}>+ Add expense</Button>
        ) : undefined
      }
    >
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-slate-500">
          <span>Cash collected</span>
          <span className="font-medium text-slate-700">{euro(totalCollected(state))}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Paid for shuttles used</span>
          <span className="font-medium text-emerald-600">
            + {euro(totalUsageIncome(state))}
          </span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Spent on stock &amp; expenses</span>
          <span className="font-medium text-red-500">− {euro(totalSpent(state))}</span>
        </div>
        <div className="mt-2 flex justify-between border-t-2 border-dashed border-slate-200 pt-3 text-base font-bold text-slate-800">
          <span>Remaining fund</span>
          <span
            data-testid="fund-remaining"
            className={remaining >= 0 ? 'text-emerald-600' : 'text-red-500'}
          >
            {euro(remaining)}
          </span>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        The full list of contributions, purchases, expenses and game-day payments
        is in the Transaction Log below.
      </p>

      {open && (
        <AddExpenseModal
          onClose={() => setOpen(false)}
          onSave={(desc, amount, when) => {
            addExpense(desc, amount, when)
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
