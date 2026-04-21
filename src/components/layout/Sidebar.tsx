import {
  LayoutDashboard,
  Users,
  BookOpen,
  TrendingUp,
  Calendar,
  DollarSign,
  FileBarChart,
  Upload,
  Settings,
  ClipboardList,
  BookMarked,
  User,
  Activity,
  FlaskConical,
  AlertTriangle,
} from 'lucide-react'
import { NavItem } from './NavItem'
import { useAuth } from '@/hooks/useAuth'

const MANAGEMENT_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/investigators', icon: Users, label: 'Investigators' },
  { to: '/studies', icon: BookOpen, label: 'Studies' },
  { to: '/enrollment', icon: TrendingUp, label: 'Enrollment' },
  { to: '/workload', icon: Calendar, label: 'Workload Planner' },
  { to: '/financial', icon: DollarSign, label: 'Financial' },
  { to: '/reports', icon: FileBarChart, label: 'Reports' },
  { to: '/forecast', icon: Activity, label: 'Forecast' },
  { to: '/what-if', icon: FlaskConical, label: 'What-If' },
  { to: '/deviations', icon: AlertTriangle, label: 'Deviations' },
  { to: '/import', icon: Upload, label: 'Import' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

const STAFF_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'My Dashboard' },
  { to: '/data-entry', icon: ClipboardList, label: 'Data Entry' },
  { to: '/my-studies', icon: BookMarked, label: 'My Studies' },
  { to: '/profile', icon: User, label: 'My Profile' },
]

export function Sidebar() {
  const { role } = useAuth()
  const navItems = role === 'management' ? MANAGEMENT_NAV : STAFF_NAV

  return (
    <aside className="w-60 shrink-0 bg-k2-primary flex flex-col h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-slate-700">
        <span className="text-white font-bold text-lg tracking-tight">K2 Research</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>
    </aside>
  )
}
