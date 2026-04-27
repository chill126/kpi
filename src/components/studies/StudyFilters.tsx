import { HUDSelect } from '@/components/hud/HUDSelect'
import type { StudyStatus } from '@/types'

export interface StudyFilterState {
  status: StudyStatus | 'all'
  therapeuticArea: string
  hideCompleted: boolean
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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-label)' }}>
          Status
        </span>
        <div style={{ width: 160 }}>
          <HUDSelect
            id="filter-status"
            aria-label="Status"
            value={filters.status}
            onChange={(v) => onChange({ ...filters, status: v as StudyFilterState['status'] })}
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-label)' }}>
          Indication
        </span>
        <div style={{ width: 180 }}>
          <HUDSelect
            id="filter-area"
            aria-label="Therapeutic Area"
            value={filters.therapeuticArea}
            onChange={(v) => onChange({ ...filters, therapeuticArea: v })}
            options={INDICATION_OPTIONS}
          />
        </div>
      </div>

      <button
        onClick={() => onChange({ ...filters, hideCompleted: !filters.hideCompleted })}
        style={{
          height: 34, padding: '0 14px', borderRadius: 99, fontSize: 12,
          cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-end',
          border: filters.hideCompleted
            ? '1px solid rgba(30 120 255 / 0.5)'
            : '1px solid rgba(255 255 255 / 0.10)',
          background: filters.hideCompleted
            ? 'rgba(30 120 255 / 0.15)'
            : 'rgba(255 255 255 / 0.04)',
          color: filters.hideCompleted ? 'var(--accent-primary)' : 'var(--text-secondary)',
          fontWeight: filters.hideCompleted ? 500 : 400,
          transition: 'all 150ms',
        }}
      >
        Hide completed
      </button>

      {(filters.status !== 'all' || filters.therapeuticArea || filters.hideCompleted) && (
        <button
          onClick={() => onChange({ status: 'all', therapeuticArea: '', hideCompleted: false })}
          style={{
            height: 34, padding: '0 12px', alignSelf: 'flex-end',
            background: 'none', border: 'none',
            color: 'var(--text-muted)', fontSize: 13,
            cursor: 'pointer', textDecoration: 'underline',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
