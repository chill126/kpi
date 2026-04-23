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
import { Skeleton } from '@/components/hud/Skeleton'
import { EmptyState } from '@/components/hud/EmptyState'
import { deleteScreenFailure } from '@/lib/screenFailures'
import type { ScreenFailure } from '@/types'

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton height={28} width={260} />
        <Skeleton height={288} />
      </div>
    )
  }

  if (studies.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>Enrollment</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            Screen failure tracking and analytics
          </p>
        </div>
        <EmptyState title="No studies yet" body="Create a study to begin tracking screen failures." />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>Enrollment</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            Screen failure tracking and enrollment analytics
          </p>
        </div>
        {tab === 'screen-failures' ? (
          <Button
            onClick={openCreate}
            disabled={!effectiveStudyId}
            style={{ background: 'var(--accent-primary)', border: 'none', color: 'oklch(0.09 0.015 275)' }}
          >
            + Add Screen Failure
          </Button>
        ) : (
          <Button
            onClick={() => setImportOpen(true)}
            disabled={!effectiveStudyId}
            style={{ background: 'var(--accent-primary)', border: 'none', color: 'oklch(0.09 0.015 275)' }}
          >
            Import Historical Data
          </Button>
        )}
      </div>

      <div className="max-w-md">
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', flexShrink: 0 }} className="mb-1 block">
          Study
        </label>
        <select
          aria-label="Select study"
          value={effectiveStudyId}
          onChange={(e) => setSelectedStudyId(e.target.value)}
          style={{ height: 36, background: 'rgba(255 255 255 / 0.06)', border: '1px solid rgba(255 255 255 / 0.12)', borderRadius: 8, color: 'var(--text-primary)', padding: '0 10px', fontSize: 13, width: '100%' }}
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
              <EmptyState title="No study selected" body="Select a study to view completion predictions." />
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
