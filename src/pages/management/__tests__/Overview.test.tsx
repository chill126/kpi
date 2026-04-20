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
}))

vi.mock('@/hooks/useStudies', () => ({ useStudies: vi.fn() }))
vi.mock('@/hooks/useInvestigators', () => ({ useInvestigators: vi.fn() }))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: vi.fn() }))
vi.mock('@/hooks/useSiteAssessments', () => ({ useSiteAssessments: vi.fn() }))

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
})

describe('Overview', () => {
  it('renders the page heading', () => {
    render(<Overview />)
    expect(screen.getByRole('heading', { name: /overview/i })).toBeInTheDocument()
  })

  it('renders active studies count card', () => {
    render(<Overview />)
    expect(screen.getByText(/active studies/i)).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders investigator utilization section', () => {
    render(<Overview />)
    expect(screen.getByText(/investigator utilization/i)).toBeInTheDocument()
    expect(screen.getByText('Dr. Wilson')).toBeInTheDocument()
  })

  it('renders enrollment summary section', () => {
    render(<Overview />)
    expect(screen.getByText(/enrollment/i)).toBeInTheDocument()
  })
})
