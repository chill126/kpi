import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useDelegationLog } from '@/hooks/useDelegationLog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookMarked, Calendar, ClipboardList } from 'lucide-react'
import type { DelegationLog, Investigator, Study, Visit, VisitStatus } from '@/types'

const CARD_CLASS =
  'bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4'

const VISIT_STATUS_STYLES: Record<VisitStatus, string> = {
  scheduled: 'bg-teal-50 text-teal-700 border border-teal-200',
  completed: 'bg-green-50 text-green-700 border border-green-200',
  missed: 'bg-red-50 text-red-700 border border-red-200',
  no_show: 'bg-red-50 text-red-700 border border-red-200',
}

const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  missed: 'Missed',
  no_show: 'No Show',
}

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
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
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

// Renders nothing; subscribes to one study's delegation log and reports its task count up.
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
    <div className={`${CARD_CLASS} space-y-3`}>
      <div>
        <p className="font-semibold text-slate-800 dark:text-slate-100">{study.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {study.sponsor} · {study.phase}
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-10 w-full" />
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No delegation entries for this study.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {entries.map((entry: DelegationLog) => (
            <li key={entry.id} className="py-2.5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {invMap[entry.investigatorId]?.name ?? entry.investigatorId}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    {entry.delegatedTasks.join(', ')}
                  </p>
                </div>
                <p className="text-xs text-slate-400 font-mono whitespace-nowrap">
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
        .filter(
          (v) => assignedStudyIds.includes(v.studyId) && isUpcomingVisit(v, today, horizonEnd),
        )
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
    () =>
      assignedStudyIds.reduce((sum, id) => sum + (delegationCounts[id] ?? 0), 0),
    [assignedStudyIds, delegationCounts],
  )

  const loading = studiesLoading || visitsLoading

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hidden counters — each subscribes to one study's delegation log */}
      <div aria-hidden="true" className="hidden">
        {assignedStudyIds.map((id) => (
          <DelegationCounter key={id} studyId={id} onCount={handleDelegationCount} />
        ))}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Your workload, schedule, and study assignments.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => navigate('/my-studies')}
          className={`${CARD_CLASS} text-left hover:border-teal-400 hover:shadow-sm transition-colors`}
        >
          <div className="flex items-center gap-2">
            <BookMarked size={14} className="text-teal-600" aria-hidden="true" />
            <p className="text-xs font-medium text-slate-400 uppercase">Assigned Studies</p>
          </div>
          <p className="text-3xl font-bold tabular-nums mt-2 text-slate-800 dark:text-slate-100">
            {assignedStudyIds.length}
          </p>
          <p className="text-xs text-teal-600 mt-1">View all &rarr;</p>
        </button>

        <div className={CARD_CLASS}>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-teal-600" aria-hidden="true" />
            <p className="text-xs font-medium text-slate-400 uppercase">Upcoming Visits (14 days)</p>
          </div>
          <p className="text-3xl font-bold tabular-nums mt-2 text-slate-800 dark:text-slate-100">
            {upcomingVisits.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Scheduled across your assigned studies
          </p>
        </div>

        <div className={CARD_CLASS}>
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-teal-600" aria-hidden="true" />
            <p className="text-xs font-medium text-slate-400 uppercase">My Delegated Tasks</p>
          </div>
          <p className="text-3xl font-bold tabular-nums mt-2 text-slate-800 dark:text-slate-100">
            {totalDelegatedTasks}
          </p>
          <p className="text-xs text-slate-400 mt-1">Across all assigned studies</p>
        </div>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming Visits</TabsTrigger>
          <TabsTrigger value="delegation">Delegation Authority</TabsTrigger>
          <TabsTrigger value="studies">My Studies Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <div className="pt-4">
            {upcomingVisits.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">
                No upcoming visits in the next 14 days.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Study
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Visit Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Scheduled Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {upcomingVisits.map((visit) => (
                      <tr
                        key={visit.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                          {studyNameById[visit.studyId] ?? visit.studyId}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {visit.visitType}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">
                          {formatDate(visit.scheduledDate)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${VISIT_STATUS_STYLES[visit.status]}`}
                          >
                            {VISIT_STATUS_LABEL[visit.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
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
          <div className="pt-4 space-y-4">
            {myStudies.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">
                You have no assigned studies.
              </p>
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
          <div className="pt-4">
            {myStudies.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">
                You have no assigned studies.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myStudies.map((study) => {
                  const enrolled = study.enrollmentData?.randomizations ?? 0
                  const pct =
                    study.targetEnrollment > 0
                      ? Math.min(100, Math.round((enrolled / study.targetEnrollment) * 100))
                      : 0
                  return (
                    <div key={study.id} className={`${CARD_CLASS} space-y-3`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate">
                            {study.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {study.sponsor} · {study.phase}
                          </p>
                        </div>
                        <StatusBadge status={study.status} />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <p className="text-slate-400 uppercase font-medium">Enrollment</p>
                          <p className="tabular-nums text-slate-600 dark:text-slate-300">
                            {enrolled} / {study.targetEnrollment}
                          </p>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                          <div
                            className="h-1.5 rounded-full bg-teal-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {study.startDate} → {study.expectedEndDate}
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/studies/${study.id}`)}
                        className="text-xs font-medium text-teal-600 hover:text-teal-700"
                      >
                        View details &rarr;
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
