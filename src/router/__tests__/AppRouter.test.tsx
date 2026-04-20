import { render, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

// Mock all lazy page components so they resolve immediately
vi.mock('@/pages/management/Overview', () => ({ Overview: () => <div>Overview</div> }))
vi.mock('@/pages/management/Investigators', () => ({ Investigators: () => <div>Investigators</div> }))
vi.mock('@/pages/management/Studies', () => ({ Studies: () => <div>Studies</div> }))
vi.mock('@/pages/management/Enrollment', () => ({ Enrollment: () => <div>Enrollment</div> }))
vi.mock('@/pages/management/WorkloadPlanner', () => ({ WorkloadPlanner: () => <div>WorkloadPlanner</div> }))
vi.mock('@/pages/management/Financial', () => ({ Financial: () => <div>Financial</div> }))
vi.mock('@/pages/management/Reports', () => ({ Reports: () => <div>Reports</div> }))
vi.mock('@/pages/management/Import', () => ({ Import: () => <div>Import</div> }))
vi.mock('@/pages/management/Settings', () => ({ Settings: () => <div>Settings</div> }))
vi.mock('@/pages/management/StudyDetail', () => ({ StudyDetail: () => <div>StudyDetail</div> }))
vi.mock('@/pages/staff/MyDashboard', () => ({ MyDashboard: () => <div>MyDashboard</div> }))
vi.mock('@/pages/staff/DataEntry', () => ({ DataEntry: () => <div>DataEntry</div> }))
vi.mock('@/pages/staff/MyStudies', () => ({ MyStudies: () => <div>MyStudies</div> }))
vi.mock('@/pages/staff/MyProfile', () => ({ MyProfile: () => <div>MyProfile</div> }))
vi.mock('@/pages/Login', () => ({ Login: () => <div>Login</div> }))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, loading: false, role: null }),
}))

import { AppRouter } from '../index'

it('renders login route without crashing', async () => {
  render(<AppRouter />)
  await waitFor(() => {
    expect(document.body).toBeTruthy()
  })
})
