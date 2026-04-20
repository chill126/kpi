import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BulkVisitLogForm } from '@/components/workload/BulkVisitLogForm'
import type { Investigator, Study } from '@/types'

vi.mock('@/lib/visits', () => ({ createVisitBatch: vi.fn() }))
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
  visitSchedule: [{ visitName: 'Visit 3', visitWindow: '', investigatorTimeMinutes: 30, coordinatorTimeMinutes: 30, isInvestigatorRequired: true }],
  assessmentBattery: {}, adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
  parsedFromProtocol: false, enrollmentData: { prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0 }, statusHistory: [],
}

describe('BulkVisitLogForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders study selector and Add Participant button', () => {
    render(<BulkVisitLogForm studies={[study]} investigators={[investigator]} siteId="tampa" onSaved={vi.fn()} />)
    expect(screen.getByLabelText(/study/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add participant/i })).toBeInTheDocument()
  })

  it('adds a participant row when Add Participant is clicked', async () => {
    render(<BulkVisitLogForm studies={[study]} investigators={[investigator]} siteId="tampa" onSaved={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /add participant/i }))
    expect(screen.getAllByPlaceholderText(/P\d+/i).length).toBeGreaterThan(0)
  })

  it('calls createVisitBatch with all participant rows on submit', async () => {
    vi.mocked(visitsLib.createVisitBatch).mockResolvedValue(undefined)
    const onSaved = vi.fn()

    render(<BulkVisitLogForm studies={[study]} investigators={[investigator]} siteId="tampa" onSaved={onSaved} />)

    await userEvent.selectOptions(screen.getByLabelText(/study/i), 'study-1')
    await userEvent.selectOptions(screen.getByLabelText(/investigator/i), 'inv-1')

    await userEvent.click(screen.getByRole('button', { name: /add participant/i }))
    await userEvent.click(screen.getByRole('button', { name: /add participant/i }))

    const pidInputs = screen.getAllByPlaceholderText(/P\d+/i)
    await userEvent.type(pidInputs[0], 'P001')
    await userEvent.type(pidInputs[1], 'P002')

    await userEvent.click(screen.getByRole('button', { name: /log \d+ visits?/i }))

    await waitFor(() => {
      expect(visitsLib.createVisitBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ participantId: 'P001' }),
          expect.objectContaining({ participantId: 'P002' }),
        ]),
      )
    })
  })
})
