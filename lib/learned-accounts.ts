// ── Learned Account Preferences ───────────────────────────────────────────────
// Stores the user's preferred account per expense category.
// After one successful log, we skip the account chooser next time.

export interface LearnedAccount {
  accountId:   string
  accountName: string
  accountType: string
  lastUsed:    number
}

type Store = Record<string, LearnedAccount>

const KEY = 'donna_learned_accounts'

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function write(store: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(store)) } catch { /* quota */ }
}

export function getLearnedAccount(category: string): LearnedAccount | null {
  if (typeof window === 'undefined') return null
  return read()[category] ?? null
}

export function learnAccount(category: string, account: Omit<LearnedAccount, 'lastUsed'>) {
  if (typeof window === 'undefined') return
  const store = read()
  store[category] = { ...account, lastUsed: Date.now() }
  write(store)
}

// ── Expense intent detection ───────────────────────────────────────────────────

export interface ExpenseIntent {
  isExpense:      boolean
  amount:         number | null
  rawText:        string
  category:       string          // e.g. 'fuel', 'food', 'shopping'
  learnedAccount: LearnedAccount | null
}

const EXPENSE_TRIGGER_RE =
  /\b(paid|pay|spent|spend|log|bought|buy|purchased|purchase|expense|receipt|bill)\b.*\d+|\d+.*\b(paid|spent|for|at|rupees?|inr)\b|[₹$€£]\s*\d+/i

// Keyword → category map (order matters — more specific first)
const CATEGORY_MAP: [string[], string][] = [
  [['fuel', 'petrol', 'diesel', 'gas', 'petroleum', 'refuel'],                  'fuel'],
  [['flight', 'airline', 'train', 'bus', 'uber', 'ola', 'taxi', 'cab', 'travel', 'hotel', 'stay'], 'travel'],
  [['coffee', 'cafe', 'starbucks', 'chai', 'tea'],                              'coffee'],
  [['dinner', 'lunch', 'breakfast', 'brunch', 'meal', 'restaurant', 'food', 'eat', 'zomato', 'swiggy'], 'food'],
  [['grocery', 'groceries', 'vegetables', 'fruits', 'supermarket', 'bigbasket', 'blinkit'], 'groceries'],
  [['medicine', 'medical', 'pharmacy', 'hospital', 'doctor', 'clinic', 'health'], 'medical'],
  [['electricity', 'water', 'internet', 'broadband', 'mobile', 'recharge', 'utility', 'bill'], 'utilities'],
  [['amazon', 'flipkart', 'clothes', 'shopping', 'apparel', 'shoes', 'bags'],   'shopping'],
  [['subscription', 'netflix', 'spotify', 'apple', 'google', 'software'],       'subscriptions'],
]

export function detectCategory(text: string): string {
  const lower = text.toLowerCase()
  for (const [keywords, category] of CATEGORY_MAP) {
    if (keywords.some(kw => lower.includes(kw))) return category
  }
  return 'general'
}

function extractAmount(text: string): number | null {
  // ₹3730.66  or  $500
  const currencyMatch = text.match(/[₹$€£]\s*([\d,]+(?:\.\d+)?)/)
  if (currencyMatch) return parseFloat(currencyMatch[1].replace(/,/g, ''))

  // 3730 rupees / 500 inr
  const rupeeMatch = text.match(/([\d,]+(?:\.\d+)?)\s*(?:rupees?|inr)/i)
  if (rupeeMatch) return parseFloat(rupeeMatch[1].replace(/,/g, ''))

  // paid / spent / for 3730
  const keywordMatch = text.match(/(?:paid|spent|for|of)\s*(?:[₹$€£])?\s*([\d,]+(?:\.\d+)?)/i)
  if (keywordMatch) return parseFloat(keywordMatch[1].replace(/,/g, ''))

  // First number in message
  const anyMatch = text.match(/([\d,]+(?:\.\d+)?)/)
  return anyMatch ? parseFloat(anyMatch[1].replace(/,/g, '')) : null
}

export function detectExpenseIntent(text: string): ExpenseIntent {
  const isExpense = EXPENSE_TRIGGER_RE.test(text)
  if (!isExpense) return { isExpense: false, amount: null, rawText: text, category: 'general', learnedAccount: null }

  const amount   = extractAmount(text)
  const category = detectCategory(text)
  const learnedAccount = typeof window !== 'undefined' ? getLearnedAccount(category) : null

  return { isExpense: true, amount, rawText: text, category, learnedAccount }
}

// Natural-language confirmation / cancellation detectors
export const CONFIRM_RE = /^(yes|yeah|yep|yup|sure|ok|okay|go ahead|do it|log it|please|confirmed?|correct|right|exactly|absolutely|perfect|sounds good)\b/i
export const CANCEL_RE  = /^(no|nope|cancel|don't|dont|never mind|nevermind|stop|skip)\b/i
