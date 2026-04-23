import { Panel } from '@/components/hud/Panel'
import { Tile } from '@/components/hud/Tile'
import { Skeleton } from '@/components/hud/Skeleton'
import { EmptyState } from '@/components/hud/EmptyState'
import { HUDBarChart } from '@/components/hud/charts/HUDBarChart'
import { useStudies } from '@/hooks/useStudies'
import { useAllScreenFailures } from '@/hooks/useAllScreenFailures'
import type { Study, ScreenFailure } from '@/types'

const STATUS_ORDER: Record<string, number> = {
  enrolling: 0,
  paused: 1,
  maintenance: 2,
  on_hold: 3,
  completed: 4,
}

function formatCategory(raw: string): string {
  return raw.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

function screenFailRate(
  study: Study,
  failures: ScreenFailure[],
): { label: string; signal: 'good' | 'warn' | 'alert' } {
  const screens = study.enrollmentData.screens
  if (screens === 0) return { label: '—', signal: 'good' }
  const count = failures.filter((f) => f.studyId === study.id).length
  const pct = (count / screens) * 100
  const label = `${Math.round(pct)}%`
  const signal = pct >= 40 ? 'alert' : pct >= 20 ? 'warn' : 'good'
  return { label, signal }
}

function pctOfTarget(
  study: Study,
): { label: string; signal: 'good' | 'warn' | 'alert' } {
  const pct = study.targetEnrollment > 0
    ? (study.enrollmentData.randomizations / study.targetEnrollment) * 100
    : 0
  const label = `${Math.round(pct)}%`
  const signal = pct >= 80 ? 'good' : pct >= 50 ? 'warn' : 'alert'
  return { label, signal }
}

const SIGNAL_COLOR: Record<'good' | 'warn' | 'alert', string> = {
  good: 'var(--signal-good)',
  warn: 'var(--signal-warn)',
  alert: 'var(--signal-alert)',
}

interface FailureCategoryDatum {
  category: string
  count: number
}

function buildCategoryData(failures: ScreenFailure[]): FailureCategoryDatum[] {
  const counts: Record<string, number> = {}
  for (const failure of failures) {
    for (const reason of failure.reasons) {
      const key = formatCategory(reason.category)
      counts[key] = (counts[key] ?? 0) + 1
    }
  }
  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
}

export function EnrollmentTab() {
  const { studies, loading: studiesLoading } = useStudies()
  const { failures, loading: failuresLoading } = useAllScreenFailures()

  const loading = studiesLoading || failuresLoading

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Skeleton height={28} width={240} />
        <Skeleton height={200} />
      </div>
    )
  }

  const totalPrescreens = studies.reduce(
    (sum, s) => sum + s.enrollmentData.prescreens,
    0,
  )
  const totalScreens = studies.reduce(
    (sum, s) => sum + s.enrollmentData.screens,
    0,
  )
  const totalRandomizations = studies.reduce(
    (sum, s) => sum + s.enrollmentData.randomizations,
    0,
  )
  const totalActive = studies.reduce(
    (sum, s) => sum + s.enrollmentData.active,
    0,
  )

  const screenRandRate: string =
    totalScreens > 0
      ? `${((totalRandomizations / totalScreens) * 100).toFixed(0)}%`
      : '—'
  const screenRandSignal: 'good' | 'warn' | 'alert' | 'neutral' =
    totalScreens === 0
      ? 'neutral'
      : totalRandomizations / totalScreens >= 0.6
      ? 'good'
      : totalRandomizations / totalScreens >= 0.4
      ? 'warn'
      : 'alert'

  const sortedStudies = [...studies].sort(
    (a, b) =>
      (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99),
  )

  const categoryData = buildCategoryData(failures)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Section 1 — Summary Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Tile
          label="Total Prescreens"
          value={totalPrescreens}
          signal="neutral"
        />
        <Tile
          label="Screen→Rand Rate"
          value={screenRandRate}
          signal={screenRandSignal}
        />
        <Tile
          label="Active Participants"
          value={totalActive}
          signal={totalActive > 0 ? 'good' : 'neutral'}
        />
      </div>

      {/* Section 2 — Enrollment Funnel by Study */}
      <Panel title="Enrollment Funnel by Study">
        {sortedStudies.length === 0 ? (
          <EmptyState title="No studies" body="No studies are currently configured." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12,
              color: 'var(--text-primary)',
            }}>
              <thead>
                <tr>
                  {[
                    'Study', 'Prescreens', 'Screens', 'Randomized',
                    'Active', 'Completions', 'Screen Fail Rate', 'Pct of Target',
                  ].map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: '6px 10px',
                        textAlign: col === 'Study' ? 'left' : 'right',
                        fontFamily: 'Inter, system-ui',
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'var(--text-label)',
                        borderBottom: '1px solid rgba(255 255 255 / 0.08)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedStudies.map((study) => {
                  const sfr = screenFailRate(study, failures)
                  const pot = pctOfTarget(study)
                  const { prescreens, screens, randomizations, active, completions } =
                    study.enrollmentData
                  return (
                    <tr key={study.id}>
                      <td style={{ padding: '7px 10px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {study.name}
                      </td>
                      {[prescreens, screens, randomizations, active, completions].map((v, i) => (
                        <td
                          key={i}
                          style={{
                            padding: '7px 10px',
                            textAlign: 'right',
                            color: 'var(--text-secondary)',
                            fontFeatureSettings: '"tnum"',
                          }}
                        >
                          {v}
                        </td>
                      ))}
                      <td style={{
                        padding: '7px 10px',
                        textAlign: 'right',
                        color: SIGNAL_COLOR[sfr.signal],
                        fontFeatureSettings: '"tnum"',
                      }}>
                        {sfr.label}
                      </td>
                      <td style={{
                        padding: '7px 10px',
                        textAlign: 'right',
                        color: SIGNAL_COLOR[pot.signal],
                        fontFeatureSettings: '"tnum"',
                      }}>
                        {pot.label}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Section 3 — Screen Failure Reasons */}
      <Panel title="Screen Failure Reasons (Site-Wide)">
        {categoryData.length === 0 ? (
          <EmptyState title="No screen failures recorded" />
        ) : (
          <HUDBarChart
            data={categoryData}
            xKey="category"
            yKey="count"
            height={200}
          />
        )}
      </Panel>
    </div>
  )
}
