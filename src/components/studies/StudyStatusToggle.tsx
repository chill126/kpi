import { useState } from 'react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { updateStudyStatus } from '@/lib/studies'
import type { AppUser, Study, StudyStatus } from '@/types'

interface Props {
  study: Study
  currentUser: AppUser
}

const STATUS_OPTIONS: StudyStatus[] = [
  'pending',
  'enrolling',
  'paused',
  'open',
  'completed',
]

export function StudyStatusToggle({ study, currentUser }: Props) {
  const [pending, setPending] = useState<StudyStatus | null>(null)

  return (
    <>
      <div className="flex items-center gap-2">
        <StatusBadge status={study.status} />
        <select
          value={study.status}
          onChange={(e) => setPending(e.target.value as StudyStatus)}
          className="h-7 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
          aria-label="Change status"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => { if (!open) setPending(null) }}
        title="Change Study Status"
        description={`Change "${study.name}" from ${study.status.replace('_', ' ')} to ${pending?.replace('_', ' ')}?`}
        confirmLabel="Change Status"
        onConfirm={async () => {
          if (pending) await updateStudyStatus(study.id, pending, currentUser.uid)
          setPending(null)
        }}
      />
    </>
  )
}
