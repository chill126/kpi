import { Fragment, useState } from 'react'
import { Panel } from '@/components/hud/Panel'
import { Tile } from '@/components/hud/Tile'
import { Skeleton } from '@/components/hud/Skeleton'
import { EmptyState } from '@/components/hud/EmptyState'
import { HUDBarChart } from '@/components/hud/charts/HUDBarChart'
import { useStudies } from '@/hooks/useStudies'
import { useAllProtocolDeviations } from '@/hooks/useAllProtocolDeviations'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { getWeekStart, computeWeekMetrics } from '@/lib/capacity'
import type { StudyStatus } from '@/types'

const STATUS_GROUPS = [
  { key: 'enrolling', label: 'Enrolling' },
  { key: 'open', label: 'Open' },
  { key: 'paused', label: 'Paused' },
  { key: 'completed', label: 'Completed' },
] as const

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  pending: { color: 'var(--accent-primary)', background: 'rgba(139 92 246 / 0.12)', border: '1px solid rgba(139 92 246 / 0.25)' },
  enrolling: { color: 'var(--signal-good)', background: 'rgba(22 163 74 / 0.12)', border: '1px solid rgba(22 163 74 / 0.25)' },
  paused: { color: 'var(--signal-warn)', background: 'rgba(217 119 6 / 0.12)', border: '1px solid rgba(217 119 6 / 0.25)' },
  open: { color: 'var(--accent-secondary)', background: 'rgba(59 130 246 / 0.12)', border: '1px solid rgba(59 130 246 / 0.25)' },
  completed: { color: 'var(--text-muted)', background: 'rgba(255 255 255 / 0.06)', border: '1px solid rgba(255 255 255 / 0.10)' },
}

function enrollmentSignal(pct: number): 'good' | 'warn' | 'alert' {
  if (pct >= 80) return 'good'
  if (pct >= 50) return 'warn'
  return 'alert'
}

export function SiteSummaryTab() {
  const { studies, loading: loadingStudies } = useStudies()
  const { deviations, loading: loadingDeviations } = useAllProtocolDeviations()
  const { visits, loading: loadingVisits } = useSiteVisits()
  const { investigators, loading: loadingInvestigators } = useInvestigators()
  const { assessments, loading: loadingAssessments } = useSiteAssessments()

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    enrolling: true,
    open: true,
    paused: false,
    completed: false,
  })

  const isLoading =
    loadingStudies || loadingDeviations || loadingVisits || loadingInvestigators || loadingAssessments

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={100} />
          ))}
        </div>
        <Skeleton height={200} />
        <Skeleton height={200} />
      </div>
    )
  }

  // --- Computed values ---
  const activeStudies = studies.filter(
    (s) => s.status === 'enrolling' || s.status === 'open',
  )

  const totalEnrolled = studies.reduce(
    (sum, s) => sum + s.enrollmentData.randomizations,
    0,
  )
  const totalTarget = studies.reduce((sum, s) => sum + s.targetEnrollment, 0)

  const totalScreens = studies.reduce(
    (sum, s) => sum + s.enrollmentData.screens,
    0,
  )
  const totalRandomizations = studies.reduce(
    (sum, s) => sum + s.enrollmentData.randomizations,
    0,
  )
  const screenToRandValue =
    totalScreens > 0
      ? `${Math.round((totalRandomizations / totalScreens) * 100)}%`
      : '—'
  const screenToRandSignal: 'good' | 'warn' | 'alert' =
    totalScreens === 0
      ? 'alert'
      : totalRandomizations / totalScreens >= 0.6
      ? 'good'
      : totalRandomizations / totalScreens >= 0.4
      ? 'warn'
      : 'alert'

  const openDevCount = deviations.filter((d) => d.status === 'open').length
  const openDevSignal: 'good' | 'warn' | 'alert' =
    openDevCount === 0 ? 'good' : openDevCount <= 3 ? 'warn' : 'alert'

  const currentWeek = getWeekStart(new Date())
  const avgUtilization =
    investigators.length > 0
      ? Math.round(
          investigators.reduce((sum, inv) => {
            const metrics = computeWeekMetrics(
              inv.id,
              inv.weeklyCapacityHours * 60,
              visits,
              assessments,
              currentWeek,
            )
            return sum + metrics.utilizationPct
          }, 0) / investigators.length,
        )
      : 0
  const avgUtilizationSignal: 'good' | 'warn' | 'alert' =
    avgUtilization >= 90 ? 'alert' : avgUtilization >= 75 ? 'warn' : 'good'

  const milestonesAchieved = studies.reduce((sum, s) => {
    const milestones = s.contract?.milestones ?? []
    return sum + milestones.filter((m) => m.achieved).length
  }, 0)
  const milestonesSignal: 'good' | 'neutral' =
    milestonesAchieved > 0 ? 'good' : 'neutral'

  // --- Deviation chart ---
  const piReviewedCount = deviations.filter((d) => d.status === 'pi_reviewed').length
  const closedCount = deviations.filter((d) => d.status === 'closed').length

  const categoryCountMap: Record<string, number> = {}
  for (const dev of deviations) {
    categoryCountMap[dev.category] = (categoryCountMap[dev.category] ?? 0) + 1
  }
  const deviationChartData = Object.entries(categoryCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Tile row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        <Tile
          label="Active Studies"
          value={activeStudies.length}
          signal="info"
        />
        <Tile
          label="Site Enrolled"
          value={totalEnrolled}
          sub={`of ${totalTarget} target`}
          signal="neutral"
        />
        <Tile
          label="Screen→Rand"
          value={screenToRandValue}
          signal={totalScreens === 0 ? 'neutral' : screenToRandSignal}
        />
        <Tile
          label="Open Deviations"
          value={openDevCount}
          signal={openDevSignal}
        />
        <Tile
          label="Avg Utilization"
          value={avgUtilization}
          suffix="%"
          signal={avgUtilizationSignal}
        />
        <Tile
          label="Milestones Achieved"
          value={milestonesAchieved}
          signal={milestonesSignal}
        />
      </div>

      {/* Enrollment by Study */}
      <Panel title="Enrollment by Study">
        {studies.length === 0 ? (
          <EmptyState title="No studies" body="No studies have been added yet." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255 255 255 / 0.08)' }}>
                {(['Study', 'Enrolled / Target', '%', 'Status'] as const).map((col) => (
                  <th
                    key={col}
                    style={{
                      textAlign: col === 'Study' ? 'left' : 'right',
                      padding: '6px 10px',
                      fontFamily: 'Inter, system-ui',
                      fontSize: 10.5,
                      fontWeight: 500,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--text-label)',
                    }}
                  >
                    {col === 'Status' ? (
                      <span style={{ display: 'block', textAlign: 'right' }}>{col}</span>
                    ) : (
                      col
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STATUS_GROUPS.map((group) => {
                const groupStudies = studies.filter((s) => s.status === group.key)
                if (groupStudies.length === 0) return null
                const isOpen = openSections[group.key]
                return (
                  <Fragment key={group.key}>
                    <tr
                      onClick={() =>
                        setOpenSections((prev) => ({ ...prev, [group.key]: !prev[group.key] }))
                      }
                      style={{ cursor: 'pointer', background: 'rgba(255 255 255 / 0.03)' }}
                    >
                      <td
                        colSpan={4}
                        style={{
                          padding: '10px 10px',
                          color: 'var(--text-label)',
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                        }}
                      >
                        <span style={{ marginRight: 8 }}>{isOpen ? '▼' : '▶'}</span>
                        {group.label}{' '}
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                          ({groupStudies.length})
                        </span>
                      </td>
                    </tr>
                    {isOpen &&
                      groupStudies.map((study) => {
                        const enrolled = study.enrollmentData.randomizations
                        const target = study.targetEnrollment
                        const pct = target > 0 ? Math.round((enrolled / target) * 100) : 0
                        const sig = enrollmentSignal(pct)
                        const pctColor =
                          sig === 'good'
                            ? 'var(--signal-good)'
                            : sig === 'warn'
                            ? 'var(--signal-warn)'
                            : 'var(--signal-alert)'
                        const statusStyle =
                          STATUS_STYLE[study.status as StudyStatus] ?? STATUS_STYLE.completed

                        return (
                          <tr
                            key={study.id}
                            style={{ borderBottom: '1px solid rgba(255 255 255 / 0.05)' }}
                          >
                            <td style={{ padding: '8px 10px', color: 'var(--text-primary)' }}>
                              {study.name}
                            </td>
                            <td
                              style={{
                                padding: '8px 10px',
                                textAlign: 'right',
                                color: 'var(--text-secondary)',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {enrolled} / {target}
                            </td>
                            <td
                              style={{
                                padding: '8px 10px',
                                textAlign: 'right',
                                fontWeight: 600,
                                color: pctColor,
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {pct}%
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                              <span
                                style={{
                                  ...statusStyle,
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  letterSpacing: '0.04em',
                                }}
                              >
                                {study.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </Panel>

      {/* Deviation Snapshot */}
      <Panel title="Deviation Snapshot">
        {deviations.length === 0 ? (
          <EmptyState
            title="No deviations recorded"
            body="Protocol deviations will appear here once logged."
          />
        ) : (
          <div>
            <HUDBarChart
              data={deviationChartData}
              xKey="name"
              yKey="value"
              height={160}
            />
            <div
              style={{
                display: 'flex',
                gap: 24,
                marginTop: 12,
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              <span>
                open{' '}
                <strong style={{ color: 'var(--signal-alert)' }}>{openDevCount}</strong>
              </span>
              <span>
                pi_reviewed{' '}
                <strong style={{ color: 'var(--signal-warn)' }}>{piReviewedCount}</strong>
              </span>
              <span>
                closed{' '}
                <strong style={{ color: 'var(--text-muted)' }}>{closedCount}</strong>
              </span>
            </div>
          </div>
        )}
      </Panel>
    </div>
  )
}
