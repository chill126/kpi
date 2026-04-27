import { useMemo } from 'react'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
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
import { Tile } from '@/components/hud/Tile'
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
    pct >= FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT
      ? 'var(--signal-alert)'
      : pct >= FORECAST_CONFIG.WARNING_THRESHOLD_PCT
      ? 'var(--signal-warn)'
      : 'var(--signal-good)'
  return { color, fontFeatureSettings: '"tnum"' }
}

function utilizationSignal(pct: number): 'alert' | 'warn' | 'good' {
  if (pct >= FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT) return 'alert'
  if (pct >= FORECAST_CONFIG.WARNING_THRESHOLD_PCT) return 'warn'
  return 'good'
}

function assignedStudyCount(invId: string, studies: ReturnType<typeof useStudies>['studies']): number {
  return studies.filter(
    (s) => s.assignedInvestigators?.some((si) => si.investigatorId === invId),
  ).length
}

export function Forecast() {
  const { investigators, loading: invLoading } = useInvestigators()
  const { studies, loading: studiesLoading } = useStudies()
  const { visits } = useSiteVisits()
  const { assessments } = useSiteAssessments()

  const loading = invLoading || studiesLoading

  const currentWeek = getWeekStart(new Date())
  const halfForecast = Math.floor(FORECAST_CONFIG.FORECAST_WEEKS / 2)

  // Only PI / Sub-I for capacity
  const capacityInvestigators = useMemo(
    () => investigators.filter((inv) => inv.role === 'PI' || inv.role === 'Sub-I'),
    [investigators],
  )

  const weeks = useMemo(
    () =>
      Array.from({ length: FORECAST_CONFIG.FORECAST_WEEKS }, (_, i) =>
        addWeeks(currentWeek, i - halfForecast),
      ),
    [currentWeek, halfForecast],
  )

  // --- Site aggregate tiles ---
  const siteCapacityHours = useMemo(
    () => capacityInvestigators.reduce((sum, inv) => sum + inv.weeklyCapacityHours, 0),
    [capacityInvestigators],
  )

  const thisWeekSiteLoad = useMemo(() => {
    if (capacityInvestigators.length === 0) return 0
    const totalPct = capacityInvestigators.reduce((sum, inv) => {
      const m = projectWeekMetrics(
        inv.id,
        inv.weeklyCapacityHours * 60,
        currentWeek,
        studies,
        visits,
        assessments,
      )
      return sum + m.utilizationPct
    }, 0)
    return Math.round(totalPct / capacityInvestigators.length)
  }, [capacityInvestigators, currentWeek, studies, visits, assessments])

  const fourWeekOutload = useMemo(() => {
    if (capacityInvestigators.length === 0) return 0
    const futureWeek = addWeeks(currentWeek, 4)
    const totalPct = capacityInvestigators.reduce((sum, inv) => {
      const m = projectWeekMetrics(
        inv.id,
        inv.weeklyCapacityHours * 60,
        futureWeek,
        studies,
        visits,
        assessments,
      )
      return sum + m.utilizationPct
    }, 0)
    return Math.round(totalPct / capacityInvestigators.length)
  }, [capacityInvestigators, currentWeek, studies, visits, assessments])

  // --- Stacked bar chart data (all investigators, not just PI/Sub-I) ---
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

  // --- Alert cards (capacity investigators only) ---
  const projectedAlerts = useMemo(() => {
    const alerts: {
      name: string
      pct: number
      level: 'warning' | 'critical'
      weeksOut: number
      invId: string
    }[] = []
    for (const inv of capacityInvestigators) {
      const capacityMinutes = inv.weeklyCapacityHours * 60
      for (let w = 1; w <= FORECAST_CONFIG.ALERT_LOOKAHEAD_WEEKS; w++) {
        const weekIso = addWeeks(currentWeek, w)
        const m = projectWeekMetrics(inv.id, capacityMinutes, weekIso, studies, visits, assessments)
        if (m.utilizationPct >= FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT) {
          alerts.push({ name: inv.name, pct: m.utilizationPct, level: 'critical', weeksOut: w, invId: inv.id })
          break
        } else if (m.utilizationPct >= FORECAST_CONFIG.WARNING_THRESHOLD_PCT) {
          alerts.push({ name: inv.name, pct: m.utilizationPct, level: 'warning', weeksOut: w, invId: inv.id })
          break
        }
      }
    }
    return alerts
  }, [capacityInvestigators, studies, visits, assessments, currentWeek])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton height={28} width={260} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <Skeleton height={100} />
          <Skeleton height={100} />
          <Skeleton height={100} />
        </div>
        <Skeleton height={288} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
          Capacity Forecast
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
          Actual (past) + projected (future) investigator utilization — {FORECAST_CONFIG.FORECAST_WEEKS}-week view.
        </p>
      </div>

      {/* Site aggregate tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Tile
          label="Site Capacity"
          value={siteCapacityHours}
          suffix=" hrs/wk"
          sub={`${capacityInvestigators.length} PI/Sub-I investigators`}
          signal="neutral"
        />
        <Tile
          label="This Week Load"
          value={thisWeekSiteLoad}
          suffix="%"
          sub="Average across PI/Sub-I"
          signal={utilizationSignal(thisWeekSiteLoad)}
        />
        <Tile
          label="4-Week Outlook"
          value={fourWeekOutload}
          suffix="%"
          sub="Projected average load"
          signal={utilizationSignal(fourWeekOutload)}
        />
      </div>

      {/* Alert cards */}
      {projectedAlerts.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--signal-good)', margin: 0 }}>
          No projected capacity alerts in the next {FORECAST_CONFIG.ALERT_LOOKAHEAD_WEEKS} weeks.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projectedAlerts.map((a) => {
            const studyCount = assignedStudyCount(a.invId, studies)
            const suggestedAction =
              studyCount > 1
                ? 'Review study assignments to redistribute load.'
                : 'Consider adjusting enrollment pace for active studies.'
            const isCritical = a.level === 'critical'
            return (
              <div
                key={a.name}
                style={{
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  background: isCritical
                    ? 'rgba(220 38 38 / 0.12)'
                    : 'rgba(217 119 6 / 0.12)',
                  border: isCritical
                    ? '1px solid rgba(220 38 38 / 0.3)'
                    : '1px solid rgba(217 119 6 / 0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: isCritical ? 'var(--signal-alert)' : 'var(--signal-warn)' }}>
                  {isCritical
                    ? <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    : <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  }
                  <span>
                    <strong>{a.name}</strong> projected to{' '}
                    {isCritical ? 'exceed 90%' : 'reach 75%'} capacity in ~{a.weeksOut} week
                    {a.weeksOut > 1 ? 's' : ''} ({a.pct}%)
                  </span>
                </div>
                <div style={{ marginTop: 4, paddingLeft: 20, fontSize: 12, color: 'var(--text-muted)' }}>
                  {suggestedAction}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Stacked bar chart */}
      <Panel title="Utilization by Investigator">
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 16px' }}>
          Left = actual, right = projected. Bars stack per-investigator utilization to show aggregate site load.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: chartPalette.axis }} />
            <YAxis unit="%" domain={[0, 110]} tick={{ fontSize: 12, fill: chartPalette.axis }} />
            <Tooltip
              formatter={(v, name) => [`${Number(v)}%`, name]}
              contentStyle={{
                background: chartPalette.tooltip.bg,
                border: `1px solid ${chartPalette.tooltip.border}`,
                color: chartPalette.tooltip.text,
                fontFamily: chartPalette.tooltip.font,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: chartPalette.axis, paddingTop: 8 }} />
            <ReferenceLine
              y={FORECAST_CONFIG.WARNING_THRESHOLD_PCT}
              stroke="#f59e0b"
              strokeDasharray="4 2"
              label={{ value: '75%', fontSize: 10, fill: '#f59e0b' }}
            />
            <ReferenceLine
              y={FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT}
              stroke="#dc2626"
              strokeDasharray="4 2"
              label={{ value: '90%', fontSize: 10, fill: '#dc2626' }}
            />
            {investigators.map((inv, idx) => (
              <Bar
                key={inv.id}
                dataKey={inv.name}
                stackId="site"
                fill={chartPalette.series[idx % chartPalette.series.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Current-week summary table (unchanged) */}
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
