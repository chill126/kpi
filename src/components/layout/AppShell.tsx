import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import type { SyncStatus } from '@/types'

interface Props {
  syncStatus?: SyncStatus
}

export function AppShell({ syncStatus = 'synced' }: Props) {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('k2-theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('k2-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          syncStatus={syncStatus}
          isDark={isDark}
          onToggleDark={() => setIsDark((d) => !d)}
        />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
