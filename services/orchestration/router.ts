/**
 * Orchestration router — server-side only.
 *
 * Takes a parsed FinanceIntent, resolves it to the right service call,
 * and returns a FinanceActionResult for Donna's chat to render.
 */

import type { FinanceIntent, FinanceActionResult } from '@/types/contracts/vaultr'
import { createTransaction } from '@/services/vaultr/actions'
import {
  buildInvoiceRedirect, buildRecoverablesRedirect,
} from '@/services/vaultr/actions'
import {
  getFinanceSummary, getRecoverablesSummary,
  getRecentTransactions, getSupplierBalances,
} from '@/services/vaultr/finance'

const fmt = (n: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)

export async function routeFinanceIntent(
  intent: FinanceIntent,
  userId: string,
): Promise<FinanceActionResult> {

  switch (intent.kind) {

    // ── Create expense ─────────────────────────────────────────────────────
    case 'create_expense': {
      if (!intent.amount) {
        return {
          status: 'needs_confirmation',
          message: 'How much was the expense? (e.g. "₹500 dinner from HDFC Savings")',
        }
      }
      try {
        return await createTransaction({
          userId,
          type: 'expense',
          amount: intent.amount,
          accountHint: intent.accountHint,
          categoryHint: intent.categoryHint,
          description: deriveName(intent),
          date: intent.dateHint ?? new Date().toISOString().slice(0, 10),
          notes: intent.notes,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('[router] create_expense error:', msg)
        return { status: 'error', message: `Could not log expense: ${msg}` }
      }
    }

    // ── Create income ──────────────────────────────────────────────────────
    case 'create_income': {
      if (!intent.amount) {
        return {
          status: 'needs_confirmation',
          message: 'How much was received? (e.g. "₹50,000 salary into HDFC Savings")',
        }
      }
      try {
        return await createTransaction({
          userId,
          type: 'income',
          amount: intent.amount,
          accountHint: intent.accountHint,
          categoryHint: intent.categoryHint,
          description: deriveName(intent),
          date: intent.dateHint ?? new Date().toISOString().slice(0, 10),
          notes: intent.notes,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('[router] create_income error:', msg)
        return { status: 'error', message: `Could not log income: ${msg}` }
      }
    }

    // ── Finance summary ────────────────────────────────────────────────────
    case 'query_summary': {
      try {
        const summary = await getFinanceSummary(userId)
        const lines = [
          `**This month:** ${fmt(summary.monthlyIncome, summary.currency)} in · ${fmt(summary.monthlyExpense, summary.currency)} out · **${fmt(summary.monthlyBalance, summary.currency)} balance**`,
          `**Accounts:** ${summary.accountCount} active`,
        ]
        if (summary.topAccounts.length > 0) {
          lines.push(summary.topAccounts.map(a => `  · ${a.name}: ${fmt(a.balance, summary.currency)}`).join('\n'))
        }
        return { status: 'success', message: lines.join('\n'), data: summary as unknown as Record<string, unknown> }
      } catch {
        return { status: 'error', message: 'Could not fetch finance summary. Check VAULTR_SUPABASE_URL and VAULTR_SERVICE_ROLE_KEY.' }
      }
    }

    // ── Recoverables summary ───────────────────────────────────────────────
    case 'query_recoverables': {
      try {
        const rec = await getRecoverablesSummary(userId)
        const lines = [
          `**Recoverables summary:**`,
          `  · Pending: **${fmt(rec.totalPending, rec.currency)}**`,
          `  · Billed:  ${fmt(rec.totalBilled, rec.currency)}`,
          `  · Paid:    ${fmt(rec.totalPaid, rec.currency)}`,
          `  · ${rec.customerCount} customers across ${rec.batchCount} batches`,
        ]
        if (rec.topCustomers.length > 0) {
          lines.push('\n**Top pending:**')
          lines.push(...rec.topCustomers.slice(0, 3).map(c =>
            `  · ${c.customerName}: ${fmt(c.pendingAmount, rec.currency)} pending`
          ))
        }
        return { status: 'success', message: lines.join('\n'), data: rec as unknown as Record<string, unknown> }
      } catch {
        return { status: 'error', message: 'Could not fetch recoverables. Check Vaultr connection.' }
      }
    }

    // ── Supplier balances ──────────────────────────────────────────────────
    case 'query_suppliers': {
      try {
        const balances = await getSupplierBalances(userId)
        if (balances.length === 0) {
          return { status: 'success', message: 'No supplier allocations found in Vaultr.' }
        }
        const lines = ['**Supplier balances (top 5):**']
        balances.slice(0, 5).forEach(b => {
          lines.push(`  · **${b.customerName}**: ${fmt(b.pendingAmount)} pending · ${fmt(b.paidAmount)} paid`)
        })
        return { status: 'success', message: lines.join('\n'), data: { balances } }
      } catch {
        return { status: 'error', message: 'Could not fetch supplier balances.' }
      }
    }

    // ── Recent transactions ────────────────────────────────────────────────
    case 'query_transactions': {
      try {
        const txns = await getRecentTransactions(userId, 8)
        if (txns.length === 0) {
          return { status: 'success', message: 'No transactions found in Vaultr.' }
        }
        const lines = ['**Recent transactions:**']
        txns.forEach(t => {
          const sign = t.type === 'income' ? '+' : '-'
          const label = t.categoryName ? `${t.description} · ${t.categoryName}` : t.description
          lines.push(`  · ${t.date}  ${sign}${fmt(t.amount, t.currency)}  ${label}  (${t.accountName})`)
        })
        return { status: 'success', message: lines.join('\n') }
      } catch {
        return { status: 'error', message: 'Could not fetch transactions.' }
      }
    }

    // ── Invoice generation (redirect) ──────────────────────────────────────
    case 'open_invoice':
      return buildInvoiceRedirect(intent.customerHint)

    // ── Fallback ───────────────────────────────────────────────────────────
    default:
      return {
        status: 'error',
        message: "I didn't understand that finance request. Try: \"Log ₹500 dinner from HDFC Savings\" or \"Show pending recoverables\".",
      }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function deriveName(intent: FinanceIntent): string {
  // Merchant name ("at Burger King") is the best transaction name
  if (intent.merchantHint) return intent.merchantHint

  // Fall back to category hint as a human-readable name
  if (intent.categoryHint) {
    return intent.categoryHint.charAt(0).toUpperCase() + intent.categoryHint.slice(1)
  }

  // Last resort: strip noise from the raw input
  const cleaned = intent.raw
    .replace(/₹[\d,]+|rs\.?\s*[\d,]+|[\d,]+\s*(?:rupees?|inr)/gi, '')
    .replace(/\b(?:log|add|record|expense|from|using|via|on|today|yesterday|i|spent|paid)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return cleaned.slice(0, 60) || (intent.kind === 'create_income' ? 'Income' : 'Expense')
}
