/**
 * Vaultr data contracts — read-only mirror of Vaultr's DB schema.
 * These types describe the shape of data Donna reads from / writes to
 * Vaultr's Supabase tables. Donna NEVER owns or duplicates Vaultr logic.
 *
 * Keep in sync with Vaultr's lib/types.ts and lib/recoverables/types.ts
 * when Vaultr's schema evolves.
 */

// ── Core finance types ─────────────────────────────────────────────────────

export type VTransactionType = 'expense' | 'income' | 'transfer'
export type VAccountType     = 'checking' | 'savings' | 'credit' | 'cash' | 'investment' | 'loan' | 'other'
export type VAllocationStatus = 'pending' | 'billed' | 'paid' | 'cancelled'
export type VInvoiceStatus   = 'draft' | 'sent' | 'overdue' | 'paid' | 'cancelled'

export interface VAccount {
  id: string
  user_id: string
  name: string
  type: VAccountType
  currency: string
  initial_balance: number
  is_active: boolean
  include_in_net_worth: boolean
  color: string
  created_at: string
}

export interface VCategory {
  id: string
  user_id: string
  name: string
  type: 'expense' | 'income'
  icon: string
  color: string
  parent_id: string | null
}

export interface VTransaction {
  id: string
  user_id: string
  account_id: string
  category_id: string | null
  name: string | null
  type: VTransactionType
  amount: number
  original_currency: string
  date: string
  notes: string | null
  created_at: string
  account?: VAccount
  category?: VCategory
}

export interface VProfile {
  id: string
  full_name: string | null
  currency: string
  household_id: string | null
}

// ── Recoverables types ─────────────────────────────────────────────────────

export interface VRecoverableAllocation {
  id: string
  user_id: string
  batch_id: string
  shipment_id: string
  customer_id: string | null
  customer_name: string
  pieces: number
  base_cost: number
  recoverable_amount: number
  status: VAllocationStatus
  billed_at: string | null
  created_at: string
  updated_at: string
}

export interface VImportBatch {
  id: string
  user_id: string
  name: string
  import_date: string
  currency: string
  total_cost: number
  total_recoverable: number
  status: string
  created_at: string
}

export interface VRecoverableInvoice {
  id: string
  user_id: string
  invoice_number: string
  customer_name: string
  subtotal: number
  total: number
  balance_due: number
  status: VInvoiceStatus
  invoice_date: string
  due_date: string | null
  currency: string
  created_at: string
}

// ── Donna-side aggregated response shapes ──────────────────────────────────

export interface FinanceSummary {
  currency: string
  netWorth: number
  monthlyIncome: number
  monthlyExpense: number
  monthlyBalance: number
  accountCount: number
  topAccounts: { name: string; balance: number; type: VAccountType }[]
}

export interface RecoverablesSummary {
  currency: string
  totalPending: number
  totalBilled: number
  totalPaid: number
  batchCount: number
  customerCount: number
  topCustomers: { customerName: string; pendingAmount: number; totalAmount: number }[]
}

export interface SupplierBalanceLine {
  customerName: string
  pendingAmount: number
  billedAmount: number
  paidAmount: number
  totalAmount: number
}

export interface TransactionRecord {
  id: string
  date: string
  description: string
  amount: number
  type: VTransactionType
  accountName: string
  categoryName: string | null
  currency: string
}

// ── Intent shapes (Donna → orchestration) ─────────────────────────────────

export type FinanceIntentKind =
  | 'create_expense'
  | 'create_income'
  | 'query_summary'
  | 'query_recoverables'
  | 'query_transactions'
  | 'query_suppliers'
  | 'open_invoice'
  | 'unknown'

export interface FinanceIntent {
  kind: FinanceIntentKind
  confidence: number          // 0–1
  raw: string                 // original user text

  // Extraction fields — null when not applicable/detected
  amount: number | null
  currency: string
  accountHint: string | null  // "HDFC Savings", "credit card"
  categoryHint: string | null // "dinner", "fuel", "salary"
  dateHint: string | null     // ISO YYYY-MM-DD resolved date
  customerHint: string | null // "DHL", "Netto"
  notes: string | null
}

// ── Action result ──────────────────────────────────────────────────────────

export type FinanceActionStatus = 'success' | 'error' | 'needs_confirmation' | 'redirect'

export interface FinanceActionResult {
  status: FinanceActionStatus
  message: string             // Human-readable response for Donna's chat
  data?: Record<string, unknown>
  redirectUrl?: string        // Vaultr deep-link when action must be done there
}
