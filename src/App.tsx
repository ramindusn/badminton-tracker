import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import { useApp } from './context/AppContext'
import {
  euro,
  remainingFund,
  todayISO,
  totalShuttlesInStock,
  usageForDate,
} from './lib/calc'
import { Header } from './components/Header'
import { StatCard } from './components/StatCard'
import { TodayUsage } from './components/TodayUsage'
import { FundSummary } from './components/FundSummary'
import { TransactionLog } from './components/TransactionLog'
import { Inventory } from './components/Inventory'
import { MemberBalances } from './components/MemberBalances'
import { Login } from './components/Login'
import { Modal } from './components/Modal'
import { Button } from './components/Button'

export default function App() {
  const { isAuthenticated, logout } = useAuth()
  const { state, resetAll } = useApp()
  const [loginOpen, setLoginOpen] = useState(false)

  const remaining = remainingFund(state)
  const shuttles = totalShuttlesInStock(state)
  const todayCost = usageForDate(state, todayISO()).totalCost

  return (
    <div className="min-h-full px-4 py-6 sm:py-8" data-testid="app-root">
      <div className="mx-auto max-w-6xl">
        <Header
          isAuthenticated={isAuthenticated}
          onLogin={() => setLoginOpen(true)}
          onLogout={logout}
        />

        {/* Quick stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon="💰"
            label="Remaining Fund"
            value={euro(remaining)}
            tone={remaining >= 0 ? 'positive' : 'negative'}
            testId="stat-remaining-fund"
          />
          <StatCard
            icon="📦"
            label="Total Shuttles"
            value={String(shuttles)}
            tone={shuttles < 24 ? 'warning' : 'default'}
            hint="in stock"
            testId="stat-total-shuttles"
          />
          <StatCard icon="📅" label="Today's Cost" value={euro(todayCost)} testId="stat-today-cost" />
          <StatCard
            icon="👥"
            label="Members"
            value={String(state.members.length)}
            testId="stat-members"
          />
        </div>

        {/* Top row: today's usage paired with the compact fund summary */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TodayUsage />
          </div>
          <div className="lg:col-span-1">
            <FundSummary />
          </div>
        </div>

        {/* Wide tables get the full width so nothing is cramped or truncated */}
        <div className="mt-5 space-y-5">
          <Inventory />
          <MemberBalances />
          <TransactionLog />
        </div>

        {isAuthenticated && (
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              className="text-xs text-slate-400"
              data-testid="reset-data-button"
              onClick={() => {
                if (confirm('Reset all data back to the original seed values?')) resetAll()
              }}
            >
              Reset all data to seed
            </Button>
          </div>
        )}

        <footer className="mt-8 text-center text-xs text-slate-400">
          Data is stored locally in your browser. 🏸 Pet project.
        </footer>
      </div>

      <Modal open={loginOpen} title="Log in" onClose={() => setLoginOpen(false)}>
        <Login onClose={() => setLoginOpen(false)} />
      </Modal>
    </div>
  )
}
