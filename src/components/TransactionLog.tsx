import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import type { TxRef } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { euro, formatDateTime, usageHistory } from '../lib/calc'
import { Card } from './Card'
import { Button } from './Button'
import { Modal } from './Modal'
import { Field } from './Field'

type Kind = 'contribution' | 'purchase' | 'expense' | 'usage'

interface LogRow {
  ref: TxRef
  kind: Kind
  label: string
  amount: number // positive = into fund, negative = out
  date: string
  batch?: { id: string; pricePerBarrel: number; barrels: number }
}

const PAGE_SIZE = 20

const KIND_BADGE: Record<Kind, { label: string; className: string }> = {
  contribution: { label: 'Cash', className: 'bg-sky-100 text-sky-700' },
  purchase: { label: 'Purchase', className: 'bg-purple-100 text-purple-700' },
  expense: { label: 'Expense', className: 'bg-amber-100 text-amber-700' },
  usage: { label: 'Usage', className: 'bg-emerald-100 text-emerald-700' },
}

export function TransactionLog() {
  const { state, deleteTransaction, updateBatchPrice } = useApp()
  const { isAuthenticated } = useAuth()
  const [editingBatch, setEditingBatch] = useState<LogRow['batch'] | null>(null)
  const [page, setPage] = useState(0)

  const productName = (id: string) => {
    const p = state.products.find((x) => x.id === id)
    return p ? `${p.brand} ${p.model}` : 'product'
  }

  // Build and sort newest-first. Memoised so paging doesn't rebuild needlessly.
  const rows: LogRow[] = useMemo(() => {
    const all: LogRow[] = [
      ...state.members.flatMap((m) =>
        m.contributions.map((c) => ({
          ref: { kind: 'contribution', memberId: m.id, id: c.id } as TxRef,
          kind: 'contribution' as const,
          label: `Cash from ${m.name}`,
          amount: c.amount,
          date: c.date,
        })),
      ),
      ...state.purchases.map((p) => ({
        ref: { kind: 'purchase', id: p.id } as TxRef,
        kind: 'purchase' as const,
        label: `Bought ${p.barrels} × ${productName(p.productId)} barrel${
          p.barrels === 1 ? '' : 's'
        } @ ${euro(p.pricePerBarrel)}`,
        amount: -(p.barrels * p.pricePerBarrel),
        date: p.date,
        batch: { id: p.id, pricePerBarrel: p.pricePerBarrel, barrels: p.barrels },
      })),
      ...state.expenses.map((e) => ({
        ref: { kind: 'expense', id: e.id } as TxRef,
        kind: 'expense' as const,
        label: e.description,
        amount: -e.amount,
        date: e.date,
      })),
      ...usageHistory(state).map((u) => ({
        ref: { kind: 'usage', id: u.id } as TxRef,
        kind: 'usage' as const,
        label: `Members paid for ${u.totalShuttles} shuttle${
          u.totalShuttles === 1 ? '' : 's'
        } used`,
        amount: u.totalCost,
        date: u.date,
      })),
    ]
    return all.sort((a, b) => b.date.localeCompare(a.date))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const start = safePage * PAGE_SIZE
  const visible = rows.slice(start, start + PAGE_SIZE)

  function handleDelete(row: LogRow) {
    const sign = row.amount >= 0 ? '+' : '−'
    const msg =
      `Are you sure you want to delete this entry?\n\n` +
      `"${row.label}"  (${sign} ${euro(Math.abs(row.amount))})\n\n` +
      (row.kind === 'purchase'
        ? 'This also removes those barrels from inventory.'
        : row.kind === 'usage'
          ? 'This returns those shuttles to inventory and undoes the payment.'
          : 'This updates the fund accordingly.')
    if (confirm(msg)) deleteTransaction(row.ref)
  }

  return (
    <Card title="Transaction Log" icon="🧾" accent="border-slate-400">
      {rows.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">No transactions yet.</p>
      ) : (
        <>
          <div data-testid="transaction-log">
            {/* Mobile: stacked cards (no horizontal scroll) */}
            <ul className="space-y-3 sm:hidden">
              {visible.map((r, i) => {
                const badge = KIND_BADGE[r.kind]
                return (
                  <li
                    key={`m-${r.kind}-${start + i}`}
                    className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                  >
                    {/* Header: type + amount */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      <span
                        className={`whitespace-nowrap text-base font-bold ${
                          r.amount >= 0 ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {r.amount >= 0 ? '+' : '−'} {euro(Math.abs(r.amount))}
                      </span>
                    </div>
                    {/* Body: description */}
                    <div className="break-words px-3 py-2.5 text-sm leading-snug text-slate-700">
                      {r.label}
                    </div>
                    {/* Footer: date + actions */}
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-3 py-1.5">
                      <span className="text-xs text-slate-500">
                        {formatDateTime(r.date)}
                      </span>
                      {isAuthenticated && (
                        <div className="flex items-center gap-1">
                          {r.batch && (
                            <button
                              type="button"
                              aria-label="Edit batch price"
                              title="Edit batch price"
                              onClick={() => setEditingBatch(r.batch)}
                              className="rounded p-1 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              ✎
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label="Delete entry"
                            onClick={() => handleDelete(r)}
                            className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Description</th>
                  <th className="py-2 pr-3 text-right font-medium">Amount</th>
                  {isAuthenticated && <th className="py-2 font-medium" />}
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => {
                  const badge = KIND_BADGE[r.kind]
                  return (
                    <tr
                      key={`${r.kind}-${start + i}`}
                      className="border-b border-slate-100 align-top hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap py-2.5 pr-3 text-slate-500">
                        {formatDateTime(r.date)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-700">{r.label}</td>
                      <td
                        className={`whitespace-nowrap py-2.5 pr-3 text-right font-bold ${
                          r.amount >= 0 ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {r.amount >= 0 ? '+' : '−'} {euro(Math.abs(r.amount))}
                      </td>
                      {isAuthenticated && (
                        <td className="py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            {r.batch && (
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
                            <button
                              type="button"
                              aria-label="Delete entry"
                              onClick={() => handleDelete(r)}
                              className="rounded p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span data-testid="log-range">
              Showing {start + 1}–{Math.min(start + PAGE_SIZE, rows.length)} of{' '}
              {rows.length}
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="px-2.5 py-1"
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  ← Newer
                </Button>
                <span className="tabular-nums">
                  {safePage + 1} / {pageCount}
                </span>
                <Button
                  variant="secondary"
                  className="px-2.5 py-1"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  Older →
                </Button>
              </div>
            )}
          </div>
        </>
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
