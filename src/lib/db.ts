import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppState } from '../types'
import { supabase } from './supabase'

/** An empty AppState — the starting point before Supabase hydration. */
export function emptyState(): AppState {
  return { members: [], products: [], purchases: [], usage: [], expenses: [] }
}

/** Club membership tallies for the dashboard (admins are also players). */
export interface RoleCounts {
  admins: number
  players: number
}

export const emptyRoleCounts: RoleCounts = { admins: 0, players: 0 }

// ---- date mapping ----------------------------------------------------------
// The app stores naive local wall-clock strings ('YYYY-MM-DDTHH:mm') and never
// does timezone math (it only slices to a date and sorts lexically). We persist
// them verbatim into timestamptz columns (Supabase sessions are UTC) and slice
// the first 16 chars back on read, so the string round-trips unchanged.
export function toDbDate(appDate: string): string {
  return appDate
}
export function fromDbDate(iso: string): string {
  return iso.slice(0, 16)
}

// ---- row builders (AppState -> table rows) ---------------------------------
export function rowsFromState(state: AppState, clubId: string) {
  const members = state.members.map((m) => ({ id: m.id, club_id: clubId, name: m.name }))
  const contributions = state.members.flatMap((m) =>
    m.contributions.map((c) => ({
      id: c.id,
      member_id: m.id,
      amount: c.amount,
      occurred_at: toDbDate(c.date),
    })),
  )
  const products = state.products.map((p) => ({
    id: p.id,
    club_id: clubId,
    brand: p.brand,
    model: p.model,
    shuttles_per_barrel: p.shuttlesPerBarrel,
    barrels: p.barrels,
    loose_shuttles: p.looseShuttles,
  }))
  const purchases = state.purchases.map((p) => ({
    id: p.id,
    club_id: clubId,
    product_id: p.productId,
    barrels: p.barrels,
    price_per_barrel: p.pricePerBarrel,
    occurred_at: toDbDate(p.date),
    note: p.note ?? null,
  }))
  const usageEntries = state.usage.map((u) => ({
    id: u.id,
    club_id: clubId,
    occurred_at: toDbDate(u.date),
  }))
  const usageItems = state.usage.flatMap((u) =>
    u.items.map((i) => ({
      usage_id: u.id,
      product_id: i.productId,
      shuttles_used: i.shuttlesUsed,
    })),
  )
  const expenses = state.expenses.map((e) => ({
    id: e.id,
    club_id: clubId,
    description: e.description,
    amount: e.amount,
    occurred_at: toDbDate(e.date),
  }))
  return { members, contributions, products, purchases, usageEntries, usageItems, expenses }
}

type Row = Record<string, unknown>

// ---- hydrate (Supabase -> AppState) ----------------------------------------

/**
 * Load the admin's club state from Supabase. Returns null when the user has no
 * admin club membership (RLS then yields no data anyway).
 */
export async function hydrate(): Promise<{
  clubId: string
  state: AppState
  roleCounts: RoleCounts
} | null> {
  if (!supabase) return null

  const { data: memberships, error: mErr } = await supabase
    .from('club_members')
    .select('club_id, role')
    .eq('role', 'admin')
    .limit(1)
  if (mErr || !memberships || memberships.length === 0) return null
  const clubId = memberships[0].club_id as string

  const [
    members,
    contributions,
    products,
    purchases,
    usageEntries,
    usageItems,
    expenses,
    clubMembers,
  ] = await Promise.all([
    select(supabase, 'members', clubId),
    select(supabase, 'contributions'),
    select(supabase, 'products', clubId),
    select(supabase, 'purchases', clubId),
    select(supabase, 'usage_entries', clubId),
    select(supabase, 'usage_items'),
    select(supabase, 'expenses', clubId),
    select(supabase, 'club_members', clubId),
  ])

  // Admins are also players, so the player count is every club member.
  const roleCounts: RoleCounts = {
    admins: clubMembers.filter((m) => m.role === 'admin').length,
    players: clubMembers.length,
  }

  const contribByMember = new Map<string, Row[]>()
  for (const c of contributions) {
    const key = c.member_id as string
    if (!contribByMember.has(key)) contribByMember.set(key, [])
    contribByMember.get(key)!.push(c)
  }
  const itemsByUsage = new Map<string, Row[]>()
  for (const i of usageItems) {
    const key = i.usage_id as string
    if (!itemsByUsage.has(key)) itemsByUsage.set(key, [])
    itemsByUsage.get(key)!.push(i)
  }

  const state: AppState = {
    members: members.map((m) => ({
      id: m.id as string,
      name: m.name as string,
      contributions: (contribByMember.get(m.id as string) ?? []).map((c) => ({
        id: c.id as string,
        amount: Number(c.amount),
        date: fromDbDate(c.occurred_at as string),
      })),
    })),
    products: products.map((p) => ({
      id: p.id as string,
      brand: p.brand as string,
      model: p.model as string,
      shuttlesPerBarrel: Number(p.shuttles_per_barrel),
      barrels: Number(p.barrels),
      looseShuttles: Number(p.loose_shuttles),
    })),
    purchases: purchases.map((p) => ({
      id: p.id as string,
      productId: p.product_id as string,
      barrels: Number(p.barrels),
      pricePerBarrel: Number(p.price_per_barrel),
      date: fromDbDate(p.occurred_at as string),
      note: (p.note as string | null) ?? undefined,
    })),
    usage: usageEntries.map((u) => ({
      id: u.id as string,
      date: fromDbDate(u.occurred_at as string),
      items: (itemsByUsage.get(u.id as string) ?? []).map((i) => ({
        productId: i.product_id as string,
        shuttlesUsed: Number(i.shuttles_used),
      })),
    })),
    expenses: expenses.map((e) => ({
      id: e.id as string,
      description: e.description as string,
      amount: Number(e.amount),
      date: fromDbDate(e.occurred_at as string),
    })),
  }
  return { clubId, state, roleCounts }
}

async function select(client: SupabaseClient, table: string, clubId?: string): Promise<Row[]> {
  let query = client.from(table).select('*')
  if (clubId) query = query.eq('club_id', clubId)
  const { data, error } = await query
  if (error) throw new Error(`${table} select: ${error.message}`)
  return (data ?? []) as Row[]
}

// ---- sync (AppState diff -> Supabase writes) -------------------------------

/**
 * Persist the change from `prev` to `next` by diffing each table and applying
 * the minimal set of upserts/deletes. The reducers in AppContext remain the
 * single source of truth for logic; this just mirrors the resulting state.
 *
 * Upserts run parents-first and deletes children-first to respect foreign
 * keys (FKs are ON DELETE CASCADE, so parent deletes also clean up children).
 */
export async function syncState(clubId: string, prev: AppState, next: AppState): Promise<void> {
  if (!supabase) return
  const client = supabase
  const a = rowsFromState(prev, clubId)
  const b = rowsFromState(next, clubId)

  // Upserts: parents -> children
  await upsert(client, 'members', a.members, b.members)
  await upsert(client, 'products', a.products, b.products)
  await upsert(client, 'contributions', a.contributions, b.contributions)
  await upsert(client, 'purchases', a.purchases, b.purchases)
  await upsert(client, 'usage_entries', a.usageEntries, b.usageEntries)
  await upsert(client, 'expenses', a.expenses, b.expenses)
  await upsertUsageItems(client, a.usageItems, b.usageItems)

  // Deletes: children -> parents
  await remove(client, 'contributions', a.contributions, b.contributions)
  await removeUsageItems(client, a.usageItems, b.usageItems)
  await remove(client, 'purchases', a.purchases, b.purchases)
  await remove(client, 'usage_entries', a.usageEntries, b.usageEntries)
  await remove(client, 'expenses', a.expenses, b.expenses)
  await remove(client, 'products', a.products, b.products)
  await remove(client, 'members', a.members, b.members)
}

async function upsert(client: SupabaseClient, table: string, prev: Row[], next: Row[]) {
  const prevById = new Map(prev.map((r) => [r.id as string, JSON.stringify(r)]))
  const changed = next.filter((r) => prevById.get(r.id as string) !== JSON.stringify(r))
  if (changed.length === 0) return
  const { error } = await client.from(table).upsert(changed)
  if (error) throw new Error(`${table} upsert: ${error.message}`)
}

async function remove(client: SupabaseClient, table: string, prev: Row[], next: Row[]) {
  const nextIds = new Set(next.map((r) => r.id as string))
  const removed = prev.filter((r) => !nextIds.has(r.id as string)).map((r) => r.id as string)
  if (removed.length === 0) return
  const { error } = await client.from(table).delete().in('id', removed)
  if (error) throw new Error(`${table} delete: ${error.message}`)
}

// usage_items has a composite PK (usage_id, product_id) — handled specially.
function itemKey(r: Row): string {
  return `${r.usage_id as string}:${r.product_id as string}`
}

async function upsertUsageItems(client: SupabaseClient, prev: Row[], next: Row[]) {
  const prevByKey = new Map(prev.map((r) => [itemKey(r), JSON.stringify(r)]))
  const changed = next.filter((r) => prevByKey.get(itemKey(r)) !== JSON.stringify(r))
  if (changed.length === 0) return
  const { error } = await client
    .from('usage_items')
    .upsert(changed, { onConflict: 'usage_id,product_id' })
  if (error) throw new Error(`usage_items upsert: ${error.message}`)
}

async function removeUsageItems(client: SupabaseClient, prev: Row[], next: Row[]) {
  const nextKeys = new Set(next.map(itemKey))
  const removed = prev.filter((r) => !nextKeys.has(itemKey(r)))
  for (const r of removed) {
    const { error } = await client
      .from('usage_items')
      .delete()
      .eq('usage_id', r.usage_id as string)
      .eq('product_id', r.product_id as string)
    if (error) throw new Error(`usage_items delete: ${error.message}`)
  }
}
