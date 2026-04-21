import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { RevenueForecastChart } from '@/components/financial/RevenueForecastChart'
import type { Study } from '@/types'

function makeStudy(overrides: Partial<Study> = {}): Study {
  return {
    id: 'study-1',
    name: 'Study Alpha',
    sponsor: 'Pharma Co',
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
    enrollmentData: { prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0 },
    statusHistory: [],
    ...overrides,
  }
}

describe('RevenueForecastChart', () => {
  it('renders empty state when no studies have contract data', () => {
    const studies = [makeStudy()]
    render(<RevenueForecastChart studies={studies} startDate="2026-04-01" endDate="2026-10-01" />)
    expect(screen.getByText(/No contract data available/i)).toBeInTheDocument()
  })

  it('renders chart and milestone rows when a study has milestones in range', () => {
    const studies = [
      makeStudy({
        id: 'study-m',
        name: 'Milestone Study',
        contract: {
          milestones: [
            { name: 'Site Initiation', amount: 25000, expectedDate: '2026-05-15', achieved: false },
            { name: 'First Patient In', amount: 40000, expectedDate: '2026-07-20', achieved: true, achievedDate: '2026-07-18' },
          ],
        },
      }),
    ]
    render(<RevenueForecastChart studies={studies} startDate="2026-04-01" endDate="2026-10-01" />)
    expect(screen.getByText(/Projected Revenue by Month/i)).toBeInTheDocument()
    expect(screen.getByText('Site Initiation')).toBeInTheDocument()
    expect(screen.getByText('First Patient In')).toBeInTheDocument()
    expect(screen.getByText(/Achieved/)).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('includes studies that only have a total contract value', () => {
    const studies = [
      makeStudy({
        id: 'study-v',
        name: 'Total Value Study',
        startDate: '2026-04-01',
        expectedEndDate: '2026-09-30',
        contract: { totalValue: 120000 },
      }),
    ]
    render(<RevenueForecastChart studies={studies} startDate="2026-04-01" endDate="2026-10-01" />)
    expect(screen.getByText(/Projected Revenue by Month/i)).toBeInTheDocument()
    expect(screen.getByText(/No milestones scheduled within this range/i)).toBeInTheDocument()
  })
})
