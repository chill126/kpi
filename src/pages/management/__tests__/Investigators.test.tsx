import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Investigators } from '@/pages/management/Investigators'

vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/hooks/useInvestigators', () => ({ useInvestigators: vi.fn() }))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: vi.fn() }))
vi.mock('@/hooks/useSiteAssessments', () => ({ useSiteAssessments: vi.fn() }))
vi.mock('@/hooks/useStudies', () => ({ useStudies: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('@/hooks/useSite', () => ({ useSite: vi.fn() }))

import * as investigatorsModule from '@/hooks/useInvestigators'
import * as siteVisitsModule from '@/hooks/useSiteVisits'
import * as siteAssessmentsModule from '@/hooks/useSiteAssessments'
import * as studiesModule from '@/hooks/useStudies'
import * as authHook from '@/hooks/useAuth'
import * as siteHook from '@/hooks/useSite'
import type { Investigator } from '@/types'

const mockInvestigator: Investigator = {
  id: 'inv-1', name: 'Dr. Wilson', credentials: 'MD', role: 'PI',
  siteId: 'tampa', weeklyCapacityHours: 40, siteBaselinePct: 15, assignedStudies: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(investigatorsModule.useInvestigators).mockReturnValue({ investigators: [mockInvestigator], loading: false, error: null })
  vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits: [], loading: false, error: null })
  vi.mocked(siteAssessmentsModule.useSiteAssessments).mockReturnValue({ assessments: [], loading: false, error: null })
  vi.mocked(studiesModule.useStudies).mockReturnValue({ studies: [], loading: false, error: null })
  vi.mocked(authHook.useAuth).mockReturnValue({ user: null, role: 'management', loading: false })
  vi.mocked(siteHook.useSite).mockReturnValue({ siteId: 'tampa', setActiveSite: vi.fn() })
})

describe('Investigators', () => {
  it('renders the page heading', () => {
    render(<Investigators />)
    expect(screen.getByRole('heading', { name: /investigators/i })).toBeInTheDocument()
  })

  it('renders each investigator name', () => {
    render(<Investigators />)
    expect(screen.getByText('Dr. Wilson')).toBeInTheDocument()
  })

  it('shows utilization percentage', () => {
    render(<Investigators />)
    expect(screen.getByText(/0%/)).toBeInTheDocument()
  })

  it('expands detail view when investigator row is clicked', async () => {
    render(<Investigators />)
    await userEvent.click(screen.getByText('Dr. Wilson'))
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })
})
