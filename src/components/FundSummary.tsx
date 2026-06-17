import { useApp } from '../context/AppContext'
import {
  euro,
  remainingFund,
  totalCollected,
  totalSpent,
  totalUsageIncome,
} from '../lib/calc'
import { Card } from './Card'

export function FundSummary() {
  const { state } = useApp()
  const cash = totalCollected(state)
  const usage = totalUsageIncome(state)
  const spent = totalSpent(state)
  const moneyIn = cash + usage
  const remaining = remainingFund(state)

  return (
    <Card title="Fund Summary" icon="💰" accent="border-emerald-500">
      <div className="space-y-4 text-sm">
        {/* Money in */}
        <section>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Money in
          </div>
          <Row label="Member cash" value={`+ ${euro(cash)}`} positive />
          <Row
            label="Game-day usage payments"
            value={`+ ${euro(usage)}`}
            positive
            faded={usage === 0}
          />
          <Subtotal label="Total in" value={`+ ${euro(moneyIn)}`} positive />
        </section>

        {/* Money out */}
        <section>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-700">
            Money out
          </div>
          <Row label="Stock &amp; expenses" value={`− ${euro(spent)}`} negative />
          <Subtotal label="Total out" value={`− ${euro(spent)}`} negative />
        </section>

        {/* Remaining */}
        <div className="flex items-baseline justify-between border-t-2 border-dashed border-slate-200 pt-3 text-base font-bold text-slate-800">
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
        Use <span className="font-medium">+ Add transaction</span> in the header to log
        cash, expenses or game-day usage.
      </p>
    </Card>
  )
}

function Row({
  label,
  value,
  positive,
  negative,
  faded,
}: {
  label: string
  value: string
  positive?: boolean
  negative?: boolean
  faded?: boolean
}) {
  const color = faded
    ? 'text-slate-400'
    : positive
      ? 'text-emerald-600'
      : negative
        ? 'text-red-500'
        : 'text-slate-700'
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium ${color}`}>{value}</span>
    </div>
  )
}

function Subtotal({
  label,
  value,
  positive,
  negative,
}: {
  label: string
  value: string
  positive?: boolean
  negative?: boolean
}) {
  const color = positive
    ? 'text-emerald-700'
    : negative
      ? 'text-red-600'
      : 'text-slate-800'
  return (
    <div className="mt-1 flex justify-between border-t border-slate-100 pt-1 text-xs font-semibold uppercase tracking-wide">
      <span className="text-slate-500">{label}</span>
      <span className={color}>{value}</span>
    </div>
  )
}
