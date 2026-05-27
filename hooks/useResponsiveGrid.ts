'use client'

import { useState, useEffect } from 'react'
import { BREAKPOINTS, GRID_COLS } from '@/lib/dashboard-layout'

type Cols = 1 | 2 | 3

export function useResponsiveGrid(): Cols {
  const [cols, setCols] = useState<Cols>(3)

  useEffect(() => {
    function update() {
      const w = window.innerWidth
      if (w < BREAKPOINTS.md) setCols(GRID_COLS.sm as Cols)
      else if (w < BREAKPOINTS.lg) setCols(GRID_COLS.md as Cols)
      else setCols(GRID_COLS.lg as Cols)
    }

    update()
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])

  return cols
}
