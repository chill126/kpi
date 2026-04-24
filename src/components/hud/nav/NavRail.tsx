import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { NavGroup } from './NavGroup'
import { NavItem } from './NavItem'
import { SiteSwitcher } from './SiteSwitcher'
import { UserChip } from './UserChip'
import { managementPages, staffPages, type Role, type CommandItem } from './commandRegistry'

interface Props {
  role: Role
  user: { displayName: string; email: string; role: string }
  onSignOut: () => void | Promise<void>
  onSettings?: () => void
}

const managementGroups: Array<{ label: string; ids: string[] }> = [
  { label: 'Command',  ids: ['overview'] },
  { label: 'Operate',  ids: ['operations', 'workload', 'enrollment', 'deviations'] },
  { label: 'Plan',     ids: ['forecast', 'what-if', 'reports'] },
  { label: 'Catalog',  ids: ['studies', 'staff', 'financial'] },
  { label: 'System',   ids: ['import'] },
]

const staffGroups: Array<{ label: string; ids: string[] }> = [
  { label: 'My Site', ids: ['my-dashboard', 'my-studies'] },
  { label: 'Work',    ids: ['data-entry', 'profile'] },
]

function renderItem(item: CommandItem): React.ReactNode {
  const Icon = item.icon
  return (
    <NavItem
      key={item.id}
      to={item.route ?? '#'}
      label={item.title}
      icon={Icon ? <Icon size={18} /> : null}
      end={item.route === '/'}
    />
  )
}

export function NavRail({ role, user, onSignOut, onSettings }: Props) {
  const pages = role === 'management' ? managementPages : staffPages
  const groups = role === 'management' ? managementGroups : staffGroups
  const byId = new Map(pages.map(p => [p.id, p] as const))

  return (
    <aside
      className="glass"
      style={{
        position: 'fixed', top: 12, bottom: 12, left: 12,
        width: 240, display: 'flex', flexDirection: 'column',
        padding: '14px 0 10px',
      }}
    >
      <div style={{ padding: '0 10px 10px' }}>
        <SiteSwitcher role={role} />
      </div>
      <div className="nav-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        {groups.map(g => (
          <NavGroup key={g.label} label={g.label}>
            {g.ids.map(id => {
              const item = byId.get(id)
              return item ? renderItem(item) : null
            })}
          </NavGroup>
        ))}
      </div>
      <div style={{ borderTop: '1px solid rgba(255 255 255 / 0.06)', padding: '8px 6px 0', display: 'flex', alignItems: 'center', gap: 2 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <UserChip
            displayName={user.displayName}
            email={user.email}
            role={user.role}
            onSignOut={onSignOut}
            onSettings={onSettings}
          />
        </div>
        {role === 'management' && (
          <Link
            to="/settings"
            aria-label="Settings"
            className="hud-focus-ring"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              color: 'var(--text-muted)', textDecoration: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255 255 255 / 0.06)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <Settings size={16} />
          </Link>
        )}
      </div>
    </aside>
  )
}
