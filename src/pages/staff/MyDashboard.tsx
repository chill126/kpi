import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useDelegationLog } from '@/hooks/useDelegationLog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/hud/EmptyState'
import { Calendar } from 'lucide-react'
import type { DelegationLog, Investigator, Study, Visit, VisitStatus } from '@/types'

const TILE_LABEL: React.CSSProperties = {
  fontFamily: 'Inter, system-ui', fontSize: 10.5, fontWeight: 500,
  letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-label)',
}

const TILE_VALUE: React.CSSProperties = {
  fontFamily: 'Geist, Inter, system-ui', fontSize: 32, fontWeight: 300,
  letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--text-primary)',
  fontFeatureSettings: '"tnum"', marginTop: 2,
}

const TILE_SUB: React.CSSProperties = {
  marginTop: 6, fontSize: 11.5, color: 'var(--text-muted)',
}

const VISIT_STATUS_HUD: Record<VisitStatus, React.CSSProperties> = {
  scheduled: { color: 'var(--text-primary)', background: 'rgba(255 255 255 / 0.08)' },
  completed: { color: 'var(--signal-good)', background: 'rgba(52 211 153 / 0.12)' },
  missed: { color: 'var(--signal-alert)', background: 'rgba(248 113 113 / 0.12)' },
  no_show: { color: 'var(--signal-alert)', background: 'rgba(248 113 113 / 0.12)' },
}

const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  missed: 'Missed',
  no_show: 'No Show',
}

const TAB_TRIGGER_CLASS =
  'rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3 px-4 text-sm font-medium'

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' })
}

function isUpcomingVisit(visit: Visit, start: string, end: string): boolean {
  return (
    visit.scheduledDate >= start &&
    visit.scheduledDate <= end &&
    visit.status !== 'completed' &&
    visit.status !== 'missed'
  )
}

interface DelegationCounterProps {
  studyId: string
  onCount: (studyId: string, count: number) => void
}

function DelegationCounter({ studyId, onCount }: DelegationCounterProps) {
  const { entries } = useDelegationLog(studyId)
  useEffect(() => {
    const total = entries.reduce((sum, entry) => sum + entry.delegatedTasks.length, 0)
    onCount(studyId, total)
  }, [studyId, entries, onCount])
  return null
}

interface DelegationSummaryForStudyProps {
  study: Study
  investigators: Investigator[]
}

function DelegationSummaryForStudy({ study, investigators }: DelegationSummaryForStudyProps) {
  const { entries, loading } = useDelegationLog(study.id)

  const invMap = useMemo(
    () => Object.fromEntries(investigators.map((i) => [i.id, i])),
    [investigators],
  )

  return (
    <div className="glass" style={{ padding: 16 }}>
      <div style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{study.name}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
          {study.sponsor} · {study.phase}
        </p>
      </div>

      {loading ? (
        <div className="glass" style={{ height: 40 }} />
      ) : entries.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No delegation entries for this study.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {entries.map((entry: DelegationLog) => (
            <li
              key={entry.id}
              style={{ padding: '10px 0', borderTop: '1px solid rgba(255 255 255 / 0.06)', fontSize: 13 }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {invMap[entry.investigatorId]?.name ?? entry.investigatorId}
                  </p>
                  <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)' }}>
                    {entry.delegatedTasks.join(', ')}
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {entry.effectiveDate}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function MyDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { studies, loading: studiesLoading } = useStudies()
  const { investigators } = useInvestigators()
  const { visits, loading: visitsLoading } = useSiteVisits()

  const assignedStudyIds = useMemo(() => user?.assignedStudies ?? [], [user])

  const myStudies = useMemo(
    () => studies.filter((s) => assignedStudyIds.includes(s.id)),
    [studies, assignedStudyIds],
  )

  const today = todayIso()
  const horizonEnd = addDaysIso(today, 14)

  const upcomingVisits = useMemo(
    () =>
      visits
        .filter((v) => assignedStudyIds.includes(v.studyId) && isUpcomingVisit(v, today, horizonEnd))
        .slice()
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)),
    [visits, assignedStudyIds, today, horizonEnd],
  )

  const studyNameById = useMemo(
    () => Object.fromEntries(studies.map((s) => [s.id, s.name])),
    [studies],
  )

  const [delegationCounts, setDelegationCounts] = useState<Record<string, number>>({})

  const handleDelegationCount = useMemo(
    () => (studyId: string, count: number) => {
      setDelegationCounts((prev) => (prev[studyId] === count ? prev : { ...prev, [studyId]: count }))
    },
    [],
  )

  const totalDelegatedTasks = useMemo(
    () => assignedStudyIds.reduce((sum, id) => sum + (delegationCounts[id] ?? 0), 0),
    [assignedStudyIds, delegationCounts],
  )

  const loading = studiesLoading || visitsLoading

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="glass" style={{ height: 32, width: 200 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[0, 1, 2].map(i => <div key={i} className="glass" style={{ height: 100 }} />)}
        </div>
        <div className="glass" style={{ height: 280 }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hidden counters — each subscribes to one study's delegation log */}
      <div aria-hidden="true" style={{ display: 'none' }}>
        {assignedStudyIds.map((id) => (
          <DelegationCounter key={id} studyId={id} onCount={handleDelegationCount} />
        ))}
      </div>

      <div>
        <h1 style={{
          margin: 0, fontFamily: 'Geist, Inter, system-ui', fontSize: 24,
          fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-primary)',
        }}>My Dashboard</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
          Your workload, schedule, and study assignments.
        </p>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/my-studies')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/my-studies')}
          className="glass"
          style={{ padding: '16px 18px 18px', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={TILE_LABEL}>Assigned Studies</div>
          <div style={TILE_VALUE}>{assignedStudyIds.length}</div>
          <div style={TILE_SUB}>View all →</div>
        </div>

        <div className="glass" style={{ padding: '16px 18px 18px' }}>
          <div style={TILE_LABEL}>Upcoming Visits (14 days)</div>
          <div style={TILE_VALUE}>{upcomingVisits.length}</div>
          <div style={TILE_SUB}>Across your assigned studies</div>
        </div>

        <div className="glass" style={{ padding: '16px 18px 18px' }}>
          <div style={TILE_LABEL}>Delegated Tasks</div>
          <div style={TILE_VALUE}>{totalDelegatedTasks}</div>
          <div style={TILE_SUB}>Across all assigned studies</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming">
        <TabsList
          className="border-b w-full justify-start rounded-none bg-transparent h-auto p-0 gap-0"
          style={{ borderColor: 'rgba(255 255 255 / 0.08)' }}
        >
          <TabsTrigger value="upcoming" className={TAB_TRIGGER_CLASS}
            style={{ color: 'var(--text-secondary)' }}>
            Upcoming Visits
          </TabsTrigger>
          <TabsTrigger value="delegation" className={TAB_TRIGGER_CLASS}
            style={{ color: 'var(--text-secondary)' }}>
            Delegation Authority
          </TabsTrigger>
          <TabsTrigger value="studies" className={TAB_TRIGGER_CLASS}
            style={{ color: 'var(--text-secondary)' }}>
            My Studies Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <div style={{ paddingTop: 16 }}>
            {upcomingVisits.length === 0 ? (
              <EmptyState
                icon={<Calendar size={28} />}
                title="No upcoming visits in the next 14 days."
              />
            ) : (
              <div className="glass" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['Study', 'Visit Type', 'Scheduled Date', 'Status', 'Duration'].map(h => (
                        <th key={h} style={{
                          padding: '10px 12px',
                          textAlign: h === 'Duration' ? 'right' : 'left',
                          fontSize: 10.5, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
                          color: 'var(--text-label)',
                          borderBottom: '1px solid rgba(255 255 255 / 0.08)',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingVisits.map((visit: Visit, i: number) => (
                      <tr
                        key={visit.id}
                        style={{ background: i % 2 === 1 ? 'rgba(255 255 255 / 0.02)' : undefined }}
                      >
                        <td style={{ padding: '9px 12px', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui', fontSize: 13, fontWeight: 500 }}>
                          {studyNameById[visit.studyId] ?? visit.studyId}
                        </td>
                        <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{visit.visitType}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{formatDate(visit.scheduledDate)}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center',
                            padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 500,
                            ...VISIT_STATUS_HUD[visit.status],
                          }}>
                            {VISIT_STATUS_LABEL[visit.status]}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {visit.durationMinutes}m
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="delegation">
          <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {myStudies.length === 0 ? (
              <EmptyState title="No assigned studies." />
            ) : (
              myStudies.map((study) => (
                <DelegationSummaryForStudy
                  key={study.id}
                  study={study}
                  investigators={investigators}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="studies">
          <div style={{ paddingTop: 16 }}>
            {myStudies.length === 0 ? (
              <EmptyState title="No assigned studies." />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {myStudies.map((study) => {
                  const enrolled = study.enrollmentData?.randomizations ?? 0
                  const pct =
                    study.targetEnrollment > 0
                      ? Math.min(100, Math.round((enrolled / study.targetEnrollment) * 100))
                      : 0
                  return (
                    <div key={study.id} className="glass" style={{ padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {study.name}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                            {study.sponsor} · {study.phase}
                          </p>
                        </div>
                        <StatusBadge status={study.status} />
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-label)' }}>
                            Enrollment
                          </span>
                          <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
                            {enrolled} / {study.targetEnrollment}
                          </span>
                        </div>
                        <div style={{ height: 4, borderRadius: 4, background: 'rgba(255 255 255 / 0.08)' }}>
                          <div style={{ height: 4, borderRadius: 4, background: 'var(--signal-good)', width: `${pct}%` }} />
                        </div>
                      </div>

                      <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', marginBottom: 10 }}>
                        {study.startDate} → {study.expectedEndDate}
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/studies/${study.id}`)}
                        style={{ fontSize: 12, fontWeight: 500, color: 'var(--signal-good)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        View details →
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
