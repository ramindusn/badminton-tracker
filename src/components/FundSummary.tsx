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
  const remaining = remainingFund(state)

  return (
    <Card title="Fund Summary" icon="💰" accent="border-emerald-500">
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
        Use <span className="font-medium">+ Add transaction</span> in the header to log
        cash, expenses or game-day usage.
      </p>
    </Card>
  )
}
