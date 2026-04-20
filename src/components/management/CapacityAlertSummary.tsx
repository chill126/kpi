import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { projectWeekMetrics, futureWeekStart, getWeekStart } from '@/lib/capacity'
import { FORECAST_CONFIG } from '@/lib/forecast-config'
import type { Investigator, Visit, Assessment } from '@/types'

interface Props {
  investigators: Investigator[]
  visits: Visit[]
  assessments: Assessment[]
}

export function CapacityAlertSummary({ investigators, visits, assessments }: Props) {
  const alerts = useMemo(() => {
    const result: { name: string; pct: number; level: 'warning' | 'critical'; weeksOut: number }[] = []

    for (const inv of investigators) {
      const capacityMinutes = inv.weeklyCapacityHours * 60
      // Check current week (w=0) plus ALERT_LOOKAHEAD_WEEKS future weeks
      for (let w = 0; w <= FORECAST_CONFIG.ALERT_LOOKAHEAD_WEEKS; w++) {
        const weekIso = w === 0 ? getWeekStart(new Date()) : futureWeekStart(w)
        const m = projectWeekMetrics(inv.id, capacityMinutes, weekIso, [], visits, assessments)
        if (m.utilizationPct >= FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT) {
          result.push({ name: inv.name, pct: m.utilizationPct, level: 'critical', weeksOut: w })
          break
        } else if (m.utilizationPct >= FORECAST_CONFIG.WARNING_THRESHOLD_PCT) {
          result.push({ name: inv.name, pct: m.utilizationPct, level: 'warning', weeksOut: w })
          break
        }
      }
    }

    return result
  }, [investigators, visits, assessments])

  if (alerts.length === 0) return null

  const criticalCount = alerts.filter((a) => a.level === 'critical').length
  const warningCount = alerts.filter((a) => a.level === 'warning').length

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-center justify-between gap-4">
      <div className="text-sm text-amber-800 dark:text-amber-300">
        <span className="font-medium">Upcoming capacity: </span>
        {criticalCount > 0 && (
          <span className="text-red-600 dark:text-red-400 font-medium">
            {criticalCount} investigator{criticalCount > 1 ? 's' : ''} projected to exceed 90%
          </span>
        )}
        {criticalCount > 0 && warningCount > 0 && ', '}
        {warningCount > 0 && (
          <span>
            {warningCount} approaching 75%
          </span>
        )}
        {' '}within {FORECAST_CONFIG.ALERT_LOOKAHEAD_WEEKS} weeks.
      </div>
      <Link
        to="/forecast"
        className="text-sm font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap hover:underline"
      >
        View forecast →
      </Link>
    </div>
  )
}
