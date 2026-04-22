import type { StudyStatus } from '@/types'

interface Props {
  status: StudyStatus | string | null | undefined
}

const STATUS_CONFIG: Record<StudyStatus, { label: string; className: string }> = {
  enrolling: {
    label: 'Enrolling',
    className: 'bg-green-50 text-green-700 border border-green-200',
  },
  paused: {
    label: 'Paused',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  on_hold: {
    label: 'On Hold',
    className: 'bg-red-50 text-red-700 border border-red-200',
  },
  maintenance: {
    label: 'Maintenance',
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-slate-100 text-slate-600 border border-slate-200',
  },
}

const UNKNOWN_CONFIG = {
  label: 'Unknown',
  className: 'bg-slate-100 text-slate-500 border border-slate-200',
}

function labelForUnknown(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) return UNKNOWN_CONFIG.label
  return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function StatusBadge({ status }: Props) {
  const config = (status && STATUS_CONFIG[status as StudyStatus]) || {
    label: labelForUnknown(status),
    className: UNKNOWN_CONFIG.className,
  }
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${config.className}`}>
      {config.label}
    </span>
  )
}
