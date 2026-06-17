import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { euro, memberBalances, nowLocalInput } from '../lib/calc'
import { Card } from './Card'
import { Button } from './Button'
import { Modal } from './Modal'
import { Field } from './Field'

export function MemberBalances() {
  const { state, addMember } = useApp()
  const { isAuthenticated } = useAuth()
  const [addingMember, setAddingMember] = useState(false)

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
      {/* Mobile: stacked cards (no horizontal scroll) */}
      <ul className="space-y-3 sm:hidden">
        {balances.map((b) => (
          <li
            key={b.id}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            {/* Header: name + remaining balance */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
              <span className="break-words font-semibold text-slate-800">{b.name}</span>
              <span
                className={`whitespace-nowrap text-base font-bold ${
                  b.left >= 0 ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {euro(b.left)}
              </span>
            </div>
            {/* Body: divided rows */}
            <dl className="divide-y divide-slate-100 px-3 pb-2 text-sm">
              <div className="flex items-baseline justify-between gap-3 py-1.5">
                <dt className="text-xs uppercase tracking-wide text-slate-400">Starting</dt>
                <dd className="font-medium text-slate-700">{euro(b.starting)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-1.5">
                <dt className="text-xs uppercase tracking-wide text-slate-400">
                  Spent (split)
                </dt>
                <dd className="font-medium text-slate-700">{euro(b.spent)}</dd>
              </div>
            </dl>
          </li>
        ))}
        {balances.length === 0 && (
          <li className="py-3 text-sm text-slate-500">No members yet.</li>
        )}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-3 font-medium">Member</th>
              <th className="py-2 pr-3 font-medium">Starting</th>
              <th className="py-2 pr-3 font-medium">Spent (split)</th>
              <th className="py-2 pr-3 font-medium">Left</th>
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
              </tr>
            ))}
            {balances.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-slate-500">
                  No members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Spending is split equally across all current members. Record incoming cash via
        <span className="font-medium"> + Add transaction</span> in the header.
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

