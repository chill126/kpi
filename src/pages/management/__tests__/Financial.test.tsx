import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Financial } from '@/pages/management/Financial'
import type { Study, Visit } from '@/types'

vi.mock('@/hooks/useStudies', () => ({ useStudies: vi.fn() }))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: vi.fn() }))

import * as studiesModule from '@/hooks/useStudies'
import * as siteVisitsModule from '@/hooks/useSiteVisits'

const mockStudy: Study = {
  id: 'study-1', name: 'Study Alpha', sponsor: 'Pharma Co', sponsorProtocolId: 'PC-001',
  therapeuticArea: 'Psychiatry', phase: 'Phase II', status: 'enrolling',
  siteId: 'tampa', piId: 'inv-1', assignedInvestigators: [],
  targetEnrollment: 20, startDate: '2026-01-01', expectedEndDate: '2026-12-31',
  visitSchedule: [], assessmentBattery: {},
  adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
  parsedFromProtocol: false,
  enrollmentData: { prescreens: 5, screens: 3, randomizations: 2, active: 2, completions: 0 },
  statusHistory: [],
}

const mockVisit: Visit = {
  id: 'v-1', participantId: 'P001', studyId: 'study-1', investigatorId: 'inv-1', siteId: 'tampa',
  visitType: 'Screening', scheduledDate: '2026-04-14', completedDate: '2026-04-14',
  status: 'completed', durationMinutes: 60, actualDurationMinutes: null, source: 'manual',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(studiesModule.useStudies).mockReturnValue({ studies: [mockStudy], loading: false, error: null })
  vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits: [mockVisit], loading: false, error: null })
})

describe('Financial', () => {
  it('renders the page heading', () => {
    render(<Financial />)
    expect(screen.getByRole('heading', { name: /financial/i })).toBeInTheDocument()
  })

  it('renders a card for each study', () => {
    render(<Financial />)
    expect(screen.getByText('Study Alpha')).toBeInTheDocument()
  })

  it('shows total logged hours for a study', () => {
    render(<Financial />)
    expect(screen.getByText(/1\.0h logged/i)).toBeInTheDocument()
  })

  it('shows enrollment progress', () => {
    render(<Financial />)
    expect(screen.getByText(/2 \/ 20/i)).toBeInTheDocument()
  })
})
