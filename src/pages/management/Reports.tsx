import { useMemo } from 'react'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { recentWeekStarts, computeWeekMetrics } from '@/lib/capacity'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/hud/Skeleton'
import { Panel } from '@/components/hud/Panel'

const NUM_WEEKS = 26

export function Reports() {
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

  function downloadCsv() {
    const header = ['Investigator', ...weekStarts].join(',')
    const rows = grid.map(({ investigator: inv, weeks }) =>
      [inv.name, ...weeks.map((m) => `${m.utilizationPct}%`)].join(','),
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `utilization-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton height={28} width={200} />
        <Skeleton height={256} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>Reports</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
          Investigator utilization — last {NUM_WEEKS} weeks. Use browser Print (Ctrl+P) to save as PDF.
        </p>
      </div>

      <Panel
        title="Investigator Utilization"
        action={
          <Button variant="outline" size="sm" onClick={downloadCsv}>
            Download CSV
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead style={{ borderBottom: '1px solid rgba(255 255 255 / 0.08)' }}>
              <tr>
                <th
                  className="sticky left-0"
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--text-label)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: 160,
                    background: 'var(--color-canvas-raised)',
                  }}
                >
                  Investigator
                </th>
                {weekStarts.map((ws) => (
                  <th
                    key={ws}
                    style={{
                      padding: '12px 4px',
                      textAlign: 'center',
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'var(--text-muted)',
                      width: 56,
                    }}
                  >
                    {ws.slice(5)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map(({ investigator: inv, weeks }) => (
                <tr key={inv.id} style={{ borderTop: '1px solid rgba(255 255 255 / 0.05)' }}>
                  <td
                    className="sticky left-0"
                    style={{ padding: '8px 16px', background: 'var(--color-canvas-raised)' }}
                  >
                    <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>{inv.name}</p>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 11 }}>{inv.weeklyCapacityHours}h</p>
                  </td>
                  {weeks.map((m) => (
                    <td key={m.weekStart} style={{ padding: '2px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'block',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 500,
                          fontFeatureSettings: '"tnum"',
                          padding: '4px 2px',
                          background:
                            m.utilizationPct >= 90 ? 'rgba(220, 38, 38, 0.20)'
                            : m.utilizationPct >= 75 ? 'rgba(217, 119, 6, 0.20)'
                            : m.utilizationPct > 0   ? 'rgba(22, 163, 74, 0.15)'
                            : 'rgba(255, 255, 255, 0.04)',
                          color:
                            m.utilizationPct >= 90 ? 'var(--signal-alert)'
                            : m.utilizationPct >= 75 ? 'var(--signal-warn)'
                            : m.utilizationPct > 0   ? 'var(--signal-good)'
                            : 'var(--text-muted)',
                        }}
                      >
                        {m.utilizationPct}%
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
              {investigators.length === 0 && (
                <tr>
                  <td
                    colSpan={NUM_WEEKS + 1}
                    style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}
                  >
                    No investigators found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
