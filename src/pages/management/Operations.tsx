import { useMemo, useState } from 'react'
import { Activity, CalendarDays } from 'lucide-react'
import { useBoardSessions } from '@/hooks/useBoardSessions'
import { useK2BoardToday } from '@/hooks/useK2BoardToday'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import { Panel } from '@/components/hud/Panel'
import { Tile } from '@/components/hud/Tile'
import { HUDBarChart } from '@/components/hud/charts/HUDBarChart'
import { HUDLineChart } from '@/components/hud/charts/HUDLineChart'
import { EmptyState } from '@/components/hud/EmptyState'
import { ErrorState } from '@/components/hud/ErrorState'
import { Skeleton } from '@/components/hud/Skeleton'

type PeriodKey = '1m' | '3m' | '6m' | 'ytd'

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: 'ytd', label: 'YTD' },
]

type GranularityKey = 'day' | 'week' | 'month'

const GRANULARITIES: Array<{ key: GranularityKey; label: string }> = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
]

function PeriodSelector({ value, onChange }: { value: PeriodKey; onChange: (p: PeriodKey) => void }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {PERIODS.map(p => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          style={{
            padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
            background: value === p.key ? 'var(--accent-primary)' : 'rgba(255 255 255 / 0.06)',
            color: value === p.key ? 'oklch(0.09 0.015 275)' : 'var(--text-secondary)',
            border: 'none', cursor: 'pointer',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

function GranularitySelector({ value, onChange }: { value: GranularityKey; onChange: (g: GranularityKey) => void }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {GRANULARITIES.map(g => (
        <button
          key={g.key}
          onClick={() => onChange(g.key)}
          style={{
            padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
            background: value === g.key ? 'var(--accent-primary)' : 'rgba(255 255 255 / 0.06)',
            color: value === g.key ? 'oklch(0.09 0.015 275)' : 'var(--text-secondary)',
            border: 'none', cursor: 'pointer',
          }}
        >
          {g.label}
        </button>
      ))}
    </div>
  )
}

function filterByPeriod<T extends { sessionDate: string }>(sessions: T[], period: PeriodKey): T[] {
  const now = new Date()
  let cutoff: Date
  if (period === '1m') cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  else if (period === '3m') cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
  else if (period === '6m') cutoff = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
  else {
    cutoff = new Date(now.getFullYear(), 0, 1)
  }
  const cutoffStr = cutoff.toISOString().split('T')[0]
  return sessions.filter(s => s.sessionDate >= cutoffStr)
}

function filterByGranularity<T extends { sessionDate: string }>(sessions: T[], granularity: GranularityKey): T[] {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (granularity === 'day') {
    return sessions.filter(s => s.sessionDate === todayStr)
  }
  if (granularity === 'week') {
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    return sessions.filter(s => s.sessionDate >= cutoffStr)
  }
  return sessions
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  checked_in: 'Checked In',
  with_coordinator: 'With Coordinator',
  in_ratings: 'In Ratings',
  in_procedures: 'In Procedures',
  ip_dosing: 'IP Dosing',
  observation: 'Observation',
  discharge_ready: 'Discharge Ready',
  left: 'Left',
  ooo_appts: 'OOO / Appts',
  no_show: 'No Show',
}

const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'Inter, system-ui',
  fontSize: 10.5,
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--text-label)',
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDuration(min: number | null): string {
  return min !== null ? `${min}m` : '—'
}

export function Operations() {
  const { sessions, loading: sessionsLoading, error: sessionsError, circuitOpen: sessionsCircuitOpen } = useBoardSessions()
  const { entries, loading: boardLoading, error: boardError, circuitOpen: boardCircuitOpen } = useK2BoardToday()

  // ── Time range / granularity state ───────────────────────────────────────
  const [period, setPeriod] = useState<PeriodKey>('3m')
  const [arrivalGranularity, setArrivalGranularity] = useState<GranularityKey>('month')
  const [investigatorGranularity, setInvestigatorGranularity] = useState<GranularityKey>('month')

  // ── Historical derived data ──────────────────────────────────────────────
  const filteredSessions = useMemo(() => filterByPeriod(sessions, period), [sessions, period])

  const chronological = useMemo(() => [...filteredSessions].reverse(), [filteredSessions])

  const { aggregateScheduled, aggregateNoShows } = useMemo(() => ({
    aggregateScheduled: filteredSessions.reduce((s, x) => s + x.metrics.totalScheduled, 0),
    aggregateNoShows: filteredSessions.reduce((s, x) => s + x.metrics.noShows, 0),
  }), [filteredSessions])

  const avgNoShowPct = aggregateScheduled > 0
    ? Math.round(aggregateNoShows / aggregateScheduled * 100)
    : null

  const avgDurationMin = useMemo(() => {
    const withDuration = filteredSessions.filter(s => s.metrics.avgVisitDurationMin !== null)
    if (withDuration.length === 0) return null
    const total = withDuration.reduce((s, x) => s + (x.metrics.avgVisitDurationMin ?? 0), 0)
    return Math.round(total / withDuration.length)
  }, [filteredSessions])

  const noShowRateData = useMemo(() =>
    chronological.map(s => ({
      date: fmtDate(s.sessionDate),
      pct: s.metrics.totalScheduled > 0
        ? Math.round(s.metrics.noShows / s.metrics.totalScheduled * 100)
        : 0,
    })),
    [chronological],
  )

  const durationData = useMemo(() =>
    chronological
      .filter(s => s.metrics.avgVisitDurationMin !== null)
      .map(s => ({ date: fmtDate(s.sessionDate), min: s.metrics.avgVisitDurationMin as number })),
    [chronological],
  )

  const byStudyData = useMemo(() => {
    const scoped = filterByGranularity(sessions, arrivalGranularity)
    const map: Record<string, number> = {}
    for (const s of scoped) {
      for (const [study, m] of Object.entries(s.metrics.byStudy ?? {})) {
        map[study] = (map[study] ?? 0) + m.arrivals
      }
    }
    return Object.entries(map)
      .map(([study, arrivals]) => ({ study, arrivals }))
      .sort((a, b) => b.arrivals - a.arrivals)
      .slice(0, 10)
  }, [sessions, arrivalGranularity])

  const byInvestigatorData = useMemo(() => {
    const scoped = filterByGranularity(sessions, investigatorGranularity)
    const map: Record<string, number> = {}
    for (const s of scoped) {
      for (const [name, m] of Object.entries(s.metrics.byInvestigator ?? {})) {
        map[name] = (map[name] ?? 0) + m.visits
      }
    }
    return Object.entries(map)
      .map(([name, visits]) => ({ name, visits }))
      .sort((a, b) => b.visits - a.visits)
  }, [sessions, investigatorGranularity])

  // ── Live today derived data ──────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const entry of entries) {
      counts[entry.status] = (counts[entry.status] ?? 0) + 1
    }
    return counts
  }, [entries])

  const activeCount = useMemo(
    () => entries.filter(e => !['scheduled', 'left', 'no_show'].includes(e.status)).length,
    [entries],
  )

  // ── Section C: Today's Data Entry ────────────────────────────────────────
  const { visits, loading: visitsLoading } = useSiteVisits()
  const { assessments, loading: assessmentsLoading } = useSiteAssessments()
  const { studies } = useStudies()
  const { investigators } = useInvestigators()
  const sectionCLoading = visitsLoading || assessmentsLoading

  const todayStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  const studyNameById = useMemo(
    () => Object.fromEntries(studies.map((s) => [s.id, s.name])),
    [studies],
  )

  const invNameById = useMemo(
    () => Object.fromEntries(investigators.map((i) => [i.id, i.name])),
    [investigators],
  )

  interface TodayEntry {
    key: string
    type: 'Visit' | 'Assessment'
    participant: string
    label: string
    study: string
    investigator: string
    status: string
    duration: number
  }

  const todayEntries = useMemo<TodayEntry[]>(() => {
    const visitEntries: TodayEntry[] = visits
      .filter((v) => v.status === 'completed' && v.completedDate === todayStr)
      .map((v) => ({
        key: v.id,
        type: 'Visit',
        participant: v.participantId,
        label: v.visitType,
        study: studyNameById[v.studyId] ?? v.studyId,
        investigator: invNameById[v.investigatorId] ?? v.investigatorId,
        status: v.status,
        duration: v.actualDurationMinutes ?? v.durationMinutes,
      }))

    const assessmentEntries: TodayEntry[] = assessments
      .filter((a) => a.date === todayStr)
      .map((a) => ({
        key: a.id,
        type: 'Assessment',
        participant: '—',
        label: a.scaleType,
        study: studyNameById[a.studyId] ?? a.studyId,
        investigator: invNameById[a.investigatorId] ?? a.investigatorId,
        status: 'completed',
        duration: a.durationMinutes,
      }))

    return [...visitEntries, ...assessmentEntries].sort((a, b) =>
      a.study.localeCompare(b.study),
    )
  }, [visits, assessments, todayStr, studyNameById, invNameById])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{
          margin: 0, fontFamily: 'Geist, Inter, system-ui', fontSize: 24,
          fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-primary)',
        }}>Operations</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
          Board session history and live participant flow.
        </p>
      </div>

      {/* ── Section B: Live Today ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={SECTION_LABEL_STYLE}>Live Today — k2 Board</div>

        <Panel
          title="Participant Flow"
          action={
            entries.length > 0 ? (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {entries.length} total · {activeCount} active
              </span>
            ) : undefined
          }
        >
          {boardCircuitOpen && (
            <div style={{
              background: 'rgba(245 158 11 / 0.12)',
              border: '1px solid rgba(245 158 11 / 0.35)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 14,
              fontSize: 13, color: 'var(--signal-warn)',
            }}>
              ▲ Live subscription paused — snapshot rate exceeded. Auto-retrying in ~2 min.
            </div>
          )}

          {boardLoading && !boardCircuitOpen ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="glass" style={{ height: 72 }} />
              ))}
            </div>
          ) : boardError && !boardCircuitOpen ? (
            <ErrorState message={boardError.message} />
          ) : entries.length === 0 ? (
            <EmptyState
              icon={<Activity size={28} />}
              title="No participants yet today"
              body="Entries will appear here as participants check in on the k2 board."
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {Object.entries(STATUS_LABELS).map(([status, label]) => {
                const count = statusCounts[status] ?? 0
                if (count === 0) return null
                return (
                  <Tile
                    key={status}
                    label={label}
                    value={count}
                    signal={
                      status === 'no_show' ? 'alert'
                      : status === 'discharge_ready' ? 'warn'
                      : 'neutral'
                    }
                  />
                )
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* ── Section A: Historical ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={SECTION_LABEL_STYLE}>Historical — Board Sessions</div>

        {sessionsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[0, 1, 2].map(i => (
              <div key={i} className="glass" style={{ height: 100 }} />
            ))}
          </div>
        ) : sessionsCircuitOpen ? (
          <Panel title="Board Sessions">
            <div style={{
              background: 'rgba(245 158 11 / 0.12)',
              border: '1px solid rgba(245 158 11 / 0.35)',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: 'var(--signal-warn)',
            }}>
              ▲ Subscription paused — snapshot rate exceeded. Auto-retrying in ~1 min.
            </div>
          </Panel>
        ) : sessionsError ? (
          <Panel title="Board Sessions">
            <ErrorState message={sessionsError.message} />
          </Panel>
        ) : sessions.length === 0 ? (
          <Panel title="Board Sessions">
            <EmptyState
              icon={<CalendarDays size={32} />}
              title="No sessions imported"
              body="Import a k2 Board Session XLSX from the Import page to see historical metrics."
            />
          </Panel>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <Tile label="Total Sessions" value={sessions.length} />
              <Tile
                label="Avg No-Show Rate"
                value={avgNoShowPct ?? '—'}
                suffix={avgNoShowPct !== null ? '%' : undefined}
                signal={
                  avgNoShowPct === null ? 'neutral'
                  : avgNoShowPct >= 20 ? 'alert'
                  : avgNoShowPct >= 10 ? 'warn'
                  : 'good'
                }
              />
              <Tile
                label="Avg Visit Duration"
                value={avgDurationMin ?? '—'}
                suffix={avgDurationMin !== null ? ' min' : undefined}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Panel
                title="No-Show Rate Over Time"
                action={<PeriodSelector value={period} onChange={setPeriod} />}
              >
                {noShowRateData.length < 2 ? (
                  <EmptyState title="Not enough sessions" body="Need at least 2 sessions for trend data." />
                ) : (
                  <HUDLineChart
                    data={noShowRateData}
                    xKey="date"
                    yKey="pct"
                    valueFormatter={v => `${v}%`}
                  />
                )}
              </Panel>
              <Panel
                title="Avg Visit Duration Over Time"
                action={<PeriodSelector value={period} onChange={setPeriod} />}
              >
                {durationData.length < 2 ? (
                  <EmptyState title="Not enough data" body="Need at least 2 sessions with duration data." />
                ) : (
                  <HUDLineChart
                    data={durationData}
                    xKey="date"
                    yKey="min"
                    valueFormatter={v => `${v}m`}
                  />
                )}
              </Panel>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Panel
                title="Arrivals by Study"
                action={<GranularitySelector value={arrivalGranularity} onChange={setArrivalGranularity} />}
              >
                {byStudyData.length === 0 ? (
                  <EmptyState title="No study data" />
                ) : (
                  <HUDBarChart data={byStudyData} xKey="study" yKey="arrivals" />
                )}
              </Panel>
              <Panel
                title="Visits by Investigator"
                action={<GranularitySelector value={investigatorGranularity} onChange={setInvestigatorGranularity} />}
              >
                {byInvestigatorData.length === 0 ? (
                  <EmptyState title="No investigator data" />
                ) : (
                  <HUDBarChart data={byInvestigatorData} xKey="name" yKey="visits" />
                )}
              </Panel>
            </div>

            <Panel title="Session Log">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['Date', 'Scheduled', 'Arrivals', 'Completed', 'No-Shows', 'No-Show %', 'Avg Duration'].map(h => (
                        <th
                          key={h}
                          scope="col"
                          style={{
                            padding: '0 12px 8px 0', textAlign: 'left', fontWeight: 500,
                            fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase',
                            color: 'var(--text-label)',
                            borderBottom: '1px solid rgba(255 255 255 / 0.08)',
                          }}
                        >{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.slice(0, 20).map((s, i) => {
                      const noShowPct = s.metrics.totalScheduled > 0
                        ? Math.round(s.metrics.noShows / s.metrics.totalScheduled * 100)
                        : null
                      return (
                        <tr
                          key={s.id}
                          style={{ background: i % 2 === 1 ? 'rgba(255 255 255 / 0.02)' : undefined }}
                        >
                          <td style={{ padding: '8px 12px 8px 0', color: 'var(--text-primary)' }}>
                            {fmtDate(s.sessionDate)}
                          </td>
                          <td style={{ padding: '8px 12px 8px 0', color: 'var(--text-secondary)' }}>
                            {s.metrics.totalScheduled}
                          </td>
                          <td style={{ padding: '8px 12px 8px 0', color: 'var(--text-secondary)' }}>
                            {s.metrics.arrivals}
                          </td>
                          <td style={{ padding: '8px 12px 8px 0', color: 'var(--text-secondary)' }}>
                            {s.metrics.completedVisits}
                          </td>
                          <td style={{ padding: '8px 12px 8px 0', color: 'var(--text-secondary)' }}>
                            {s.metrics.noShows}
                          </td>
                          <td style={{
                            padding: '8px 12px 8px 0',
                            color: noShowPct === null ? 'var(--text-muted)'
                              : noShowPct >= 20 ? 'var(--signal-alert)'
                              : noShowPct >= 10 ? 'var(--signal-warn)'
                              : 'var(--text-primary)',
                          }}>
                            {noShowPct !== null ? `${noShowPct}%` : '—'}
                          </td>
                          <td style={{ padding: '8px 12px 8px 0', color: 'var(--text-secondary)' }}>
                            {fmtDuration(s.metrics.avgVisitDurationMin)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}
      </div>

      {/* ── Section C: Today's Data Entry ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={SECTION_LABEL_STYLE}>Today's Data Entry</div>

        <Panel
          title="Logged Entries"
          action={
            todayEntries.length > 0 ? (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {todayEntries.length} {todayEntries.length === 1 ? 'entry' : 'entries'} today
              </span>
            ) : undefined
          }
        >
          {sectionCLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[0, 1, 2].map((i) => <Skeleton key={i} height={36} rounded={6} />)}
            </div>
          ) : todayEntries.length === 0 ? (
            <EmptyState title="No entries logged today" body="Staff data-entry submissions appear here." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Type', 'Study', 'Investigator', 'Visit / Scale', 'Status', 'Duration'].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        style={{
                          padding: '0 12px 8px 0', textAlign: 'left', fontWeight: 500,
                          fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase',
                          color: 'var(--text-label)',
                          borderBottom: '1px solid rgba(255 255 255 / 0.08)',
                        }}
                      >{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {todayEntries.map((entry, i) => (
                    <tr key={entry.key} style={{ background: i % 2 === 1 ? 'rgba(255 255 255 / 0.02)' : undefined }}>
                      <td style={{ padding: '8px 12px 8px 0' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 99,
                          background: entry.type === 'Visit' ? 'rgba(114 90 193 / 0.15)' : 'rgba(22 163 74 / 0.12)',
                          color: entry.type === 'Visit' ? 'var(--accent-primary)' : 'var(--signal-good)',
                          border: entry.type === 'Visit' ? '1px solid rgba(114 90 193 / 0.3)' : '1px solid rgba(22 163 74 / 0.25)',
                        }}>
                          {entry.type}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px 8px 0', color: 'var(--text-primary)' }}>{entry.study}</td>
                      <td style={{ padding: '8px 12px 8px 0', color: 'var(--text-secondary)' }}>{entry.investigator}</td>
                      <td style={{ padding: '8px 12px 8px 0', color: 'var(--text-secondary)' }}>{entry.label}</td>
                      <td style={{ padding: '8px 12px 8px 0', color: 'var(--text-secondary)' }}>{entry.status}</td>
                      <td style={{ padding: '8px 12px 8px 0', color: 'var(--text-secondary)' }}>{entry.duration} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

    </div>
  )
}
