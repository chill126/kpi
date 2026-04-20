import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { PrivateRoute } from '@/router/PrivateRoute'
import { RoleRoute } from '@/router/RoleRoute'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import * as useAuthModule from '@/hooks/useAuth'

describe('PrivateRoute', () => {
  it('renders children when user is authenticated', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { uid: '1', email: 'a@b.com', displayName: 'A', role: 'management', siteId: 'tampa', assignedStudies: [] },
      role: 'management',
      loading: false,
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('redirects to /login when not authenticated', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      role: null,
      loading: false,
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })
})

describe('RoleRoute', () => {
  it('renders children when role matches', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { uid: '1', email: 'a@b.com', displayName: 'A', role: 'management', siteId: 'tampa', assignedStudies: [] },
      role: 'management',
      loading: false,
    })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<RoleRoute allowedRole="management" />}>
            <Route path="/admin" element={<div>Admin Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Admin Page')).toBeInTheDocument()
  })

  it('redirects to / when role does not match', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { uid: '1', email: 'a@b.com', displayName: 'A', role: 'staff', siteId: 'tampa', assignedStudies: [] },
      role: 'staff',
      loading: false,
    })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<RoleRoute allowedRole="management" />}>
            <Route path="/admin" element={<div>Admin Page</div>} />
          </Route>
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.queryByText('Admin Page')).not.toBeInTheDocument()
  })
})
