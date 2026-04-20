import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { Sidebar } from '@/components/layout/Sidebar'

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))

import * as useAuthModule from '@/hooks/useAuth'

const renderSidebar = (role: 'management' | 'staff') => {
  vi.mocked(useAuthModule.useAuth).mockReturnValue({
    user: { uid: '1', email: 'a@b.com', displayName: 'Test User', role, siteId: 'tampa', assignedStudies: [] },
    role,
    loading: false,
  })
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  )
}

describe('Sidebar', () => {
  it('shows management nav items for management role', () => {
    renderSidebar('management')
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Financial')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('does not show management items for staff role', () => {
    renderSidebar('staff')
    expect(screen.queryByText('Financial')).not.toBeInTheDocument()
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('shows staff nav items for staff role', () => {
    renderSidebar('staff')
    expect(screen.getByText('My Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Data Entry')).toBeInTheDocument()
  })
})
