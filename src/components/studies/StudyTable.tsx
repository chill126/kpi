import type { Investigator, Study } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { StudyFilterState } from './StudyFilters'

interface Props {
  studies: Study[]
  investigators: Investigator[]
  filters: StudyFilterState
  selectedIds: string[]
  onSelectChange: (ids: string[]) => void
  onViewDetail: (studyId: string) => void
}

function applyFilters(studies: Study[], filters: StudyFilterState): Study[] {
  return studies.filter((s) => {
    if (filters.status !== 'all' && s.status !== filters.status) return false
    if (
      filters.therapeuticArea &&
      !s.therapeuticArea.toLowerCase().includes(filters.therapeuticArea.toLowerCase())
    )
      return false
    if (filters.piId && s.piId !== filters.piId) return false
    return true
  })
}

export function StudyTable({
  studies,
  investigators,
  filters,
  selectedIds,
  onSelectChange,
  onViewDetail,
}: Props) {
  const invMap = Object.fromEntries(investigators.map((i) => [i.id, i]))
  const filtered = applyFilters(studies, filters)

  function toggleSelect(id: string) {
    if (selectedIds.includes(id)) {
      onSelectChange(selectedIds.filter((x) => x !== id))
    } else if (selectedIds.length < 2) {
      onSelectChange([...selectedIds, id])
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="w-10 px-4 py-3 text-left">
              <span className="sr-only">Select</span>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Study
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Sponsor
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Area
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Phase
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              PI
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
              Enrolled
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {filtered.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">
                No studies match the current filters.
              </td>
            </tr>
          )}
          {filtered.map((study) => {
            const pi = invMap[study.piId]
            const enrolled = study.enrollmentData?.randomizations ?? 0
            const pct =
              study.targetEnrollment > 0
                ? Math.round((enrolled / study.targetEnrollment) * 100)
                : 0
            const isSelected = selectedIds.includes(study.id)

            return (
              <tr
                key={study.id}
                className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-teal-50 dark:bg-teal-900/20' : ''}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(study.id)}
                    aria-label={`Select ${study.name}`}
                    className="rounded border-slate-300"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onViewDetail(study.id)}
                    className="font-medium text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 text-left"
                  >
                    {study.name}
                  </button>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{study.sponsor}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={study.status} />
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {study.therapeuticArea}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{study.phase}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {pi?.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                  {`${enrolled}/${study.targetEnrollment} `}
                  <span className="text-slate-400 text-xs">{`${pct}%`}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
