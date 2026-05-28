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
  VTransactionType, FinanceActionResult, VAccount,
} from '@/types/contracts/vaultr'

// ── Create transaction (expense / income) ─────────────────────────────────

export interface CreateTransactionPayload {
  userId: string
  type: VTransactionType
  amount: number
  accountHint: string | null    // resolved against user's accounts by name fuzzy match
  accountId?: string | null     // explicit account ID (from chooser, overrides hint)
  categoryHint: string | null   // resolved against user's categories
  description: string
  date: string                  // YYYY-MM-DD
  notes?: string | null
}

export async function createTransaction(
  payload: CreateTransactionPayload,
): Promise<FinanceActionResult> {
  const db = vaultrDb()
  const { userId, type, amount, accountHint, accountId, categoryHint, description, date, notes } = payload

  // 1. Resolve account
  const accounts   = await getAccounts(userId)
  const categories = await getCategories(userId)

  if (accounts.length === 0) {
    return {
      status: 'error',
      message: 'No accounts found in Vaultr. Make sure you have at least one active account set up at inex-mu.vercel.app.',
    }
  }

  // If explicit accountId provided (user picked from chooser chips), use it directly
  let account: VAccount | null = null
  if (accountId) {
    account = accounts.find(a => a.id === accountId) ?? null
    if (!account) {
      return { status: 'error', message: 'Selected account not found. Please try again.' }
    }
  } else {
    // Fuzzy resolve by hint; if multiple candidates → show chooser
    const candidates = resolveByNameMulti(accounts, accountHint)
    if (candidates.length === 1) {
      account = candidates[0]
    } else if (candidates.length === 0) {
      // No match at all — show all accounts as choices
      return {
        status: 'choose_account',
        message: accountHint
          ? `I couldn't find an account matching **"${accountHint}"**. Pick one:`
          : 'Which account should I use?',
        accounts: accounts.map(a => ({ id: a.id, name: a.name, type: a.type })),
      }
    } else {
      // Multiple fuzzy matches — let user pick
      return {
        status: 'choose_account',
        message: `I found a few accounts that could match **"${accountHint}"**. Which one?`,
        accounts: candidates.map(a => ({ id: a.id, name: a.name, type: a.type })),
      }
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
    data: { transactionId: data?.id, accountId: account.id, accountName: account.name, accountType: account.type },
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

/** Returns a single unambiguous match, or null when there are 0 or 2+ matches. */
function resolveByName<T extends Named>(items: T[], hint: string | null): T | null {
  if (!hint || items.length === 0) return items[0] ?? null
  const matches = resolveByNameMulti(items, hint)
  return matches.length === 1 ? matches[0] : null
}

/** Returns all items that fuzzy-match the hint, in order of confidence. */
function resolveByNameMulti<T extends Named>(items: T[], hint: string | null): T[] {
  if (!hint) return items  // no hint → return all (caller handles)

  const q = normalise(hint)

  // Exact match → single confident result
  const exact = items.filter(i => normalise(i.name) === q)
  if (exact.length > 0) return exact

  // Starts-with / contains match (hint is prefix of name, or name is prefix of hint)
  const prefix = items.filter(i => {
    const n = normalise(i.name)
    return n.startsWith(q) || q.startsWith(n)
  })
  if (prefix.length > 0) return prefix

  // Substring match in either direction
  const sub = items.filter(i => {
    const n = normalise(i.name)
    return n.includes(q) || q.includes(n)
  })
  return sub
}
