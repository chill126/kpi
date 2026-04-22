import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SnapshotImportDialog } from '@/components/enrollment/SnapshotImportDialog'
import { useStudies } from '@/hooks/useStudies'
import { useSite } from '@/hooks/useSite'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const selectClass =
  'w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'

export function EnrollmentSnapshotImportDialog({ open, onOpenChange }: Props) {
  const { studies } = useStudies()
  const { siteId } = useSite()

  const [selectedStudyId, setSelectedStudyId] = useState<string>('')
  const [fileDialogOpen, setFileDialogOpen] = useState(false)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelectedStudyId('')
    }
    onOpenChange(next)
  }

  function handleFileDialogOpenChange(next: boolean) {
    setFileDialogOpen(next)
    if (!next) {
      // Close the whole flow once the child closes.
      handleOpenChange(false)
    }
  }

  return (
    <>
      <Dialog open={open && !fileDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Enrollment Snapshots</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Select a study, then upload historical enrollment data.
            </p>
            <div>
              <label
                htmlFor="snap-study"
                className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block"
              >
                Study
              </label>
              <select
                id="snap-study"
                aria-label="Select study"
                value={selectedStudyId}
                onChange={(e) => setSelectedStudyId(e.target.value)}
                className={selectClass}
              >
                <option value="">Select a study…</option>
                {studies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedStudyId}
              onClick={() => setFileDialogOpen(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedStudyId && (
        <SnapshotImportDialog
          open={fileDialogOpen}
          onOpenChange={handleFileDialogOpenChange}
          studyId={selectedStudyId}
          siteId={siteId}
        />
      )}
    </>
  )
}
