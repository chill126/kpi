import type { Investigator, Visit, Assessment } from '@/types'
import { projectWeekMetrics, getWeekStart, futureWeekStart } from './capacity'

export interface CapacityForecastWeek {
  /** Short display label — "This week", "W+1", "W+2", … */
  label: string
  /** ISO Monday of the week (YYYY-MM-DD). */
  weekStart: string
  /** Site-wide average projected utilization percent across all investigators. */
  avg: number
  /** Peak investigator projected utilization percent this week. */
  max: number
}

/**
 * Returns the site-wide projected utilization for the next `weekCount` weeks,
 * starting from the current week. Future weeks are projected via the rolling
 * average of recent actuals (delegated to projectWeekMetrics).
 */
export function computeCapacityForecast(
  investigators: Investigator[],
  visits: Visit[],
  assessments: Assessment[],
  weekCount = 4,
): CapacityForecastWeek[] {
  if (weekCount < 1) return []

  const out: CapacityForecastWeek[] = []
  for (let w = 0; w < weekCount; w++) {
    const weekStart = w === 0 ? getWeekStart(new Date()) : futureWeekStart(w)

    if (investigators.length === 0) {
      out.push({ label: w === 0 ? 'This week' : `W+${w}`, weekStart, avg: 0, max: 0 })
      continue
    }

    const pcts = investigators.map((inv) =>
      projectWeekMetrics(
        inv.id,
        inv.weeklyCapacityHours * 60,
        weekStart,
        [],
        visits,
        assessments,
      ).utilizationPct,
    )

    const avg = Math.round(pcts.reduce((sum, p) => sum + p, 0) / pcts.length)
    const max = Math.max(...pcts)

    out.push({
      label: w === 0 ? 'This week' : `W+${w}`,
      weekStart,
      avg,
      max,
    })
  }
  return out
}
