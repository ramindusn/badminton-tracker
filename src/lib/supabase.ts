import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True when both Supabase env vars were present at build time. */
export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * Shared Supabase client singleton.
 *
 * Null when the env vars are absent (unit tests, or a build without secrets)
 * so importing this module never throws — callers must handle the unconfigured
 * case. The anon key is meant to ship in the client bundle; Row Level Security
 * is the real guard (AGENTS.md §12).
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null
