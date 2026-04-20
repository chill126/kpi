import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { StudyStatusToggle } from '@/components/studies/StudyStatusToggle'
import { StudyCloneButton } from '@/components/studies/StudyCloneButton'
import { StudyForm } from '@/components/studies/StudyForm'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useSite } from '@/hooks/useSite'
import type { Investigator, Study } from '@/types'
import { Pencil } from 'lucide-react'

interface Props {
  study: Study
  investigators: Investigator[]
}

export function StudyDetailHeader({ study, investigators }: Props) {
  const { user, role } = useAuth()
  const { siteId } = useSite()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)

  const pi = investigators.find((i) => i.id === study.piId)
  const enrolled = study.enrollmentData?.randomizations ?? 0
  const pct =
    study.targetEnrollment > 0 ? Math.round((enrolled / study.targetEnrollment) * 100) : 0

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{study.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {study.sponsor}
            {study.sponsorProtocolId ? ` · ${study.sponsorProtocolId}` : ''}
          </p>
        </div>

        {role === 'management' && user && (
          <div className="flex items-center gap-2 shrink-0">
            <StudyStatusToggle study={study} currentUser={user} />
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil size={14} className="mr-1.5" aria-hidden="true" />
              Edit
            </Button>
            <StudyCloneButton
              study={study}
              onCloned={(id) => navigate(`/studies/${id}`)}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Phase</p>
          <p className="mt-0.5 text-slate-700 dark:text-slate-200">{study.phase}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Area</p>
          <p className="mt-0.5 text-slate-700 dark:text-slate-200">{study.therapeuticArea}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">PI</p>
          <p className="mt-0.5 text-slate-700 dark:text-slate-200">{pi?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Dates</p>
          <p className="mt-0.5 text-slate-700 dark:text-slate-200">
            {study.startDate || '—'} → {study.expectedEndDate || '—'}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Enrollment</span>
          <span>
            {enrolled} / {study.targetEnrollment} ({pct}%)
          </span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      {role === 'management' && user && (
        <StudyForm
          open={editOpen}
          onOpenChange={setEditOpen}
          study={study}
          investigators={investigators}
          siteId={siteId}
          onSave={() => setEditOpen(false)}
        />
      )}
    </div>
  )
}
