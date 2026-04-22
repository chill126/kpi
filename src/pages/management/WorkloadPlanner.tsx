import { useMemo } from 'react'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { recentWeekStarts, computeWeekMetrics } from '@/lib/capacity'
import { Panel } from '@/components/hud/Panel'
import { EmptyState } from '@/components/hud/EmptyState'
import { Users } from 'lucide-react'

const NUM_WEEKS = 13

function hudCellStyle(pct: number): React.CSSProperties {
  if (pct >= 90) return { color: 'var(--signal-alert)', background: 'rgba(248 113 113 / 0.15)', borderRadius: 4 }
  if (pct >= 75) return { color: 'var(--signal-warn)', background: 'rgba(245 158 11 / 0.15)', borderRadius: 4 }
  return { color: 'var(--signal-good)', background: 'rgba(52 211 153 / 0.15)', borderRadius: 4 }
}

export function WorkloadPlanner() {
  const { investigators, loading } = useInvestigators()
  const { visits } = useSiteVisits()
  const { assessments } = useSiteAssessments()

  const weekStarts = useMemo(() => recentWeekStarts(NUM_WEEKS).reverse(), [])

  const grid = useMemo(
    () =>
      investigators.map((inv) => ({
        investigator: inv,
        weeks: weekStarts.map((ws) =>
          computeWeekMetrics(inv.id, inv.weeklyCapacityHours * 60, visits, assessments, ws),
        ),
      })),
    [investigators, visits, assessments, weekStarts],
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="glass" style={{ height: 32, width: 240 }} />
        <div className="glass" style={{ height: 200 }} />
      </div>
    )
  }

  const legend = (
    <span style={{ display: 'flex', gap: 12, fontSize: 11 }}>
      <span style={{ color: 'var(--signal-good)' }}>■ &lt;75%</span>
      <span style={{ color: 'var(--signal-warn)' }}>■ 75–89%</span>
      <span style={{ color: 'var(--signal-alert)' }}>■ ≥90%</span>
    </span>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{
          margin: 0, fontFamily: 'Geist, Inter, system-ui', fontSize: 24,
          fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-primary)',
        }}>Workload Planner</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
          Capacity utilization per investigator over the last {NUM_WEEKS} weeks.
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{
                    padding: '0 12px 10px 0', textAlign: 'left', width: 160,
                    fontSize: 10.5, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--text-label)',
                    borderBottom: '1px solid rgba(255 255 255 / 0.08)',
                  }}>Investigator</th>
                  {weekStarts.map((ws) => (
                    <th key={ws} style={{
                      padding: '0 4px 10px', textAlign: 'center', width: 52,
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5,
                      color: 'var(--text-label)',
                      borderBottom: '1px solid rgba(255 255 255 / 0.08)',
                    }}>
                      {ws.slice(5)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map(({ investigator: inv, weeks }) => (
                  <tr key={inv.id}>
                    <td style={{ padding: '8px 12px 8px 0' }}>
                      <p style={{ margin: 0, fontWeight: 500, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'Inter, system-ui' }}>{inv.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{inv.weeklyCapacityHours}h/wk</p>
                    </td>
                    {weeks.map((m) => (
                      <td key={m.weekStart} style={{ padding: 3, textAlign: 'center' }}>
                        <span style={{
                          display: 'block', padding: '4px 2px',
                          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500,
                          fontFeatureSettings: '"tnum"',
                          ...hudCellStyle(m.utilizationPct),
                        }}>
                          {m.utilizationPct}%
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
    </div>
  )
}
