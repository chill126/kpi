import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSite } from '@/hooks/useSite'
import { useStudies } from '@/hooks/useStudies'
import { useAllProtocolDeviations } from '@/hooks/useAllProtocolDeviations'
import { DeviationAnalyticsPanel } from '@/components/deviations/DeviationAnalyticsPanel'
import { DeviationForm } from '@/components/deviations/DeviationForm'
import { DeviationTable } from '@/components/deviations/DeviationTable'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProtocolDeviation } from '@/types'

const SELECT_CLASS =
  'h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'

export function Deviations() {
  const { user, role } = useAuth()
  const { siteId } = useSite()
  const { studies } = useStudies()
  const { deviations, loading } = useAllProtocolDeviations()

  const canManage = role === 'management'

  const [filterStudyId, setFilterStudyId] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingDeviation, setEditingDeviation] = useState<ProtocolDeviation | undefined>()

  const visibleStudies = useMemo(
    () =>
      canManage
        ? studies
        : studies.filter((s) => user?.assignedStudies.includes(s.id)),
    [studies, canManage, user],
  )

  const studyOptions = useMemo(
    () => visibleStudies.map((s) => ({ id: s.id, name: s.name })),
    [visibleStudies],
  )

  const studyNameById = useMemo(
    () => Object.fromEntries(studies.map((s) => [s.id, s.name])),
    [studies],
  )

  const filtered = useMemo(
    () =>
      filterStudyId
        ? deviations.filter((d) => d.studyId === filterStudyId)
        : deviations,
    [deviations, filterStudyId],
  )

  function openCreate() {
    setEditingDeviation(undefined)
    setFormOpen(true)
  }

  function openEdit(deviation: ProtocolDeviation) {
    setEditingDeviation(deviation)
    setFormOpen(true)
  }


  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Protocol Deviations
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Log and track protocol deviations across all studies.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          + Log Deviation
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">
          Study
        </label>
        <select
          aria-label="Filter by study"
          value={filterStudyId}
          onChange={(e) => setFilterStudyId(e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">All Studies</option>
          {visibleStudies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <>
          <DeviationAnalyticsPanel deviations={filtered} />

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                Deviation Log
              </h2>
              <p className="text-xs text-slate-400">
                {filtered.length} record{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
            <DeviationTable
              deviations={filtered}
              canManage={canManage}
              onEdit={openEdit}
              studyNameById={!filterStudyId ? studyNameById : undefined}
            />
          </div>
        </>
      )}

      <DeviationForm
        open={formOpen}
        onOpenChange={(next) => {
          setFormOpen(next)
          if (!next) setEditingDeviation(undefined)
        }}
        studyId={editingDeviation?.studyId ?? ''}
        studyOptions={editingDeviation ? undefined : studyOptions}
        siteId={siteId}
        reportedBy={user?.displayName ?? user?.email ?? ''}
        canManage={canManage}
        deviation={editingDeviation}
      />
    </div>
  )
}

