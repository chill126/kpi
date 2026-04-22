import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavRail } from './NavRail'
import { CommandPalette } from './CommandPalette'
import { registerShortcuts } from './keyboardShortcuts'
import type { Role } from './commandRegistry'

interface Props {
  role: Role
  user: { displayName: string; email: string; role: string }
  onSignOut: () => void | Promise<void>
  onAction?: (actionId: string) => void
  children: React.ReactNode
}

export function HudShell({ role, user, onSignOut, onAction, children }: Props) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    return registerShortcuts({
      openPalette: () => setPaletteOpen(true),
      navigate: (to) => nav(to),
      openShortcutHelp: () => { /* wire later if needed */ },
    })
  }, [nav])

  return (
    <>
      <NavRail role={role} user={user} onSignOut={onSignOut} />
      <main
        style={{
          marginLeft: 264, padding: '20px 32px 40px',
          minHeight: '100vh',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="glass hud-focus-ring"
            style={{
              padding: '6px 12px', borderRadius: 9999,
              fontSize: 11.5, color: 'var(--text-secondary)',
              cursor: 'pointer', border: 'none',
              fontFamily: 'Inter, system-ui',
              letterSpacing: '0.04em',
            }}
          >⌘K · Search</button>
        </div>
        {children}
      </main>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        role={role}
        onAction={onAction}
      />
    </>
  )
}
