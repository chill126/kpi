import { describe, it, expect } from 'vitest'
import { projectWeekMetrics, simulateStudyImpact } from '../capacity'
import { FORECAST_CONFIG } from '../forecast-config'
import type { Visit, HypotheticalStudy, Investigator } from '@/types'

const CAPACITY_MINUTES = 480 // 8 hours/week

function makeVisit(investigatorId: string, date: string, minutes: number): Visit {
  return {
    id: 'v1',
    participantId: 'p1',
    studyId: 's1',
    investigatorId,
    siteId: 'tampa',
    visitType: 'Week 1',
    scheduledDate: date,
    completedDate: date,
    status: 'completed',
    durationMinutes: minutes,
    actualDurationMinutes: minutes,
    source: 'manual',
  }
}

describe('projectWeekMetrics', () => {
  it('returns actual data for a past week', () => {
    // Use a known past Monday
    const pastWeek = '2020-01-06'
    const visit = makeVisit('inv1', '2020-01-07', 120)
    const result = projectWeekMetrics('inv1', CAPACITY_MINUTES, pastWeek, [], [visit], [])
    expect(result.totalMinutes).toBe(120)
    expect(result.weekStart).toBe(pastWeek)
  })

  it('returns rolling average projection for a future week', () => {
    const visits: Visit[] = []
    const now = new Date()
    for (let i = 1; i <= 4; i++) {
      const d = new Date(now)
      d.setUTCDate(now.getUTCDate() - i * 7 + 1) // Tuesday of that week
      const iso = d.toISOString().split('T')[0]
      visits.push(makeVisit('inv1', iso, 60))
    }

    const futureDate = new Date(now)
    futureDate.setUTCDate(now.getUTCDate() + 14)
    const futureWeek = futureDate.toISOString().split('T')[0]

    const result = projectWeekMetrics('inv1', CAPACITY_MINUTES, futureWeek, [], visits, [])
    expect(result.totalMinutes).toBeGreaterThan(0)
    expect(result.weekStart).toBe(futureWeek)
  })

  it('returns zero utilization for future week with no history', () => {
    const now = new Date()
    const futureDate = new Date(now)
    futureDate.setUTCDate(now.getUTCDate() + 14)
    const futureWeek = futureDate.toISOString().split('T')[0]

    const result = projectWeekMetrics('inv1', CAPACITY_MINUTES, futureWeek, [], [], [])
    expect(result.totalMinutes).toBe(0)
    expect(result.utilizationPct).toBe(0)
  })
})

function makeInvestigator(id: string, capacityHours = 8): Investigator {
  return {
    id,
    name: 'Dr. Test',
    credentials: 'MD',
    role: 'PI',
    siteId: 'tampa',
    weeklyCapacityHours: capacityHours,
    siteBaselinePct: 0,
    assignedStudies: [],
  }
}

function makeHypothetical(overrides: Partial<HypotheticalStudy> = {}): HypotheticalStudy {
  return {
    name: 'Test Study',
    assignedInvestigatorIds: ['inv1'],
    targetEnrollment: 10,
    enrollmentRamp: { 1: 2, 2: 4, 4: 6, 8: 10 },
    avgInvestigatorMinutesPerVisit: 30,
    avgAssessmentMinutesPerVisit: 15,
    visitsPerParticipantPerMonth: 2,
    estimatedContractValue: 100000,
    durationWeeks: 26,
    startDate: new Date().toISOString().split('T')[0],
    ...overrides,
  }
}

describe('simulateStudyImpact', () => {
  it('returns result for each assigned investigator', () => {
    const inv = makeInvestigator('inv1')
    const study = makeHypothetical()
    const result = simulateStudyImpact(study, [inv], [], [], [])
    expect(result.byInvestigator['inv1']).toBeDefined()
  })

  it('returns SIMULATOR_WEEKS utilization entries per investigator', () => {
    const inv = makeInvestigator('inv1')
    const study = makeHypothetical()
    const result = simulateStudyImpact(study, [inv], [], [], [])
    expect(result.byInvestigator['inv1'].weeklyUtilizationPct).toHaveLength(
      FORECAST_CONFIG.SIMULATOR_WEEKS,
    )
  })

  it('returns infeasible verdict when projected utilization exceeds critical threshold', () => {
    const inv = makeInvestigator('inv1', 1) // 1h capacity — will be overwhelmed
    const study = makeHypothetical({ avgInvestigatorMinutesPerVisit: 120 })
    const result = simulateStudyImpact(study, [inv], [], [], [])
    expect(result.overallVerdict).toBe('infeasible')
  })

  it('calculates estimated revenue from contract value and enrollment', () => {
    const inv = makeInvestigator('inv1')
    const study = makeHypothetical({ estimatedContractValue: 100000, targetEnrollment: 10 })
    const result = simulateStudyImpact(study, [inv], [], [], [])
    expect(result.estimatedRevenue).toBeGreaterThanOrEqual(0)
  })

  it('overall verdict is infeasible if any investigator is infeasible', () => {
    const inv = makeInvestigator('inv1', 1) // 1h capacity — will be overwhelmed
    const study = makeHypothetical({ avgInvestigatorMinutesPerVisit: 120 })
    const result = simulateStudyImpact(study, [inv], [], [], [])
    expect(result.overallVerdict).toBe('infeasible')
  })
})
