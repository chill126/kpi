import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VisitLogForm } from '@/components/workload/VisitLogForm'
import type { Investigator, Study } from '@/types'

vi.mock('@/lib/visits', () => ({ createVisit: vi.fn() }))
import * as visitsLib from '@/lib/visits'

const investigator: Investigator = {
  id: 'inv-1', name: 'Dr. Wilson', credentials: 'MD', role: 'PI',
  siteId: 'tampa', weeklyCapacityHours: 40, siteBaselinePct: 15, assignedStudies: [],
}

const study: Study = {
  id: 'study-1', name: 'Study Alpha', sponsor: 'P', sponsorProtocolId: '',
  therapeuticArea: 'Psychiatry', phase: 'Phase II', status: 'enrolling',
  siteId: 'tampa', piId: 'inv-1', assignedInvestigators: [{ investigatorId: 'inv-1', role: 'PI' }],
  targetEnrollment: 20, startDate: '', expectedEndDate: '',
  visitSchedule: [{ visitName: 'Screening', visitWindow: '', investigatorTimeMinutes: 45, coordinatorTimeMinutes: 60, isInvestigatorRequired: true }],
  assessmentBattery: {}, adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
  parsedFromProtocol: false, enrollmentData: { prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0 }, statusHistory: [],
}

describe('VisitLogForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders study, investigator, and visit type selectors', () => {
    render(<VisitLogForm studies={[study]} investigators={[investigator]} siteId="tampa" onSaved={vi.fn()} />)
    expect(screen.getByLabelText(/study/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/investigator/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/participant id/i)).toBeInTheDocument()
  })

  it('shows validation error when participant ID is missing', async () => {
    render(<VisitLogForm studies={[study]} investigators={[investigator]} siteId="tampa" onSaved={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /log visit/i }))
    expect(screen.getByText(/participant id is required/i)).toBeInTheDocument()
  })

  it('calls createVisit and onSaved on valid submit', async () => {
    vi.mocked(visitsLib.createVisit).mockResolvedValue('v-1')
    const onSaved = vi.fn()

    render(<VisitLogForm studies={[study]} investigators={[investigator]} siteId="tampa" onSaved={onSaved} />)

    const studySel = screen.getByLabelText(/study/i)
    await userEvent.selectOptions(studySel, 'study-1')

    const invSel = screen.getByLabelText(/investigator/i)
    await userEvent.selectOptions(invSel, 'inv-1')

    await userEvent.type(screen.getByLabelText(/participant id/i), 'P001')

    await userEvent.click(screen.getByRole('button', { name: /log visit/i }))

    await waitFor(() => {
      expect(visitsLib.createVisit).toHaveBeenCalled()
      expect(onSaved).toHaveBeenCalledTimes(1)
    })
  })
})
