import { Cloud, CloudOff, Loader2 } from 'lucide-react'
import type { SyncStatus } from '@/types'

interface Props {
  status: SyncStatus
}

const config: Record<SyncStatus, { icon: typeof Cloud; label: string; className: string }> = {
  synced: { icon: Cloud, label: 'Synced', className: 'text-green-400' },
  syncing: { icon: Loader2, label: 'Syncing', className: 'text-amber-400 animate-spin' },
  offline: { icon: CloudOff, label: 'Offline', className: 'text-red-400' },
}

export function SyncIndicator({ status }: Props) {
  const { icon: Icon, label, className } = config[status]
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${className}`}>
      <Icon size={14} aria-hidden="true" />
      {label}
    </span>
  )
}
