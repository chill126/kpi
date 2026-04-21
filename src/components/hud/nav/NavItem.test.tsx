import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { NavItem } from './NavItem'
import { LayoutDashboard } from 'lucide-react'

describe('NavItem', () => {
  it('renders label and link', () => {
    render(
      <MemoryRouter>
        <NavItem to="/overview" label="Overview" icon={<LayoutDashboard size={18} />} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /overview/i })).toHaveAttribute('href', '/overview')
  })
  it('shows count pill when count > 0', () => {
    render(
      <MemoryRouter>
        <NavItem to="/x" label="Alerts" icon={null} count={3} />
      </MemoryRouter>,
    )
    expect(screen.getByText('3')).toBeInTheDocument()
  })
  it('hides count pill at 0', () => {
    render(
      <MemoryRouter>
        <NavItem to="/x" label="Alerts" icon={null} count={0} />
      </MemoryRouter>,
    )
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
  it('marks active with aria-current', () => {
    render(
      <MemoryRouter initialEntries={['/here']}>
        <NavItem to="/here" label="Here" icon={null} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link')).toHaveAttribute('aria-current', 'page')
  })
})
