import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/hooks/useInvestigators', () => ({
  useInvestigators: () => ({
    investigators: [
      {
        id: 'i1', name: 'Dr. Smith', credentials: 'MD', role: 'PI',
        siteId: 'tampa', weeklyCapacityHours: 8, siteBaselinePct: 0, assignedStudies: [],
      },
    ],
    loading: false,
  }),
}))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: () => ({ visits: [] }) }))
vi.mock('@/hooks/useSiteAssessments', () => ({ useSiteAssessments: () => ({ assessments: [] }) }))
vi.mock('@/hooks/useStudies', () => ({ useStudies: () => ({ studies: [], loading: false }) }))

import { Forecast } from '../Forecast'

describe('Forecast', () => {
  it('renders page heading', () => {
    render(<MemoryRouter><Forecast /></MemoryRouter>)
    expect(screen.getByText('Capacity Forecast')).toBeInTheDocument()
  })

  it('renders investigator name in summary table', () => {
    render(<MemoryRouter><Forecast /></MemoryRouter>)
    expect(screen.getByText(/Dr. Smith/i)).toBeInTheDocument()
  })

  it('shows no-alerts message when all under threshold', () => {
    render(<MemoryRouter><Forecast /></MemoryRouter>)
    expect(screen.getByText(/no projected capacity alerts/i)).toBeInTheDocument()
  })
})
