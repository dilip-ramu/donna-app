// ─── Donna Design Tokens ──────────────────────────────────────────────────────
// Single source of truth for all design values.
// Use these in components for consistency; they mirror tailwind.config.ts.

export const colors = {
  bg:           '#F4F4F8',
  surface:      '#FFFFFF',
  elevated:     '#F0F0F5',
  border:       '#E8E8EE',
  sidebar:      '#FFFFFF',

  text:         '#111827',
  muted:        '#6B7280',
  subtle:       '#9CA3AF',

  violet:       '#7C3AED',
  violetLight:  '#EDE9FE',
  violetDim:    'rgba(124, 58, 237, 0.08)',

  // Priority
  critical:     '#EF4444',
  high:         '#EF4444',
  medium:       '#F59E0B',
  low:          '#10B981',
  someday:      '#9CA3AF',
} as const

export const shadows = {
  card:  '0 1px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
  hover: '0 4px 20px rgba(0,0,0,0.08)',
  pop:   '0 8px 32px rgba(0,0,0,0.12)',
} as const

export const radius = {
  sm:   '8px',
  md:   '10px',
  lg:   '14px',
  xl:   '18px',
  full: '9999px',
} as const

// Fluid spacing via clamp(min, preferred, max)
export const space = {
  cardPad:  'clamp(14px, 2vw, 20px)',
  gap:      'clamp(12px, 1.5vw, 16px)',
  pagePad:  'clamp(16px, 3vw, 24px)',
} as const

// Typography scale
export const type = {
  cardTitle:   { fontSize: '0.9375rem', fontWeight: '600', lineHeight: '1.3' },
  cardMeta:    { fontSize: '0.6875rem', color: colors.muted },
  label:       { fontSize: '0.8125rem', fontWeight: '500' },
  caption:     { fontSize: '0.6875rem' },
} as const

export const gradients = {
  violet: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)',
  violetSoft: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(147,51,234,0.12))',
} as const

// Priority pill config
export const PRIORITY_CONFIG = {
  critical: { label: 'Critical', bg: '#FEF2F2', color: '#EF4444' },
  high:     { label: 'High',     bg: '#FEF2F2', color: '#EF4444' },
  medium:   { label: 'Medium',   bg: '#FFFBEB', color: '#D97706' },
  low:      { label: 'Low',      bg: '#ECFDF5', color: '#10B981' },
  someday:  { label: 'Someday',  bg: '#F3F4F6', color: '#6B7280' },
} as const

// Rotating accent colors for lists
export const ACCENT_COLORS = [
  '#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#F97316'
] as const

export const BORDER_COLORS = [
  '#F59E0B', '#3B82F6', '#F97316', '#8B5CF6', '#10B981', '#EF4444'
] as const
