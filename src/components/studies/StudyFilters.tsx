import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Investigator, StudyStatus } from '@/types'

export interface StudyFilterState {
  status: StudyStatus | 'all'
  therapeuticArea: string
  piId: string
}

interface Props {
  filters: StudyFilterState
  onChange: (filters: StudyFilterState) => void
  investigators: Investigator[]
}

const STATUS_OPTIONS: { value: StudyStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'enrolling', label: 'Enrolling' },
  { value: 'paused', label: 'Paused' },
  { value: 'open', label: 'Open' },
  { value: 'completed', label: 'Completed' },
]

export function StudyFilters({ filters, onChange, investigators }: Props) {
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
          Therapeutic Area
        </Label>
        <Input
          id="filter-area"
          placeholder="Therapeutic area…"
          value={filters.therapeuticArea}
          onChange={(e) => onChange({ ...filters, therapeuticArea: e.target.value })}
          className="h-9 w-48"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-pi" className="text-xs font-medium text-slate-500">
          PI
        </Label>
        <select
          id="filter-pi"
          value={filters.piId}
          onChange={(e) => onChange({ ...filters, piId: e.target.value })}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
        >
          <option value="">All PIs</option>
          {investigators.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.name}
            </option>
          ))}
        </select>
      </div>

      {(filters.status !== 'all' || filters.therapeuticArea || filters.piId) && (
        <button
          onClick={() => onChange({ status: 'all', therapeuticArea: '', piId: '' })}
          className="h-9 px-3 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
