import { Panel } from '@/components/hud/Panel'
import { Tile } from '@/components/hud/Tile'
import { Skeleton } from '@/components/hud/Skeleton'
import { EmptyState } from '@/components/hud/EmptyState'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import type { Visit, Study, Investigator } from '@/types'

type QualitySignal = 'good' | 'warn' | 'alert'

function completionSignal(pct: number): QualitySignal {
  if (pct >= 85) return 'good'
  if (pct >= 70) return 'warn'
  return 'alert'
}

function missedSignal(pct: number): QualitySignal {
  if (pct <= 5) return 'good'
  if (pct <= 15) return 'warn'
  return 'alert'
}

const signalColor: Record<QualitySignal, string> = {
  good: 'var(--signal-good)',
  warn: 'var(--signal-warn)',
  alert: 'var(--signal-alert)',
}

interface StudyRow {
  study: Study
  completed: number
  missed: number
  no_show: number
  total: number
  completionPct: number
}

interface InvestigatorRow {
  investigator: Investigator
  completed: number
  missed: number
  no_show: number
  total: number
  completionPct: number
}

interface DurationRow {
  study: Study
  avgScheduled: number
  avgActual: number
  variance: number
}

function buildStudyRows(visits: Visit[], studies: Study[]): StudyRow[] {
  const studyMap = new Map<string, Study>(studies.map((s) => [s.id, s]))
  const counts = new Map<string, { completed: number; missed: number; no_show: number; total: number }>()

  for (const v of visits) {
    if (v.status === 'scheduled') continue
    const existing = counts.get(v.studyId) ?? { completed: 0, missed: 0, no_show: 0, total: 0 }
    existing.total += 1
    if (v.status === 'completed') existing.completed += 1
    else if (v.status === 'missed') existing.missed += 1
    else if (v.status === 'no_show') existing.no_show += 1
    counts.set(v.studyId, existing)
  }

  const rows: StudyRow[] = []
  for (const [studyId, c] of counts) {
    const study = studyMap.get(studyId)
    if (!study) continue
    rows.push({
      study,
      ...c,
      completionPct: c.total > 0 ? (c.completed / c.total) * 100 : 0,
    })
  }

  return rows.sort((a, b) => a.completionPct - b.completionPct)
}

function buildInvestigatorRows(visits: Visit[], investigators: Investigator[]): InvestigatorRow[] {
  const invMap = new Map<string, Investigator>(investigators.map((i) => [i.id, i]))
  const counts = new Map<string, { completed: number; missed: number; no_show: number; total: number }>()

  for (const v of visits) {
    if (v.status === 'scheduled') continue
    const existing = counts.get(v.investigatorId) ?? { completed: 0, missed: 0, no_show: 0, total: 0 }
    existing.total += 1
    if (v.status === 'completed') existing.completed += 1
    else if (v.status === 'missed') existing.missed += 1
    else if (v.status === 'no_show') existing.no_show += 1
    counts.set(v.investigatorId, existing)
  }

  const rows: InvestigatorRow[] = []
  for (const [invId, c] of counts) {
    const investigator = invMap.get(invId)
    if (!investigator) continue
    rows.push({
      investigator,
      ...c,
      completionPct: c.total > 0 ? (c.completed / c.total) * 100 : 0,
    })
  }

  return rows.sort((a, b) => a.completionPct - b.completionPct)
}

function buildDurationRows(visits: Visit[], studies: Study[]): DurationRow[] {
  const studyMap = new Map<string, Study>(studies.map((s) => [s.id, s]))
  const data = new Map<string, { scheduledSum: number; actualSum: number; count: number }>()

  for (const v of visits) {
    if (v.status !== 'completed' || v.actualDurationMinutes === null) continue
    const existing = data.get(v.studyId) ?? { scheduledSum: 0, actualSum: 0, count: 0 }
    existing.scheduledSum += v.durationMinutes
    existing.actualSum += v.actualDurationMinutes
    existing.count += 1
    data.set(v.studyId, existing)
  }

  const rows: DurationRow[] = []
  for (const [studyId, d] of data) {
    if (d.count < 3) continue
    const study = studyMap.get(studyId)
    if (!study) continue
    const avgScheduled = d.scheduledSum / d.count
    const avgActual = d.actualSum / d.count
    rows.push({ study, avgScheduled, avgActual, variance: avgActual - avgScheduled })
  }

  return rows
}

function varianceColor(variance: number): string {
  const abs = Math.abs(variance)
  if (abs <= 10) return signalColor.good
  if (abs <= 20) return signalColor.warn
  return signalColor.alert
}

function fmt(n: number): string {
  return `${Math.round(n)}`
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-label)',
  paddingBottom: 8,
  borderBottom: '1px solid rgba(255 255 255 / 0.07)',
}

const tdStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-primary)',
  padding: '8px 0',
  borderBottom: '1px solid rgba(255 255 255 / 0.04)',
}

const tdMutedStyle: React.CSSProperties = {
  ...tdStyle,
  color: 'var(--text-secondary)',
}

export function VisitQualityTab() {
  const { visits, loading: visitsLoading } = useSiteVisits()
  const { studies, loading: studiesLoading } = useStudies()
  const { investigators, loading: investigatorsLoading } = useInvestigators()

  const loading = visitsLoading || studiesLoading || investigatorsLoading

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <Skeleton height={90} />
          <Skeleton height={90} />
          <Skeleton height={90} />
        </div>
        <Skeleton height={200} />
        <Skeleton height={200} />
        <Skeleton height={200} />
      </div>
    )
  }

  const historical = visits.filter((v) => v.status !== 'scheduled')
  const total = historical.length
  const completed = historical.filter((v) => v.status === 'completed').length
  const missed = historical.filter((v) => v.status === 'missed').length
  const noShow = historical.filter((v) => v.status === 'no_show').length

  const hasHistory = total > 0
  const completionPct = hasHistory ? (completed / total) * 100 : 0
  const missedPct = hasHistory ? (missed / total) * 100 : 0
  const noShowPct = hasHistory ? (noShow / total) * 100 : 0

  const studyRows = buildStudyRows(visits, studies)
  const investigatorRows = buildInvestigatorRows(visits, investigators)
  const durationRows = buildDurationRows(visits, studies)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Section 1 — Site-wide tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Tile
          label="Completion Rate"
          value={hasHistory ? `${Math.round(completionPct)}%` : '—'}
          signal={hasHistory ? completionSignal(completionPct) : 'neutral'}
        />
        <Tile
          label="Missed Rate"
          value={hasHistory ? `${Math.round(missedPct)}%` : '—'}
          signal={hasHistory ? missedSignal(missedPct) : 'neutral'}
        />
        <Tile
          label="No-Show Rate"
          value={hasHistory ? `${Math.round(noShowPct)}%` : '—'}
          signal={hasHistory ? missedSignal(noShowPct) : 'neutral'}
        />
      </div>

      {/* Section 2 — By study */}
      <Panel title="Visit Quality by Study">
        {studyRows.length === 0 ? (
          <EmptyState title="No visit history yet" />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Study</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Completed</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Missed</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>No-Show</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Completion %</th>
              </tr>
            </thead>
            <tbody>
              {studyRows.map((row) => {
                const sig = completionSignal(row.completionPct)
                return (
                  <tr key={row.study.id}>
                    <td style={tdStyle}>{row.study.name}</td>
                    <td style={{ ...tdMutedStyle, textAlign: 'right' }}>{row.completed}</td>
                    <td style={{ ...tdMutedStyle, textAlign: 'right' }}>{row.missed}</td>
                    <td style={{ ...tdMutedStyle, textAlign: 'right' }}>{row.no_show}</td>
                    <td style={{ ...tdMutedStyle, textAlign: 'right' }}>{row.total}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: signalColor[sig] }}>
                      {Math.round(row.completionPct)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Panel>

      {/* Section 3 — By investigator */}
      <Panel title="Visit Quality by Investigator">
        {investigatorRows.length === 0 ? (
          <EmptyState title="No visit history yet" />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Investigator</th>
                <th style={thStyle}>Role</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Completed</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Missed</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>No-Show</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Completion %</th>
              </tr>
            </thead>
            <tbody>
              {investigatorRows.map((row) => {
                const sig = completionSignal(row.completionPct)
                return (
                  <tr key={row.investigator.id}>
                    <td style={tdStyle}>{row.investigator.name}</td>
                    <td style={tdMutedStyle}>{row.investigator.role}</td>
                    <td style={{ ...tdMutedStyle, textAlign: 'right' }}>{row.completed}</td>
                    <td style={{ ...tdMutedStyle, textAlign: 'right' }}>{row.missed}</td>
                    <td style={{ ...tdMutedStyle, textAlign: 'right' }}>{row.no_show}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: signalColor[sig] }}>
                      {Math.round(row.completionPct)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Panel>

      {/* Section 4 — Duration accuracy */}
      <Panel title="Duration Accuracy">
        {durationRows.length === 0 ? (
          <EmptyState title="No actual duration data recorded" />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Study</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Avg Scheduled (min)</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Avg Actual (min)</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Variance</th>
              </tr>
            </thead>
            <tbody>
              {durationRows.map((row) => {
                const varStr = `${row.variance >= 0 ? '+' : ''}${fmt(row.variance)}`
                return (
                  <tr key={row.study.id}>
                    <td style={tdStyle}>{row.study.name}</td>
                    <td style={{ ...tdMutedStyle, textAlign: 'right' }}>{fmt(row.avgScheduled)}</td>
                    <td style={{ ...tdMutedStyle, textAlign: 'right' }}>{fmt(row.avgActual)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: varianceColor(row.variance) }}>
                      {varStr}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  )
}
