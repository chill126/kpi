import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ScreenFailureTable } from '@/components/enrollment/ScreenFailureTable'
import type { ScreenFailure, Study } from '@/types'

const study: Study = {
  id: 'study-1',
  name: 'Study Alpha',
  sponsor: 'Pharma',
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
  enrollmentData: { prescreens: 10, screens: 8, randomizations: 5, active: 5, completions: 0 },
  statusHistory: [],
}

const failure: ScreenFailure = {
  id: 'sf-1',
  studyId: 'study-1',
  siteId: 'tampa',
  date: '2026-04-01',
  source: 'Main Campus',
  reasons: [{ category: 'inclusion_criteria' }, { category: 'lab_values', detail: 'ALT' }],
  notes: 'Test note',
}

describe('ScreenFailureTable', () => {
  it('renders failure rows', () => {
    render(
      <ScreenFailureTable
        failures={[failure]}
        study={study}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByText('2026-04-01')).toBeInTheDocument()
    expect(screen.getByText(/Inclusion Criteria/)).toBeInTheDocument()
    expect(screen.getByText(/Lab Values \(ALT\)/)).toBeInTheDocument()
    expect(screen.getByText('Main Campus')).toBeInTheDocument()
  })

  it('shows failure rate', () => {
    render(
      <ScreenFailureTable
        failures={[failure]}
        study={study}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    // (8 - 5) / 8 = 37.5% → rounded to 38%
    expect(screen.getByText('38%')).toBeInTheDocument()
  })

  it('shows empty state when no failures', () => {
    render(
      <ScreenFailureTable failures={[]} study={study} onEdit={vi.fn()} onDelete={vi.fn()} />,
    )
    expect(screen.getByText(/no screen failures recorded/i)).toBeInTheDocument()
  })

  it('calls onEdit with the failure when Edit clicked', async () => {
    const onEdit = vi.fn()
    render(
      <ScreenFailureTable
        failures={[failure]}
        study={study}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(onEdit).toHaveBeenCalledWith(failure)
  })

  it('calls onDelete with the id when Delete clicked', async () => {
    const onDelete = vi.fn()
    render(
      <ScreenFailureTable
        failures={[failure]}
        study={study}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalledWith('sf-1')
  })
})
