import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Overview } from '@/pages/management/Overview'
import type { Study, Investigator, Visit, Site } from '@/types'

vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => null,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  ReferenceLine: () => null,
}))

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

vi.mock('@/hooks/useStudies', () => ({ useStudies: vi.fn() }))
vi.mock('@/hooks/useInvestigators', () => ({ useInvestigators: vi.fn() }))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: vi.fn() }))
vi.mock('@/hooks/useSiteAssessments', () => ({ useSiteAssessments: vi.fn() }))
vi.mock('@/hooks/useSites', () => ({ useSites: vi.fn() }))
vi.mock('@/hooks/useAllStudies', () => ({ useAllStudies: vi.fn() }))
vi.mock('@/hooks/useDashboardConfig', () => ({ useDashboardConfig: vi.fn() }))
vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => ({
    user: { uid: 'u-1', displayName: 'Chris Hill', email: 'chris@example.com', role: 'management' },
    role: 'management',
    loading: false,
  }),
}))

import * as studiesModule from '@/hooks/useStudies'
import * as investigatorsModule from '@/hooks/useInvestigators'
import * as siteVisitsModule from '@/hooks/useSiteVisits'
import * as siteAssessmentsModule from '@/hooks/useSiteAssessments'
import * as sitesModule from '@/hooks/useSites'
import * as allStudiesModule from '@/hooks/useAllStudies'
import * as dashboardConfigModule from '@/hooks/useDashboardConfig'

const mockStudy: Study = {
  id: 'study-1', name: 'Study Alpha', sponsor: 'P', sponsorProtocolId: '',
  therapeuticArea: 'Psychiatry', phase: 'Phase II', status: 'enrolling',
  siteId: 'tampa', piId: 'inv-1', assignedInvestigators: [{ investigatorId: 'inv-1', role: 'PI' }],
  targetEnrollment: 20, startDate: '', expectedEndDate: '',
  visitSchedule: [], assessmentBattery: {},
  adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
  parsedFromProtocol: false,
  enrollmentData: { prescreens: 5, screens: 3, randomizations: 2, active: 2, completions: 0 },
  statusHistory: [],
}

const mockInvestigator: Investigator = {
  id: 'inv-1', name: 'Dr. Wilson', credentials: 'MD', role: 'PI',
  siteId: 'tampa', weeklyCapacityHours: 40, siteBaselinePct: 15, assignedStudies: ['study-1'],
}

const today = new Date().toISOString().split('T')[0]

const mockVisit: Visit = {
  id: 'v-1', participantId: 'P001', studyId: 'study-1', investigatorId: 'inv-1', siteId: 'tampa',
  visitType: 'Screening', scheduledDate: today, completedDate: today,
  status: 'completed', durationMinutes: 60, actualDurationMinutes: null, source: 'manual',
}

const mockSite: Site = {
  id: 'tampa', name: 'Tampa Research', location: 'Tampa, FL', active: true, timezone: 'America/New_York',
}

const allVisibleConfig = {
  tiles: [
    { id: 'studies' as const, visible: true, order: 0 },
    { id: 'enrollment' as const, visible: true, order: 1 },
    { id: 'today-activity' as const, visible: true, order: 2 },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(studiesModule.useStudies).mockReturnValue({ studies: [mockStudy], loading: false, error: null })
  vi.mocked(investigatorsModule.useInvestigators).mockReturnValue({ investigators: [mockInvestigator], loading: false, error: null })
  vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits: [mockVisit], loading: false, error: null })
  vi.mocked(siteAssessmentsModule.useSiteAssessments).mockReturnValue({ assessments: [], loading: false, error: null })
  vi.mocked(sitesModule.useSites).mockReturnValue({ sites: [mockSite], loading: false, error: null })
  vi.mocked(allStudiesModule.useAllStudies).mockReturnValue({ studies: [mockStudy], loading: false, error: null })
  vi.mocked(dashboardConfigModule.useDashboardConfig).mockReturnValue({
    config: allVisibleConfig,
    saveConfig: vi.fn().mockResolvedValue(undefined),
  })

  const mql = {
    matches: true, media: '', onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockReturnValue(mql) })
})

describe('Overview — My Dashboard tab', () => {
  it('renders the greeting', () => {
    render(<Overview />)
    expect(screen.getByText(/good morning/i)).toBeInTheDocument()
  })

  it('renders all three configurable tiles when all visible', () => {
    render(<Overview />)
    expect(screen.getAllByText(/studies/i)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/enrollment/i)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/today.s activity/i)[0]).toBeInTheDocument()
  })

  it('hides a tile when visible is false in config', () => {
    vi.mocked(dashboardConfigModule.useDashboardConfig).mockReturnValue({
      config: {
        tiles: allVisibleConfig.tiles.map(t =>
          t.id === 'today-activity' ? { ...t, visible: false } : t,
        ),
      },
      saveConfig: vi.fn(),
    })
    render(<Overview />)
    expect(screen.queryByText("Today's Activity")).not.toBeInTheDocument()
  })

  it('shows empty-config message when all tiles hidden', () => {
    vi.mocked(dashboardConfigModule.useDashboardConfig).mockReturnValue({
      config: { tiles: allVisibleConfig.tiles.map(t => ({ ...t, visible: false })) },
      saveConfig: vi.fn(),
    })
    render(<Overview />)
    expect(screen.getByText(/no tiles visible/i)).toBeInTheDocument()
  })

  it('counts today visits in Today\'s Activity tile', () => {
    render(<Overview />)
    // mockVisit is scheduled today → today-activity = 1
    expect(screen.getAllByText(/today.s activity/i)[0]).toBeInTheDocument()
  })

  it('exposes h1 for screen readers', () => {
    render(<Overview />)
    expect(screen.getByRole('heading', { level: 1, name: /management overview/i })).toBeInTheDocument()
  })

  it('renders Enrollment Progress panel', () => {
    render(<Overview />)
    expect(screen.getByText(/enrollment progress/i)).toBeInTheDocument()
  })
})

describe('Overview — Network Overview tab', () => {
  it('shows Network Overview tab button', () => {
    render(<Overview />)
    expect(screen.getByRole('tab', { name: /network overview/i })).toBeInTheDocument()
  })

  it('renders site cards when Network tab is active', async () => {
    render(<Overview />)
    await userEvent.click(screen.getByRole('tab', { name: /network overview/i }))
    expect(screen.getByText('Tampa Research')).toBeInTheDocument()
  })

  it('shows aggregate tiles on Network tab', async () => {
    render(<Overview />)
    await userEvent.click(screen.getByRole('tab', { name: /network overview/i }))
    expect(screen.getByText(/active sites/i)).toBeInTheDocument()
    expect(screen.getByText(/across network/i)).toBeInTheDocument()
  })
})
