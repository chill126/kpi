import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PrivateRoute } from './PrivateRoute'
import { RoleRoute } from './RoleRoute'
import { AppShell } from '@/components/layout/AppShell'
import { Login } from '@/pages/Login'
import { Overview } from '@/pages/management/Overview'
import { Investigators } from '@/pages/management/Investigators'
import { Studies } from '@/pages/management/Studies'
import { Enrollment } from '@/pages/management/Enrollment'
import { WorkloadPlanner } from '@/pages/management/WorkloadPlanner'
import { Financial } from '@/pages/management/Financial'
import { Reports } from '@/pages/management/Reports'
import { Import } from '@/pages/management/Import'
import { Settings } from '@/pages/management/Settings'
import { MyDashboard } from '@/pages/staff/MyDashboard'
import { DataEntry } from '@/pages/staff/DataEntry'
import { MyStudies } from '@/pages/staff/MyStudies'
import { MyProfile } from '@/pages/staff/MyProfile'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<PrivateRoute />}>
          <Route element={<AppShell />}>
            <Route element={<RoleRoute allowedRole="management" />}>
              <Route path="/" element={<Overview />} />
              <Route path="/investigators" element={<Investigators />} />
              <Route path="/studies" element={<Studies />} />
              <Route path="/enrollment" element={<Enrollment />} />
              <Route path="/workload" element={<WorkloadPlanner />} />
              <Route path="/financial" element={<Financial />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/import" element={<Import />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route element={<RoleRoute allowedRole="staff" />}>
              <Route path="/" element={<MyDashboard />} />
              <Route path="/data-entry" element={<DataEntry />} />
              <Route path="/my-studies" element={<MyStudies />} />
              <Route path="/profile" element={<MyProfile />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
