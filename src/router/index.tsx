import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PrivateRoute } from './PrivateRoute'
import { RoleRoute } from './RoleRoute'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/shared/PageLoader'

const Login = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })))
const Overview = lazy(() => import('@/pages/management/Overview').then(m => ({ default: m.Overview })))
const Investigators = lazy(() => import('@/pages/management/Investigators').then(m => ({ default: m.Investigators })))
const Studies = lazy(() => import('@/pages/management/Studies').then(m => ({ default: m.Studies })))
const Enrollment = lazy(() => import('@/pages/management/Enrollment').then(m => ({ default: m.Enrollment })))
const WorkloadPlanner = lazy(() => import('@/pages/management/WorkloadPlanner').then(m => ({ default: m.WorkloadPlanner })))
const Financial = lazy(() => import('@/pages/management/Financial').then(m => ({ default: m.Financial })))
const Reports = lazy(() => import('@/pages/management/Reports').then(m => ({ default: m.Reports })))
const Import = lazy(() => import('@/pages/management/Import').then(m => ({ default: m.Import })))
const Settings = lazy(() => import('@/pages/management/Settings').then(m => ({ default: m.Settings })))
const StudyDetail = lazy(() => import('@/pages/management/StudyDetail').then(m => ({ default: m.StudyDetail })))
const MyDashboard = lazy(() => import('@/pages/staff/MyDashboard').then(m => ({ default: m.MyDashboard })))
const DataEntry = lazy(() => import('@/pages/staff/DataEntry').then(m => ({ default: m.DataEntry })))
const MyStudies = lazy(() => import('@/pages/staff/MyStudies').then(m => ({ default: m.MyStudies })))
const MyProfile = lazy(() => import('@/pages/staff/MyProfile').then(m => ({ default: m.MyProfile })))

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
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
                <Route path="/studies/:id" element={<StudyDetail />} />
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
      </Suspense>
    </BrowserRouter>
  )
}
