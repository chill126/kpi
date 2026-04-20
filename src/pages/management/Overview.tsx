import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { getWeekStart, computeWeekMetrics, utilizationColor, utilizationBarColor } from '@/lib/capacity'
import { Skeleton } from '@/components/ui/skeleton'

export function Overview() {
  const { studies, loading: studiesLoading } = useStudies()
  const { investigators, loading: invLoading } = useInvestigators()
  const { visits } = useSiteVisits()
  const { assessments } = useSiteAssessments()

  const loading = studiesLoading || invLoading

  const currentWeekStart = getWeekStart(new Date())

  const activeStudies = useMemo(
    () => studies.filter((s) => s.status === 'enrolling' || s.status === 'maintenance'),
    [studies],
  )

  const utilizationData = useMemo(
    () =>
      investigators.map((inv) => {
        const m = computeWeekMetrics(
          inv.id,
          inv.weeklyCapacityHours * 60,
          visits,
          assessments,
          currentWeekStart,
        )
        return {
          name: inv.name,
          utilization: m.utilizationPct,
          fill: utilizationBarColor(m.utilizationPct),
          totalHours: +(m.totalMinutes / 60).toFixed(1),
          capacityHours: inv.weeklyCapacityHours,
        }
      }),
    [investigators, visits, assessments, currentWeekStart],
  )

  const siteCapacityPct = useMemo(() => {
    if (utilizationData.length === 0) return 0
    const avg = utilizationData.reduce((sum, d) => sum + d.utilization, 0) / utilizationData.length
    return Math.round(avg)
  }, [utilizationData])

  const enrollmentData = useMemo(
    () =>
      activeStudies.map((s) => ({
        name: s.name.length > 20 ? s.name.slice(0, 18) + '…' : s.name,
        enrolled: s.enrollmentData?.randomizations ?? 0,
        target: s.targetEnrollment,
      })),
    [activeStudies],
  )

  const alerts = useMemo(() => {
    const result: string[] = []
    utilizationData.forEach((d) => {
      if (d.utilization >= 90) result.push(`${d.name} is at ${d.utilization}% capacity this week`)
      else if (d.utilization >= 75) result.push(`${d.name} is approaching capacity (${d.utilization}%)`)
    })
    return result
  }, [utilizationData])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => <Skeleton key={n} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Overview</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Site capacity and workload summary for the current week.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Site Capacity Used</p>
          <p className={`text-3xl font-bold tabular-nums mt-1 ${utilizationColor(siteCapacityPct)}`}>
            {siteCapacityPct}%
          </p>
          <p className="text-xs text-slate-400 mt-0.5">avg across all investigators this week</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Active Studies</p>
          <p className="text-3xl font-bold tabular-nums mt-1 text-slate-800 dark:text-slate-100">
            {activeStudies.length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">enrolling or in maintenance</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Capacity Alerts</p>
          <p className="text-3xl font-bold tabular-nums mt-1 text-slate-800 dark:text-slate-100">
            {alerts.length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">investigators at or near capacity</p>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-2 text-sm text-amber-800 dark:text-amber-300"
            >
              <span className="font-medium">⚠</span>
              {alert}
            </div>
          ))}
        </div>
      )}

      {/* Investigator Utilization Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Investigator Utilization — This Week
        </h2>
        {utilizationData.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No investigators found.</p>
        ) : (
          <>
            <ul className="mb-3 space-y-1">
              {utilizationData.map((d) => (
                <li key={d.name} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{d.name}</span>
                  <span className={`font-medium tabular-nums ${utilizationColor(d.utilization)}`}>
                    {d.utilization}% ({d.totalHours}h / {d.capacityHours}h)
                  </span>
                </li>
              ))}
            </ul>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={utilizationData} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, _name: string, props: { payload?: { totalHours: number; capacityHours: number } }) => [
                    `${value}% (${props.payload?.totalHours ?? 0}h / ${props.payload?.capacityHours ?? 0}h)`,
                    'Utilization',
                  ]}
                />
                <Bar dataKey="utilization" radius={[4, 4, 0, 0]}>
                  {utilizationData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* Enrollment Summary Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Enrollment Progress
        </h2>
        {enrollmentData.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No active studies.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={enrollmentData} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="target" name="Target" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="enrolled" name="Enrolled" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
