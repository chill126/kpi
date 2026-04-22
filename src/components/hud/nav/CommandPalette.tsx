import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import {
  type Role, managementPages, staffPages, actionsForRole,
  filterCommands, readRecent, pushRecent,
} from './commandRegistry'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role
  onAction: (actionId: string) => void
}

export function CommandPalette({ open, onOpenChange, role, onAction }: Props) {
  const [query, setQuery] = useState('')
  const [recentIds, setRecentIds] = useState<string[]>(() => readRecent())
  const nav = useNavigate()

  useEffect(() => {
    if (open) setRecentIds(readRecent())
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  const pages = role === 'management' ? managementPages : staffPages
  const actions = actionsForRole(role)

  const pagesFiltered = filterCommands(pages, query)
  const actionsFiltered = filterCommands(actions, query)
  const recentPages = pages.filter(p => recentIds.includes(p.route ?? ''))

  const go = (route: string) => {
    pushRecent(route)
    setRecentIds(readRecent())
    nav(route); onOpenChange(false); setQuery('')
  }
  const act = (actionId: string) => { onAction(actionId); onOpenChange(false); setQuery('') }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-label="Command palette"
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false) }}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(8 7 15 / 0.4)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        paddingTop: '12vh',
      }}
    >
      <Command
        className="glass-strong"
        style={{
          width: 'min(640px, calc(100vw - 32px))', maxHeight: '70vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search or jump to…"
          className="hud-focus-ring"
          style={{
            height: 48, width: '100%',
            background: 'transparent', border: 'none', outline: 'none',
            padding: '0 18px', color: 'var(--text-primary)', fontSize: 14,
            borderBottom: '1px solid rgba(255 255 255 / 0.06)',
          }}
        />
        <Command.List style={{ overflowY: 'auto', padding: 8 }}>
          <Command.Empty style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: 13 }}>
            No matches
          </Command.Empty>

          {recentPages.length > 0 && query === '' && (
            <Command.Group heading="Recent">
              {recentPages.map((p) => (
                <Command.Item key={p.id} onSelect={() => p.route && go(p.route)} value={`recent-${p.id}`}>
                  {p.title}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          <Command.Group heading="Pages">
            {pagesFiltered.map((p) => (
              <Command.Item key={p.id} onSelect={() => p.route && go(p.route)} value={`page-${p.id}`}>
                {p.title}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Actions">
            {actionsFiltered.map((a) => (
              <Command.Item key={a.id} onSelect={() => a.action && act(a.action)} value={`action-${a.id}`}>
                {a.title}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  )
}
