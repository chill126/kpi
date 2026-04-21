import { Button } from '@/components/ui/button'
import { deleteProtocolDeviation } from '@/lib/protocolDeviations'
import { DEVIATION_CATEGORY_LABELS } from './DeviationForm'
import type { DeviationStatus, ProtocolDeviation } from '@/types'

const STATUS_BADGE: Record<DeviationStatus, string> = {
  open: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  pi_reviewed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
  closed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
}

const STATUS_LABEL: Record<DeviationStatus, string> = {
  open: 'Open',
  pi_reviewed: 'PI Reviewed',
  closed: 'Closed',
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' })
}

interface Props {
  deviations: ProtocolDeviation[]
  canManage: boolean
  onEdit: (deviation: ProtocolDeviation) => void
  studyNameById?: Record<string, string>
}

export function DeviationTable({ deviations, canManage, onEdit, studyNameById }: Props) {
  const showStudy = !!studyNameById
  if (deviations.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-8 text-center">No protocol deviations logged.</p>
    )
  }

  async function handleDelete(id: string) {
    await deleteProtocolDeviation(id)
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <tr>
            {showStudy && (
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Study</th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Subject</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">PI Review</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Reported By</th>
            {canManage && (
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {deviations.map((dev) => (
            <tr key={dev.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
              {showStudy && (
                <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-200">
                  {studyNameById![dev.studyId] ?? dev.studyId}
                </td>
              )}
              <td className="px-4 py-3 font-mono text-xs font-medium text-slate-800 dark:text-slate-100">
                {dev.subjectId}
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300 tabular-nums text-xs">
                {formatDate(dev.date)}
              </td>
              <td className="px-4 py-3 text-slate-700 dark:text-slate-200 text-xs">
                {DEVIATION_CATEGORY_LABELS[dev.category] ?? dev.category}
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs">
                <p className="truncate" title={dev.description}>{dev.description}</p>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[dev.status]}`}>
                  {STATUS_LABEL[dev.status]}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                {dev.piReviewed ? (dev.piReviewDate ? formatDate(dev.piReviewDate) : 'Yes') : '—'}
              </td>
              <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                {dev.reportedBy}
              </td>
              {canManage && (
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(dev)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                      onClick={() => handleDelete(dev.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
