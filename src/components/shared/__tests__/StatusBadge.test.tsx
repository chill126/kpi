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

  it('renders "Open" for open status', () => {
    render(<StatusBadge status="open" />)
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('renders "Completed" for completed status', () => {
    render(<StatusBadge status="completed" />)
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('renders "Pending" for pending status', () => {
    render(<StatusBadge status="pending" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders "Unknown" when status is undefined (bad data)', () => {
    render(<StatusBadge status={undefined} />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('renders "Unknown" when status is null (bad data)', () => {
    render(<StatusBadge status={null} />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('renders a humanized label for a string status not in the config', () => {
    render(<StatusBadge status="pending_review" />)
    expect(screen.getByText('Pending Review')).toBeInTheDocument()
  })
})
