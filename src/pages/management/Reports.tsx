import { useMemo } from 'react'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { recentWeekStarts, computeWeekMetrics, utilizationCellColor } from '@/lib/capacity'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const NUM_WEEKS = 26

export function Reports() {
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

  function downloadCsv() {
    const header = ['Investigator', ...weekStarts].join(',')
    const rows = grid.map(({ investigator: inv, weeks }) =>
      [inv.name, ...weeks.map((m) => `${m.utilizationPct}%`)].join(','),
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `utilization-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Investigator utilization — last {NUM_WEEKS} weeks. Use browser Print (Ctrl+P) to save as PDF.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadCsv}>
          Download CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-xs">
          <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase sticky left-0 bg-white dark:bg-slate-800 w-40">
                Investigator
              </th>
              {weekStarts.map((ws) => (
                <th key={ws} className="px-1 py-3 text-center text-xs font-medium text-slate-400 w-14">
                  {ws.slice(5)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {grid.map(({ investigator: inv, weeks }) => (
              <tr key={inv.id}>
                <td className="px-4 py-2 sticky left-0 bg-white dark:bg-slate-800">
                  <p className="font-medium text-slate-700 dark:text-slate-200">{inv.name}</p>
                  <p className="text-slate-400">{inv.weeklyCapacityHours}h</p>
                </td>
                {weeks.map((m) => (
                  <td key={m.weekStart} className="px-0.5 py-0.5 text-center">
                    <span
                      className={`block rounded text-xs font-medium tabular-nums px-0.5 py-1 ${utilizationCellColor(m.utilizationPct)}`}
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
