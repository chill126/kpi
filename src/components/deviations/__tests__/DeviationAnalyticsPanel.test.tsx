import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DeviationAnalyticsPanel } from '@/components/deviations/DeviationAnalyticsPanel'
import type { ProtocolDeviation } from '@/types'

function makeDeviation(overrides: Partial<ProtocolDeviation> = {}): ProtocolDeviation {
  return {
    id: 'dev-1',
    siteId: 'site-1',
    studyId: 'study-1',
    subjectId: 'K2-001',
    date: '2026-04-01',
    category: 'procedural',
    description: 'Test deviation',
    correctiveAction: '',
    piReviewed: false,
    status: 'open',
    reportedBy: 'Alice',
    createdAt: '2026-04-01T10:00:00Z',
    ...overrides,
  }
}

describe('DeviationAnalyticsPanel', () => {
  it('renders nothing when deviations is empty', () => {
    const { container } = render(<DeviationAnalyticsPanel deviations={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows open count stat card', () => {
    const deviations = [
      makeDeviation({ id: '1', status: 'open' }),
      makeDeviation({ id: '2', status: 'open' }),
      makeDeviation({ id: '3', status: 'closed' }),
    ]
    render(<DeviationAnalyticsPanel deviations={deviations} />)
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Closed')).toBeInTheDocument()
    expect(screen.getByText('PI Reviewed')).toBeInTheDocument()
  })

  it('shows deviations by category heading', () => {
    render(<DeviationAnalyticsPanel deviations={[makeDeviation()]} />)
    expect(screen.getByText(/deviations by category/i)).toBeInTheDocument()
  })
})
