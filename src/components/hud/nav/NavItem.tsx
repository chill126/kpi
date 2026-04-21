import { NavLink } from 'react-router-dom'

interface Props {
  to: string
  label: string
  icon: React.ReactNode
  count?: number
  end?: boolean
}

export function NavItem({ to, label, icon, count, end = false }: Props) {
  return (
    <NavLink
      to={to}
      end={end}
      className="hud-focus-ring"
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', margin: '1px 6px',
        borderRadius: 10, textDecoration: 'none',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: isActive ? 'rgba(255 255 255 / 0.06)' : 'transparent',
        boxShadow: isActive
          ? 'inset 2px 0 0 var(--accent-primary), 0 0 16px oklch(0.72 0.17 295 / 0.25)'
          : undefined,
        transition: 'background 150ms var(--ease-standard), color 150ms var(--ease-standard)',
      })}
    >
      {({ isActive }) => (
        <>
          <span style={{ display: 'inline-flex', width: 18, height: 18 }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: isActive ? 500 : 400, flex: 1 }}>{label}</span>
          {count !== undefined && count > 0 && (
            <span style={{
              padding: '2px 7px', borderRadius: 9999,
              background: 'oklch(0.72 0.17 13 / 0.18)',
              color: 'var(--signal-alert)',
              fontFamily: 'JetBrains Mono', fontSize: 10.5,
              fontFeatureSettings: '"tnum"',
            }}>{count}</span>
          )}
        </>
      )}
    </NavLink>
  )
}
