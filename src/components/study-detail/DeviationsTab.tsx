import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSite } from '@/hooks/useSite'
import { useProtocolDeviations } from '@/hooks/useProtocolDeviations'
import { DeviationForm } from '@/components/deviations/DeviationForm'
import { DeviationTable } from '@/components/deviations/DeviationTable'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProtocolDeviation } from '@/types'

interface Props {
  studyId: string
  canManage: boolean
}

export function DeviationsTab({ studyId, canManage }: Props) {
  const { user } = useAuth()
  const { siteId } = useSite()
  const { deviations, loading } = useProtocolDeviations(studyId)
  const [formOpen, setFormOpen] = useState(false)
  const [editingDeviation, setEditingDeviation] = useState<ProtocolDeviation | undefined>()

  function openCreate() {
    setEditingDeviation(undefined)
    setFormOpen(true)
  }

  function openEdit(deviation: ProtocolDeviation) {
    setEditingDeviation(deviation)
    setFormOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {deviations.length} deviation{deviations.length !== 1 ? 's' : ''} logged
        </p>
        <Button
          size="sm"
          onClick={openCreate}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          + Log Deviation
        </Button>
      </div>

      <DeviationTable
        deviations={deviations}
        canManage={canManage}
        onEdit={openEdit}
      />

      <DeviationForm
        open={formOpen}
        onOpenChange={(next) => {
          setFormOpen(next)
          if (!next) setEditingDeviation(undefined)
        }}
        studyId={studyId}
        siteId={siteId}
        reportedBy={user?.displayName ?? user?.email ?? ''}
        canManage={canManage}
        deviation={editingDeviation}
      />
    </div>
  )
}
