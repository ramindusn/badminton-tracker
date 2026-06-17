import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import { useApp } from './context/AppContext'
import { Header } from './components/Header'
import { TodayUsage } from './components/TodayUsage'
import { FundSummary } from './components/FundSummary'
import { Inventory } from './components/Inventory'
import { MemberBalances } from './components/MemberBalances'
import { Login } from './components/Login'
import { Modal } from './components/Modal'
import { Button } from './components/Button'

export default function App() {
  const { isAuthenticated, logout } = useAuth()
  const { resetAll } = useApp()
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <div className="min-h-full px-4 py-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <Header
          isAuthenticated={isAuthenticated}
          onLogin={() => setLoginOpen(true)}
          onLogout={logout}
        />

        <main className="space-y-5">
          <TodayUsage />
          <FundSummary />
          <Inventory />
          <MemberBalances />
        </main>

        {isAuthenticated && (
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              className="text-xs text-slate-400"
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
