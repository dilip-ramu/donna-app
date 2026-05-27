'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Landmark, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import type { FinanceSummary, RecoverablesSummary } from '@/types/contracts/vaultr'

const fmt = (n: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency,
    notation: Math.abs(n) >= 100000 ? 'compact' : 'standard',
    maximumFractionDigits: Math.abs(n) >= 100000 ? 1 : 0,
  }).format(n)

interface FinanceCardProps {
  vaultrUrl: string
}

interface FinanceData {
  summary: FinanceSummary | null
  recoverables: RecoverablesSummary | null
}

export default function FinanceCard({ vaultrUrl }: FinanceCardProps) {
  const [data, setData]       = useState<FinanceData>({ summary: null, recoverables: null })
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/finance/summary')
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json() as FinanceData
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const s = data.summary
  const r = data.recoverables

  return (
    <div className="donna-card p-4 flex flex-col gap-3 min-w-0">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark size={14} style={{ color: 'var(--c-violet)' }} />
          <span className="text-xs font-semibold text-donna-text">Vaultr</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={load}
            disabled={loading}
            className="text-donna-subtle hover:text-donna-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          </button>
          <a
            href={vaultrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-donna-subtle hover:text-donna-muted transition-colors"
            title="Open Vaultr"
          >
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 size={12} className="animate-spin text-donna-subtle" />
          <span className="text-xs text-donna-subtle">Loading from Vaultr…</span>
        </div>
      )}

      {error && !loading && (
        <p className="text-[11px] text-donna-subtle">
          Vaultr not connected.{' '}
          <button onClick={load} className="underline">Retry</button>
        </p>
      )}

      {!loading && !error && s && (
        <div className="space-y-2.5">
          {/* Monthly balance */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-donna-muted">This month</span>
            <span
              className="text-sm font-semibold tabular-nums"
              style={{ color: s.monthlyBalance >= 0 ? '#10B981' : '#EF4444' }}
            >
              {s.monthlyBalance >= 0 ? '+' : ''}{fmt(s.monthlyBalance, s.currency)}
            </span>
          </div>

          {/* Income / Expense row */}
          <div className="flex gap-3">
            <div className="flex items-center gap-1 flex-1">
              <TrendingUp size={11} className="text-emerald-500 shrink-0" />
              <span className="text-[11px] text-donna-muted truncate">{fmt(s.monthlyIncome, s.currency)}</span>
            </div>
            <div className="flex items-center gap-1 flex-1">
              <TrendingDown size={11} className="text-red-400 shrink-0" />
              <span className="text-[11px] text-donna-muted truncate">{fmt(s.monthlyExpense, s.currency)}</span>
            </div>
          </div>

          {/* Recoverables pending */}
          {r && r.totalPending > 0 && (
            <div
              className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
              style={{ background: 'var(--c-violet-bg)' }}
            >
              <span className="text-[11px] text-donna-muted">Pending recoverables</span>
              <span
                className="text-[11px] font-semibold tabular-nums"
                style={{ color: 'var(--c-violet)' }}
              >
                {fmt(r.totalPending, r.currency)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
