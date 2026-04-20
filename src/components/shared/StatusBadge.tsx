import type { StudyStatus } from '@/types'

interface Props {
  status: StudyStatus
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

export function StatusBadge({ status }: Props) {
  const { label, className } = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  )
}
