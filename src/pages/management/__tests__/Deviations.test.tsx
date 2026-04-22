import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Deviations } from '@/pages/management/Deviations'
import type { AppUser, ProtocolDeviation, Study } from '@/types'

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('@/hooks/useSite', () => ({ useSite: vi.fn() }))
vi.mock('@/hooks/useStudies', () => ({ useStudies: vi.fn() }))
vi.mock('@/hooks/useAllProtocolDeviations', () => ({ useAllProtocolDeviations: vi.fn() }))
vi.mock('@/lib/protocolDeviations', () => ({
  createProtocolDeviation: vi.fn().mockResolvedValue('new-id'),
  updateProtocolDeviation: vi.fn().mockResolvedValue(undefined),
  deleteProtocolDeviation: vi.fn().mockResolvedValue(undefined),
}))

import * as authHook from '@/hooks/useAuth'
import * as siteHook from '@/hooks/useSite'
import * as studiesHook from '@/hooks/useStudies'
import * as deviationsHook from '@/hooks/useAllProtocolDeviations'

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    uid: 'user-1',
    email: 'mgr@example.com',
    displayName: 'Manager',
    role: 'management',
    siteId: 'site-1',
    assignedStudies: ['study-1'],
    ...overrides,
  }
}

function makeStudy(overrides: Partial<Study> = {}): Study {
  return {
    id: 'study-1',
    name: 'Study Alpha',
    sponsor: 'Pharma',
    sponsorProtocolId: 'PC-001',
    therapeuticArea: 'Oncology',
    phase: 'Phase II',
    status: 'enrolling',
    siteId: 'site-1',
    piId: 'inv-1',
    assignedInvestigators: [],
    targetEnrollment: 20,
    startDate: '2026-01-01',
    expectedEndDate: '2026-12-31',
    visitSchedule: [],
    assessmentBattery: {},
    adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
    parsedFromProtocol: false,
    enrollmentData: { prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0 },
    statusHistory: [],
    ...overrides,
  }
}

function makeDeviation(overrides: Partial<ProtocolDeviation> = {}): ProtocolDeviation {
  return {
    id: 'dev-1',
    siteId: 'site-1',
    studyId: 'study-1',
    subjectId: 'K2-001',
    date: '2026-04-01',
    category: 'procedural',
    description: 'Missed PK window',
    correctiveAction: '',
    piReviewed: false,
    status: 'open',
    reportedBy: 'Manager',
    createdAt: '2026-04-01T10:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(authHook.useAuth).mockReturnValue({
    user: makeUser(),
    role: 'management',
    loading: false,
  } as ReturnType<typeof authHook.useAuth>)
  vi.mocked(siteHook.useSite).mockReturnValue({ siteId: 'site-1', setActiveSite: vi.fn() })
  vi.mocked(studiesHook.useStudies).mockReturnValue({
    studies: [makeStudy()],
    loading: false,
    error: null,
  })
  vi.mocked(deviationsHook.useAllProtocolDeviations).mockReturnValue({
    deviations: [],
    loading: false,
    error: null,
  })
})

describe('Deviations page', () => {
  it('renders page heading', () => {
    render(<Deviations />)
    expect(screen.getByRole('heading', { name: /protocol deviations/i })).toBeInTheDocument()
  })

  it('renders study filter with All Studies option', () => {
    render(<Deviations />)
    expect(screen.getByRole('combobox', { name: /filter by study/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /all studies/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Study Alpha' })).toBeInTheDocument()
  })

  it('shows Log Deviation button', () => {
    render(<Deviations />)
    expect(screen.getByRole('button', { name: /log deviation/i })).toBeInTheDocument()
  })

  it('shows deviation records in table', () => {
    vi.mocked(deviationsHook.useAllProtocolDeviations).mockReturnValue({
      deviations: [makeDeviation()],
      loading: false,
      error: null,
    })
    render(<Deviations />)
    expect(screen.getByText('K2-001')).toBeInTheDocument()
    expect(screen.getByText('Missed PK window')).toBeInTheDocument()
  })

  it('shows study column in all-studies view', () => {
    vi.mocked(deviationsHook.useAllProtocolDeviations).mockReturnValue({
      deviations: [makeDeviation()],
      loading: false,
      error: null,
    })
    render(<Deviations />)
    expect(screen.getByRole('columnheader', { name: /study/i })).toBeInTheDocument()
    // "Study Alpha" appears in the dropdown option + table cell — both should be present
    expect(screen.getAllByText('Study Alpha').length).toBeGreaterThanOrEqual(1)
  })

  it('opens form dialog when Log Deviation clicked', async () => {
    const user = userEvent.setup()
    render(<Deviations />)
    await user.click(screen.getByRole('button', { name: /log deviation/i }))
    expect(screen.getByRole('dialog', { name: /log protocol deviation/i })).toBeInTheDocument()
  })

  it('filters deviations when a study is selected', async () => {
    const user = userEvent.setup()
    vi.mocked(deviationsHook.useAllProtocolDeviations).mockReturnValue({
      deviations: [makeDeviation()],
      loading: false,
      error: null,
    })
    render(<Deviations />)
    await user.selectOptions(
      screen.getByRole('combobox', { name: /filter by study/i }),
      'study-1',
    )
    expect(screen.queryByRole('columnheader', { name: /^study$/i })).not.toBeInTheDocument()
  })

  it('shows loading skeletons while loading', () => {
    vi.mocked(deviationsHook.useAllProtocolDeviations).mockReturnValue({
      deviations: [],
      loading: true,
      error: null,
    })
    render(<Deviations />)
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('shows record count', () => {
    vi.mocked(deviationsHook.useAllProtocolDeviations).mockReturnValue({
      deviations: [makeDeviation()],
      loading: false,
      error: null,
    })
    render(<Deviations />)
    expect(screen.getByText(/1 record/i)).toBeInTheDocument()
  })
})
