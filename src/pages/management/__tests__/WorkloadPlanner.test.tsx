import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkloadPlanner } from '@/pages/management/WorkloadPlanner'
import type { Investigator } from '@/types'

vi.mock('@/hooks/useInvestigators', () => ({ useInvestigators: vi.fn() }))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: vi.fn() }))
vi.mock('@/hooks/useSiteAssessments', () => ({ useSiteAssessments: vi.fn() }))

import * as investigatorsModule from '@/hooks/useInvestigators'
import * as siteVisitsModule from '@/hooks/useSiteVisits'
import * as siteAssessmentsModule from '@/hooks/useSiteAssessments'

const mockInvestigator: Investigator = {
  id: 'inv-1', name: 'Dr. Wilson', credentials: 'MD', role: 'PI',
  siteId: 'tampa', weeklyCapacityHours: 40, siteBaselinePct: 15, assignedStudies: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(investigatorsModule.useInvestigators).mockReturnValue({ investigators: [mockInvestigator], loading: false, error: null })
  vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits: [], loading: false, error: null })
  vi.mocked(siteAssessmentsModule.useSiteAssessments).mockReturnValue({ assessments: [], loading: false, error: null })
})

describe('WorkloadPlanner', () => {
  it('renders the page heading', () => {
    render(<WorkloadPlanner />)
    expect(screen.getByRole('heading', { name: /capacity planner/i })).toBeInTheDocument()
  })

  it('renders investigator names in the heat map', () => {
    render(<WorkloadPlanner />)
    expect(screen.getByText('Dr. Wilson')).toBeInTheDocument()
  })

  it('renders 13 week columns (10 back + current + 2 ahead)', () => {
    render(<WorkloadPlanner />)
    const cells = screen.getAllByText(/\d{2}-\d{2}/)
    expect(cells.length).toBe(13)
  })

  it('renders dash cells when no visits are scheduled', () => {
    render(<WorkloadPlanner />)
    const emptyCells = screen.getAllByText('—')
    expect(emptyCells.length).toBeGreaterThan(0)
  })
})
