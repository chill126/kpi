import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Financial } from '@/pages/management/Financial'
import type { Study, Visit } from '@/types'

vi.mock('@/hooks/useStudies', () => ({ useStudies: vi.fn() }))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: vi.fn() }))

import * as studiesModule from '@/hooks/useStudies'
import * as siteVisitsModule from '@/hooks/useSiteVisits'

function makeStudy(overrides: Partial<Study> = {}): Study {
  return {
    id: 'study-1', name: 'Study Alpha', sponsor: 'Pharma Co', sponsorProtocolId: 'PC-001',
    therapeuticArea: 'Psychiatry', phase: 'Phase II', status: 'enrolling',
    siteId: 'tampa', piId: 'inv-1', assignedInvestigators: [],
    targetEnrollment: 20, startDate: '2026-01-01', expectedEndDate: '2026-12-31',
    visitSchedule: [], assessmentBattery: {},
    adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
    parsedFromProtocol: false,
    enrollmentData: { prescreens: 5, screens: 3, randomizations: 2, active: 2, completions: 0 },
    statusHistory: [],
    ...overrides,
  }
}

const mockVisit: Visit = {
  id: 'v-1', participantId: 'P001', studyId: 'study-1', investigatorId: 'inv-1', siteId: 'tampa',
  visitType: 'Screening', scheduledDate: '2026-04-14', completedDate: '2026-04-14',
  status: 'completed', durationMinutes: 60, actualDurationMinutes: null, source: 'manual',
}

function setStudies(studies: Study[]) {
  vi.mocked(studiesModule.useStudies).mockReturnValue({ studies, loading: false, error: null })
}

beforeEach(() => {
  vi.clearAllMocks()
  setStudies([makeStudy()])
  vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits: [mockVisit], loading: false, error: null })
})

describe('Financial', () => {
  it('renders the page heading', () => {
    render(<Financial />)
    expect(screen.getByRole('heading', { name: /financial/i })).toBeInTheDocument()
  })

  it('renders Workload and Revenue Forecast tabs', () => {
    render(<Financial />)
    expect(screen.getByRole('tab', { name: /workload/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /revenue forecast/i })).toBeInTheDocument()
  })

  it('renders a card for each study on the Workload tab', () => {
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

  it('shows the "not set" placeholder when contract value is absent', () => {
    render(<Financial />)
    expect(screen.getAllByText(/not set/i).length).toBeGreaterThan(0)
  })

  it('shows the contract value when it is set', () => {
    setStudies([makeStudy({ contract: { totalValue: 150000 } })])
    render(<Financial />)
    expect(screen.getByText(/\$150,000/)).toBeInTheDocument()
  })

  it('shows empty state on Revenue Forecast when no studies have contract data', async () => {
    const user = userEvent.setup()
    render(<Financial />)
    await user.click(screen.getByRole('tab', { name: /revenue forecast/i }))
    expect(screen.getByText(/No contract data available/i)).toBeInTheDocument()
  })

  it('renders Revenue Forecast chart when a study has milestones', async () => {
    setStudies([
      makeStudy({
        contract: {
          milestones: [
            { name: 'Site Initiation', amount: 25000, expectedDate: '2026-05-15', achieved: false },
          ],
        },
      }),
    ])
    const user = userEvent.setup()
    render(<Financial />)
    await user.click(screen.getByRole('tab', { name: /revenue forecast/i }))
    expect(screen.getByText(/Projected Revenue by Month/i)).toBeInTheDocument()
    expect(screen.getByText('Site Initiation')).toBeInTheDocument()
  })
})
