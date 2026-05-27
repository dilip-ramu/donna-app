import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        donna: {
          // CSS-variable backed — automatically flip in dark mode
          bg:       'var(--c-bg)',
          surface:  'var(--c-surface)',
          elevated: 'var(--c-elevated)',
          border:   'var(--c-border)',
          text:     'var(--c-text)',
          muted:    'var(--c-muted)',
          subtle:   'var(--c-subtle)',
          violet:   'var(--c-violet)',
          'violet-light': 'var(--c-violet-bg)',

          // Sidebar aliases (same as surface/border)
          sidebar:           'var(--c-surface)',
          'sidebar-surface': 'var(--c-elevated)',
          'sidebar-border':  'var(--c-border)',
          chat:              'var(--c-surface)',

          // Compat alias
          gold:         'var(--c-violet)',
          'gold-light': 'var(--c-violet-bg)',

          // Semantic colors — kept as fixed values (no dark mode needed)
          rose:         '#E11D48',
          'rose-light': '#FFF1F2',
          teal:         '#0D9488',
          'teal-light': '#F0FDFA',
          amber:        '#D97706',
          'amber-light':'#FFFBEB',
          blue:         '#3B82F6',
          'blue-light': '#EFF6FF',
          green:        '#10B981',
          'green-light':'#ECFDF5',
        },
        priority: {
          critical: '#EF4444',
          high:     '#EF4444',
          medium:   '#F59E0B',
          low:      '#10B981',
          someday:  '#9CA3AF',
        },
      },
      fontFamily: {
        sans:   ['var(--font-inter)', 'system-ui', 'sans-serif'],
        script: ['var(--font-script)', 'cursive'],
        mono:   ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        lg:    '10px',
        xl:    '14px',
        '2xl': '18px',
      },
      boxShadow: {
        card:  '0 1px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
        hover: '0 4px 16px rgba(0,0,0,0.08)',
        pop:   '0 8px 32px rgba(0,0,0,0.12)',
      },
      animation: {
        'fade-in':  'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                               to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
