import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Investigator, Study } from '@/types'

interface Props {
  studyIds: [string, string]
  studies: Study[]
  investigators: Investigator[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CompareRow {
  label: string
  getValue: (study: Study, invMap: Record<string, Investigator>) => string
}

const ROWS: CompareRow[] = [
  { label: 'Sponsor', getValue: (s) => s.sponsor },
  { label: 'Phase', getValue: (s) => s.phase },
  { label: 'Therapeutic Area', getValue: (s) => s.therapeuticArea },
  { label: 'Status', getValue: (s) => s.status.replace('_', ' ') },
  { label: 'PI', getValue: (s, im) => im[s.piId]?.name ?? '—' },
  { label: 'Target Enrollment', getValue: (s) => String(s.targetEnrollment) },
  { label: 'Enrolled', getValue: (s) => String(s.enrollmentData?.randomizations ?? 0) },
  {
    label: 'Enrollment %',
    getValue: (s) =>
      s.targetEnrollment > 0
        ? `${Math.round(((s.enrollmentData?.randomizations ?? 0) / s.targetEnrollment) * 100)}%`
        : '—',
  },
  {
    label: 'Active Participants',
    getValue: (s) => String(s.enrollmentData?.active ?? 0),
  },
  {
    label: 'Weekly Inv. Hours',
    getValue: (s) => {
      const totalMins = s.visitSchedule.reduce((sum, v) => sum + v.investigatorTimeMinutes, 0)
      return totalMins > 0 ? `${Math.round(totalMins / 60 * 10) / 10}h/visit` : '—'
    },
  },
  {
    label: 'Assigned Investigators',
    getValue: (s, im) =>
      s.assignedInvestigators
        .map((a) => `${im[a.investigatorId]?.name ?? a.investigatorId} (${a.role})`)
        .join(', ') || '—',
  },
  { label: 'Start Date', getValue: (s) => s.startDate || '—' },
  { label: 'Expected End', getValue: (s) => s.expectedEndDate || '—' },
  {
    label: 'Admin hrs/week',
    getValue: (s) => `${s.adminOverride.perStudyWeeklyHours}h`,
  },
  {
    label: 'Participant Overhead',
    getValue: (s) => `${s.adminOverride.perParticipantOverheadPct}%`,
  },
]

export function StudyComparison({ studyIds, studies, investigators, open, onOpenChange }: Props) {
  const invMap = Object.fromEntries(investigators.map((i) => [i.id, i]))
  const [studyA, studyB] = studyIds.map((id) => studies.find((s) => s.id === id))

  if (!studyA || !studyB) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" style={{ width: 'min(95vw, 72rem)', maxWidth: 'min(95vw, 72rem)' }}>
        <DialogHeader>
          <DialogTitle>Study Comparison</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="py-3 pr-4 text-left text-xs font-medium text-slate-400 uppercase w-40" />
                <th className="py-3 px-4 text-left">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{studyA.name}</p>
                    <StatusBadge status={studyA.status} />
                  </div>
                </th>
                <th className="py-3 px-4 text-left">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{studyB.name}</p>
                    <StatusBadge status={studyB.status} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {ROWS.map((row) => {
                const valA = row.getValue(studyA, invMap)
                const valB = row.getValue(studyB, invMap)
                const differ = valA !== valB

                return (
                  <tr key={row.label} className={differ ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''}>
                    <td className="py-2.5 pr-4 text-xs font-medium text-slate-400 uppercase tracking-wide">
                      {row.label}
                    </td>
                    <td className={`py-2.5 px-4 text-slate-700 dark:text-slate-200 ${differ ? 'font-medium' : ''}`}>
                      {valA}
                    </td>
                    <td className={`py-2.5 px-4 text-slate-700 dark:text-slate-200 ${differ ? 'font-medium' : ''}`}>
                      {valB}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
