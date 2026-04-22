import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ProtocolUpload } from '@/components/protocol-parser/ProtocolUpload'
import { updateStudy } from '@/lib/studies'
import { createImportRecord } from '@/lib/imports'
import { useStudies } from '@/hooks/useStudies'
import { useAuth } from '@/hooks/useAuth'
import { useSite } from '@/hooks/useSite'
import type { ParsedProtocol } from '@/lib/protocolParser'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const selectClass =
  'w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'

export function ProtocolPdfImportDialog({ open, onOpenChange }: Props) {
  const { studies } = useStudies()
  const { user } = useAuth()
  const { siteId } = useSite()

  const [selectedStudyId, setSelectedStudyId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  function reset() {
    setSelectedStudyId('')
    setError(null)
    setSummary(null)
    setApplying(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleParsed(result: ParsedProtocol) {
    if (!selectedStudyId) {
      setError('Select a study before uploading a protocol.')
      return
    }
    setError(null)
    setApplying(true)
    try {
      await updateStudy(selectedStudyId, {
        visitSchedule: result.visits,
        assessmentBattery: result.assessmentBattery,
        parsedFromProtocol: true,
      })
      await createImportRecord({
        type: 'protocol_pdf',
        siteId,
        uploadedBy: user?.displayName ?? 'Unknown',
        uploadedAt: new Date().toISOString(),
        rowCount: result.visits.length,
        status: 'complete',
        mappingUsed: {},
        errors: [],
      })
      setSummary(
        `Applied ${result.visits.length} visit${result.visits.length === 1 ? '' : 's'} to the selected study.`,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to apply protocol.'
      setError(message)
      await createImportRecord({
        type: 'protocol_pdf',
        siteId,
        uploadedBy: user?.displayName ?? 'Unknown',
        uploadedAt: new Date().toISOString(),
        rowCount: 0,
        status: 'error',
        mappingUsed: {},
        errors: [message],
      })
    } finally {
      setApplying(false)
    }
  }

  function handleError(message: string) {
    setError(message)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Protocol PDF</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Select a study, then upload the protocol PDF. The parsed visit schedule and assessment battery will be applied to the study.
          </p>

          <div>
            <label
              htmlFor="protocol-study"
              className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block"
            >
              Study
            </label>
            <select
              id="protocol-study"
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

          <div className="flex items-center gap-2">
            <ProtocolUpload onParsed={handleParsed} onError={handleError} />
            {applying && (
              <span className="text-xs text-slate-500">Applying to study…</span>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md px-3 py-2 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700"
            >
              {error}
            </p>
          )}

          {summary && (
            <p className="text-sm text-teal-700 border border-teal-200 bg-teal-50 rounded-md px-3 py-2 dark:bg-teal-900/30 dark:text-teal-200 dark:border-teal-700">
              {summary}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
