import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusBadge } from '@/components/shared/StatusBadge'

describe('StatusBadge', () => {
  it('renders "Enrolling" for enrolling status', () => {
    render(<StatusBadge status="enrolling" />)
    expect(screen.getByText('Enrolling')).toBeInTheDocument()
  })

  it('renders "Paused" for paused status', () => {
    render(<StatusBadge status="paused" />)
    expect(screen.getByText('Paused')).toBeInTheDocument()
  })

  it('renders "On Hold" for on_hold status', () => {
    render(<StatusBadge status="on_hold" />)
    expect(screen.getByText('On Hold')).toBeInTheDocument()
  })

  it('renders "Completed" for completed status', () => {
    render(<StatusBadge status="completed" />)
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('renders "Maintenance" for maintenance status', () => {
    render(<StatusBadge status="maintenance" />)
    expect(screen.getByText('Maintenance')).toBeInTheDocument()
  })
})
