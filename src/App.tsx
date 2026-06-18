import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import { useApp } from './context/AppContext'
import { euro, remainingFund, totalShuttlesInStock } from './lib/calc'
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
  const { isAuthenticated, notAdmin, user, signOut } = useAuth()
  const { state, resetAll, cloudBacked, roleCounts } = useApp()
  const [loginOpen, setLoginOpen] = useState(false)

  // Close the login dialog once a session is established (e.g. after the magic
  // link lands, or the e2e bypass authenticates).
  useEffect(() => {
    if (isAuthenticated) setLoginOpen(false)
  }, [isAuthenticated])

  const remaining = remainingFund(state)
  const shuttles = totalShuttlesInStock(state)
  // Role tallies come from Supabase (club_members); in local/e2e mode fall back
  // to the fund members as players with the current user as the sole admin.
  const players = cloudBacked ? roleCounts.players : state.members.length
  const admins = cloudBacked ? roleCounts.admins : 1

  return (
    <div className="min-h-full px-4 py-6 sm:py-8" data-testid="app-root">
      <div className="mx-auto max-w-6xl">
        <Header
          isAuthenticated={isAuthenticated}
          onLogin={() => setLoginOpen(true)}
          onLogout={signOut}
        />

        {notAdmin && (
          <div
            data-testid="not-admin-notice"
            className="mb-6 flex flex-col items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>
              You're signed in as <span className="font-medium">{user?.email}</span> but
              you're not an admin of this club. Ask an existing admin to add you.
            </span>
            <Button variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          </div>
        )}

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
          <StatCard
            icon="🛡️"
            label="Admins"
            value={String(admins)}
            testId="stat-admins"
          />
          <StatCard
            icon="👥"
            label="Players"
            value={String(players)}
            hint="incl. admins"
            testId="stat-players"
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
          <TransactionLog />
          <MemberBalances />
        </div>

        {isAuthenticated && !cloudBacked && (
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
          {cloudBacked
            ? 'Synced to the cloud database. 🏸 Pet project.'
            : 'Data is stored locally in your browser. 🏸 Pet project.'}
        </footer>
      </div>

      <Modal open={loginOpen} title="Log in" onClose={() => setLoginOpen(false)}>
        <Login onClose={() => setLoginOpen(false)} />
      </Modal>
    </div>
  )
}
