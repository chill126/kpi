import { useMemo } from 'react'
import { ReportInfoIcon } from '@/components/hud/ReportInfoIcon'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { useStudies } from '@/hooks/useStudies'
import { getWeekStart, computeWeekMetrics } from '@/lib/capacity'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/hud/Skeleton'
import { Panel } from '@/components/hud/Panel'

const labelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 10.5,
  fontWeight: 500,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-label)',
}

const valueStyle: React.CSSProperties = {
  margin: '2px 0 0',
  fontSize: 18,
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--text-primary)',
}

function CapacityBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100)
  const color =
    pct >= 90 ? 'var(--signal-alert)' : pct >= 75 ? 'var(--signal-warn)' : 'var(--signal-good)'
  return (
    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255 255 255 / 0.08)', overflow: 'hidden' }}>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          width: `${capped}%`,
          background: color,
          transition: 'width 0.3s',
        }}
      />
    </div>
  )
}

export function InvestigatorTab() {
  const { investigators, loading } = useInvestigators()
  const { visits } = useSiteVisits()
  const { assessments } = useSiteAssessments()
  const { studies } = useStudies()

  const currentWeek = useMemo(() => getWeekStart(new Date()), [])
  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  const clinicalInvestigators = useMemo(
    () => investigators.filter((inv) => inv.role === 'PI' || inv.role === 'Sub-I'),
    [investigators],
  )

  const cards = useMemo(
    () =>
      clinicalInvestigators.map((inv) => {
        const metrics = computeWeekMetrics(
          inv.id,
          inv.weeklyCapacityHours * 60,
          visits,
          assessments,
          currentWeek,
        )
        const visitsCount = visits.filter(
          (v) =>
            v.investigatorId === inv.id &&
            v.completedDate !== null &&
            v.completedDate >= thirtyDaysAgoStr,
        ).length
        const assessmentsCount = assessments.filter(
          (a) => a.investigatorId === inv.id && a.date >= thirtyDaysAgoStr,
        ).length
        const assignedStudyNames = studies
          .filter((s) => s.assignedInvestigators.some((ai) => ai.investigatorId === inv.id))
          .map((s) => s.name)
        return {
          investigator: inv,
          utilizationPct: metrics.utilizationPct,
          visitsCount,
          assessmentsCount,
          assignedStudyNames,
        }
      }),
    [clinicalInvestigators, visits, assessments, studies, currentWeek, thirtyDaysAgoStr],
  )

  function csvCell(value: string | number): string {
    const str = String(value)
    const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }

  function downloadCsv() {
    const header = ['Investigator', 'Utilization %', 'Visits (30d)', 'Assessments (30d)'].map(csvCell).join(',')
    const rows = cards.map(
      ({ investigator, utilizationPct, visitsCount, assessmentsCount }) =>
        [investigator.name, `${utilizationPct}%`, visitsCount, assessmentsCount].map(csvCell).join(','),
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `investigator-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 }}>
        <Skeleton height={28} width={200} />
        <Skeleton height={256} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 }}>
      <Panel
        title="Investigator Report"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ReportInfoIcon info={"Per-investigator workload cards showing current week utilization against capacity, visits and assessments logged in the last 30 days, and delegated studies.\n\nPulls from: Investigators, Visits, Assessments, Studies."} />
            <Button variant="outline" size="sm" onClick={downloadCsv}>
              Download CSV
            </Button>
          </div>
        }
      >
        {cards.length === 0 ? (
          <p style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            No investigators found.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 16,
            }}
          >
            {cards.map(({ investigator: inv, utilizationPct, visitsCount, assessmentsCount, assignedStudyNames }) => {
              const utilizationColor =
                utilizationPct >= 90
                  ? 'var(--signal-alert)'
                  : utilizationPct >= 75
                  ? 'var(--signal-warn)'
                  : 'var(--signal-good)'
              return (
                <div
                  key={inv.id}
                  className="glass"
                  style={{
                    padding: 20,
                    borderRadius: 14,
                    border: '1px solid rgba(255 255 255 / 0.08)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
                        {inv.name}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                        {inv.credentials} · {inv.role}
                      </p>
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 700, color: utilizationColor }}>
                      {utilizationPct}%
                    </span>
                  </div>
                  <CapacityBar pct={utilizationPct} />
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                      marginTop: 14,
                    }}
                  >
                    <div>
                      <p style={labelStyle}>Visits (30d)</p>
                      <p style={valueStyle}>{visitsCount}</p>
                    </div>
                    <div>
                      <p style={labelStyle}>Assessments (30d)</p>
                      <p style={valueStyle}>{assessmentsCount}</p>
                    </div>
                  </div>
                  {assignedStudyNames.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <p style={labelStyle}>Delegated Studies</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {assignedStudyNames.map((name) => (
                          <span
                            key={name}
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 99,
                              background: 'rgba(255 255 255 / 0.06)',
                              color: 'var(--text-secondary)',
                              border: '1px solid rgba(255 255 255 / 0.10)',
                            }}
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Panel>
    </div>
  )
}
