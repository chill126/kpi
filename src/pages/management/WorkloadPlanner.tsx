import { useMemo } from 'react'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { computeWeekMetrics } from '@/lib/capacity'
import { Panel } from '@/components/hud/Panel'
import { Skeleton } from '@/components/hud/Skeleton'
import { EmptyState } from '@/components/hud/EmptyState'
import { Users } from 'lucide-react'

const BACK_WEEKS = 43  // ~10 months
const AHEAD_WEEKS = 8   // ~2 months

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildWeekRange(backWeeks: number, aheadWeeks: number): string[] {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const currentMonday = new Date(today)
  currentMonday.setDate(today.getDate() + diff)
  currentMonday.setHours(0, 0, 0, 0)

  const weeks: string[] = []
  for (let i = -backWeeks; i <= aheadWeeks; i++) {
    const d = new Date(currentMonday)
    d.setDate(currentMonday.getDate() + i * 7)
    weeks.push(localDateStr(d))
  }
  return weeks
}

function cellStyle(pct: number): React.CSSProperties {
  if (pct === 0) return { color: 'var(--text-muted)', background: 'rgba(255 255 255 / 0.04)', borderRadius: 4 }
  if (pct >= 90) return { color: 'var(--signal-alert)', background: 'rgba(248 113 113 / 0.15)', borderRadius: 4 }
  if (pct >= 75) return { color: 'var(--signal-warn)', background: 'rgba(245 158 11 / 0.15)', borderRadius: 4 }
  return { color: 'var(--signal-good)', background: 'rgba(52 211 153 / 0.15)', borderRadius: 4 }
}

function isCurrentWeek(ws: string): boolean {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return ws === localDateStr(monday)
}

export function WorkloadPlanner() {
  const { investigators, loading } = useInvestigators()
  const { visits } = useSiteVisits()
  const { assessments } = useSiteAssessments()

  const weekStarts = buildWeekRange(BACK_WEEKS, AHEAD_WEEKS)

  const today = new Date()
  const _day = today.getDay()
  const _diff = _day === 0 ? -6 : 1 - _day
  const _monday = new Date(today)
  _monday.setDate(today.getDate() + _diff)
  _monday.setHours(0, 0, 0, 0)
  const currentWeekStr = localDateStr(_monday)

  const grid = useMemo(
    () =>
      investigators.map((inv) => ({
        investigator: inv,
        weeks: weekStarts.map((ws) =>
          computeWeekMetrics(
            inv.id,
            inv.weeklyCapacityHours * 60,
            visits,
            assessments,
            ws,
            ws < currentWeekStr ? ['completed'] : ['scheduled', 'completed'],
          ),
        ),
      })),
    [investigators, visits, assessments, weekStarts, currentWeekStr],
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton height={28} width={240} />
        <Skeleton height={200} />
      </div>
    )
  }

  const legend = (
    <span style={{ display: 'flex', gap: 12, fontSize: 11 }}>
      <span style={{ color: 'var(--text-muted)' }}>■ Empty</span>
      <span style={{ color: 'var(--signal-good)' }}>■ &lt;75%</span>
      <span style={{ color: 'var(--signal-warn)' }}>■ 75–89%</span>
      <span style={{ color: 'var(--signal-alert)' }}>■ ≥90%</span>
    </span>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Capacity Planner
        </h1>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
          ~10 months of actuals · current week · 2 months forecast
        </p>
      </div>

      <Panel title="Capacity Heatmap" action={legend}>
        {investigators.length === 0 ? (
          <EmptyState
            icon={<Users size={28} />}
            title="No investigators"
            body="Add investigators to see the capacity heatmap."
          />
        ) : (
          <div className="heatmap-scroll">
            <table style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th
                    style={{
                      padding: '0 12px 10px 0',
                      textAlign: 'left',
                      width: 160,
                      minWidth: 160,
                      fontSize: 10.5,
                      fontWeight: 500,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--text-label)',
                      borderBottom: '1px solid rgba(255 255 255 / 0.08)',
                      position: 'sticky',
                      left: 0,
                      zIndex: 10,
                      background: 'oklch(0.10 0.018 238)',
                    }}
                  >
                    Investigator
                  </th>
                  {weekStarts.map((ws) => {
                    const current = isCurrentWeek(ws)
                    const isPast = ws < currentWeekStr
                    return (
                      <th
                        key={ws}
                        style={{
                          padding: '0 4px 10px',
                          textAlign: 'center',
                          width: 50,
                          minWidth: 50,
                          fontSize: 10.5,
                          color: current ? 'var(--accent-primary)' : isPast ? 'var(--text-muted)' : 'var(--text-label)',
                          fontWeight: current ? 700 : 500,
                          borderBottom: '1px solid rgba(255 255 255 / 0.08)',
                          borderRight: current ? '2px solid rgba(var(--accent-primary-rgb, 30 120 255) / 0.4)' : undefined,
                        }}
                      >
                        {ws.slice(5)}
                        {current && (
                          <span style={{ display: 'block', fontSize: 9, marginTop: 1, color: 'var(--accent-primary)' }}>
                            now
                          </span>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {grid.map(({ investigator: inv, weeks }) => (
                  <tr key={inv.id} style={{ borderTop: '1px solid rgba(255 255 255 / 0.05)' }}>
                    <td style={{ padding: '8px 12px 8px 0', position: 'sticky', left: 0, zIndex: 5, background: 'oklch(0.10 0.018 238)' }}>
                      <p style={{ margin: 0, fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>
                        {inv.name}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                        {inv.weeklyCapacityHours}h/wk
                      </p>
                    </td>
                    {weeks.map((m) => {
                      const current = isCurrentWeek(m.weekStart)
                      return (
                        <td
                          key={m.weekStart}
                          style={{
                            padding: 3,
                            textAlign: 'center',
                            borderRight: current ? '2px solid rgba(var(--accent-primary-rgb, 30 120 255) / 0.4)' : undefined,
                          }}
                        >
                          <span
                            style={{
                              display: 'block',
                              padding: '5px 2px',
                              fontSize: 11,
                              fontWeight: 500,
                              fontFeatureSettings: '"tnum"',
                              ...cellStyle(m.utilizationPct),
                            }}
                          >
                            {m.utilizationPct > 0 ? `${m.utilizationPct}%` : '—'}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div
        className="glass"
        style={{ borderRadius: 10, padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}
      >
        <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>How to read this:</strong>{' '}
        Past cells show completed visit hours. Current and future cells show scheduled load.
        A dashed cell means no visits are recorded for that week — use the{' '}
        <strong style={{ color: 'var(--text-primary)' }}>What-If Simulator</strong> to model the impact of adding a new study.
      </div>
    </div>
  )
}
