# Donna — Personal AI Operating System

## What This Is
Donna is a personal cognitive infrastructure app. She is NOT a todo app or chatbot wrapper — she is an operational mind that remembers, connects, surfaces, and executes.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase · Anthropic Claude API

## Design Laws (Never Violate)
1. Every feature must reduce cognitive load. If it can't pass this test, don't add it.
2. Capture is frictionless. Thought → system in under 3 seconds.
3. AI is invisible. It should feel like Donna just knows — not like a form was submitted.
4. Calm over density. No notification storms, no dashboard overload.
5. Speed is UX. No loading spinners in the critical path.
6. Memory is a feature. Donna remembers so the user doesn't have to.

## Design System
- **Colors:** donna-bg (#0a0a0a), donna-surface (#111111), donna-border (#1e1e1e), donna-accent (#1a1a2e), donna-gold (#c9a84c), donna-text (#e5e5e5), donna-muted (#666666)
- **Font:** Inter (body), JetBrains Mono (code/mono)
- **Mode:** Dark mode first, always
- **Inspiration:** Linear, Things 3, Arc Browser, Raycast — calm, fast, premium

## Key Conventions
- All Supabase calls: check errors, never silently fail
- All AI calls: async only, never block UI, 15s timeout
- Server Actions for mutations, Server Components for data fetching
- Soft deletes on all primary entities (deleted_at timestamp)
- RLS enabled on every table — users only see their own data
- TypeScript strict mode, no `any` on public interfaces

## Current Phase
**Phase 1 — Foundation** (complete after running `npm install` and deploying migrations)

Next phases (in order): Inbox → AI Engine → Tasks → Calendar → Meetings → Ideas → Documents → Graph → Search → Mobile → Semantic Memory

## Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

## Quick Start
```bash
npm install
cp .env.local.example .env.local
# Fill in your Supabase + Anthropic keys
npx supabase db push  # or run migrations manually in Supabase dashboard
npm run dev
```

## File Structure
```
app/
  (auth)/login/        — magic link login
  (auth)/callback/     — Supabase auth callback
  (app)/               — main app (protected)
    page.tsx           — Today view (home)
    inbox/             — Universal Inbox
    tasks/             — Tasks & Execution
    projects/          — Projects
    calendar/          — Calendar & Time
    ideas/             — Idea Vault
    meetings/          — Meeting Intelligence
    documents/         — Document Management
    search/            — Universal Search
  api/                 — API routes (AI processing, search, reminders)
components/
  ui/                  — Design system primitives
  layout/              — Sidebar, TopBar, BottomNav
  inbox/               — Inbox components
  tasks/               — Task components
  command/             — Command palette (⌘K)
  surface/             — Smart surfacing panel
lib/
  supabase/            — Supabase clients (browser + server)
  types/               — All TypeScript interfaces
  utils/               — cn(), date helpers, priority helpers
  actions/             — Server Actions (mutations)
  ai/                  — AI service layer
  hooks/               — React hooks
supabase/
  migrations/          — SQL migrations (run in order)
```
