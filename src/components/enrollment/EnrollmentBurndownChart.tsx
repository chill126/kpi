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
import { Panel } from '@/components/hud/Panel'
import { EmptyState } from '@/components/hud/EmptyState'
import { chartPalette } from '@/components/hud/charts/palette'
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
      <Panel title="Enrollment Burndown">
        <EmptyState title="No snapshots yet" body="Add snapshots to enable predictions." />
      </Panel>
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
    <Panel title="Enrollment Burndown">
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, marginTop: -4 }}>
        Historical randomizations with projected completion range.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" style={{ marginBottom: 16 }}>
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
          <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} />
          <XAxis dataKey="label" tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
          <Area
            type="monotone"
            dataKey="bestCase"
            stroke="none"
            fill={chartPalette.series[0]}
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
            stroke={chartPalette.series[0]}
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
          style={
            budgetCard.tone === 'green'
              ? { borderRadius: 8, padding: '8px 12px', fontSize: 13, background: 'rgba(22 163 74 / 0.12)', border: '1px solid rgba(22 163 74 / 0.3)', color: 'var(--signal-good)', marginTop: 16 }
              : budgetCard.tone === 'amber'
                ? { borderRadius: 8, padding: '8px 12px', fontSize: 13, background: 'rgba(217 119 6 / 0.12)', border: '1px solid rgba(217 119 6 / 0.3)', color: 'var(--signal-warn)', marginTop: 16 }
                : { borderRadius: 8, padding: '8px 12px', fontSize: 13, background: 'rgba(220 38 38 / 0.12)', border: '1px solid rgba(220 38 38 / 0.3)', color: 'var(--signal-alert)', marginTop: 16 }
          }
        >
          {budgetCard.label}
        </div>
      )}
    </Panel>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass" style={{ padding: 8 }}>
      <p style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-label)' }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 600, fontFeatureSettings: '"tnum"', color: 'var(--text-primary)', marginTop: 2 }}>
        {value}
      </p>
    </div>
  )
}
