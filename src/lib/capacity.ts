import type { Visit, Assessment, Study, Investigator, HypotheticalStudy, SimulationResult, FeasibilityVerdict, InvestigatorSimResult } from '@/types'
import { FORECAST_CONFIG } from './forecast-config'

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
  visitStatuses: Visit['status'][] = ['completed'],
): WeekMetrics {
  const visitMinutes = visits
    .filter(
      (v) =>
        v.investigatorId === investigatorId &&
        visitStatuses.includes(v.status) &&
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

/** Returns ISO date (YYYY-MM-DD) of Monday N weeks from the Monday of the current week. */
export function futureWeekStart(weeksAhead: number): string {
  const now = new Date()
  const thisMonday = new Date(now)
  const day = now.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  thisMonday.setUTCDate(now.getUTCDate() + diff)
  thisMonday.setUTCDate(thisMonday.getUTCDate() + weeksAhead * 7)
  thisMonday.setUTCHours(0, 0, 0, 0)
  return thisMonday.toISOString().split('T')[0]
}

/** Linearly interpolates enrollment ramp between checkpoints. */
function interpolateRamp(ramp: Record<number, number>, weekFromStart: number): number {
  const checkpoints = [1, 2, 4, 8]
  if (weekFromStart <= 1) return ramp[1] ?? 0
  if (weekFromStart >= 8) return ramp[8] ?? 0
  const lower = [...checkpoints].reverse().find((c) => c <= weekFromStart) ?? 1
  const upper = checkpoints.find((c) => c > weekFromStart) ?? 8
  const t = (weekFromStart - lower) / (upper - lower)
  return Math.round((ramp[lower] ?? 0) + t * ((ramp[upper] ?? 0) - (ramp[lower] ?? 0)))
}

/** Projects added weekly minutes from the hypothetical study at a given week offset from study start. */
function hypotheticalWeekMinutes(study: HypotheticalStudy, weekFromStart: number): number {
  if (weekFromStart < 1 || weekFromStart > study.durationWeeks) return 0
  const participants = Math.min(
    interpolateRamp(study.enrollmentRamp, weekFromStart),
    study.targetEnrollment,
  )
  const visitsPerWeek = (study.visitsPerParticipantPerMonth / 4) * participants
  return Math.round(
    visitsPerWeek * (study.avgInvestigatorMinutesPerVisit + study.avgAssessmentMinutesPerVisit),
  )
}

function verdictForPct(pct: number): FeasibilityVerdict {
  if (pct >= FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT) return 'infeasible'
  if (pct >= FORECAST_CONFIG.WARNING_THRESHOLD_PCT) return 'caution'
  return 'feasible'
}

/**
 * Simulates the capacity impact of adding a hypothetical study.
 * Returns per-investigator projected utilization for SIMULATOR_WEEKS weeks.
 */
export function simulateStudyImpact(
  study: HypotheticalStudy,
  investigators: Investigator[],
  existingStudies: Study[],
  visits: Visit[],
  assessments: Assessment[],
): SimulationResult {
  const startDate = new Date(study.startDate + 'T00:00:00Z')
  const byInvestigator: Record<string, InvestigatorSimResult> = {}

  for (const inv of investigators) {
    if (!study.assignedInvestigatorIds.includes(inv.id)) continue

    const capacityMinutes = inv.weeklyCapacityHours * 60
    const weeklyUtilizationPct: number[] = []
    let cautionWeek: number | null = null
    let criticalWeek: number | null = null

    for (let w = 0; w < FORECAST_CONFIG.SIMULATOR_WEEKS; w++) {
      const weekDate = new Date(startDate)
      weekDate.setUTCDate(startDate.getUTCDate() + w * 7)
      const weekIso = getWeekStart(weekDate)

      const baseline = projectWeekMetrics(inv.id, capacityMinutes, weekIso, existingStudies, visits, assessments)
      const addedMinutes = hypotheticalWeekMinutes(study, w + 1)
      const totalMinutes = baseline.totalMinutes + addedMinutes
      const pct = capacityMinutes > 0 ? Math.round((totalMinutes / capacityMinutes) * 100) : 0

      weeklyUtilizationPct.push(pct)

      if (cautionWeek === null && pct >= FORECAST_CONFIG.WARNING_THRESHOLD_PCT) cautionWeek = w + 1
      if (criticalWeek === null && pct >= FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT) criticalWeek = w + 1
    }

    const peakPct = Math.max(...weeklyUtilizationPct)
    const peakWeek = weeklyUtilizationPct.indexOf(peakPct) + 1

    byInvestigator[inv.id] = {
      weeklyUtilizationPct,
      peakWeek,
      peakPct,
      feasibilityVerdict: verdictForPct(peakPct),
      cautionWeek,
      criticalWeek,
    }
  }

  const verdicts = Object.values(byInvestigator).map((r) => r.feasibilityVerdict)
  const overallVerdict: FeasibilityVerdict = verdicts.includes('infeasible')
    ? 'infeasible'
    : verdicts.includes('caution')
    ? 'caution'
    : 'feasible'

  const peakEnrollment = Math.min(
    interpolateRamp(study.enrollmentRamp, 8),
    study.targetEnrollment,
  )
  const estimatedRevenue = Math.round(
    study.estimatedContractValue * (peakEnrollment / Math.max(study.targetEnrollment, 1)),
  )

  return { byInvestigator, estimatedRevenue, overallVerdict }
}

/**
 * Returns WeekMetrics for the given week.
 * - Past/current weeks: actual logged data (delegates to computeWeekMetrics).
 * - Future weeks: rolling average of the last ROLLING_AVERAGE_WEEKS weeks of actual data.
 */
export function projectWeekMetrics(
  investigatorId: string,
  capacityMinutes: number,
  weekStartIso: string,
  _studies: Study[],
  visits: Visit[],
  assessments: Assessment[],
): WeekMetrics {
  const currentWeek = getWeekStart(new Date())

  if (weekStartIso <= currentWeek) {
    return computeWeekMetrics(investigatorId, capacityMinutes, visits, assessments, weekStartIso)
  }

  // Future: rolling average of last ROLLING_AVERAGE_WEEKS weeks
  const pastWeeks = Array.from({ length: FORECAST_CONFIG.ROLLING_AVERAGE_WEEKS }, (_, i) => {
    const d = new Date(currentWeek + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - (i + 1) * 7)
    return d.toISOString().split('T')[0]
  })

  const pastMetrics = pastWeeks.map((w) =>
    computeWeekMetrics(investigatorId, capacityMinutes, visits, assessments, w),
  )
  const avgMinutes =
    pastMetrics.reduce((sum, m) => sum + m.totalMinutes, 0) /
    Math.max(pastMetrics.length, 1)

  const rounded = Math.round(avgMinutes)
  const utilizationPct =
    capacityMinutes > 0 ? Math.round((rounded / capacityMinutes) * 100) : 0

  return {
    weekStart: weekStartIso,
    visitMinutes: rounded,
    assessmentMinutes: 0,
    totalMinutes: rounded,
    capacityMinutes,
    utilizationPct,
  }
}
