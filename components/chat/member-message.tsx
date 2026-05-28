'use client'

import MemberAvatar from './member-avatar'
import { getMember } from '@/services/council/member-registry'
import type { CouncilMessage } from '@/types/council/message'
import type { MemberId } from '@/types/council/member'

// ── Markdown-lite renderer (same as right-panel) ──────────────────────────────

function renderContent(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Headers
    if (/^### /.test(line)) return <p key={i} className="font-semibold text-[12px] mt-2 mb-0.5 opacity-90">{line.slice(4)}</p>
    if (/^## /.test(line))  return <p key={i} className="font-semibold text-[12.5px] mt-2.5 mb-1 opacity-90">{line.slice(3)}</p>
    if (/^# /.test(line))   return <p key={i} className="font-semibold text-[13px] mt-3 mb-1 opacity-90">{line.slice(2)}</p>

    // Bold
    const boldified = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    const emified   = boldified.replace(/\*(.+?)\*/g, '<em>$1</em>')

    // Bullets
    if (/^[-•] /.test(line)) {
      return (
        <div key={i} className="flex gap-1.5 items-start">
          <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-current opacity-50" />
          <span dangerouslySetInnerHTML={{ __html: emified.slice(2) }} />
        </div>
      )
    }
    if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1]
      return (
        <div key={i} className="flex gap-1.5 items-start">
          <span className="shrink-0 font-medium opacity-60 min-w-[14px] text-right">{num}.</span>
          <span dangerouslySetInnerHTML={{ __html: emified.replace(/^\d+\.\s*/, '') }} />
        </div>
      )
    }

    // Blank line
    if (line.trim() === '') return <div key={i} className="h-1.5" />

    return <p key={i} dangerouslySetInnerHTML={{ __html: emified }} />
  })
}

// ── Component ──────────────────────────────────────────────────────────────────

interface MemberMessageProps {
  message: CouncilMessage
}

export default function MemberMessage({ message }: MemberMessageProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[78%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm leading-relaxed"
          style={{ background: 'var(--c-text)', color: 'var(--c-surface)' }}
        >
          {message.content}
        </div>
      </div>
    )
  }

  const memberId = message.memberId as MemberId
  const member   = getMember(memberId)

  return (
    <div className="flex items-end gap-2 animate-fade-in">
      <MemberAvatar memberId={memberId} size="sm" />

      <div className="flex flex-col gap-0.5 max-w-[82%]">
        {/* Member label */}
        <div className="flex items-center gap-1.5 px-0.5">
          <span className="text-[10px] font-semibold" style={{ color: member.accentColor }}>
            {member.name}
          </span>
          <span className="text-[9px] text-donna-subtle opacity-70">
            {member.role}
          </span>
        </div>

        {/* Bubble */}
        <div
          className="rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm leading-relaxed space-y-0.5"
          style={{
            background: `color-mix(in srgb, ${member.accentColor} 10%, var(--c-elevated))`,
            color:      'var(--c-text)',
            borderLeft: `2px solid ${member.accentColor}40`,
          }}
        >
          {message.isStreaming && message.content === '' ? (
            <span className="flex gap-1 items-center py-0.5">
              {[0, 140, 280].map(delay => (
                <span
                  key={delay}
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{
                    background:      member.accentColor,
                    opacity:         0.6,
                    animationDelay:  `${delay}ms`,
                    animationDuration: '1.1s',
                  }}
                />
              ))}
            </span>
          ) : (
            <div className="flex flex-col gap-0.5">
              {renderContent(message.content)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
