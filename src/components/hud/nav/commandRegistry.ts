import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Gauge, TrendingUp, ShieldAlert, LineChart, Sparkles, FileBarChart,
  FolderKanban, Users, DollarSign, Upload, Settings, Pencil, User, Activity,
} from 'lucide-react'

export type Role = 'management' | 'staff'

export interface CommandItem {
  id: string
  title: string
  keywords: string[]
  icon?: LucideIcon
  route?: string
  action?: string
  roles: Role[]
}

export const managementPages: CommandItem[] = [
  { id: 'overview',      title: 'Overview',           keywords: ['overview','home','dashboard'],                    icon: LayoutDashboard, route: '/',               roles: ['management'] },
  { id: 'workload',      title: 'Workload Planner',   keywords: ['workload','capacity','schedule','heatmap'],       icon: Gauge,           route: '/workload',       roles: ['management'] },
  { id: 'enrollment',    title: 'Enrollment',         keywords: ['enrollment','randomization','screen failures'],   icon: TrendingUp,      route: '/enrollment',     roles: ['management'] },
  { id: 'deviations',    title: 'Deviations',         keywords: ['deviations','pd','compliance','protocol'],        icon: ShieldAlert,     route: '/deviations',     roles: ['management'] },
  { id: 'operations',   title: 'Operations',         keywords: ['board','k2','sessions','no show','visit duration','participants','live'], icon: Activity, route: '/operations', roles: ['management'] },
  { id: 'forecast',      title: 'Forecast',           keywords: ['forecast','projection','capacity forecast'],      icon: LineChart,       route: '/forecast',       roles: ['management'] },
  { id: 'what-if',       title: 'What-If',            keywords: ['what if','simulate','scenario'],                  icon: Sparkles,        route: '/what-if',        roles: ['management'] },
  { id: 'reports',       title: 'Reports',            keywords: ['reports','export','utilization report'],          icon: FileBarChart,    route: '/reports',        roles: ['management'] },
  { id: 'studies',       title: 'Studies',            keywords: ['studies','trials','protocols'],                   icon: FolderKanban,    route: '/studies',        roles: ['management'] },
  { id: 'investigators', title: 'Investigators',      keywords: ['investigators','pi','doctors','staff'],           icon: Users,           route: '/investigators',  roles: ['management'] },
  { id: 'financial',     title: 'Financial',          keywords: ['financial','revenue','milestones','contract'],    icon: DollarSign,      route: '/financial',      roles: ['management'] },
  { id: 'import',        title: 'Import',             keywords: ['import','csv','upload','conductor','advarra'],    icon: Upload,          route: '/import',         roles: ['management'] },
  { id: 'settings',      title: 'Settings',           keywords: ['settings','site','users'],                        icon: Settings,        route: '/settings',       roles: ['management'] },
]

export const staffPages: CommandItem[] = [
  { id: 'my-dashboard', title: 'My Dashboard', keywords: ['home','dashboard','overview'], icon: LayoutDashboard, route: '/',            roles: ['staff'] },
  { id: 'my-studies',   title: 'My Studies',   keywords: ['studies','assigned'],           icon: FolderKanban,    route: '/my-studies',  roles: ['staff'] },
  { id: 'data-entry',   title: 'Data Entry',   keywords: ['data','entry','log','visits'],  icon: Pencil,          route: '/data-entry',  roles: ['staff'] },
  { id: 'profile',      title: 'Profile',      keywords: ['profile','account','me'],       icon: User,            route: '/profile',     roles: ['staff'] },
]

const allActions: CommandItem[] = [
  { id: 'new-study',          title: 'New Study',          keywords: ['new','study','create'],                   action: 'new-study',          roles: ['management'] },
  { id: 'add-investigator',   title: 'Add Investigator',   keywords: ['add','investigator','pi'],                action: 'add-investigator',   roles: ['management'] },
  { id: 'log-visit',          title: 'Log Visit',          keywords: ['log','visit','new visit'],                action: 'log-visit',          roles: ['management','staff'] },
  { id: 'log-assessment',     title: 'Log Assessment',     keywords: ['log','assessment','scale'],               action: 'log-assessment',     roles: ['staff'] },
  { id: 'log-deviation',      title: 'Log Deviation',      keywords: ['log','deviation','pd'],                   action: 'log-deviation',      roles: ['management','staff'] },
  { id: 'import-csv',         title: 'Import CSV',         keywords: ['import','csv','upload','conductor','advarra'], action: 'import-csv',    roles: ['management'] },
  { id: 'invite-user',        title: 'Invite User',        keywords: ['invite','add user'],                      action: 'invite-user',        roles: ['management'] },
  { id: 'go-to-this-week',    title: 'Go to This Week',    keywords: ['week','today','current'],                 action: 'go-to-this-week',    roles: ['management','staff'] },
]

export function actionsForRole(role: Role): CommandItem[] {
  return allActions.filter(a => a.roles.includes(role))
}

export function filterCommands(items: CommandItem[], query: string): CommandItem[] {
  if (!query.trim()) return items
  const q = query.toLowerCase().trim()
  return items.filter(i =>
    i.title.toLowerCase().includes(q) ||
    i.keywords.some(k => k.toLowerCase().includes(q)),
  )
}

const RECENT_KEY = 'k2.recent'
const RECENT_MAX = 5

export function pushRecent(route: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    const prev: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    const next = [route, ...prev.filter(r => r !== route)].slice(0, RECENT_MAX)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch { /* ignore */ }
}

export function readRecent(): string[] {
  if (typeof localStorage === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}
