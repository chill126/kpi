import { describe, it, expect } from 'vitest'
import {
  getWeekStart,
  getWeekEnd,
  recentWeekStarts,
  computeWeekMetrics,
  computeWeekHistory,
  utilizationColor,
  utilizationCellColor,
} from '@/lib/capacity'
import type { Visit, Assessment } from '@/types'

function makeVisit(overrides: Partial<Omit<Visit, 'id'>> & { id: string }): Visit {
  return {
    participantId: 'P001', studyId: 'study-1', investigatorId: 'inv-1', siteId: 'tampa',
    visitType: 'Screening', scheduledDate: '2026-04-14', completedDate: '2026-04-14',
    status: 'completed', durationMinutes: 60, actualDurationMinutes: null, source: 'manual',
    ...overrides,
  }
}

function makeAssessment(overrides: Partial<Omit<Assessment, 'id'>> & { id: string }): Assessment {
  return {
    investigatorId: 'inv-1', studyId: 'study-1', siteId: 'tampa',
    visitId: null, scaleType: 'HAMD-17', durationMinutes: 20, date: '2026-04-14',
    ...overrides,
  }
}

// 2026-04-13 is a Monday; 2026-04-14 is a Tuesday; 2026-04-19 is a Sunday; 2026-04-20 is a Monday
describe('getWeekStart', () => {
  it('returns the Monday for a Tuesday', () => {
    expect(getWeekStart(new Date('2026-04-14T12:00:00Z'))).toBe('2026-04-13')
  })

  it('returns Monday when given a Monday', () => {
    expect(getWeekStart(new Date('2026-04-13T00:00:00Z'))).toBe('2026-04-13')
  })

  it('returns preceding Monday for a Sunday', () => {
    expect(getWeekStart(new Date('2026-04-19T23:59:59Z'))).toBe('2026-04-13')
  })
})

describe('getWeekEnd', () => {
  it('returns the Sunday for a given Monday', () => {
    expect(getWeekEnd('2026-04-13')).toBe('2026-04-19')
  })
})

describe('recentWeekStarts', () => {
  it('returns the correct number of Monday dates', () => {
    const weeks = recentWeekStarts(12)
    expect(weeks).toHaveLength(12)
  })

  it('every entry is a Monday (UTCDay === 1)', () => {
    recentWeekStarts(8).forEach((w) => {
      expect(new Date(w + 'T00:00:00Z').getUTCDay()).toBe(1)
    })
  })

  it('weeks are ordered newest first', () => {
    const [first, second] = recentWeekStarts(2)
    expect(first >= second).toBe(true)
  })
})

describe('computeWeekMetrics', () => {
  it('sums only completed visits using actualDurationMinutes when present', () => {
    const visits = [
      makeVisit({ id: 'v-1', scheduledDate: '2026-04-14', status: 'completed', durationMinutes: 60, actualDurationMinutes: 45 }),
      makeVisit({ id: 'v-2', scheduledDate: '2026-04-14', status: 'missed', durationMinutes: 30, actualDurationMinutes: null }),
    ]
    const metrics = computeWeekMetrics('inv-1', 2400, visits, [], '2026-04-13')
    expect(metrics.visitMinutes).toBe(45)
    expect(metrics.assessmentMinutes).toBe(0)
    expect(metrics.totalMinutes).toBe(45)
  })

  it('falls back to durationMinutes when actualDurationMinutes is null', () => {
    const visits = [
      makeVisit({ id: 'v-1', scheduledDate: '2026-04-14', status: 'completed', durationMinutes: 60, actualDurationMinutes: null }),
    ]
    const metrics = computeWeekMetrics('inv-1', 2400, visits, [], '2026-04-13')
    expect(metrics.visitMinutes).toBe(60)
  })

  it('sums assessment minutes', () => {
    const assessments = [
      makeAssessment({ id: 'a-1', date: '2026-04-15', durationMinutes: 20 }),
      makeAssessment({ id: 'a-2', date: '2026-04-17', durationMinutes: 30 }),
    ]
    const metrics = computeWeekMetrics('inv-1', 2400, [], assessments, '2026-04-13')
    expect(metrics.assessmentMinutes).toBe(50)
  })

  it('excludes visits outside the week', () => {
    const visits = [
      makeVisit({ id: 'v-1', scheduledDate: '2026-04-06', status: 'completed', durationMinutes: 60, actualDurationMinutes: null }),
    ]
    const metrics = computeWeekMetrics('inv-1', 2400, visits, [], '2026-04-13')
    expect(metrics.visitMinutes).toBe(0)
  })

  it('excludes visits for a different investigator', () => {
    const visits = [
      makeVisit({ id: 'v-1', scheduledDate: '2026-04-14', investigatorId: 'inv-2', status: 'completed', durationMinutes: 60, actualDurationMinutes: null }),
    ]
    const metrics = computeWeekMetrics('inv-1', 2400, visits, [], '2026-04-13')
    expect(metrics.visitMinutes).toBe(0)
  })

  it('computes utilizationPct correctly', () => {
    const visits = [
      makeVisit({ id: 'v-1', scheduledDate: '2026-04-14', status: 'completed', durationMinutes: 120, actualDurationMinutes: null }),
    ]
    // 120 minutes / 2400 minutes capacity = 5%
    const metrics = computeWeekMetrics('inv-1', 2400, visits, [], '2026-04-13')
    expect(metrics.utilizationPct).toBe(5)
  })

  it('returns 0 utilization when capacity is 0', () => {
    const visits = [makeVisit({ id: 'v-1', scheduledDate: '2026-04-14', status: 'completed', durationMinutes: 60, actualDurationMinutes: null })]
    const metrics = computeWeekMetrics('inv-1', 0, visits, [], '2026-04-13')
    expect(metrics.utilizationPct).toBe(0)
  })
})

describe('computeWeekHistory', () => {
  it('returns the correct number of weeks', () => {
    expect(computeWeekHistory('inv-1', 2400, [], [], 12)).toHaveLength(12)
  })
})

describe('utilizationColor', () => {
  it('returns green for < 75%', () => {
    expect(utilizationColor(50)).toContain('green')
  })

  it('returns amber for 75–89%', () => {
    expect(utilizationColor(80)).toContain('amber')
  })

  it('returns red for >= 90%', () => {
    expect(utilizationColor(95)).toContain('red')
  })
})

describe('utilizationCellColor', () => {
  it('returns slate for 0%', () => {
    expect(utilizationCellColor(0)).toContain('slate')
  })
})
