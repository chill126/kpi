import type { Visit, Assessment } from '@/types'

export interface WeekMetrics {
  weekStart: string
  visitMinutes: number
  assessmentMinutes: number
  totalMinutes: number
  capacityMinutes: number
  utilizationPct: number
}

/** Returns ISO date (YYYY-MM-DD) of the Monday for the week containing `date`. */
export function getWeekStart(date: Date): string {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  const day = d.getUTCDay() // 0=Sun, 1=Mon … 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

/** Returns ISO date of the Sunday ending the week that starts on `weekStartIso`. */
export function getWeekEnd(weekStartIso: string): string {
  const d = new Date(weekStartIso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 6)
  return d.toISOString().split('T')[0]
}

/** Returns ISO date strings for the Monday of each of the last `numWeeks` weeks, newest first. */
export function recentWeekStarts(numWeeks: number): string[] {
  const now = new Date()
  return Array.from({ length: numWeeks }, (_, i) => {
    const d = new Date(now)
    d.setUTCDate(now.getUTCDate() - i * 7)
    return getWeekStart(d)
  })
}

function inWeek(dateIso: string, weekStartIso: string): boolean {
  return dateIso >= weekStartIso && dateIso <= getWeekEnd(weekStartIso)
}

export function computeWeekMetrics(
  investigatorId: string,
  capacityMinutes: number,
  visits: Visit[],
  assessments: Assessment[],
  weekStartIso: string,
): WeekMetrics {
  const visitMinutes = visits
    .filter(
      (v) =>
        v.investigatorId === investigatorId &&
        v.status === 'completed' &&
        inWeek(v.scheduledDate, weekStartIso),
    )
    .reduce((sum, v) => sum + (v.actualDurationMinutes ?? v.durationMinutes), 0)

  const assessmentMinutes = assessments
    .filter((a) => a.investigatorId === investigatorId && inWeek(a.date, weekStartIso))
    .reduce((sum, a) => sum + a.durationMinutes, 0)

  const totalMinutes = visitMinutes + assessmentMinutes
  const utilizationPct =
    capacityMinutes > 0 ? Math.round((totalMinutes / capacityMinutes) * 100) : 0

  return { weekStart: weekStartIso, visitMinutes, assessmentMinutes, totalMinutes, capacityMinutes, utilizationPct }
}

export function computeWeekHistory(
  investigatorId: string,
  capacityMinutes: number,
  visits: Visit[],
  assessments: Assessment[],
  numWeeks: number,
): WeekMetrics[] {
  return recentWeekStarts(numWeeks).map((weekStart) =>
    computeWeekMetrics(investigatorId, capacityMinutes, visits, assessments, weekStart),
  )
}

export function utilizationColor(pct: number): string {
  if (pct < 75) return 'text-green-600 dark:text-green-400'
  if (pct < 90) return 'text-amber-500 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

export function utilizationBarColor(pct: number): string {
  if (pct < 75) return '#16a34a'
  if (pct < 90) return '#f59e0b'
  return '#dc2626'
}

export function utilizationCellColor(pct: number): string {
  if (pct === 0) return 'bg-slate-50 dark:bg-slate-800/50 text-slate-400'
  if (pct < 75) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
  if (pct < 90) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
  return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
}
