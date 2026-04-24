import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { LogOut, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Props {
  displayName: string
  role: string
  email: string
  onSignOut: () => void | Promise<void>
  onSettings?: () => void
}

export function UserChip({ displayName, role, email, onSignOut }: Props) {
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('')

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`${displayName}, ${role} — open account menu`}
          className="hud-focus-ring"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '8px 10px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            borderRadius: 10, color: 'var(--text-primary)',
            textAlign: 'left',
          }}
        >
          <span style={{
            width: 40, height: 40, borderRadius: 9999,
            display: 'grid', placeItems: 'center', flexShrink: 0,
            background: 'linear-gradient(135deg, oklch(0.72 0.17 295), oklch(0.80 0.12 220))',
            color: 'white', fontFamily: 'Geist, Inter, system-ui',
            fontSize: 14, fontWeight: 500,
          }}>{initials || '?'}</span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
            <span style={{
              fontSize: 13, color: 'var(--text-primary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{displayName}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{role}</span>
          </span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          side="top"
          sideOffset={8}
          style={{
            minWidth: 220,
            padding: 6,
            zIndex: 60,
            background: 'oklch(0.13 0.020 275)',
            border: '1px solid rgba(255 255 255 / 0.12)',
            borderRadius: 14,
            boxShadow: '0 12px 40px rgba(0 0 0 / 0.55)',
            color: 'var(--text-primary)',
          }}
        >
          <div style={{
            padding: '10px 12px 12px',
            borderBottom: '1px solid rgba(255 255 255 / 0.06)',
            marginBottom: 4,
          }}>
            <div style={{
              fontSize: 13, color: 'var(--text-primary)', fontWeight: 500,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{displayName}</div>
            {email && (
              <div style={{
                fontSize: 11, color: 'var(--text-muted)', marginTop: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{email}</div>
            )}
          </div>
          <DropdownMenu.Item
            asChild
          >
            <Link
              to="/settings"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                fontSize: 13, color: 'var(--text-primary)',
                cursor: 'pointer', outline: 'none', textDecoration: 'none',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255 255 255 / 0.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <Settings size={16} color="var(--text-secondary)" />
              <span>Settings</span>
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator style={{ height: 1, background: 'rgba(255 255 255 / 0.06)', margin: '4px 0' }} />
          <DropdownMenu.Item
            onSelect={() => { void onSignOut() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8,
              fontSize: 13, color: 'var(--text-primary)',
              cursor: 'pointer', outline: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255 255 255 / 0.06)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            onFocus={(e) => { e.currentTarget.style.background = 'rgba(255 255 255 / 0.06)' }}
            onBlur={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <LogOut size={16} color="var(--signal-alert)" />
            <span>Sign out</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
