import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { useStudies } from '@/hooks/useStudies'
import { projectWeekMetrics, getWeekStart } from '@/lib/capacity'
import { FORECAST_CONFIG } from '@/lib/forecast-config'
import { Skeleton } from '@/components/hud/Skeleton'
import { Panel } from '@/components/hud/Panel'
import { chartPalette } from '@/components/hud/charts/palette'

function addWeeks(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n * 7)
  return d.toISOString().split('T')[0]
}

function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

function utilizationStyle(pct: number): React.CSSProperties {
  const color =
    pct >= 90
      ? 'var(--signal-alert)'
      : pct >= 75
      ? 'var(--signal-warn)'
      : 'var(--signal-good)'
  return { color, fontFeatureSettings: '"tnum"' }
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton height={28} width={260} />
        <Skeleton height={288} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
          Capacity Forecast
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
          Actual (past) + projected (future) investigator utilization — {FORECAST_CONFIG.FORECAST_WEEKS}-week view.
        </p>
      </div>

      {projectedAlerts.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--signal-good)' }}>
          ✓ No projected capacity alerts in the next {FORECAST_CONFIG.ALERT_LOOKAHEAD_WEEKS} weeks.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projectedAlerts.map((a) => (
            <div
              key={a.name}
              style={
                a.level === 'critical'
                  ? { display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8, padding: '8px 14px', fontSize: 13, background: 'rgba(220 38 38 / 0.12)', border: '1px solid rgba(220 38 38 / 0.3)', color: 'var(--signal-alert)' }
                  : { display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8, padding: '8px 14px', fontSize: 13, background: 'rgba(217 119 6 / 0.12)', border: '1px solid rgba(217 119 6 / 0.3)', color: 'var(--signal-warn)' }
              }
            >
              <span>{a.level === 'critical' ? '🔴' : '⚠'}</span>
              <span>
                <strong>{a.name}</strong> projected to{' '}
                {a.level === 'critical' ? 'exceed 90%' : 'reach 75%'} capacity in ~{a.weeksOut} week
                {a.weeksOut > 1 ? 's' : ''} ({a.pct}%)
              </span>
            </div>
          ))}
        </div>
      )}

      <Panel title="Utilization by Investigator">
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 16px' }}>Left = actual, right = projected.</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: chartPalette.axis }} />
            <YAxis unit="%" domain={[0, 110]} tick={{ fontSize: 12, fill: chartPalette.axis }} />
            <Tooltip formatter={(v) => [`${Number(v)}%`, '']} />
            <Legend />
            <ReferenceLine y={FORECAST_CONFIG.WARNING_THRESHOLD_PCT} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '75%', fontSize: 10 }} />
            <ReferenceLine y={FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT} stroke="#dc2626" strokeDasharray="4 2" label={{ value: '90%', fontSize: 10 }} />
            {investigators.map((inv, idx) => (
              <Line
                key={inv.id}
                type="monotone"
                dataKey={inv.name}
                stroke={chartPalette.series[idx % chartPalette.series.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Current Week Summary">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid rgba(255 255 255 / 0.08)' }}>
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
                <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255 255 255 / 0.05)' }}>
                  <td className="py-2" style={{ color: 'var(--text-primary)' }}>{inv.name}</td>
                  <td className="py-2 text-right font-medium" style={utilizationStyle(thisWeek.utilizationPct)}>
                    {thisWeek.utilizationPct}%
                  </td>
                  <td className="py-2 text-right font-medium" style={utilizationStyle(projected.utilizationPct)}>
                    {projected.utilizationPct}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}
