import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { useStudies } from '@/hooks/useStudies'
import { projectWeekMetrics, getWeekStart, utilizationColor } from '@/lib/capacity'
import { FORECAST_CONFIG } from '@/lib/forecast-config'
import { Skeleton } from '@/components/ui/skeleton'

const WEEK_COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ec4899', '#14b8a6', '#8b5cf6']

function addWeeks(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n * 7)
  return d.toISOString().split('T')[0]
}

function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

export function Forecast() {
  const { investigators, loading: invLoading } = useInvestigators()
  const { studies, loading: studiesLoading } = useStudies()
  const { visits } = useSiteVisits()
  const { assessments } = useSiteAssessments()

  const loading = invLoading || studiesLoading

  const currentWeek = getWeekStart(new Date())
  const halfForecast = Math.floor(FORECAST_CONFIG.FORECAST_WEEKS / 2)

  const weeks = useMemo(
    () =>
      Array.from({ length: FORECAST_CONFIG.FORECAST_WEEKS }, (_, i) =>
        addWeeks(currentWeek, i - halfForecast),
      ),
    [currentWeek, halfForecast],
  )

  const chartData = useMemo(
    () =>
      weeks.map((weekIso) => {
        const entry: Record<string, string | number> = { week: shortDate(weekIso) }
        for (const inv of investigators) {
          const m = projectWeekMetrics(
            inv.id,
            inv.weeklyCapacityHours * 60,
            weekIso,
            studies,
            visits,
            assessments,
          )
          entry[inv.name] = m.utilizationPct
        }
        return entry
      }),
    [weeks, investigators, studies, visits, assessments],
  )

  const projectedAlerts = useMemo(() => {
    const alerts: { name: string; pct: number; level: 'warning' | 'critical'; weeksOut: number }[] = []
    for (const inv of investigators) {
      const capacityMinutes = inv.weeklyCapacityHours * 60
      for (let w = 1; w <= FORECAST_CONFIG.ALERT_LOOKAHEAD_WEEKS; w++) {
        const weekIso = addWeeks(currentWeek, w)
        const m = projectWeekMetrics(inv.id, capacityMinutes, weekIso, studies, visits, assessments)
        if (m.utilizationPct >= FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT) {
          alerts.push({ name: inv.name, pct: m.utilizationPct, level: 'critical', weeksOut: w })
          break
        } else if (m.utilizationPct >= FORECAST_CONFIG.WARNING_THRESHOLD_PCT) {
          alerts.push({ name: inv.name, pct: m.utilizationPct, level: 'warning', weeksOut: w })
          break
        }
      }
    }
    return alerts
  }, [investigators, studies, visits, assessments, currentWeek])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Capacity Forecast</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Actual (past) + projected (future) investigator utilization — {FORECAST_CONFIG.FORECAST_WEEKS}-week view.
        </p>
      </div>

      {/* Alert banners */}
      {projectedAlerts.length === 0 ? (
        <p className="text-sm text-green-600 dark:text-green-400">
          ✓ No projected capacity alerts in the next {FORECAST_CONFIG.ALERT_LOOKAHEAD_WEEKS} weeks.
        </p>
      ) : (
        <div className="space-y-2">
          {projectedAlerts.map((a) => (
            <div
              key={a.name}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm border ${
                a.level === 'critical'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                  : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              }`}
            >
              <span className="font-medium">{a.level === 'critical' ? '🔴' : '⚠'}</span>
              <span>
                <strong>{a.name}</strong> projected to{' '}
                {a.level === 'critical' ? 'exceed 90%' : 'reach 75%'} capacity in ~{a.weeksOut} week
                {a.weeksOut > 1 ? 's' : ''} ({a.pct}%)
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
          Utilization by Investigator
        </h2>
        <p className="text-xs text-slate-400 mb-4">Left = actual, right = projected.</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis unit="%" domain={[0, 110]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [`${Number(v)}%`, '']} />
            <Legend />
            <ReferenceLine y={FORECAST_CONFIG.WARNING_THRESHOLD_PCT} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '75%', fontSize: 10 }} />
            <ReferenceLine y={FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT} stroke="#dc2626" strokeDasharray="4 2" label={{ value: '90%', fontSize: 10 }} />
            {investigators.map((inv, idx) => (
              <Line
                key={inv.id}
                type="monotone"
                dataKey={inv.name}
                stroke={WEEK_COLORS[idx % WEEK_COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Current Week Summary</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700">
              <th className="text-left pb-2">Investigator</th>
              <th className="text-right pb-2">This Week</th>
              <th className="text-right pb-2">+{halfForecast}wk Projection</th>
            </tr>
          </thead>
          <tbody>
            {investigators.map((inv) => {
              const thisWeek = projectWeekMetrics(inv.id, inv.weeklyCapacityHours * 60, currentWeek, studies, visits, assessments)
              const projected = projectWeekMetrics(inv.id, inv.weeklyCapacityHours * 60, addWeeks(currentWeek, halfForecast), studies, visits, assessments)
              return (
                <tr key={inv.id} className="border-b border-slate-50 dark:border-slate-800">
                  <td className="py-2 text-slate-700 dark:text-slate-300">{inv.name}</td>
                  <td className={`py-2 text-right font-medium tabular-nums ${utilizationColor(thisWeek.utilizationPct)}`}>
                    {thisWeek.utilizationPct}%
                  </td>
                  <td className={`py-2 text-right font-medium tabular-nums ${utilizationColor(projected.utilizationPct)}`}>
                    {projected.utilizationPct}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
