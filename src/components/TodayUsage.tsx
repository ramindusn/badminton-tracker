import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import {
  euro,
  formatDate,
  formatDateTime,
  todayISO,
  usageForDate,
  usageHistory,
} from '../lib/calc'
import { Card } from './Card'

export function TodayUsage() {
  const { state, deleteTransaction } = useApp()
  const { isAuthenticated } = useAuth()

  const today = todayISO()
  const totals = usageForDate(state, today)
  const history = usageHistory(state)

  function handleDeleteDay(day: { id: string; date: string; totalShuttles: number }) {
    if (
      confirm(
        `Are you sure you want to delete this game day?\n\n${formatDateTime(day.date)} — ${
          day.totalShuttles
        } shuttles\n\nThis returns those shuttles to inventory and undoes the members' payment.`,
      )
    ) {
      deleteTransaction({ kind: 'usage', id: day.id })
    }
  }

  return (
    <Card title="Game-day Usage" icon="📅" accent="border-amber-400">
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
            No game days logged yet.
            {isAuthenticated
              ? ' Use + Add transaction in the header to log one.'
              : ''}
          </p>
        ) : (
          <ul className="space-y-2">
            {history.slice(0, 6).map((day) => (
              <li
                key={day.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-700">
                    {formatDateTime(day.date)}
                  </div>
                  <div className="break-words text-xs text-slate-400">
                    {day.parts
                      .filter((p) => p.shuttlesUsed > 0)
                      .map((p) => `${p.name}: ${p.shuttlesUsed}`)
                      .join(' · ') || 'no shuttles'}
                  </div>
                </div>
                <div className="shrink-0 text-right">
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
    </Card>
  )
}
