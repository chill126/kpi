import { Label } from '@/components/ui/label'
import type { StudyStatus } from '@/types'

export interface StudyFilterState {
  status: StudyStatus | 'all'
  therapeuticArea: string
}

interface Props {
  filters: StudyFilterState
  onChange: (filters: StudyFilterState) => void
}

const STATUS_OPTIONS: { value: StudyStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'enrolling', label: 'Enrolling' },
  { value: 'paused', label: 'Paused' },
  { value: 'open', label: 'Open' },
  { value: 'completed', label: 'Completed' },
]

const INDICATION_OPTIONS = [
  { value: '', label: 'All Indications' },
  { value: 'Psychiatry', label: 'Psychiatry' },
  { value: 'Neurology', label: 'Neurology' },
  { value: 'Dermatology', label: 'Dermatology' },
  { value: 'General Medicine', label: 'General Medicine' },
  { value: 'Cardiology', label: 'Cardiology' },
  { value: 'Oncology', label: 'Oncology' },
  { value: 'Other', label: 'Other' },
]

export function StudyFilters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-status" className="text-xs font-medium text-slate-500">
          Status
        </Label>
        <select
          id="filter-status"
          aria-label="Status"
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value as StudyFilterState['status'] })}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-area" className="text-xs font-medium text-slate-500">
          Indication
        </Label>
        <select
          id="filter-area"
          aria-label="Therapeutic Area"
          value={filters.therapeuticArea}
          onChange={(e) => onChange({ ...filters, therapeuticArea: e.target.value })}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
        >
          {INDICATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {(filters.status !== 'all' || filters.therapeuticArea) && (
        <button
          onClick={() => onChange({ status: 'all', therapeuticArea: '' })}
          className="h-9 px-3 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
