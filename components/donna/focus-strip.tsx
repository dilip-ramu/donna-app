import Link from 'next/link'
import { Target, Zap, ArrowRight } from 'lucide-react'

const TIPS = [
  { icon: Target, label: 'Single-task mode', sub: 'Close unrelated tabs and work on one thing.' },
  { icon: Zap,    label: 'Energy peaks',     sub: 'Your sharpest hours are typically mid-morning.' },
]

const QUOTE = 'The secret of getting ahead is getting started.'
const QUOTE_ATTR = '— Mark Twain'

export default function FocusStrip() {
  return (
    <div
      className="shrink-0 rounded-2xl bg-white border border-[#F0F0F5] overflow-hidden"
      style={{ marginTop: 'clamp(12px, 1.5vw, 16px)' }}
    >
      <div className="flex items-stretch divide-x divide-[#F0F0F5]">

        {/* Quote block */}
        <div
          className="flex-1 px-5 py-4 flex items-center gap-4"
          style={{ background: 'linear-gradient(to right, #F5F3FF, #FAFAFF)' }}
        >
          <span
            className="text-5xl leading-none select-none shrink-0 font-serif"
            style={{ color: 'rgba(124,58,237,0.25)', fontFamily: 'Georgia, serif' }}
          >
            "
          </span>
          <div>
            <p className="text-sm font-medium text-[#111827] leading-snug">{QUOTE}</p>
            <p className="text-[11px] text-[#9CA3AF] mt-1">{QUOTE_ATTR}</p>
          </div>
        </div>

        {/* Tips */}
        {TIPS.map(({ icon: Icon, label, sub }) => (
          <div key={label} className="px-5 py-4 flex items-start gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#F5F3FF] flex items-center justify-center shrink-0 mt-0.5">
              <Icon size={14} className="text-[#7C3AED]" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#111827] leading-none truncate">{label}</p>
              <p className="text-[11px] text-[#6B7280] mt-1 leading-snug line-clamp-2">{sub}</p>
            </div>
          </div>
        ))}

        {/* Link */}
        <div className="px-5 py-4 flex items-center shrink-0">
          <Link
            href="/focus"
            className="flex items-center gap-1.5 text-xs font-medium text-[#7C3AED]
                       hover:underline whitespace-nowrap"
          >
            Focus mode <ArrowRight size={12} />
          </Link>
        </div>

      </div>
    </div>
  )
}
