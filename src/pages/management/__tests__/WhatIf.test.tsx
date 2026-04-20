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
vi.mock('@/hooks/useWhatIfScenarios', () => ({ useWhatIfScenarios: () => ({ scenarios: [], loading: false }) }))
vi.mock('@/hooks/useSite', () => ({
  useSite: () => ({ siteId: 'tampa' }),
}))
vi.mock('@/lib/whatif', () => ({
  saveWhatIfScenario: vi.fn().mockResolvedValue('scenario-id'),
  deleteWhatIfScenario: vi.fn().mockResolvedValue(undefined),
}))

import { WhatIf } from '../WhatIf'

describe('WhatIf', () => {
  it('renders page heading', () => {
    render(<MemoryRouter><WhatIf /></MemoryRouter>)
    expect(screen.getByText('What-If Simulator')).toBeInTheDocument()
  })

  it('renders the form', () => {
    render(<MemoryRouter><WhatIf /></MemoryRouter>)
    expect(screen.getByLabelText(/study name/i)).toBeInTheDocument()
  })

  it('renders the output placeholder when no investigators selected', () => {
    render(<MemoryRouter><WhatIf /></MemoryRouter>)
    expect(screen.getByText(/fill in the form/i)).toBeInTheDocument()
  })
})
