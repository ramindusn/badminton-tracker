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
  const todayTotals = usageForDate(state, today)
  const history = usageHistory(state)
  const playedToday =
    todayTotals.totalCost > 0 || todayTotals.perProduct.some((p) => p.shuttlesUsed > 0)
  const lastDay = history[0] // newest first; undefined when nothing logged

  // Show today's tally when there's play today; otherwise fall back to the most
  // recent game day so the card stays useful on non-game days. Null only before
  // any game has ever been logged (then just the "Recent game days" hint shows).
  const focus = playedToday
    ? {
        today: true,
        label: `Today · ${formatDate(today)}`,
        costLabel: 'Cost today',
        totals: todayTotals,
      }
    : lastDay
      ? {
          today: false,
          label: `Last game day · ${formatDate(lastDay.date.slice(0, 10))}`,
          costLabel: 'Cost',
          totals: usageForDate(state, lastDay.date),
        }
      : null

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
    <Card title="Game-day Usage" icon="📅">
      {/* Tally: today when there's play, else the most recent game day */}
      {focus && (
        <div className={`rounded-lg p-4 ${focus.today ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-surface-muted'}`}>
          <div
            className={`mb-2 text-xs font-semibold uppercase tracking-wide ${
              focus.today ? 'text-amber-700 dark:text-amber-300' : 'text-fg-muted'
            }`}
          >
            {focus.label}
          </div>
          <ul className={`divide-y ${focus.today ? 'divide-amber-100' : 'divide-line'}`}>
            {focus.totals.perProduct.map(({ product, shuttlesUsed }) => (
              <li key={product.id} className="flex justify-between py-1.5 text-sm">
                <span className="text-fg-muted">
                  {product.brand} {product.model}
                </span>
                <strong className="text-fg">{shuttlesUsed} used</strong>
              </li>
            ))}
            {focus.totals.perProduct.length === 0 && (
              <li className="py-1.5 text-sm text-fg-muted">No products yet.</li>
            )}
          </ul>
          <div
            className={`mt-2 border-t pt-2 text-right text-base font-bold text-fg ${
              focus.today ? 'border-amber-200' : 'border-line'
            }`}
          >
            {focus.costLabel}: {euro(focus.totals.totalCost)}
          </div>
        </div>
      )}

      {/* Game-day history */}
      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold text-fg-muted">
          Recent game days
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-fg-subtle">
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
                className="flex items-start justify-between gap-2 rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-fg">
                    {formatDateTime(day.date)}
                  </div>
                  <div className="break-words text-xs text-fg-subtle">
                    {day.parts
                      .filter((p) => p.shuttlesUsed > 0)
                      .map((p) => `${p.name}: ${p.shuttlesUsed}`)
                      .join(' · ') || 'no shuttles'}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-semibold text-fg">
                    {day.totalShuttles} shuttles
                  </div>
                  <div className="text-xs text-fg-subtle">{euro(day.totalCost)}</div>
                </div>
                {isAuthenticated && (
                  <button
                    type="button"
                    aria-label="Delete game day"
                    onClick={() => handleDeleteDay(day)}
                    className="ml-2 rounded p-1 text-fg-subtle transition-colors hover:bg-red-50 hover:text-red-600"
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
