import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

interface Props {
  to: string
  icon: LucideIcon
  label: string
}

export function NavItem({ to, icon: Icon, label }: Props) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
          isActive
            ? 'bg-k2-accent/20 text-k2-accent'
            : 'text-slate-400 hover:bg-slate-700 hover:text-white',
        ].join(' ')
      }
    >
      <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  )
}
