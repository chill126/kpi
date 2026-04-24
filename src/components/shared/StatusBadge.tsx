import type { StudyStatus } from '@/types'

interface Props {
  status: StudyStatus | string | null | undefined
}

const STATUS_CONFIG: Record<StudyStatus, { label: string; style: React.CSSProperties }> = {
  pending: {
    label: 'Pending',
    style: {
      background: 'rgba(30 120 255 / 0.15)',
      color: 'var(--accent-primary)',
      border: '1px solid rgba(30 120 255 / 0.3)',
    },
  },
  enrolling: {
    label: 'Enrolling',
    style: {
      background: 'rgba(52 211 153 / 0.15)',
      color: 'var(--signal-good)',
      border: '1px solid rgba(52 211 153 / 0.3)',
    },
  },
  paused: {
    label: 'Paused',
    style: {
      background: 'rgba(245 158 11 / 0.15)',
      color: 'var(--signal-warn)',
      border: '1px solid rgba(245 158 11 / 0.3)',
    },
  },
  open: {
    label: 'Open',
    style: {
      background: 'rgba(99 149 255 / 0.15)',
      color: 'var(--accent-info)',
      border: '1px solid rgba(99 149 255 / 0.3)',
    },
  },
  completed: {
    label: 'Completed',
    style: {
      background: 'rgba(255 255 255 / 0.06)',
      color: 'var(--text-muted)',
      border: '1px solid rgba(255 255 255 / 0.10)',
    },
  },
}

const UNKNOWN_STYLE: React.CSSProperties = {
  background: 'rgba(255 255 255 / 0.06)',
  color: 'var(--text-muted)',
  border: '1px solid rgba(255 255 255 / 0.10)',
}

function labelForUnknown(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) return 'Unknown'
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function StatusBadge({ status }: Props) {
  const config = (status && STATUS_CONFIG[status as StudyStatus]) || {
    label: labelForUnknown(status),
    style: UNKNOWN_STYLE,
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 11,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 9999,
        ...config.style,
      }}
    >
      {config.label}
    </span>
  )
}
