import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Overview } from '@/pages/management/Overview'

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

vi.mock('@/hooks/useStudies', () => ({ useStudies: vi.fn() }))
vi.mock('@/hooks/useInvestigators', () => ({ useInvestigators: vi.fn() }))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: vi.fn() }))
vi.mock('@/hooks/useSiteAssessments', () => ({ useSiteAssessments: vi.fn() }))
vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => ({ user: { displayName: 'Chris Hill', email: 'chris@example.com', role: 'management' }, role: 'management', loading: false }),
}))

import * as studiesModule from '@/hooks/useStudies'
import * as investigatorsModule from '@/hooks/useInvestigators'
import * as siteVisitsModule from '@/hooks/useSiteVisits'
import * as siteAssessmentsModule from '@/hooks/useSiteAssessments'
import type { Study, Investigator, Visit } from '@/types'

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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(studiesModule.useStudies).mockReturnValue({ studies: [mockStudy], loading: false, error: null })
  vi.mocked(investigatorsModule.useInvestigators).mockReturnValue({ investigators: [mockInvestigator], loading: false, error: null })
  vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits: [mockVisit], loading: false, error: null })
  vi.mocked(siteAssessmentsModule.useSiteAssessments).mockReturnValue({ assessments: [], loading: false, error: null })

  const mql = { matches: true, media: '', onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() } as unknown as MediaQueryList
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockReturnValue(mql) })
})

describe('Overview', () => {
  it('renders good morning greeting', () => {
    render(<Overview />)
    expect(screen.getByText(/good morning/i)).toBeInTheDocument()
  })

  it('renders active studies count card', () => {
    render(<Overview />)
    expect(screen.getAllByText(/studies/i)[0]).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders investigator utilization section', () => {
    render(<Overview />)
    expect(screen.getByText(/investigator utilization/i)).toBeInTheDocument()
  })

  it('renders enrollment summary section', () => {
    render(<Overview />)
    expect(screen.getAllByText(/enrollment/i)[0]).toBeInTheDocument()
  })
})

describe('Overview (HUD)', () => {
  it('renders hero sentence greeting', () => {
    render(<Overview />)
    expect(screen.getByText(/good morning/i)).toBeInTheDocument()
  })
  it('renders all four tiles', () => {
    render(<Overview />)
    expect(screen.getAllByText(/capacity/i)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/studies/i)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/alerts/i)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/enrollment/i)[0]).toBeInTheDocument()
  })
  it('renders Enrollment Progress panel above Investigator Utilization panel', () => {
    render(<Overview />)
    const html = document.body.innerHTML
    const enrollIdx = html.toLowerCase().indexOf('enrollment progress')
    const utilIdx   = html.toLowerCase().indexOf('investigator utilization')
    expect(enrollIdx).toBeGreaterThan(-1)
    expect(utilIdx).toBeGreaterThan(-1)
    expect(enrollIdx).toBeLessThan(utilIdx)
  })
  it('renders Active Participants panel', () => {
    render(<Overview />)
    expect(screen.getByText(/active participants/i)).toBeInTheDocument()
  })
  it('exposes a top-level <h1> for screen readers', () => {
    render(<Overview />)
    expect(screen.getByRole('heading', { level: 1, name: /management overview/i })).toBeInTheDocument()
  })
})
