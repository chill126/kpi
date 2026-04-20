import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { useStudies } from '@/hooks/useStudies'
import {
  getWeekStart,
  computeWeekMetrics,
  computeWeekHistory,
  utilizationColor,
  utilizationBarColor,
} from '@/lib/capacity'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Investigator, Study, Visit, Assessment } from '@/types'

function CapacityBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${capped}%`, backgroundColor: utilizationBarColor(pct) }}
        />
      </div>
      <span className={`text-xs font-semibold tabular-nums w-10 text-right ${utilizationColor(pct)}`}>
        {pct}%
      </span>
    </div>
  )
}

function InvestigatorDetail({
  investigator,
  visits,
  assessments,
  studies,
}: {
  investigator: Investigator
  visits: Visit[]
  assessments: Assessment[]
  studies: Study[]
}) {
  const capacityMinutes = investigator.weeklyCapacityHours * 60
  const history = useMemo(
    () => computeWeekHistory(investigator.id, capacityMinutes, visits, assessments, 12),
    [investigator.id, capacityMinutes, visits, assessments],
  )

  const chartData = history
    .slice()
    .reverse()
    .map((m) => ({
      week: m.weekStart.slice(5),
      utilization: m.utilizationPct,
      hours: +(m.totalMinutes / 60).toFixed(1),
    }))

  const assignedStudies = studies.filter((s) =>
    s.assignedInvestigators.some((a) => a.investigatorId === investigator.id),
  )

  const currentWeek = history[0]

  return (
    <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600 space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase">This Week</p>
          <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">
            {+(currentWeek.totalMinutes / 60).toFixed(1)}h
            <span className="text-sm font-normal text-slate-400"> / {investigator.weeklyCapacityHours}h</span>
          </p>
          <p className="text-xs text-slate-500">
            {+(currentWeek.visitMinutes / 60).toFixed(1)}h visits + {+(currentWeek.assessmentMinutes / 60).toFixed(1)}h assessments
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase">Role</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5">
            {investigator.credentials} · {investigator.role}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase">Assigned Studies</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5">
            {assignedStudies.length}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Weekly Utilization — Last 12 Weeks</p>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="week" tick={{ fontSize: 10 }} />
            <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 10 }} width={35} />
            <Tooltip formatter={(v) => [`${v}%`, 'Utilization']} />
            <Line type="monotone" dataKey="utilization" stroke="#0d9488" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {assignedStudies.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Study Assignments</p>
          <div className="space-y-1">
            {assignedStudies.map((s) => {
              const role = s.assignedInvestigators.find((a) => a.investigatorId === investigator.id)?.role
              return (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-200">{s.name}</span>
                  <div className="flex items-center gap-2">
                    {role && <span className="text-xs text-slate-400">{role}</span>}
                    <StatusBadge status={s.status} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function Investigators() {
  const { investigators, loading } = useInvestigators()
  const { visits } = useSiteVisits()
  const { assessments } = useSiteAssessments()
  const { studies } = useStudies()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const currentWeekStart = getWeekStart(new Date())

  const rows = useMemo(
    () =>
      investigators.map((inv) => {
        const m = computeWeekMetrics(
          inv.id,
          inv.weeklyCapacityHours * 60,
          visits,
          assessments,
          currentWeekStart,
        )
        return { investigator: inv, metrics: m }
      }),
    [investigators, visits, assessments, currentWeekStart],
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((n) => <Skeleton key={n} className="h-16 w-full" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Investigators</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {investigators.length} investigators · current week utilization
        </p>
      </div>

      <div className="space-y-2">
        {rows.map(({ investigator: inv, metrics }) => (
          <div
            key={inv.id}
            className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
          >
            <button
              className="w-full text-left"
              onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{inv.name}</p>
                  <p className="text-xs text-slate-500">{inv.credentials} · {inv.role}</p>
                </div>
                <div className="w-48">
                  <CapacityBar pct={metrics.utilizationPct} />
                </div>
                <div className="text-xs text-slate-400 w-32 text-right">
                  {+(metrics.totalMinutes / 60).toFixed(1)}h / {inv.weeklyCapacityHours}h this week
                </div>
              </div>
            </button>

            {expandedId === inv.id && (
              <InvestigatorDetail
                investigator={inv}
                visits={visits}
                assessments={assessments}
                studies={studies}
              />
            )}
          </div>
        ))}

        {investigators.length === 0 && (
          <p className="text-sm text-slate-400 py-8 text-center">
            No investigators found for this site.
          </p>
        )}
      </div>
    </div>
  )
}
