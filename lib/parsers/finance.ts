/**
 * Natural language finance parser.
 * Extracts structured FinanceIntent from free-form user text.
 * Pure functions — no I/O, no DB calls.
 */

import type { FinanceIntent, FinanceIntentKind } from '@/types/contracts/vaultr'

// ── Intent keyword maps ────────────────────────────────────────────────────

const CREATE_EXPENSE_TRIGGERS = [
  'log', 'add', 'record', 'spent', 'paid', 'expense', 'bought', 'purchase',
  'charged', 'deducted', 'withdraw', 'withdrew',
]

const CREATE_INCOME_TRIGGERS = [
  'received', 'income', 'salary', 'credited', 'earned', 'got paid', 'deposit',
  'reimbursed', 'refund',
]

const QUERY_SUMMARY_TRIGGERS = [
  'how much', 'total', 'balance', 'net worth', 'summary', 'overview',
  'financial summary', 'finance summary', 'spend this month', 'spent this month',
  'monthly', 'net', 'accounts',
]

const QUERY_RECOVERABLES_TRIGGERS = [
  'recoverable', 'pending amount', 'pending recoverables', 'recover',
  'outstanding', 'dues', 'due amount',
]

const QUERY_SUPPLIERS_TRIGGERS = [
  'supplier', 'supplier balance', 'customer balance', 'who owes',
  'supplier summary', 'customer summary', 'allocation',
]

const INVOICE_TRIGGERS = [
  'invoice', 'generate invoice', 'create invoice', 'raise invoice', 'bill',
  'billing', 'send invoice',
]

const QUERY_TX_TRIGGERS = [
  'transactions', 'recent transactions', 'last transactions', 'history',
  'what did i spend', 'spending', 'show me',
]

// ── Amount extraction ──────────────────────────────────────────────────────

const AMOUNT_PATTERNS = [
  /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i,          // ₹1,000 or Rs 1000
  /([\d,]+(?:\.\d{1,2})?)\s*(?:rupees?|inr|rs)/i,        // 1000 rupees
  /\b([\d,]+(?:\.\d{1,2})?)\s*k\b/i,                     // 10k → 10000
  /\b([\d,]+\.\d{1,2})\b/,                                // 1000.00 (decimal)
  /\b([1-9][\d,]{2,})\b/,                                 // 1000+ (bare number)
]

function extractAmount(text: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const m = text.match(pattern)
    if (m) {
      const raw = m[1].replace(/,/g, '')
      const num = parseFloat(raw)
      // k suffix
      if (/k\b/i.test(text.slice(text.indexOf(m[0]) + m[0].length - 1, text.indexOf(m[0]) + m[0].length + 1))) {
        return num * 1000
      }
      return isNaN(num) ? null : num
    }
  }
  return null
}

// ── Date extraction ────────────────────────────────────────────────────────

function extractDate(text: string): string | null {
  const now = new Date()
  const lower = text.toLowerCase()

  if (lower.includes('today'))     return toISO(now)
  if (lower.includes('yesterday')) { now.setDate(now.getDate() - 1); return toISO(now) }
  if (lower.includes('last week')) { now.setDate(now.getDate() - 7); return toISO(now) }

  // DD/MM or DD/MM/YY or DD/MM/YYYY (same parser as task dates)
  const m = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (m) {
    const day = parseInt(m[1], 10)
    const mon = parseInt(m[2], 10) - 1
    let year = now.getFullYear()
    if (m[3]) {
      year = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10)
    }
    const d = new Date(year, mon, day)
    if (!isNaN(d.getTime()) && d.getDate() === day) return toISO(d)
  }

  return toISO(now)  // default to today
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ── Account hint extraction ────────────────────────────────────────────────

const ACCOUNT_PREPOSITIONS = ['from', 'using', 'via', 'on', 'through', 'with', 'in']

function extractAccountHint(text: string): string | null {
  const lower = text.toLowerCase()
  for (const prep of ACCOUNT_PREPOSITIONS) {
    const regex = new RegExp(`\\b${prep}\\s+([a-z][\\w\\s]{1,30})(?:\\s|$|,|\\.|-|–)`, 'i')
    const m = lower.match(regex)
    if (m) {
      const hint = m[1].trim()
      // Filter out generic words that aren't account hints
      const SKIP = ['me', 'my', 'the', 'a', 'an', 'this', 'that', 'today', 'yesterday', 'it']
      if (!SKIP.includes(hint.toLowerCase())) return hint
    }
  }
  return null
}

// ── Category hint extraction ───────────────────────────────────────────────

// Common category keywords mapped to canonical hints
const CATEGORY_KEYWORDS: Record<string, string> = {
  dinner: 'food', lunch: 'food', breakfast: 'food', food: 'food', meal: 'food',
  restaurant: 'food', cafe: 'food', coffee: 'coffee', eat: 'food', eating: 'food',
  snack: 'food', groceries: 'groceries', grocery: 'groceries', supermarket: 'groceries',
  fuel: 'transport', petrol: 'transport', diesel: 'transport', uber: 'transport',
  ola: 'transport', cab: 'transport', taxi: 'transport', auto: 'transport',
  bus: 'transport', metro: 'transport', train: 'transport', flight: 'travel', travel: 'travel',
  hotel: 'travel', airbnb: 'travel',
  medicine: 'health', doctor: 'health', hospital: 'health', pharmacy: 'health',
  medical: 'health', health: 'health',
  shopping: 'shopping', amazon: 'shopping', flipkart: 'shopping', clothes: 'shopping',
  clothing: 'shopping', fashion: 'shopping',
  salary: 'salary', paycheck: 'salary', wage: 'salary',
  rent: 'home', electricity: 'utilities', water: 'utilities', gas: 'utilities',
  internet: 'internet', wifi: 'internet', mobile: 'utilities', phone: 'utilities',
  subscription: 'subscriptions', netflix: 'subscriptions', spotify: 'subscriptions',
  entertainment: 'entertainment', movie: 'entertainment', games: 'entertainment',
}

function extractCategoryHint(text: string): string | null {
  const lower = text.toLowerCase()
  for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lower.includes(keyword)) return category
  }
  return null
}

// ── Merchant / place extraction ────────────────────────────────────────────
// Captures the place name from "at [Merchant Name]", e.g.
//   "spent 500 at Burger King for food" → "Burger King"
//   "lunch at The Blue Door from HDFC"  → "The Blue Door"

const MERCHANT_SKIP = new Set(['a', 'an', 'the', 'home', 'work', 'school', 'office', 'this', 'that', 'my'])

function extractMerchantHint(text: string): string | null {
  // Match "at <Name>" where name ends at a preposition, comma, or end-of-string
  const m = text.match(
    /\bat\s+((?:the\s+)?[A-Za-z][A-Za-z0-9'&.\s-]{1,40}?)(?:\s+(?:for|from|using|via|on|through|with|yesterday|today|last)\b|[,.]|$)/i
  )
  if (!m) return null
  const name = m[1].trim().replace(/\s{2,}/g, ' ')
  if (MERCHANT_SKIP.has(name.toLowerCase())) return null
  // Title-case the result
  return name.replace(/\b\w/g, c => c.toUpperCase())
}

// ── Customer hint extraction ───────────────────────────────────────────────

function extractCustomerHint(text: string): string | null {
  // Look for patterns like "for DHL", "DHL invoice", "supplier DHL"
  const m = text.match(/(?:for|supplier|customer|client)\s+([A-Z][A-Za-z0-9\s&.]{1,30})/i)
    ?? text.match(/([A-Z][A-Z0-9\s&]{2,})\s+(?:invoice|allocation|balance)/i)
  return m ? m[1].trim() : null
}

// ── Intent classification ──────────────────────────────────────────────────

function classifyIntent(text: string): { kind: FinanceIntentKind; confidence: number } {
  const lower = text.toLowerCase()
  const scores: Record<FinanceIntentKind, number> = {
    create_expense:      0,
    create_income:       0,
    query_summary:       0,
    query_recoverables:  0,
    query_transactions:  0,
    query_suppliers:     0,
    open_invoice:        0,
    unknown:             0.1,
  }

  for (const kw of CREATE_EXPENSE_TRIGGERS)    if (lower.includes(kw)) scores.create_expense      += 0.4
  for (const kw of CREATE_INCOME_TRIGGERS)     if (lower.includes(kw)) scores.create_income       += 0.4
  for (const kw of QUERY_SUMMARY_TRIGGERS)     if (lower.includes(kw)) scores.query_summary       += 0.35
  for (const kw of QUERY_RECOVERABLES_TRIGGERS)if (lower.includes(kw)) scores.query_recoverables  += 0.5
  for (const kw of QUERY_SUPPLIERS_TRIGGERS)   if (lower.includes(kw)) scores.query_suppliers     += 0.4
  for (const kw of INVOICE_TRIGGERS)           if (lower.includes(kw)) scores.open_invoice        += 0.5
  for (const kw of QUERY_TX_TRIGGERS)          if (lower.includes(kw)) scores.query_transactions  += 0.3

  // Boost create_expense if an amount is present
  if (/₹|rs\.?|rupee|inr|\d{3,}/i.test(lower) && scores.create_income === 0) {
    scores.create_expense += 0.2
  }

  const best = Object.entries(scores).sort(([, a], [, b]) => b - a)[0]
  return {
    kind: best[0] as FinanceIntentKind,
    confidence: Math.min(best[1], 1),
  }
}

// ── Main parser ────────────────────────────────────────────────────────────

export function parseFinanceIntent(text: string): FinanceIntent {
  const { kind, confidence } = classifyIntent(text)

  return {
    kind,
    confidence,
    raw: text,
    amount:       extractAmount(text),
    currency:     'INR',
    accountHint:  extractAccountHint(text),
    categoryHint: extractCategoryHint(text),
    merchantHint: extractMerchantHint(text),
    dateHint:     extractDate(text),
    customerHint: extractCustomerHint(text),
    notes:        null,
  }
}

/** Quick check: is this text likely a finance-related query? */
export function looksLikeFinance(text: string): boolean {
  const lower = text.toLowerCase()
  const allTriggers = [
    ...CREATE_EXPENSE_TRIGGERS, ...CREATE_INCOME_TRIGGERS,
    ...QUERY_SUMMARY_TRIGGERS, ...QUERY_RECOVERABLES_TRIGGERS,
    ...QUERY_SUPPLIERS_TRIGGERS, ...INVOICE_TRIGGERS,
  ]
  const hasAmount = /₹|rs\.?|rupee|inr/i.test(lower)
  const hasTrigger = allTriggers.some(kw => lower.includes(kw))
  return hasAmount || hasTrigger
}
