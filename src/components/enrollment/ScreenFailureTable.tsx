import { Button } from '@/components/ui/button'
import { CATEGORY_LABELS } from './ScreenFailureForm'
import type { ScreenFailure, Study } from '@/types'

interface Props {
  failures: ScreenFailure[]
  study: Study
  onEdit: (failure: ScreenFailure) => void
  onDelete: (id: string) => void
}

function formatReasons(failure: ScreenFailure): string {
  return failure.reasons
    .map((r) => {
      const label = CATEGORY_LABELS[r.category] ?? r.category
      return r.detail ? `${label} (${r.detail})` : label
    })
    .join(', ')
}

export function ScreenFailureTable({ failures, study, onEdit, onDelete }: Props) {
  const screens = study.enrollmentData?.screens ?? 0
  const randomizations = study.enrollmentData?.randomizations ?? 0
  const failureRate = screens > 0 ? Math.round(((screens - randomizations) / screens) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 inline-block">
        <p className="text-xs font-medium text-slate-400 uppercase">Screen Failure Rate</p>
        <p className="text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">
          {screens > 0 ? `${failureRate}%` : '—'}
        </p>
        <p className="text-xs text-slate-400">
          {screens > 0
            ? `${screens - randomizations} of ${screens} screens`
            : 'No screens recorded'}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Reasons
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {failures.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">
                  No screen failures recorded.
                </td>
              </tr>
            )}
            {failures.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300 tabular-nums">
                  {f.date}
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                  {formatReasons(f)}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{f.source ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                  {f.notes ?? '—'}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(f)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(f.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
