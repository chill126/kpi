import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DeviationsTab } from '@/components/reports/DeviationsTab'
import type { ProtocolDeviation, Study } from '@/types'

vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => null,
}))

vi.mock('@/hooks/useAllProtocolDeviations', () => ({ useAllProtocolDeviations: vi.fn() }))
vi.mock('@/hooks/useStudies', () => ({ useStudies: vi.fn() }))

import * as deviationsHook from '@/hooks/useAllProtocolDeviations'
import * as studiesHook from '@/hooks/useStudies'

function makeDeviation(overrides: Partial<ProtocolDeviation> = {}): ProtocolDeviation {
  return {
    id: 'dev-1',
    studyId: 'study-1',
    siteId: 'site-1',
    subjectId: 'K2-001',
    date: '2026-04-01',
    category: 'procedural',
    description: 'Missed PK window',
    correctiveAction: '',
    piReviewed: false,
    status: 'open',
    reportedBy: 'Manager',
    createdAt: new Date().toISOString(),
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

beforeEach(() => {
  vi.clearAllMocks()
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
  vi.mocked(studiesHook.useStudies).mockReturnValue({
    studies: [makeStudy()],
    loading: false,
    error: null,
  })
})

describe('DeviationsTab', () => {
  it('shows loading state', () => {
    vi.mocked(deviationsHook.useAllProtocolDeviations).mockReturnValue({
      deviations: [],
      loading: true,
      error: null,
    })
    render(<DeviationsTab />)
    const skeletons = document.querySelectorAll('[aria-hidden="true"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders open/pi_reviewed/closed tiles', () => {
    vi.mocked(deviationsHook.useAllProtocolDeviations).mockReturnValue({
      deviations: [
        makeDeviation({ id: 'dev-1', status: 'open' }),
        makeDeviation({ id: 'dev-2', status: 'open' }),
        makeDeviation({ id: 'dev-3', status: 'closed' }),
      ],
      loading: false,
      error: null,
    })
    render(<DeviationsTab />)
    expect(screen.getByRole('group', { name: /open/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /pi reviewed/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /closed/i })).toBeInTheDocument()
  })

  it('renders by-category panel', () => {
    vi.mocked(deviationsHook.useAllProtocolDeviations).mockReturnValue({
      deviations: [makeDeviation({ category: 'procedural' })],
      loading: false,
      error: null,
    })
    render(<DeviationsTab />)
    expect(screen.getByText(/by category/i)).toBeInTheDocument()
  })

  it('renders by-study panel with study name', () => {
    vi.mocked(deviationsHook.useAllProtocolDeviations).mockReturnValue({
      deviations: [makeDeviation({ studyId: 'study-1' })],
      loading: false,
      error: null,
    })
    render(<DeviationsTab />)
    expect(screen.getByText(/by study/i)).toBeInTheDocument()
    // Study Alpha may appear in multiple tables (By Study + Aging), so use getAllByText
    expect(screen.getAllByText('Study Alpha').length).toBeGreaterThan(0)
  })

  it('renders aging panel with open deviation subject', () => {
    vi.mocked(deviationsHook.useAllProtocolDeviations).mockReturnValue({
      deviations: [makeDeviation({ subjectId: 'K2-001', status: 'open' })],
      loading: false,
      error: null,
    })
    render(<DeviationsTab />)
    expect(screen.getByText(/open deviations.*aging/i)).toBeInTheDocument()
    expect(screen.getByText('K2-001')).toBeInTheDocument()
  })

  it('shows empty state when no deviations in aging panel', () => {
    vi.mocked(deviationsHook.useAllProtocolDeviations).mockReturnValue({
      deviations: [],
      loading: false,
      error: null,
    })
    render(<DeviationsTab />)
    expect(screen.getByText(/no open deviations/i)).toBeInTheDocument()
  })
})
