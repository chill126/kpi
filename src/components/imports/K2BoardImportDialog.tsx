import { useState } from 'react'
import * as XLSX from 'xlsx'
import { LayoutGrid } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createImportRecord } from '@/lib/imports'
import { createBoardSession } from '@/lib/boardSessions'
import {
  parseK2BoardRows,
  computeBoardSessionMetrics,
  extractDateFromFilename,
} from '@/lib/k2BoardParser'
import { useAuth } from '@/hooks/useAuth'
import { useSite } from '@/hooks/useSite'
import type { BoardSessionEntry } from '@/types'

type RawRow = Record<string, unknown>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function K2BoardImportDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth()
  const { siteId } = useSite()

  const [sessionDate, setSessionDate] = useState<string>(
    () => new Date().toISOString().split('T')[0],
  )
  const [entries, setEntries] = useState<BoardSessionEntry[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  function reset() {
    setEntries([])
    setParseErrors([])
    setError(null)
    setSummary(null)
  }

  async function handleFile(file: File) {
    reset()
    setSessionDate(extractDateFromFilename(file.name))
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<RawRow>(sheet)
      const result = parseK2BoardRows(rows)
      setEntries(result.entries)
      setParseErrors(result.errors)
      if (result.entries.length === 0 && result.errors.length > 0) {
        setError(result.errors[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file.')
    }
  }

  async function handleImport() {
    if (entries.length === 0) return
    setImporting(true)
    try {
      const metrics = computeBoardSessionMetrics(entries)
      await createBoardSession({
        siteId,
        sessionDate,
        importedAt: new Date().toISOString(),
        importedBy: user?.displayName ?? 'Unknown',
        entryCount: entries.length,
        metrics,
        entries,
      })
      await createImportRecord({
        type: 'k2_board_export',
        siteId,
        uploadedBy: user?.displayName ?? 'Unknown',
        uploadedAt: new Date().toISOString(),
        rowCount: entries.length,
        status: parseErrors.length > 0 ? 'error' : 'complete',
        mappingUsed: {},
        errors: parseErrors,
      })
      setSummary(
        `Imported ${entries.length} participant${entries.length === 1 ? '' : 's'} for ${sessionDate}.`,
      )
      if (parseErrors.length === 0) {
        setTimeout(() => handleOpenChange(false), 600)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  const metrics = entries.length > 0 ? computeBoardSessionMetrics(entries) : null
  const studyEntries = metrics
    ? Object.entries(metrics.byStudy).sort((a, b) => b[1].scheduled - a[1].scheduled)
    : []
  const investigatorEntries = metrics
    ? Object.entries(metrics.byInvestigator).sort((a, b) => b[1].visits - a[1].visits)
    : []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid size={18} className="text-teal-600" aria-hidden="true" />
            Import k2 Board Session
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Session date — pre-filled from filename, editable */}
          <div>
            <label
              htmlFor="k2-session-date"
              className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1"
            >
              Session date
            </label>
            <input
              id="k2-session-date"
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* File upload */}
          <div>
            <label
              htmlFor="k2-file"
              className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1"
            >
              Upload k2-board export (.xlsx)
            </label>
            <input
              id="k2-file"
              aria-label="Upload k2-board export file"
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFile(f)
              }}
              className="block w-full text-sm text-slate-700 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-teal-600 file:text-white hover:file:bg-teal-700"
            />
            <p className="text-xs text-slate-400 mt-1">
              In k2-board: click Export → choose XLSX. Session date is auto-detected from the filename.
            </p>
          </div>

          {/* Error */}
          {error && (
            <p
              role="alert"
              className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md px-3 py-2 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700"
            >
              {error}
            </p>
          )}

          {/* Success */}
          {summary && (
            <p className="text-sm text-teal-700 border border-teal-200 bg-teal-50 rounded-md px-3 py-2 dark:bg-teal-900/30 dark:text-teal-200 dark:border-teal-700">
              {summary}
            </p>
          )}

          {/* Session preview — shown after file is parsed */}
          {metrics && !summary && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Session Preview — {sessionDate}
              </p>

              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    { label: 'Scheduled', value: metrics.totalScheduled },
                    { label: 'Arrivals', value: metrics.arrivals },
                    { label: 'Completed', value: metrics.completedVisits },
                    { label: 'No Shows', value: metrics.noShows },
                  ] as const
                ).map(({ label, value }) => (
                  <div
                    key={label}
                    className="bg-slate-50 dark:bg-slate-700/50 rounded-md px-3 py-2 text-center"
                  >
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                      {value}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              {metrics.avgVisitDurationMin !== null && (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Avg visit duration:{' '}
                  <span className="font-semibold">{metrics.avgVisitDurationMin} min</span>
                </p>
              )}

              {studyEntries.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">
                    By Study
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="pb-1 pr-4 font-medium">Study</th>
                          <th className="pb-1 pr-4 font-medium text-right">Arrivals</th>
                          <th className="pb-1 pr-4 font-medium text-right">No Shows</th>
                          <th className="pb-1 font-medium text-right">Avg Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {studyEntries.map(([study, data]) => (
                          <tr key={study}>
                            <td className="py-1 pr-4 font-medium text-slate-700 dark:text-slate-200">
                              {study || '—'}
                            </td>
                            <td className="py-1 pr-4 text-right tabular-nums text-slate-600 dark:text-slate-300">
                              {data.arrivals}
                            </td>
                            <td className="py-1 pr-4 text-right tabular-nums text-slate-600 dark:text-slate-300">
                              {data.noShows}
                            </td>
                            <td className="py-1 text-right tabular-nums text-slate-500 dark:text-slate-400">
                              {data.avgDurationMin !== null ? `${data.avgDurationMin} min` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {investigatorEntries.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">
                    By Investigator
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {investigatorEntries.map(([name, data]) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs text-slate-700 dark:text-slate-200"
                      >
                        {name}
                        <span className="font-bold tabular-nums">{data.visits}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Parse warnings */}
          {parseErrors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase mb-1">
                Warnings ({parseErrors.length})
              </p>
              <ul className="text-xs text-amber-700 border border-amber-200 bg-amber-50 rounded-md px-3 py-2 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700 max-h-28 overflow-y-auto">
                {parseErrors.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={importing || entries.length === 0 || summary !== null}
            onClick={() => void handleImport()}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {importing
              ? 'Importing…'
              : entries.length > 0
                ? `Import ${entries.length} participant${entries.length === 1 ? '' : 's'}`
                : 'Import Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
