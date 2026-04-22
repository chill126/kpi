import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ContractTab } from '@/components/study-detail/ContractTab'
import type { Study } from '@/types'

vi.mock('@/lib/studies', () => ({
  updateStudy: vi.fn(),
}))

import * as studiesLib from '@/lib/studies'

function makeStudy(overrides: Partial<Study> = {}): Study {
  return {
    id: 'study-1',
    name: 'Study Alpha',
    sponsor: 'Acme',
    sponsorProtocolId: 'ACM-001',
    therapeuticArea: 'Neurology',
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
    enrollmentData: { prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0 },
    statusHistory: [],
    ...overrides,
  }
}

describe('ContractTab', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders summary section with em-dashes when no contract data', () => {
    render(<ContractTab study={makeStudy()} canEdit={false} />)
    expect(screen.getByText('Contract Summary')).toBeInTheDocument()
    // Read-only summary row always visible; with no contract value, it shows —
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('shows contract values when set', () => {
    const study = makeStudy({
      contract: {
        totalValue: 100000,
        paidScreenFails: { ratio: 0.25, maxPaid: 5 },
      },
    })
    render(<ContractTab study={study} canEdit={false} />)
    expect(screen.getAllByText('$100,000').length).toBeGreaterThan(0)
    expect(screen.getByText('0.25')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows Add Milestone button when canEdit=true', () => {
    render(<ContractTab study={makeStudy()} canEdit={true} />)
    expect(screen.getByRole('button', { name: /add milestone/i })).toBeInTheDocument()
  })

  it('hides Add Milestone button when canEdit=false', () => {
    render(<ContractTab study={makeStudy()} canEdit={false} />)
    expect(screen.queryByRole('button', { name: /add milestone/i })).not.toBeInTheDocument()
  })

  it('opens add milestone dialog on button click', async () => {
    render(<ContractTab study={makeStudy()} canEdit={true} />)
    await userEvent.click(screen.getByRole('button', { name: /add milestone/i }))
    // Dialog title appears (form fields rendered)
    expect(screen.getByLabelText(/^Name \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Expected Date/i)).toBeInTheDocument()
  })

  it('saves summary changes via updateStudy with merged contract data', async () => {
    vi.mocked(studiesLib.updateStudy).mockResolvedValue(undefined)
    const study = makeStudy({
      contract: { milestones: [{ name: 'Kickoff', amount: 5000, expectedDate: '2026-02-01', achieved: false }] },
    })
    render(<ContractTab study={study} canEdit={true} />)

    await userEvent.type(screen.getByLabelText(/total contract value/i), '250000')
    await userEvent.type(screen.getByLabelText(/paid screen fail ratio/i), '0.3')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(studiesLib.updateStudy).toHaveBeenCalledWith('study-1', {
        contract: expect.objectContaining({
          totalValue: 250000,
          milestones: study.contract?.milestones,
          paidScreenFails: expect.objectContaining({ ratio: 0.3 }),
        }),
      })
    })
  })

  it('shows milestone rows in table when milestones exist', () => {
    const study = makeStudy({
      contract: {
        milestones: [
          { name: 'Site Initiation', amount: 25000, expectedDate: '2026-03-01', achieved: true, achievedDate: '2026-03-05' },
          { name: 'First Patient In', amount: 10000, expectedDate: '2026-04-01', achieved: false },
        ],
      },
    })
    render(<ContractTab study={study} canEdit={true} />)
    expect(screen.getByText('Site Initiation')).toBeInTheDocument()
    expect(screen.getByText('First Patient In')).toBeInTheDocument()
    expect(screen.getAllByText('$25,000').length).toBeGreaterThan(0)
    expect(screen.getByText(/✓ Achieved/)).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('confirms before deleting milestone', async () => {
    vi.mocked(studiesLib.updateStudy).mockResolvedValue(undefined)
    const study = makeStudy({
      contract: {
        milestones: [
          { name: 'Kickoff', amount: 5000, expectedDate: '2026-02-01', achieved: false },
        ],
      },
    })
    render(<ContractTab study={study} canEdit={true} />)

    await userEvent.click(screen.getByRole('button', { name: /delete kickoff/i }))
    expect(screen.getByText(/Delete Milestone/i)).toBeInTheDocument()
    // Summary section "Save Changes" should not have been triggered; no update yet.
    expect(studiesLib.updateStudy).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => {
      expect(studiesLib.updateStudy).toHaveBeenCalledWith('study-1', {
        contract: expect.objectContaining({ milestones: [] }),
      })
    })
  })
})
