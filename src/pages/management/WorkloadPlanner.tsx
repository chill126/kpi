import { useMemo } from 'react'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { computeWeekMetrics } from '@/lib/capacity'
import { Panel } from '@/components/hud/Panel'
import { Skeleton } from '@/components/hud/Skeleton'
import { EmptyState } from '@/components/hud/EmptyState'
import { Users } from 'lucide-react'

const NUM_WEEKS = 8

function nextWeekStarts(n: number): string[] {
  const today = new Date()
  const day = today.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setUTCDate(today.getUTCDate() + diff)
  const weeks: string[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date(monday)
    d.setUTCDate(monday.getUTCDate() + i * 7)
    weeks.push(d.toISOString().split('T')[0])
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
  const day = today.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setUTCDate(today.getUTCDate() + diff)
  return ws === monday.toISOString().split('T')[0]
}

export function WorkloadPlanner() {
  const { investigators, loading } = useInvestigators()
  const { visits } = useSiteVisits()
  const { assessments } = useSiteAssessments()

  const weekStarts = useMemo(() => nextWeekStarts(NUM_WEEKS), [])

  const grid = useMemo(
    () =>
      investigators.map((inv) => ({
        investigator: inv,
        weeks: weekStarts.map((ws) =>
          computeWeekMetrics(inv.id, inv.weeklyCapacityHours * 60, visits, assessments, ws, ['scheduled', 'completed']),
        ),
      })),
    [investigators, visits, assessments, weekStarts],
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
          Scheduled investigator load for the next {NUM_WEEKS} weeks — spot over-commitment before it happens.
        </p>
      </div>

      <Panel title="Upcoming Capacity" action={legend}>
        {investigators.length === 0 ? (
          <EmptyState
            icon={<Users size={28} />}
            title="No investigators"
            body="Add investigators to see the capacity heatmap."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th
                    style={{
                      padding: '0 12px 10px 0',
                      textAlign: 'left',
                      width: 160,
                      fontSize: 10.5,
                      fontWeight: 500,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--text-label)',
                      borderBottom: '1px solid rgba(255 255 255 / 0.08)',
                    }}
                  >
                    Investigator
                  </th>
                  {weekStarts.map((ws) => {
                    const current = isCurrentWeek(ws)
                    return (
                      <th
                        key={ws}
                        style={{
                          padding: '0 4px 10px',
                          textAlign: 'center',
                          width: 64,
                          fontSize: 10.5,
                          color: current ? 'var(--accent-primary)' : 'var(--text-label)',
                          fontWeight: current ? 700 : 500,
                          borderBottom: '1px solid rgba(255 255 255 / 0.08)',
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
                    <td style={{ padding: '8px 12px 8px 0' }}>
                      <p style={{ margin: 0, fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>
                        {inv.name}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                        {inv.weeklyCapacityHours}h/wk
                      </p>
                    </td>
                    {weeks.map((m) => (
                      <td key={m.weekStart} style={{ padding: 3, textAlign: 'center' }}>
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
                    ))}
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
        Each cell shows how much of an investigator's weekly capacity is already committed by scheduled visits.
        A dashed cell means no visits are scheduled yet for that week — use the{' '}
        <strong style={{ color: 'var(--text-primary)' }}>What-If Simulator</strong> to model the impact of adding a new study.
      </div>
    </div>
  )
}
