import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MyDashboard } from '@/pages/staff/MyDashboard'
import type { AppUser, DelegationLog, Investigator, Study, Visit } from '@/types'

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('@/hooks/useStudies', () => ({ useStudies: vi.fn() }))
vi.mock('@/hooks/useInvestigators', () => ({ useInvestigators: vi.fn() }))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: vi.fn() }))
vi.mock('@/hooks/useDelegationLog', () => ({ useDelegationLog: vi.fn() }))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

import * as useAuthModule from '@/hooks/useAuth'
import * as useStudiesModule from '@/hooks/useStudies'
import * as useInvestigatorsModule from '@/hooks/useInvestigators'
import * as useSiteVisitsModule from '@/hooks/useSiteVisits'
import * as useDelegationLogModule from '@/hooks/useDelegationLog'

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    uid: 'user-1',
    email: 'staff@k2.com',
    displayName: 'Staff User',
    role: 'staff',
    siteId: 'tampa',
    assignedStudies: ['study-1', 'study-2'],
    ...overrides,
  }
}

function makeStudy(overrides: Partial<Study> = {}): Study {
  return {
    id: 'study-1',
    name: 'Study Alpha',
    sponsor: 'Pharma Co',
    sponsorProtocolId: 'PC-001',
    therapeuticArea: 'Psychiatry',
    phase: 'Phase II',
    status: 'enrolling',
    siteId: 'tampa',
    piId: 'inv-1',
    assignedInvestigators: [],
    targetEnrollment: 20,
    startDate: '2026-01-01',
    expectedEndDate: '2026-12-31',
    visitSchedule: [],
    assessmentBattery: {},
    adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
    parsedFromProtocol: false,
    enrollmentData: { prescreens: 5, screens: 3, randomizations: 2, active: 2, completions: 0 },
    statusHistory: [],
    ...overrides,
  }
}

function makeVisit(overrides: Partial<Visit> = {}): Visit {
  return {
    id: 'v-1',
    participantId: 'P001',
    studyId: 'study-1',
    investigatorId: 'inv-1',
    siteId: 'tampa',
    visitType: 'Screening',
    scheduledDate: '2026-04-25',
    completedDate: null,
    status: 'scheduled',
    durationMinutes: 60,
    actualDurationMinutes: null,
    source: 'manual',
    ...overrides,
  }
}

const mockInvestigator: Investigator = {
  id: 'inv-1',
  name: 'Dr. Smith',
  credentials: 'MD',
  role: 'PI',
  siteId: 'tampa',
  weeklyCapacityHours: 40,
  siteBaselinePct: 20,
  assignedStudies: ['study-1'],
}

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <MyDashboard />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAuthModule.useAuth).mockReturnValue({
    user: makeUser(),
    role: 'staff',
    loading: false,
  })
  vi.mocked(useStudiesModule.useStudies).mockReturnValue({
    studies: [
      makeStudy(),
      makeStudy({ id: 'study-2', name: 'Study Beta', sponsor: 'Biotech Inc' }),
    ],
    loading: false,
    error: null,
  })
  vi.mocked(useInvestigatorsModule.useInvestigators).mockReturnValue({
    investigators: [mockInvestigator],
    loading: false,
    error: null,
  })
  vi.mocked(useSiteVisitsModule.useSiteVisits).mockReturnValue({
    visits: [],
    loading: false,
    error: null,
  })
  vi.mocked(useDelegationLogModule.useDelegationLog).mockReturnValue({
    entries: [] as DelegationLog[],
    loading: false,
    error: null,
  })
})

describe('MyDashboard', () => {
  it('renders the page header', () => {
    renderDashboard()
    expect(screen.getByRole('heading', { name: /my dashboard/i })).toBeInTheDocument()
    expect(
      screen.getByText(/your workload, schedule, and study assignments/i),
    ).toBeInTheDocument()
  })

  it('shows assigned study count in stat card', () => {
    renderDashboard()
    const card = screen.getByRole('button', { name: /assigned studies/i })
    expect(card).toHaveTextContent('2')
  })

  it('shows "No upcoming visits" empty state when no matching visits', () => {
    renderDashboard()
    expect(
      screen.getByText(/no upcoming visits in the next 14 days/i),
    ).toBeInTheDocument()
  })

  it('renders the three tabs', () => {
    renderDashboard()
    expect(screen.getByRole('tab', { name: /upcoming visits/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /delegation authority/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /my studies summary/i })).toBeInTheDocument()
  })

  it('My Studies Summary tab shows study cards', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(screen.getByRole('tab', { name: /my studies summary/i }))
    expect(screen.getByText('Study Alpha')).toBeInTheDocument()
    expect(screen.getByText('Study Beta')).toBeInTheDocument()
    expect(screen.getAllByText(/view details/i)).toHaveLength(2)
  })

  it('lists upcoming visits in the Upcoming Visits tab', () => {
    vi.mocked(useSiteVisitsModule.useSiteVisits).mockReturnValue({
      visits: [makeVisit()],
      loading: false,
      error: null,
    })
    const originalToday = Date.now
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-20T00:00:00Z').getTime())
    renderDashboard()
    expect(screen.getByText('Screening')).toBeInTheDocument()
    expect(screen.getByText('Study Alpha')).toBeInTheDocument()
    Date.now = originalToday
  })
})
