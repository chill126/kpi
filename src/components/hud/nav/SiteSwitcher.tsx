import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Building2, ChevronDown, Check } from 'lucide-react'
import { useSites } from '@/hooks/useSites'
import { useSite } from '@/hooks/useSite'
import type { Role } from '@/components/hud/nav/commandRegistry'

const MENU_CONTENT_STYLE: React.CSSProperties = {
  minWidth: 220,
  padding: 6,
  zIndex: 60,
  background: 'oklch(0.13 0.020 275)',
  border: '1px solid rgba(255 255 255 / 0.12)',
  borderRadius: 14,
  boxShadow: '0 12px 40px rgba(0 0 0 / 0.55)',
  color: 'var(--text-primary)',
}

interface Props {
  role: Role
}

export function SiteSwitcher({ role }: Props) {
  const { siteId, setActiveSite } = useSite()
  const { sites } = useSites()

  const current = sites.find((s) => s.id === siteId)
  const canSwitch = role === 'management' && sites.length > 1

  const trigger = (
    <button
      type="button"
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '8px 10px', borderRadius: 8, border: 'none',
        background: 'rgba(255 255 255 / 0.04)',
        cursor: canSwitch ? 'pointer' : 'default',
        color: 'var(--text-primary)',
        fontFamily: 'Inter, system-ui', fontSize: 12, fontWeight: 500,
      }}
    >
      <Building2 size={14} style={{ color: 'var(--text-label)', flexShrink: 0 }} />
      <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {current?.name ?? siteId}
      </span>
      {canSwitch && <ChevronDown size={12} style={{ color: 'var(--text-label)', flexShrink: 0 }} />}
    </button>
  )

  if (!canSwitch) return <div>{trigger}</div>

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {trigger}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          side="bottom"
          sideOffset={6}
          style={MENU_CONTENT_STYLE}
        >
          <div style={{
            padding: '6px 10px 8px',
            borderBottom: '1px solid rgba(255 255 255 / 0.06)',
            marginBottom: 4,
            fontSize: 10.5, fontWeight: 500, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--text-label)',
          }}>
            Site Network
          </div>

          {sites.map((site) => (
            <DropdownMenu.Item
              key={site.id}
              onSelect={() => setActiveSite(site.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8,
                fontSize: 13, color: site.id === siteId ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer', outline: 'none',
                background: site.id === siteId ? 'rgba(255 255 255 / 0.06)' : 'transparent',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255 255 255 / 0.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = site.id === siteId ? 'rgba(255 255 255 / 0.06)' : 'transparent' }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {site.name}
              </span>
              {site.id === siteId && <Check size={13} style={{ color: 'var(--signal-good)', flexShrink: 0 }} />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
