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
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
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
    expect(screen.getAllByText('Dr. Wilson').length).toBeGreaterThan(0)
  })

  it('shows utilization percentage', () => {
    render(<Investigators />)
    expect(screen.getByText(/0%/)).toBeInTheDocument()
  })

  it('shows detail panel for the selected investigator', async () => {
    render(<Investigators />)
    // first investigator is auto-selected; detail renders immediately
    // click list button (name appears in both list and panel title — target first)
    await userEvent.click(screen.getAllByText('Dr. Wilson')[0])
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })
})
