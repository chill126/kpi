import { useState } from 'react'
import type { Investigator, Study, StudyStatus } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { updateStudyStatus } from '@/lib/studies'
import { useAuth } from '@/hooks/useAuth'
import type { StudyFilterState } from './StudyFilters'

const STATUS_OPTIONS: StudyStatus[] = ['pending', 'enrolling', 'paused', 'open', 'completed']

const STATUS_SELECT_STYLE: Record<StudyStatus, React.CSSProperties> = {
  pending:   { color: '#7c3aed', background: 'rgba(139 92 246 / 0.10)', border: '1px solid rgba(139 92 246 / 0.25)' },
  enrolling: { color: '#15803d', background: 'rgba(22 163 74 / 0.10)',  border: '1px solid rgba(22 163 74 / 0.25)' },
  paused:    { color: '#b45309', background: 'rgba(217 119 6 / 0.10)',  border: '1px solid rgba(217 119 6 / 0.25)' },
  open:      { color: '#1d4ed8', background: 'rgba(59 130 246 / 0.10)', border: '1px solid rgba(59 130 246 / 0.25)' },
  completed: { color: '#64748b', background: 'rgba(100 116 139 / 0.10)', border: '1px solid rgba(100 116 139 / 0.20)' },
}

function InlineStatusSelect({ study }: { study: Study }) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)

  if (!user || user.role !== 'management') {
    return <StatusBadge status={study.status} />
  }

  async function handleChange(next: StudyStatus) {
    if (next === study.status || saving) return
    setSaving(true)
    try {
      await updateStudyStatus(study.id, next, user!.uid)
    } finally {
      setSaving(false)
    }
  }

  const style = STATUS_SELECT_STYLE[study.status as StudyStatus] ?? STATUS_SELECT_STYLE.completed

  return (
    <select
      value={study.status}
      disabled={saving}
      onChange={(e) => void handleChange(e.target.value as StudyStatus)}
      aria-label={`Status for ${study.name}`}
      style={{
        ...style,
        fontSize: 11,
        fontWeight: 500,
        padding: '2px 6px',
        borderRadius: 9999,
        cursor: 'pointer',
        outline: 'none',
        appearance: 'none',
        WebkitAppearance: 'none',
        opacity: saving ? 0.6 : 1,
      }}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </option>
      ))}
    </select>
  )
}

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
                  <InlineStatusSelect study={study} />
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
