import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VisitQualityTab } from '@/components/reports/VisitQualityTab'
import type { Visit, Study, Investigator } from '@/types'

vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: vi.fn() }))
vi.mock('@/hooks/useStudies', () => ({ useStudies: vi.fn() }))
vi.mock('@/hooks/useInvestigators', () => ({ useInvestigators: vi.fn() }))

import * as siteVisitsModule from '@/hooks/useSiteVisits'
import * as studiesModule from '@/hooks/useStudies'
import * as investigatorsModule from '@/hooks/useInvestigators'

function makeVisit(overrides: Partial<Visit> = {}): Visit {
  return {
    id: 'v-1',
    studyId: 'study-1',
    investigatorId: 'inv-1',
    siteId: 'site-1',
    participantId: 'P001',
    visitType: 'Screening',
    status: 'completed',
    scheduledDate: '2026-04-14',
    completedDate: null,
    durationMinutes: 60,
    actualDurationMinutes: null,
    source: 'manual',
    ...overrides,
  }
}

const mockStudy: Study = {
  id: 'study-1',
  name: 'Study Alpha',
  sponsor: 'Pfizer',
  sponsorProtocolId: 'PFZ-001',
  therapeuticArea: 'Psychiatry',
  phase: 'Phase II',
  status: 'enrolling',
  siteId: 'site-1',
  piId: 'inv-1',
  assignedInvestigators: [{ investigatorId: 'inv-1', role: 'PI' }],
  targetEnrollment: 20,
  startDate: '2026-01-01',
  expectedEndDate: '2027-01-01',
  visitSchedule: [],
  assessmentBattery: {},
  adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
  parsedFromProtocol: false,
  enrollmentData: { prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0 },
  statusHistory: [],
}

const mockInvestigator: Investigator = {
  id: 'inv-1',
  name: 'Dr. Wilson',
  credentials: 'MD',
  role: 'PI',
  siteId: 'site-1',
  weeklyCapacityHours: 40,
  siteBaselinePct: 15,
  assignedStudies: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
  vi.mocked(studiesModule.useStudies).mockReturnValue({ studies: [mockStudy], loading: false, error: null })
  vi.mocked(investigatorsModule.useInvestigators).mockReturnValue({ investigators: [mockInvestigator], loading: false, error: null })
  vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits: [], loading: false, error: null })
})

describe('VisitQualityTab', () => {
  it('shows loading state', () => {
    vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits: [], loading: true, error: null })
    const { container } = render(<VisitQualityTab />)
    // Skeletons are aria-hidden; just verify tiles are absent and skeletons rendered
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy()
    expect(screen.queryByRole('group')).toBeNull()
  })

  it('shows dash tiles when no historical visits', () => {
    vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits: [], loading: false, error: null })
    render(<VisitQualityTab />)
    // All three tiles should show "—"
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(3)
  })

  it('computes completion rate correctly', () => {
    const visits: Visit[] = [
      makeVisit({ id: 'v-1', status: 'completed' }),
      makeVisit({ id: 'v-2', status: 'completed' }),
      makeVisit({ id: 'v-3', status: 'completed' }),
      makeVisit({ id: 'v-4', status: 'completed' }),
      makeVisit({ id: 'v-5', status: 'completed' }),
      makeVisit({ id: 'v-6', status: 'completed' }),
      makeVisit({ id: 'v-7', status: 'completed' }),
      makeVisit({ id: 'v-8', status: 'completed' }),
      makeVisit({ id: 'v-9', status: 'missed' }),
      makeVisit({ id: 'v-10', status: 'missed' }),
    ]
    vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits, loading: false, error: null })
    render(<VisitQualityTab />)
    expect(screen.getAllByText('80%').length).toBeGreaterThanOrEqual(1)
  })

  it('renders by-study panel with study name', () => {
    const visits: Visit[] = [makeVisit({ id: 'v-1', status: 'completed' })]
    vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits, loading: false, error: null })
    render(<VisitQualityTab />)
    expect(screen.getByText('Study Alpha')).toBeInTheDocument()
  })

  it('renders by-investigator panel with investigator name', () => {
    const visits: Visit[] = [makeVisit({ id: 'v-1', status: 'completed' })]
    vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits, loading: false, error: null })
    render(<VisitQualityTab />)
    expect(screen.getByText('Dr. Wilson')).toBeInTheDocument()
  })

  it('shows empty state for duration panel when no actual duration data', () => {
    vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits: [], loading: false, error: null })
    render(<VisitQualityTab />)
    expect(screen.getByText('No actual duration data recorded')).toBeInTheDocument()
  })
})
