import { useState } from 'react'
import { useSites } from '@/hooks/useSites'
import { useSite } from '@/hooks/useSite'
import { Building2, ChevronDown } from 'lucide-react'
import type { Role } from '@/components/hud/nav/commandRegistry'

interface Props {
  role: Role
}

export function SiteSwitcher({ role }: Props) {
  const { siteId, setActiveSite } = useSite()
  const { sites } = useSites()
  const [open, setOpen] = useState(false)

  const current = sites.find((s) => s.id === siteId)
  const canSwitch = role === 'management' && sites.length > 1

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => canSwitch && setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '8px 10px',
          borderRadius: 8,
          border: 'none',
          background: 'rgba(255 255 255 / 0.04)',
          cursor: canSwitch ? 'pointer' : 'default',
          color: 'var(--text-primary)',
          fontFamily: 'Inter, system-ui',
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        <Building2 size={14} style={{ color: 'var(--text-label)', flexShrink: 0 }} />
        <span
          style={{
            flex: 1,
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {current?.name ?? siteId}
        </span>
        {canSwitch && (
          <ChevronDown size={12} style={{ color: 'var(--text-label)', flexShrink: 0 }} />
        )}
      </button>

      {open && canSwitch && (
        <div
          className="glass"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            borderRadius: 8,
            padding: 4,
            zIndex: 50,
          }}
        >
          {sites.map((site) => (
            <button
              key={site.id}
              type="button"
              onClick={() => {
                setActiveSite(site.id)
                setOpen(false)
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: 'none',
                background:
                  site.id === siteId ? 'rgba(255 255 255 / 0.08)' : 'none',
                color:
                  site.id === siteId ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: 'Inter, system-ui',
                fontSize: 12,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {site.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
