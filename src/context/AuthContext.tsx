import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// Test-only auth bypass: the e2e build sets VITE_E2E=1 so Playwright can sign
// in without a real magic-link email. This branch is never present in a normal
// production build.
const E2E = import.meta.env.VITE_E2E === '1'
const E2E_SESSION_KEY = 'badminton-tracker-e2e-auth'

interface AuthUser {
  email?: string
}

interface SignInResult {
  ok: boolean
  /** True when a magic link was emailed (real flow); false when auth was
   *  granted immediately (e2e bypass). */
  sent: boolean
  error?: string
}

interface AuthContextValue {
  /** True only when there is a session AND the user is a club admin. */
  isAuthenticated: boolean
  /** Initial session check still in flight. */
  loading: boolean
  /** Signed in but NOT an admin of any club — show a "not authorised" notice. */
  notAdmin: boolean
  user: AuthUser | null
  signInWithEmail: (email: string) => Promise<SignInResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [notAdmin, setNotAdmin] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // ---- e2e bypass --------------------------------------------------------
  useEffect(() => {
    if (!E2E) return
    const authed = sessionStorage.getItem(E2E_SESSION_KEY) === 'true'
    setIsAuthenticated(authed)
    setUser(authed ? { email: 'e2e@example.com' } : null)
    setLoading(false)
  }, [])

  // ---- real Supabase auth ------------------------------------------------
  useEffect(() => {
    if (E2E || !supabase) {
      if (!E2E) setLoading(false)
      return
    }
    let active = true
    const client = supabase

    async function resolve(session: Session | null) {
      if (!active) return
      if (!session) {
        setIsAuthenticated(false)
        setNotAdmin(false)
        setUser(null)
        setLoading(false)
        return
      }
      setUser({ email: session.user.email })
      const admin = await isClubAdmin()
      if (!active) return
      setIsAuthenticated(admin)
      setNotAdmin(!admin)
      setLoading(false)
    }

    client.auth.getSession().then(({ data }) => resolve(data.session))
    const { data: sub } = client.auth.onAuthStateChange((_event, session) =>
      resolve(session),
    )
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  /** Does the current user have an admin membership in any club? (RLS scopes
   *  the row to them, so a non-empty result means "admin somewhere".) */
  async function isClubAdmin(): Promise<boolean> {
    if (!supabase) return false
    const { data, error } = await supabase
      .from('club_members')
      .select('role')
      .eq('role', 'admin')
      .limit(1)
    return !error && !!data && data.length > 0
  }

  async function signInWithEmail(email: string): Promise<SignInResult> {
    if (E2E) {
      sessionStorage.setItem(E2E_SESSION_KEY, 'true')
      setIsAuthenticated(true)
      setNotAdmin(false)
      setUser({ email })
      return { ok: true, sent: false }
    }
    if (!supabase) {
      return { ok: false, sent: false, error: 'Supabase is not configured.' }
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    if (error) return { ok: false, sent: false, error: error.message }
    return { ok: true, sent: true }
  }

  async function signOut(): Promise<void> {
    if (E2E) {
      sessionStorage.removeItem(E2E_SESSION_KEY)
      setIsAuthenticated(false)
      setUser(null)
      return
    }
    if (supabase) await supabase.auth.signOut()
    setIsAuthenticated(false)
    setNotAdmin(false)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, loading, notAdmin, user, signInWithEmail, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
