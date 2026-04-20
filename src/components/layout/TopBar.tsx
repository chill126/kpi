import { Moon, Sun, ChevronDown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSite } from '@/hooks/useSite'
import { SyncIndicator } from '@/components/shared/SyncIndicator'
import type { SyncStatus } from '@/types'

interface Props {
  syncStatus: SyncStatus
  isDark: boolean
  onToggleDark: () => void
}

export function TopBar({ syncStatus, isDark, onToggleDark }: Props) {
  const { user, role } = useAuth()
  const { siteId } = useSite()

  const siteName = siteId === 'tampa' ? 'Tampa' : siteId

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 rounded-full border border-teal-200 dark:border-teal-800">
          {siteName}
        </span>
        {role === 'management' && (
          <button
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Switch site"
          >
            Switch site <ChevronDown size={12} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <SyncIndicator status={syncStatus} />

        <div className="text-right">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-none">
            {user?.displayName}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-0.5">
            {role}
          </p>
        </div>

        <button
          onClick={onToggleDark}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  )
}
