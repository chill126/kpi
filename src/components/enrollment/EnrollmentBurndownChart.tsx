import { useMemo } from 'react'
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { EnrollmentSnapshot, Study } from '@/types'

interface Props {
  snapshots: EnrollmentSnapshot[]
  study: Study
}

interface ChartPoint {
  date: string
  label: string
  actual: number | null
  target: number
  bestCase: number | null
  worstCase: number | null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

function formatLong(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime()
  const db = new Date(b + 'T00:00:00').getTime()
  return Math.max(0, Math.round((db - da) / 86_400_000))
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

interface Projection {
  projectedCompletion: string | null
  bestCaseCompletion: string | null
  worstCaseCompletion: string | null
  pace: number | null
}

function computeProjection(
  snapshots: EnrollmentSnapshot[],
  target: number,
): Projection {
  if (snapshots.length < 2) {
    return {
      projectedCompletion: null,
      bestCaseCompletion: null,
      worstCaseCompletion: null,
      pace: null,
    }
  }
  const earliest = snapshots[0]
  const latest = snapshots[snapshots.length - 1]
  const days = daysBetween(earliest.date, latest.date)
  if (days <= 0) {
    return {
      projectedCompletion: null,
      bestCaseCompletion: null,
      worstCaseCompletion: null,
      pace: null,
    }
  }
  const delta = latest.randomizations - earliest.randomizations
  if (delta <= 0) {
    return {
      projectedCompletion: null,
      bestCaseCompletion: null,
      worstCaseCompletion: null,
      pace: null,
    }
  }
  const pace = delta / days
  const bestPace = pace * 1.2
  const worstPace = Math.max(0.001, pace * 0.8)

  const remaining = Math.max(0, target - latest.randomizations)

  const projectDays = Math.min(365, Math.ceil(remaining / pace))
  const bestDays = Math.min(365, Math.ceil(remaining / bestPace))
  const worstDays = Math.min(365, Math.ceil(remaining / worstPace))

  return {
    projectedCompletion: addDays(latest.date, projectDays),
    bestCaseCompletion: addDays(latest.date, bestDays),
    worstCaseCompletion: addDays(latest.date, worstDays),
    pace,
  }
}

export function EnrollmentBurndownChart({ snapshots, study }: Props) {
  const sorted = useMemo(
    () => [...snapshots].sort((a, b) => a.date.localeCompare(b.date)),
    [snapshots],
  )

  const projection = useMemo(
    () => computeProjection(sorted, study.targetEnrollment),
    [sorted, study.targetEnrollment],
  )

  const chartData = useMemo<ChartPoint[]>(() => {
    if (sorted.length === 0) return []

    const latest = sorted[sorted.length - 1]
    const historical: ChartPoint[] = sorted.map((s) => ({
      date: s.date,
      label: formatShort(s.date),
      actual: s.randomizations,
      target: study.targetEnrollment,
      bestCase: null,
      worstCase: null,
    }))

    if (sorted.length < 2 || projection.pace == null) return historical

    const pace = projection.pace
    const bestPace = Math.max(0.001, pace * 1.2)
    const worstPace = Math.max(0.001, pace * 0.8)
    const remaining = Math.max(0, study.targetEnrollment - latest.randomizations)
    const maxDays = Math.min(365, Math.ceil(remaining / worstPace))

    const projected: ChartPoint[] = []
    // anchor point at last snapshot so projection connects smoothly
    projected.push({
      date: latest.date,
      label: formatShort(latest.date),
      actual: latest.randomizations,
      target: study.targetEnrollment,
      bestCase: latest.randomizations,
      worstCase: latest.randomizations,
    })

    // sample ~12 points along the projection for a clean area
    const step = Math.max(1, Math.floor(maxDays / 12))
    for (let d = step; d <= maxDays; d += step) {
      const date = addDays(latest.date, d)
      const best = Math.min(study.targetEnrollment, latest.randomizations + bestPace * d)
      const worst = Math.min(study.targetEnrollment, latest.randomizations + worstPace * d)
      projected.push({
        date,
        label: formatShort(date),
        actual: null,
        target: study.targetEnrollment,
        bestCase: best,
        worstCase: worst,
      })
    }

    return [...historical.slice(0, -1), ...projected]
  }, [sorted, study.targetEnrollment, projection.pace])

  if (snapshots.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
          Enrollment Burndown
        </h2>
        <p className="text-sm text-slate-400 text-center py-8">
          Add snapshots to enable predictions.
        </p>
      </div>
    )
  }

  const latest = sorted[sorted.length - 1]
  const currentEnrollment = `${latest.randomizations} / ${study.targetEnrollment}`

  const paidScreenFails = study.contract?.paidScreenFails
  let budgetCard: { label: string; tone: 'green' | 'amber' | 'red' } | null = null
  if (paidScreenFails) {
    const allowedFails =
      paidScreenFails.maxPaid ??
      Math.floor(latest.randomizations * (paidScreenFails.ratio ?? 0))
    const currentFails = Math.max(
      0,
      (study.enrollmentData?.screens ?? 0) - (study.enrollmentData?.randomizations ?? 0),
    )
    let tone: 'green' | 'amber' | 'red' = 'green'
    if (currentFails > allowedFails) tone = 'red'
    else if (allowedFails - currentFails <= 2) tone = 'amber'
    budgetCard = {
      label: `Screen Fail Budget: ${currentFails} used / ${allowedFails} allowed`,
      tone,
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
          Enrollment Burndown
        </h2>
        <p className="text-xs text-slate-400">
          Historical randomizations with projected completion range.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="Current Enrollment" value={currentEnrollment} />
        <StatCard
          label="Projected Completion"
          value={
            projection.projectedCompletion
              ? formatLong(projection.projectedCompletion)
              : 'Insufficient data'
          }
        />
        <StatCard
          label="Best Case"
          value={
            projection.bestCaseCompletion
              ? formatLong(projection.bestCaseCompletion)
              : 'Insufficient data'
          }
        />
        <StatCard
          label="Worst Case"
          value={
            projection.worstCaseCompletion
              ? formatLong(projection.worstCaseCompletion)
              : 'Insufficient data'
          }
        />
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="bestCase"
            stroke="none"
            fill="#0d9488"
            fillOpacity={0.15}
            name="Best / Worst Range"
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="worstCase"
            stroke="none"
            fill="#ffffff"
            fillOpacity={1}
            legendType="none"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#0d9488"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Actual"
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="target"
            stroke="#64748b"
            strokeWidth={1}
            strokeDasharray="4 4"
            dot={false}
            name="Target"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {budgetCard && (
        <div
          className={
            'rounded-md border px-3 py-2 text-sm ' +
            (budgetCard.tone === 'green'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700'
              : budgetCard.tone === 'amber'
                ? 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700'
                : 'border-red-300 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700')
          }
        >
          {budgetCard.label}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-700 p-2">
      <p className="text-xs font-medium text-slate-400 uppercase">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100 mt-0.5">
        {value}
      </p>
    </div>
  )
}
