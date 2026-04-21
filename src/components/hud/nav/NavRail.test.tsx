import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { NavRail } from './NavRail'

describe('NavRail', () => {
  it('renders management groups and items', () => {
    render(
      <MemoryRouter>
        <NavRail role="management" user={{ displayName: 'Chris Hill', role: 'Manager' }} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/operate/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /workload planner/i })).toBeInTheDocument()
  })
  it('renders staff groups and items', () => {
    render(
      <MemoryRouter>
        <NavRail role="staff" user={{ displayName: 'Alex Kim', role: 'Coordinator' }} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /my dashboard/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /workload planner/i })).not.toBeInTheDocument()
  })
})
