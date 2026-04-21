import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EnrollmentBurndownChart } from '@/components/enrollment/EnrollmentBurndownChart'
import type { EnrollmentSnapshot, Study } from '@/types'

// Recharts uses ResizeObserver which jsdom doesn't provide
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

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

function snap(date: string, randomizations: number): EnrollmentSnapshot {
  return {
    id: `s-${date}`,
    studyId: 'study-1',
    siteId: 'tampa',
    date,
    prescreens: 0,
    screens: 0,
    randomizations,
    active: randomizations,
    completions: 0,
  }
}

describe('EnrollmentBurndownChart', () => {
  it('renders empty state when no snapshots', () => {
    render(<EnrollmentBurndownChart snapshots={[]} study={study} />)
    expect(screen.getByText(/add snapshots to enable predictions/i)).toBeInTheDocument()
  })

  it('renders stat cards with at least 2 snapshots', () => {
    const snapshots = [snap('2026-01-01', 2), snap('2026-03-01', 8)]
    render(<EnrollmentBurndownChart snapshots={snapshots} study={study} />)
    expect(screen.getByText(/current enrollment/i)).toBeInTheDocument()
    expect(screen.getByText('8 / 20')).toBeInTheDocument()
    // Stat card labels are uppercase text
    expect(screen.getByText('Projected Completion')).toBeInTheDocument()
    expect(screen.getByText('Best Case')).toBeInTheDocument()
    expect(screen.getByText('Worst Case')).toBeInTheDocument()
  })

  it('shows "Insufficient data" with only one snapshot', () => {
    const snapshots = [snap('2026-01-01', 2)]
    render(<EnrollmentBurndownChart snapshots={snapshots} study={study} />)
    const insufficient = screen.getAllByText(/insufficient data/i)
    expect(insufficient.length).toBeGreaterThan(0)
  })
})
