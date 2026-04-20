import { useMemo } from 'react'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { recentWeekStarts, computeWeekMetrics, utilizationCellColor } from '@/lib/capacity'
import { Skeleton } from '@/components/ui/skeleton'

const NUM_WEEKS = 13

export function WorkloadPlanner() {
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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Workload Planner</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Capacity utilization per investigator over the last {NUM_WEEKS} weeks.
          <span className="ml-2 inline-flex gap-2 text-xs">
            <span className="text-green-600">■ &lt;75%</span>
            <span className="text-amber-500">■ 75–89%</span>
            <span className="text-red-600">■ ≥90%</span>
          </span>
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-xs">
          <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-40">
                Investigator
              </th>
              {weekStarts.map((ws) => (
                <th key={ws} className="px-2 py-3 text-center text-xs font-medium text-slate-400 w-16">
                  {ws.slice(5)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {grid.map(({ investigator: inv, weeks }) => (
              <tr key={inv.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{inv.name}</p>
                  <p className="text-slate-400">{inv.weeklyCapacityHours}h/wk</p>
                </td>
                {weeks.map((m) => (
                  <td key={m.weekStart} className="px-1 py-1 text-center">
                    <span
                      className={`block rounded px-1 py-1 text-xs font-medium tabular-nums ${utilizationCellColor(m.utilizationPct)}`}
                    >
                      {m.utilizationPct}%
                    </span>
                  </td>
                ))}
              </tr>
            ))}
            {investigators.length === 0 && (
              <tr>
                <td colSpan={NUM_WEEKS + 1} className="py-8 text-center text-sm text-slate-400">
                  No investigators found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
