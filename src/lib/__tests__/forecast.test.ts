import { describe, it, expect } from 'vitest'
import { projectWeekMetrics } from '../capacity'
import type { Visit, Assessment } from '@/types'

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
