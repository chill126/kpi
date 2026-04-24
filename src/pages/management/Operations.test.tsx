import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  const mql = {
    matches: false, media: '', onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockReturnValue(mql) })
})

afterEach(() => { vi.unstubAllGlobals() })

vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Line: () => null, Bar: () => null, XAxis: () => null, YAxis: () => null,
  CartesianGrid: () => null, Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => null,
}))

vi.mock('@/hooks/useBoardSessions', () => ({ useBoardSessions: vi.fn() }))
vi.mock('@/hooks/useK2BoardToday', () => ({ useK2BoardToday: vi.fn() }))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: vi.fn() }))
vi.mock('@/hooks/useSiteAssessments', () => ({ useSiteAssessments: vi.fn() }))
vi.mock('@/hooks/useStudies', () => ({ useStudies: vi.fn() }))
vi.mock('@/hooks/useInvestigators', () => ({ useInvestigators: vi.fn() }))

import { useBoardSessions } from '@/hooks/useBoardSessions'
import { useK2BoardToday } from '@/hooks/useK2BoardToday'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import { Operations } from './Operations'
import type { BoardSession, Visit, Assessment, Study, Investigator } from '@/types'

const mockUseBoardSessions = vi.mocked(useBoardSessions)
const mockUseK2BoardToday = vi.mocked(useK2BoardToday)

beforeEach(() => {
  vi.mocked(useSiteVisits).mockReturnValue({ visits: [], loading: false, error: null })
  vi.mocked(useSiteAssessments).mockReturnValue({ assessments: [], loading: false, error: null })
  vi.mocked(useStudies).mockReturnValue({ studies: [], loading: false, error: null })
  vi.mocked(useInvestigators).mockReturnValue({ investigators: [], loading: false, error: null })
})

const emptyHistory = { sessions: [], loading: false, error: null, circuitOpen: false }
const emptyBoard = { entries: [], loading: false, error: null, circuitOpen: false, snapshotCount: 0 }

function makeSession(overrides: Partial<BoardSession> = {}): BoardSession {
  return {
    id: 'session-1',
    siteId: 'site-1',
    sessionDate: '2026-04-22',
    importedAt: '2026-04-22T12:00:00Z',
    importedBy: 'user-1',
    entryCount: 5,
    metrics: {
      totalScheduled: 10,
      arrivals: 8,
      completedVisits: 7,
      noShows: 2,
      avgVisitDurationMin: 90,
      byStudy: { 'Study A': { scheduled: 10, arrivals: 8, noShows: 2, avgDurationMin: 90 } },
      byInvestigator: { Wilson: { visits: 8 } },
    },
    entries: [],
    ...overrides,
  }
}

describe('Operations', () => {
  it('shows page heading', () => {
    mockUseBoardSessions.mockReturnValue(emptyHistory)
    mockUseK2BoardToday.mockReturnValue(emptyBoard)
    render(<Operations />)
    expect(screen.getByRole('heading', { name: /operations/i })).toBeInTheDocument()
  })

  it('shows empty state when no sessions imported', () => {
    mockUseBoardSessions.mockReturnValue(emptyHistory)
    mockUseK2BoardToday.mockReturnValue(emptyBoard)
    render(<Operations />)
    expect(screen.getByText(/No sessions imported/i)).toBeInTheDocument()
  })

  it('shows summary tiles when sessions exist', () => {
    mockUseBoardSessions.mockReturnValue({ sessions: [makeSession()], loading: false, error: null, circuitOpen: false })
    mockUseK2BoardToday.mockReturnValue(emptyBoard)
    render(<Operations />)
    expect(screen.getByText('Total Sessions')).toBeInTheDocument()
    expect(screen.getByText(/Avg No-Show Rate/i)).toBeInTheDocument()
    expect(screen.getByText('Avg Visit Duration')).toBeInTheDocument()
  })

  it('shows session log table with formatted date', () => {
    mockUseBoardSessions.mockReturnValue({ sessions: [makeSession({ sessionDate: '2026-04-22' })], loading: false, error: null, circuitOpen: false })
    mockUseK2BoardToday.mockReturnValue(emptyBoard)
    render(<Operations />)
    expect(screen.getByText('Apr 22')).toBeInTheDocument()
  })

  it('shows sessions error state', () => {
    mockUseBoardSessions.mockReturnValue({ sessions: [], loading: false, error: new Error('permission denied'), circuitOpen: false })
    mockUseK2BoardToday.mockReturnValue(emptyBoard)
    render(<Operations />)
    expect(screen.getByText(/permission denied/i)).toBeInTheDocument()
  })

  it('shows live empty state when no board entries', () => {
    mockUseBoardSessions.mockReturnValue(emptyHistory)
    mockUseK2BoardToday.mockReturnValue(emptyBoard)
    render(<Operations />)
    expect(screen.getByText(/No participants yet today/i)).toBeInTheDocument()
  })

  it('shows circuit breaker warning when board circuit is open', () => {
    mockUseBoardSessions.mockReturnValue(emptyHistory)
    mockUseK2BoardToday.mockReturnValue({ ...emptyBoard, circuitOpen: true })
    render(<Operations />)
    expect(screen.getByText(/Live subscription paused/i)).toBeInTheDocument()
  })

  it('shows live board error state', () => {
    mockUseBoardSessions.mockReturnValue(emptyHistory)
    mockUseK2BoardToday.mockReturnValue({ ...emptyBoard, error: new Error('k2 auth failed') })
    render(<Operations />)
    expect(screen.getByText(/k2 auth failed/i)).toBeInTheDocument()
  })
})

describe("Operations — Today's Data Entry section", () => {
  const _d = new Date()
  const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`

  const mockStudy: Study = {
    id: 'study-1', name: 'Study Alpha', sponsor: 'P', sponsorProtocolId: '', therapeuticArea: '',
    phase: 'Phase II', status: 'enrolling', siteId: 'site-1', piId: 'inv-1',
    assignedInvestigators: [], targetEnrollment: 10, startDate: '', expectedEndDate: '',
    visitSchedule: [], assessmentBattery: {},
    adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
    parsedFromProtocol: false,
    enrollmentData: { prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0 },
    statusHistory: [],
  }

  const mockInvestigator: Investigator = {
    id: 'inv-1', name: 'Dr. Wilson', credentials: 'MD', role: 'PI',
    siteId: 'site-1', weeklyCapacityHours: 40, siteBaselinePct: 15, assignedStudies: [],
  }

  const todayVisit: Visit = {
    id: 'v-today', participantId: 'P001', studyId: 'study-1', investigatorId: 'inv-1',
    siteId: 'site-1', visitType: 'Screening', scheduledDate: today, completedDate: today,
    status: 'completed', durationMinutes: 60, actualDurationMinutes: null, source: 'manual',
  }

  const todayAssessment: Assessment = {
    id: 'a-today', investigatorId: 'inv-1', studyId: 'study-1', siteId: 'site-1',
    visitId: null, scaleType: 'HDRS', durationMinutes: 30, date: today,
  }

  it("renders Today's Data Entry section header", () => {
    mockUseBoardSessions.mockReturnValue(emptyHistory)
    mockUseK2BoardToday.mockReturnValue(emptyBoard)
    render(<Operations />)
    expect(screen.getByText(/today.s data entry/i)).toBeInTheDocument()
  })

  it('shows empty state when no entries today', () => {
    mockUseBoardSessions.mockReturnValue(emptyHistory)
    mockUseK2BoardToday.mockReturnValue(emptyBoard)
    render(<Operations />)
    expect(screen.getByText(/no entries logged today/i)).toBeInTheDocument()
  })

  it("shows today's visit in the table", () => {
    mockUseBoardSessions.mockReturnValue(emptyHistory)
    mockUseK2BoardToday.mockReturnValue(emptyBoard)
    vi.mocked(useSiteVisits).mockReturnValue({ visits: [todayVisit], loading: false, error: null })
    vi.mocked(useStudies).mockReturnValue({ studies: [mockStudy], loading: false, error: null })
    vi.mocked(useInvestigators).mockReturnValue({ investigators: [mockInvestigator], loading: false, error: null })
    render(<Operations />)
    expect(screen.getByText('Study Alpha')).toBeInTheDocument()
    expect(screen.getByText('Dr. Wilson')).toBeInTheDocument()
    expect(screen.getByText('Screening')).toBeInTheDocument()
  })

  it("shows today's assessment in the table", () => {
    mockUseBoardSessions.mockReturnValue(emptyHistory)
    mockUseK2BoardToday.mockReturnValue(emptyBoard)
    vi.mocked(useSiteAssessments).mockReturnValue({ assessments: [todayAssessment], loading: false, error: null })
    vi.mocked(useStudies).mockReturnValue({ studies: [mockStudy], loading: false, error: null })
    vi.mocked(useInvestigators).mockReturnValue({ investigators: [mockInvestigator], loading: false, error: null })
    render(<Operations />)
    expect(screen.getByText('HDRS')).toBeInTheDocument()
  })

  it('shows entry count badge in section header', () => {
    mockUseBoardSessions.mockReturnValue(emptyHistory)
    mockUseK2BoardToday.mockReturnValue(emptyBoard)
    vi.mocked(useSiteVisits).mockReturnValue({ visits: [todayVisit], loading: false, error: null })
    vi.mocked(useSiteAssessments).mockReturnValue({ assessments: [todayAssessment], loading: false, error: null })
    render(<Operations />)
    expect(screen.getByText(/2 entries today/i)).toBeInTheDocument()
  })
})
