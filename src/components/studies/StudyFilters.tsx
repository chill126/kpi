import { HUDSelect } from '@/components/hud/HUDSelect'
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

      {(filters.status !== 'all' || filters.therapeuticArea) && (
        <button
          onClick={() => onChange({ status: 'all', therapeuticArea: '' })}
          style={{
            height: 36, padding: '0 12px',
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
