import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SiteSummaryTab } from '@/components/reports/SiteSummaryTab'
import type { Study, ProtocolDeviation, Visit, Assessment } from '@/types'

// --- Mock all hooks ---
vi.mock('@/hooks/useStudies')
vi.mock('@/hooks/useAllProtocolDeviations')
vi.mock('@/hooks/useSiteVisits')
vi.mock('@/hooks/useInvestigators')
vi.mock('@/hooks/useSiteAssessments')
vi.mock('@/hooks/useAllScreenFailures')

// Mock useSite (required by hooks internally; pulled in transitively via vi.mock hoisting)
vi.mock('@/hooks/useSite', () => ({ useSite: () => ({ siteId: 'site-1' }) }))

import { useStudies } from '@/hooks/useStudies'
import { useAllProtocolDeviations } from '@/hooks/useAllProtocolDeviations'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'

// Typed mock helpers
const mockUseStudies = vi.mocked(useStudies)
const mockUseDeviations = vi.mocked(useAllProtocolDeviations)
const mockUseVisits = vi.mocked(useSiteVisits)
const mockUseInvestigators = vi.mocked(useInvestigators)
const mockUseAssessments = vi.mocked(useSiteAssessments)

// --- Minimal factory helpers ---
function makeStudy(overrides: Partial<Study> = {}): Study {
  return {
    id: 'study-1',
    name: 'Alpha Trial',
    sponsor: 'Acme',
    sponsorProtocolId: 'ACM-001',
    therapeuticArea: 'Neurology',
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
    enrollmentData: { prescreens: 5, screens: 5, randomizations: 4, active: 4, completions: 0 },
    statusHistory: [],
    ...overrides,
  }
}

function makeDeviation(overrides: Partial<ProtocolDeviation> = {}): ProtocolDeviation {
  return {
    id: 'dev-1',
    studyId: 'study-1',
    siteId: 'site-1',
    status: 'open',
    category: 'consent',
    date: '2026-03-01',
    subjectId: 'SUBJ-001',
    description: 'Missed consent re-sign',
    correctiveAction: 'Re-consented subject',
    piReviewed: false,
    reportedBy: 'Dr. Smith',
    createdAt: '2026-03-01T10:00:00Z',
    ...overrides,
  }
}

// Default empty-but-loaded return values
function setAllLoaded(studiesOverride: Study[] = []) {
  mockUseStudies.mockReturnValue({ studies: studiesOverride, loading: false, error: null })
  mockUseDeviations.mockReturnValue({ deviations: [], loading: false, error: null })
  mockUseVisits.mockReturnValue({ visits: [] as Visit[], loading: false, error: null })
  mockUseInvestigators.mockReturnValue({ investigators: [], loading: false, error: null })
  mockUseAssessments.mockReturnValue({ assessments: [] as Assessment[], loading: false, error: null })
}

describe('SiteSummaryTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  })

  it('renders loading skeletons while data loads', () => {
    // One hook still loading
    mockUseStudies.mockReturnValue({ studies: [], loading: true, error: null })
    mockUseDeviations.mockReturnValue({ deviations: [], loading: false, error: null })
    mockUseVisits.mockReturnValue({ visits: [], loading: false, error: null })
    mockUseInvestigators.mockReturnValue({ investigators: [], loading: false, error: null })
    mockUseAssessments.mockReturnValue({ assessments: [], loading: false, error: null })

    render(<MemoryRouter><SiteSummaryTab /></MemoryRouter>)

    const skeletons = document.querySelectorAll('[aria-hidden="true"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders Active Studies tile', () => {
    setAllLoaded([makeStudy({ status: 'enrolling' })])
    render(<MemoryRouter><SiteSummaryTab /></MemoryRouter>)

    // Tile renders with aria-label containing the label
    expect(screen.getByRole('group', { name: /active studies/i })).toBeInTheDocument()
  })

  it('renders Enrollment by Study panel with study name in table', () => {
    setAllLoaded([makeStudy({ name: 'Alpha Trial' })])
    render(<MemoryRouter><SiteSummaryTab /></MemoryRouter>)

    expect(screen.getByRole('region', { name: /enrollment by study/i })).toBeInTheDocument()
    expect(screen.getByText('Alpha Trial')).toBeInTheDocument()
  })

  it('shows deviation snapshot panel with empty state when no deviations', () => {
    setAllLoaded()
    render(<MemoryRouter><SiteSummaryTab /></MemoryRouter>)

    expect(screen.getByRole('region', { name: /deviation snapshot/i })).toBeInTheDocument()
    expect(screen.getByText(/no deviations recorded/i)).toBeInTheDocument()
  })

  it('shows deviation chart when deviations exist', () => {
    setAllLoaded()
    mockUseDeviations.mockReturnValue({
      deviations: [
        makeDeviation({ category: 'consent', status: 'open' }),
        makeDeviation({ id: 'dev-2', category: 'consent', status: 'closed' }),
        makeDeviation({ id: 'dev-3', category: 'assessment', status: 'pi_reviewed' }),
      ],
      loading: false,
      error: null,
    })

    render(<MemoryRouter><SiteSummaryTab /></MemoryRouter>)

    expect(screen.getByRole('region', { name: /deviation snapshot/i })).toBeInTheDocument()
    // EmptyState should NOT be present
    expect(screen.queryByText(/no deviations recorded/i)).not.toBeInTheDocument()
    // Status summary row should appear (getAllByText handles the Tile label + row span match)
    expect(screen.getAllByText(/open/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/PI Reviewed/i)).toBeInTheDocument()
    expect(screen.getByText(/closed/i)).toBeInTheDocument()
  })
})
