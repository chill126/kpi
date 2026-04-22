import { useMemo, useState } from 'react'
import { useStudies } from '@/hooks/useStudies'
import { useScreenFailures } from '@/hooks/useScreenFailures'
import { useAllScreenFailures } from '@/hooks/useAllScreenFailures'
import { useEnrollmentSnapshots } from '@/hooks/useEnrollmentSnapshots'
import { useSite } from '@/hooks/useSite'
import { ScreenFailureForm } from '@/components/enrollment/ScreenFailureForm'
import { ScreenFailureTable } from '@/components/enrollment/ScreenFailureTable'
import { ScreenFailureRateChart } from '@/components/enrollment/ScreenFailureRateChart'
import { ScreenFailureReasonChart } from '@/components/enrollment/ScreenFailureReasonChart'
import { CrossStudyComparisonPanel } from '@/components/enrollment/CrossStudyComparisonPanel'
import { EnrollmentBurndownChart } from '@/components/enrollment/EnrollmentBurndownChart'
import { SnapshotImportDialog } from '@/components/enrollment/SnapshotImportDialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { deleteScreenFailure } from '@/lib/screenFailures'
import type { ScreenFailure } from '@/types'

const selectClass =
  'w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'

export function Enrollment() {
  const { siteId } = useSite()
  const { studies, loading: studiesLoading } = useStudies()

  const defaultStudyId = useMemo(() => {
    const enrolling = studies.find((s) => s.status === 'enrolling')
    return enrolling?.id ?? studies[0]?.id ?? ''
  }, [studies])

  const [selectedStudyId, setSelectedStudyId] = useState<string>('')
  const effectiveStudyId = selectedStudyId || defaultStudyId
  const selectedStudy = studies.find((s) => s.id === effectiveStudyId)

  const { failures } = useScreenFailures(effectiveStudyId)
  const { failures: allFailures } = useAllScreenFailures()
  const { snapshots } = useEnrollmentSnapshots(effectiveStudyId)

  const [formOpen, setFormOpen] = useState(false)
  const [editingFailure, setEditingFailure] = useState<ScreenFailure | undefined>(undefined)
  const [importOpen, setImportOpen] = useState(false)
  const [tab, setTab] = useState('screen-failures')

  function openCreate() {
    setEditingFailure(undefined)
    setFormOpen(true)
  }

  function openEdit(failure: ScreenFailure) {
    setEditingFailure(failure)
    setFormOpen(true)
  }

  async function handleDelete(id: string) {
    await deleteScreenFailure(id)
  }

  if (studiesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (studies.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Enrollment</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Screen failure tracking and analytics
          </p>
        </div>
        <p className="text-sm text-slate-400 py-8 text-center">
          No studies found. Create a study to begin tracking screen failures.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Enrollment</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Screen failure tracking and enrollment analytics
          </p>
        </div>
        {tab === 'screen-failures' ? (
          <Button
            onClick={openCreate}
            disabled={!effectiveStudyId}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            + Add Screen Failure
          </Button>
        ) : (
          <Button
            onClick={() => setImportOpen(true)}
            disabled={!effectiveStudyId}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            Import Historical Data
          </Button>
        )}
      </div>

      <div className="max-w-md">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
          Study
        </label>
        <select
          aria-label="Select study"
          value={effectiveStudyId}
          onChange={(e) => setSelectedStudyId(e.target.value)}
          className={selectClass}
        >
          {studies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="screen-failures">Screen Failures</TabsTrigger>
          <TabsTrigger value="predictor">Completion Predictor</TabsTrigger>
        </TabsList>

        <TabsContent value="screen-failures">
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {selectedStudy && <ScreenFailureRateChart failures={failures} study={selectedStudy} />}
              <ScreenFailureReasonChart failures={failures} />
            </div>

            <CrossStudyComparisonPanel allFailures={allFailures} studies={studies} />

            {selectedStudy && (
              <ScreenFailureTable
                failures={failures}
                study={selectedStudy}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="predictor">
          <div className="space-y-6 pt-4">
            {selectedStudy ? (
              <EnrollmentBurndownChart snapshots={snapshots} study={selectedStudy} />
            ) : (
              <p className="text-sm text-slate-400 py-8 text-center">
                Select a study to view completion predictions.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {selectedStudy && (
        <ScreenFailureForm
          open={formOpen}
          onOpenChange={setFormOpen}
          studyId={selectedStudy.id}
          siteId={siteId}
          customReasons={selectedStudy.customScreenFailureReasons}
          failure={editingFailure}
        />
      )}

      {selectedStudy && (
        <SnapshotImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          studyId={selectedStudy.id}
          siteId={siteId}
        />
      )}
    </div>
  )
}
