/**
 * Vaultr finance read service — server-side only.
 * Queries Vaultr's Supabase tables via service role client.
 * All functions take userId and scope every query to it.
 */

import { vaultrDb } from './db'
import type {
  VAccount, VCategory, VTransaction, VRecoverableAllocation,
  FinanceSummary, RecoverablesSummary, SupplierBalanceLine, TransactionRecord,
} from '@/types/contracts/vaultr'

const round2 = (n: number) => Math.round(n * 100) / 100

// ── Accounts ──────────────────────────────────────────────────────────────

export async function getAccounts(userId: string): Promise<VAccount[]> {
  const db = vaultrDb()
  const { data, error } = await db
    .from('accounts')
    .select('id, user_id, name, type, currency, initial_balance, is_active, include_in_net_worth, color, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error(`getAccounts: ${error.message}`)
    return []
  }
  return (data ?? []) as VAccount[]
}

export async function getCategories(userId: string): Promise<VCategory[]> {
  const db = vaultrDb()
  const { data, error } = await db
    .from('categories')
    .select('id, user_id, name, type, icon, color, parent_id')
    .eq('user_id', userId)
    .order('name')

  if (error) {
    console.error(`getCategories: ${error.message}`)
    return []
  }
  return (data ?? []) as VCategory[]
}

// ── Transactions ───────────────────────────────────────────────────────────

export async function getRecentTransactions(
  userId: string,
  limit = 10,
): Promise<TransactionRecord[]> {
  const db = vaultrDb()
  const { data, error } = await db
    .from('transactions')
    .select(`
      id, date, name, type, amount, original_currency, created_at,
      account:accounts(name, currency),
      category:categories(name)
    `)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error(`getRecentTransactions: ${error.message}`); return [] }

  return ((data ?? []) as unknown as (VTransaction & {
    account: { name: string; currency: string } | null
    category: { name: string } | null
  })[]).map(t => ({
    id: t.id,
    date: t.date,
    description: t.name ?? '—',
    amount: t.amount,
    type: t.type,
    accountName: t.account?.name ?? 'Unknown',
    categoryName: t.category?.name ?? null,
    currency: t.account?.currency ?? t.original_currency ?? 'INR',
  }))
}

// ── Finance summary ────────────────────────────────────────────────────────

export async function getFinanceSummary(userId: string): Promise<FinanceSummary> {
  const db = vaultrDb()

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

  // Parallel: accounts + monthly transactions
  const [accountsRes, txRes] = await Promise.all([
    db
      .from('accounts')
      .select('id, name, type, currency, initial_balance, include_in_net_worth, is_active')
      .eq('user_id', userId)
      .eq('is_active', true),

    db
      .from('transactions')
      .select('type, amount, account_id, original_currency')
      .eq('user_id', userId)
      .gte('date', monthStart)
      .lte('date', monthEnd),
  ])

  if (accountsRes.error) throw new Error(`getFinanceSummary accounts: ${accountsRes.error.message}`)
  if (txRes.error)       throw new Error(`getFinanceSummary txns: ${txRes.error.message}`)

  const accounts = (accountsRes.data ?? []) as (VAccount & { id: string })[]

  // Compute running balance per account
  const allTxns = (txRes.data ?? []) as { type: string; amount: number; account_id: string }[]
  const balanceByAccount = new Map<string, number>()
  for (const a of accounts) {
    balanceByAccount.set(a.id, a.initial_balance)
  }
  // We'd need all-time txns for true balance — use initial_balance as approximation
  // (Vaultr's dashboard computes this with a view; we use a lighter approach here)

  const netWorthAccounts = accounts.filter(a => a.include_in_net_worth)
  const netWorth = round2(netWorthAccounts.reduce((s, a) => {
    const bal = a.initial_balance   // simplified — real balance needs all txns
    return ['credit', 'loan'].includes(a.type) ? s - Math.abs(bal) : s + bal
  }, 0))

  const monthlyIncome  = round2(allTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))
  const monthlyExpense = round2(allTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))

  const currency = accounts[0]?.currency ?? 'INR'

  const topAccounts = accounts
    .filter(a => a.include_in_net_worth)
    .slice(0, 4)
    .map(a => ({ name: a.name, balance: a.initial_balance, type: a.type }))

  return {
    currency,
    netWorth,
    monthlyIncome,
    monthlyExpense,
    monthlyBalance: round2(monthlyIncome - monthlyExpense),
    accountCount: accounts.length,
    topAccounts,
  }
}

// ── Recoverables summary ───────────────────────────────────────────────────

export async function getRecoverablesSummary(userId: string): Promise<RecoverablesSummary> {
  const db = vaultrDb()

  const [allocRes, batchRes] = await Promise.all([
    db
      .from('recoverable_allocations')
      .select('customer_name, recoverable_amount, status')
      .eq('user_id', userId),

    db
      .from('recoverable_import_batches')
      .select('id, currency')
      .eq('user_id', userId)
      .eq('status', 'processed'),
  ])

  if (allocRes.error) throw new Error(`getRecoverablesSummary alloc: ${allocRes.error.message}`)
  if (batchRes.error) throw new Error(`getRecoverablesSummary batch: ${batchRes.error.message}`)

  const allocations = (allocRes.data ?? []) as Pick<VRecoverableAllocation, 'customer_name' | 'recoverable_amount' | 'status'>[]
  const batches     = batchRes.data ?? []

  let totalPending = 0, totalBilled = 0, totalPaid = 0
  const customerMap = new Map<string, { pending: number; total: number }>()

  for (const a of allocations) {
    const amount = a.recoverable_amount
    if (a.status === 'pending') { totalPending = round2(totalPending + amount) }
    else if (a.status === 'billed') { totalBilled = round2(totalBilled + amount) }
    else if (a.status === 'paid')   { totalPaid   = round2(totalPaid   + amount) }

    const entry = customerMap.get(a.customer_name) ?? { pending: 0, total: 0 }
    entry.total = round2(entry.total + amount)
    if (a.status === 'pending') entry.pending = round2(entry.pending + amount)
    customerMap.set(a.customer_name, entry)
  }

  const topCustomers = Array.from(customerMap.entries())
    .map(([name, v]) => ({ customerName: name, pendingAmount: v.pending, totalAmount: v.total }))
    .sort((a, b) => b.pendingAmount - a.pendingAmount)
    .slice(0, 5)

  const currency = (batches[0] as { currency?: string } | undefined)?.currency ?? 'INR'

  return {
    currency,
    totalPending,
    totalBilled,
    totalPaid,
    batchCount: batches.length,
    customerCount: customerMap.size,
    topCustomers,
  }
}

// ── Supplier balances ──────────────────────────────────────────────────────

export async function getSupplierBalances(userId: string): Promise<SupplierBalanceLine[]> {
  const db = vaultrDb()

  const { data, error } = await db
    .from('recoverable_allocations')
    .select('customer_name, recoverable_amount, status')
    .eq('user_id', userId)

  if (error) throw new Error(`getSupplierBalances: ${error.message}`)

  const map = new Map<string, SupplierBalanceLine>()

  for (const a of (data ?? []) as Pick<VRecoverableAllocation, 'customer_name' | 'recoverable_amount' | 'status'>[]) {
    const entry = map.get(a.customer_name) ?? {
      customerName: a.customer_name,
      pendingAmount: 0, billedAmount: 0, paidAmount: 0, totalAmount: 0,
    }
    entry.totalAmount = round2(entry.totalAmount + a.recoverable_amount)
    if (a.status === 'pending')  entry.pendingAmount = round2(entry.pendingAmount + a.recoverable_amount)
    if (a.status === 'billed')   entry.billedAmount  = round2(entry.billedAmount  + a.recoverable_amount)
    if (a.status === 'paid')     entry.paidAmount    = round2(entry.paidAmount    + a.recoverable_amount)
    map.set(a.customer_name, entry)
  }

  return Array.from(map.values()).sort((a, b) => b.pendingAmount - a.pendingAmount)
}
