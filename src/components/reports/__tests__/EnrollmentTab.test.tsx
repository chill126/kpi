import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EnrollmentTab } from '@/components/reports/EnrollmentTab'
import type { Study, ScreenFailure } from '@/types'

vi.mock('@/hooks/useStudies')
vi.mock('@/hooks/useAllScreenFailures')

import * as useStudiesModule from '@/hooks/useStudies'
import * as useAllScreenFailuresModule from '@/hooks/useAllScreenFailures'

const mockUseStudies = vi.mocked(useStudiesModule.useStudies)
const mockUseAllScreenFailures = vi.mocked(useAllScreenFailuresModule.useAllScreenFailures)

function makeStudy(overrides: Partial<Study> = {}): Study {
  return {
    id: 'study-1',
    name: 'Study Alpha',
    sponsor: 'Pharma Co',
    sponsorProtocolId: 'PC-001',
    therapeuticArea: 'Psychiatry',
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
    enrollmentData: { prescreens: 15, screens: 10, randomizations: 6, active: 5, completions: 1 },
    statusHistory: [],
    ...overrides,
  }
}

function makeFailure(overrides: Partial<ScreenFailure> = {}): ScreenFailure {
  return {
    id: 'sf-1',
    studyId: 'study-1',
    siteId: 'site-1',
    date: '2026-04-01',
    reasons: [{ category: 'inclusion_criteria' }],
    ...overrides,
  }
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
  vi.clearAllMocks()
})

describe('EnrollmentTab', () => {
  it('shows loading state', () => {
    mockUseStudies.mockReturnValue({ studies: [], loading: true, error: null })
    mockUseAllScreenFailures.mockReturnValue({ failures: [], loading: false, error: null })

    render(<EnrollmentTab />)

    expect(document.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
  })

  it('shows empty state when no studies', () => {
    mockUseStudies.mockReturnValue({ studies: [], loading: false, error: null })
    mockUseAllScreenFailures.mockReturnValue({ failures: [], loading: false, error: null })

    render(<EnrollmentTab />)

    expect(screen.getByText('No studies')).toBeInTheDocument()
  })

  it('renders enrollment funnel table with study data', () => {
    const study = makeStudy()
    mockUseStudies.mockReturnValue({ studies: [study], loading: false, error: null })
    mockUseAllScreenFailures.mockReturnValue({ failures: [], loading: false, error: null })

    render(<EnrollmentTab />)

    expect(screen.getByText('Study Alpha')).toBeInTheDocument()
  })

  it('shows screen failure reason chart when failures exist', () => {
    const study = makeStudy()
    const failure = makeFailure({ reasons: [{ category: 'inclusion_criteria' }] })
    mockUseStudies.mockReturnValue({ studies: [study], loading: false, error: null })
    mockUseAllScreenFailures.mockReturnValue({ failures: [failure], loading: false, error: null })

    render(<EnrollmentTab />)

    expect(screen.getByText(/screen failure reasons/i)).toBeInTheDocument()
    // Chart renders — EmptyState is not shown
    expect(screen.queryByText('No screen failures recorded')).not.toBeInTheDocument()
  })

  it('computes screen fail rate correctly', () => {
    // 10 screens, 3 failures → 30% screen fail rate; targetEnrollment=10, rands=6 → 60% of target (not 30%)
    const study = makeStudy({
      targetEnrollment: 10,
      enrollmentData: { prescreens: 15, screens: 10, randomizations: 6, active: 5, completions: 1 },
    })
    const failures = [
      makeFailure({ id: 'sf-1' }),
      makeFailure({ id: 'sf-2' }),
      makeFailure({ id: 'sf-3' }),
    ]
    mockUseStudies.mockReturnValue({ studies: [study], loading: false, error: null })
    mockUseAllScreenFailures.mockReturnValue({ failures, loading: false, error: null })

    render(<EnrollmentTab />)

    expect(screen.getByText('30%')).toBeInTheDocument()
  })
})
