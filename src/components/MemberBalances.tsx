import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { euro, memberBalances, nowLocalInput } from '../lib/calc'
import { Card } from './Card'
import { Button } from './Button'
import { Modal } from './Modal'
import { Field } from './Field'

export function MemberBalances() {
  const { state, addMember, addCash } = useApp()
  const { isAuthenticated } = useAuth()
  const [addingMember, setAddingMember] = useState(false)
  const [cashFor, setCashFor] = useState<{ id: string; name: string } | null>(null)

  const balances = memberBalances(state)

  return (
    <Card
      title="Member Balances (Cash)"
      icon="👥"
      accent="border-red-500"
      action={
        isAuthenticated ? (
          <Button onClick={() => setAddingMember(true)}>+ Add member</Button>
        ) : undefined
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-3 font-medium">Member</th>
              <th className="py-2 pr-3 font-medium">Starting</th>
              <th className="py-2 pr-3 font-medium">Spent (split)</th>
              <th className="py-2 pr-3 font-medium">Left</th>
              {isAuthenticated && <th className="py-2 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 pr-3 font-semibold text-slate-800">{b.name}</td>
                <td className="py-2 pr-3 text-slate-600">{euro(b.starting)}</td>
                <td className="py-2 pr-3 text-slate-600">{euro(b.spent)}</td>
                <td
                  className={`py-2 pr-3 font-bold ${
                    b.left >= 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {euro(b.left)}
                </td>
                {isAuthenticated && (
                  <td className="py-2">
                    <Button
                      variant="ghost"
                      className="px-2 py-1"
                      onClick={() => setCashFor({ id: b.id, name: b.name })}
                    >
                      + Add cash
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {balances.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-slate-500">
                  No members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Spending is split equally across all current members.
      </p>

      {addingMember && (
        <AddMemberModal
          onClose={() => setAddingMember(false)}
          onSave={(name, cash, when) => {
            addMember(name, cash, when)
            setAddingMember(false)
          }}
        />
      )}

      {cashFor && (
        <AddCashModal
          name={cashFor.name}
          onClose={() => setCashFor(null)}
          onSave={(amount, when) => {
            addCash(cashFor.id, amount, when)
            setCashFor(null)
          }}
        />
      )}
    </Card>
  )
}

function AddMemberModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (name: string, cash: number, when: string) => void
}) {
  const [name, setName] = useState('')
  const [cash, setCash] = useState('')
  const [when, setWhen] = useState(nowLocalInput())

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name, Number(cash) || 0, when)
  }

  return (
    <Modal open title="Add a member" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          placeholder="e.g. Kasun"
        />
        <Field
          label="Initial cash into fund (€)"
          type="number"
          min={0}
          step="0.01"
          value={cash}
          onChange={(e) => setCash(e.target.value)}
          placeholder="0.00"
        />
        <Field
          label="Date & time"
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add member</Button>
        </div>
      </form>
    </Modal>
  )
}

function AddCashModal({
  name,
  onClose,
  onSave,
}: {
  name: string
  onClose: () => void
  onSave: (amount: number, when: string) => void
}) {
  const [amount, setAmount] = useState('')
  const [when, setWhen] = useState(nowLocalInput())

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (Number(amount) <= 0) return
    onSave(Number(amount), when)
  }

  return (
    <Modal open title={`Add cash for ${name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field
          label="Amount (€)"
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
          placeholder="0.00"
        />
        <Field
          label="Date & time"
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
        <p className="text-xs text-slate-400">This increases the fund and the member's starting balance.</p>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add cash</Button>
        </div>
      </form>
    </Modal>
  )
}
