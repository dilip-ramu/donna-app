/**
 * Vaultr write actions — server-side only.
 *
 * Donna creates data in Vaultr's tables via service role.
 * Vaultr picks it up natively — no changes to Vaultr needed.
 *
 * Rule: Donna only handles simple inserts here.
 * Complex engine ops (invoice calculations, batch processing) are
 * redirected to Vaultr's UI as deep links.
 */

import { vaultrDb, vaultrUrl } from './db'
import { getAccounts, getCategories } from './finance'
import type {
  VTransactionType, FinanceActionResult,
} from '@/types/contracts/vaultr'

// ── Create transaction (expense / income) ─────────────────────────────────

export interface CreateTransactionPayload {
  userId: string
  type: VTransactionType
  amount: number
  accountHint: string | null    // resolved against user's accounts by name fuzzy match
  categoryHint: string | null   // resolved against user's categories
  description: string
  date: string                  // YYYY-MM-DD
  notes?: string | null
}

export async function createTransaction(
  payload: CreateTransactionPayload,
): Promise<FinanceActionResult> {
  const db = vaultrDb()
  const { userId, type, amount, accountHint, categoryHint, description, date, notes } = payload

  // 1. Resolve account
  const accounts   = await getAccounts(userId)
  const categories = await getCategories(userId)

  const account = resolveByName(accounts, accountHint)
  if (!account) {
    const names = accounts.map(a => a.name).join(', ')
    return {
      status: 'needs_confirmation',
      message: `I couldn't identify the account${accountHint ? ` "${accountHint}"` : ''}. ` +
               `Your accounts: ${names}. Which one should I use?`,
    }
  }

  // 2. Resolve category (optional — null is fine)
  const expenseCats = categories.filter(c => c.type === type || c.type === 'expense')
  const category = categoryHint ? resolveByName(expenseCats, categoryHint) : null

  // 3. Insert transaction
  const { data, error } = await db
    .from('transactions')
    .insert({
      user_id:           userId,
      account_id:        account.id,
      category_id:       category?.id ?? null,
      name:              description,
      type,
      amount:            Math.abs(amount),
      original_currency: account.currency,
      original_amount:   null,
      exchange_rate_used: null,
      date,
      notes:             notes ?? null,
    })
    .select('id')
    .single()

  if (error) {
    return { status: 'error', message: `Failed to log transaction: ${error.message}` }
  }

  const fmt = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: account.currency, maximumFractionDigits: 0,
  })

  return {
    status: 'success',
    message: `✓ ${fmt.format(amount)} logged as ${type}` +
             (category ? ` · ${category.name}` : '') +
             ` from **${account.name}**` +
             ` on ${new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
    data: { transactionId: data?.id, accountName: account.name },
  }
}

// ── Invoice redirect ───────────────────────────────────────────────────────
// Invoice generation requires Vaultr's calculator engine.
// Donna provides a deep link with pre-filled context.

export function buildInvoiceRedirect(customerHint: string | null): FinanceActionResult {
  const path = customerHint
    ? `/recoverables/invoices/new?customer=${encodeURIComponent(customerHint)}`
    : '/recoverables/invoices/new'

  return {
    status: 'redirect',
    message: `Invoice generation uses Vaultr's billing engine. ` +
             `I've prepared the link${customerHint ? ` for **${customerHint}**` : ''} — ` +
             `open it to complete and send.`,
    redirectUrl: vaultrUrl(path),
  }
}

// ── Redirect helpers ───────────────────────────────────────────────────────

export function buildRecoverablesRedirect(): FinanceActionResult {
  return {
    status: 'redirect',
    message: 'Opening Vaultr recoverables dashboard.',
    redirectUrl: vaultrUrl('/recoverables'),
  }
}

export function buildTransactionsRedirect(): FinanceActionResult {
  return {
    status: 'redirect',
    message: 'Opening Vaultr transactions.',
    redirectUrl: vaultrUrl('/transactions'),
  }
}

// ── Internal helpers ───────────────────────────────────────────────────────

interface Named { id: string; name: string }

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function resolveByName<T extends Named>(items: T[], hint: string | null): T | null {
  if (!hint || items.length === 0) return items[0] ?? null

  const q = normalise(hint)

  // Exact match
  let match = items.find(i => normalise(i.name) === q)
  if (match) return match

  // Starts-with match
  match = items.find(i => normalise(i.name).startsWith(q) || q.startsWith(normalise(i.name)))
  if (match) return match

  // Substring match
  match = items.find(i => normalise(i.name).includes(q) || q.includes(normalise(i.name)))
  return match ?? null
}
