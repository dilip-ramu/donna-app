// ─── Dashboard Layout Configuration ─────────────────────────────────────────

export const BREAKPOINTS = {
  sm:  640,
  md:  768,
  lg:  1024,
  xl:  1280,
  '2xl': 1536,
} as const

// Grid: how many columns at each breakpoint
export const GRID_COLS = {
  sm:  1,
  md:  2,
  lg:  3,
  xl:  3,
} as const

// Minimum card width before wrapping (used in auto-fit/minmax)
export const CARD_MIN_WIDTH = 280 // px

// Sidebar widths
export const SIDEBAR = {
  expanded:  200, // px
  collapsed: 56,  // icon-only
  hidden:    0,
} as const

// Card proportions — how height is split between stacked cards in a column
// e.g. [0.55, 0.45] means top card gets 55%, bottom gets 45%
export const COLUMN_SPLIT = [0.55, 0.45] as const
