import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { NavRail } from './NavRail'
import { SiteProvider } from '@/context/SiteContext'

describe('NavRail', () => {
  it('renders management groups and items', () => {
    render(
      <SiteProvider>
        <MemoryRouter>
          <NavRail
            role="management"
            user={{ displayName: 'Chris Hill', email: 'chris@k2.com', role: 'Manager' }}
            onSignOut={vi.fn()}
          />
        </MemoryRouter>
      </SiteProvider>,
    )
    expect(screen.getByText(/operate/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /workload planner/i })).toBeInTheDocument()
  })
  it('renders staff groups and items', () => {
    render(
      <SiteProvider>
        <MemoryRouter>
          <NavRail
            role="staff"
            user={{ displayName: 'Alex Kim', email: 'alex@k2.com', role: 'Coordinator' }}
            onSignOut={vi.fn()}
          />
        </MemoryRouter>
      </SiteProvider>,
    )
    expect(screen.getByRole('link', { name: /my dashboard/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /workload planner/i })).not.toBeInTheDocument()
  })
  it('exposes the user menu trigger with the display name as its accessible name', () => {
    render(
      <SiteProvider>
        <MemoryRouter>
          <NavRail
            role="management"
            user={{ displayName: 'Chris Hill', email: 'chris@k2.com', role: 'Manager' }}
            onSignOut={vi.fn()}
          />
        </MemoryRouter>
      </SiteProvider>,
    )
    expect(screen.getByRole('button', { name: /chris hill/i })).toBeInTheDocument()
  })
})
