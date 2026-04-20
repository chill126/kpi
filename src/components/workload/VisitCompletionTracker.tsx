import { useMemo } from 'react'
import { useVisits } from '@/hooks/useVisits'
import { Skeleton } from '@/components/ui/skeleton'
import type { VisitStatus } from '@/types'

interface Props {
  studyId: string
}

const STATUS_LABELS: Record<VisitStatus, string> = {
  completed: 'Completed',
  scheduled: 'Scheduled',
  missed: 'Missed',
  no_show: 'No Show',
}

const STATUS_COLORS: Record<VisitStatus, string> = {
  completed: 'text-green-700',
  scheduled: 'text-blue-600',
  missed: 'text-amber-600',
  no_show: 'text-red-600',
}

export function VisitCompletionTracker({ studyId }: Props) {
  const { visits, loading } = useVisits(studyId)

  const summary = useMemo(() => {
    const counts: Record<VisitStatus, number> = {
      completed: 0, scheduled: 0, missed: 0, no_show: 0,
    }
    visits.forEach((v) => {
      counts[v.status] = (counts[v.status] ?? 0) + 1
    })
    const total = visits.length
    return { counts, total }
  }, [visits])

  const byParticipant = useMemo(() => {
    const map: Record<string, { participantId: string; latest: string; status: VisitStatus; visitType: string }[]> = {}
    visits.forEach((v) => {
      if (!map[v.participantId]) map[v.participantId] = []
      map[v.participantId].push({
        participantId: v.participantId,
        latest: v.scheduledDate,
        status: v.status,
        visitType: v.visitType,
      })
    })
    return Object.entries(map).map(([pid, visits]) => ({
      participantId: pid,
      visits: visits.sort((a, b) => b.latest.localeCompare(a.latest)),
    }))
  }, [visits])

  if (loading) {
    return <div className="space-y-2">{[1, 2, 3].map((n) => <Skeleton key={n} className="h-8 w-full" />)}</div>
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {(Object.entries(STATUS_LABELS) as [VisitStatus, string][]).map(([status, label]) => {
          const count = summary.counts[status]
          const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0
          return (
            <div
              key={status}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-center"
            >
              <p className="text-xs font-medium text-slate-400 uppercase">{label}</p>
              <p className={`text-2xl font-bold tabular-nums mt-1 ${STATUS_COLORS[status]}`}>
                {count}
              </p>
              <p className="text-xs text-slate-400">{pct}%</p>
            </div>
          )
        })}
      </div>

      {byParticipant.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Participant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Latest Visit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Visit Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {byParticipant.map(({ participantId, visits: pVisits }) => (
                <tr key={participantId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-100">
                    {participantId}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">
                    {pVisits[0]?.latest ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {pVisits[0]?.visitType ?? '—'}
                  </td>
                  <td className={`px-4 py-3 font-medium text-sm ${STATUS_COLORS[pVisits[0]?.status ?? 'scheduled']}`}>
                    {STATUS_LABELS[pVisits[0]?.status ?? 'scheduled']}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300 tabular-nums">
                    {pVisits.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {byParticipant.length === 0 && (
        <p className="text-sm text-slate-400 py-6 text-center">No visits logged for this study yet.</p>
      )}
    </div>
  )
}
