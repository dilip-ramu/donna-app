'use client'

import { useState, useEffect, useCallback } from 'react'
import { BREAKPOINTS } from '@/lib/dashboard-layout'

type SidebarMode = 'expanded' | 'collapsed' | 'hidden'

interface DashboardLayout {
  sidebarMode: SidebarMode
  setSidebarMode: (mode: SidebarMode) => void
  toggleSidebar: () => void
  isMobile: boolean
}

export function useDashboardLayout(): DashboardLayout {
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('expanded')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function update() {
      const w = window.innerWidth
      if (w < BREAKPOINTS.md) {
        setIsMobile(true)
        setSidebarMode('hidden')
      } else if (w < BREAKPOINTS.lg) {
        setIsMobile(false)
        setSidebarMode('collapsed')
      } else {
        setIsMobile(false)
        setSidebarMode('expanded')
      }
    }

    update()
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarMode(prev => {
      if (prev === 'expanded') return 'collapsed'
      if (prev === 'collapsed') return 'expanded'
      return 'expanded'
    })
  }, [])

  return { sidebarMode, setSidebarMode, toggleSidebar, isMobile }
}
