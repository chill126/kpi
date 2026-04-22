import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createImportRecord } from '@/lib/imports'
import * as XLSX from 'xlsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { bulkCreateEnrollmentSnapshots } from '@/lib/enrollmentSnapshots'
import type { EnrollmentSnapshot } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  studyId: string
  siteId: string
}

type RawRow = Record<string, unknown>

type ParsedRow = Omit<EnrollmentSnapshot, 'id'>

const FIELD_KEYWORDS: Record<keyof Omit<ParsedRow, 'studyId' | 'siteId'>, string[]> = {
  date: ['date'],
  prescreens: ['prescreen'],
  screens: ['screen'],
  randomizations: ['random'],
  active: ['active'],
  completions: ['complet'],
}

function findColumn(row: RawRow, keywords: string[]): string | null {
  for (const key of Object.keys(row)) {
    const lower = key.toLowerCase()
    if (keywords.some((k) => lower.includes(k))) return key
  }
  return null
}

function parseDateValue(val: unknown): string | null {
  if (val == null || val === '') return null
  if (typeof val === 'number') {
    const parsed = XLSX.SSF.parse_date_code(val)
    if (!parsed) return null
    const y = String(parsed.y).padStart(4, '0')
    const m = String(parsed.m).padStart(2, '0')
    const d = String(parsed.d).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const str = String(val)
  const d = new Date(str)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().split('T')[0]
}

function toNumber(val: unknown): number {
  if (val == null || val === '') return 0
  const n = typeof val === 'number' ? val : Number(val)
  return Number.isFinite(n) ? n : 0
}

interface ParseResult {
  rows: ParsedRow[]
  error: string | null
  previewHeaders: string[]
}

function parseRows(
  rawRows: RawRow[],
  studyId: string,
  siteId: string,
): ParseResult {
  if (rawRows.length === 0) {
    return { rows: [], error: 'File contains no rows.', previewHeaders: [] }
  }
  const sample = rawRows[0]
  const dateCol = findColumn(sample, FIELD_KEYWORDS.date)
  const randCol = findColumn(sample, FIELD_KEYWORDS.randomizations)
  if (!dateCol) return { rows: [], error: 'No date column found.', previewHeaders: Object.keys(sample) }
  if (!randCol) {
    return { rows: [], error: 'No randomizations column found.', previewHeaders: Object.keys(sample) }
  }
  const prescreensCol = findColumn(sample, FIELD_KEYWORDS.prescreens)
  // Pick a screens column that isn't the prescreens column (prescreens also contains "screen")
  const screensCol = (() => {
    for (const key of Object.keys(sample)) {
      const lower = key.toLowerCase()
      if (lower.includes('screen') && !lower.includes('prescreen') && key !== prescreensCol) {
        return key
      }
    }
    return null
  })()
  const activeCol = findColumn(sample, FIELD_KEYWORDS.active)
  const completionsCol = findColumn(sample, FIELD_KEYWORDS.completions)

  const rows: ParsedRow[] = []
  for (const raw of rawRows) {
    const date = parseDateValue(raw[dateCol])
    if (!date) continue
    rows.push({
      studyId,
      siteId,
      date,
      prescreens: prescreensCol ? toNumber(raw[prescreensCol]) : 0,
      screens: screensCol ? toNumber(raw[screensCol]) : 0,
      randomizations: toNumber(raw[randCol]),
      active: activeCol ? toNumber(raw[activeCol]) : 0,
      completions: completionsCol ? toNumber(raw[completionsCol]) : 0,
    })
  }
  if (rows.length === 0) {
    return { rows: [], error: 'No valid rows found (dates could not be parsed).', previewHeaders: Object.keys(sample) }
  }
  return { rows, error: null, previewHeaders: Object.keys(sample) }
}

export function SnapshotImportDialog({ open, onOpenChange, studyId, siteId }: Props) {
  const { user } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [rawPreview, setRawPreview] = useState<RawRow[]>([])
  const [importing, setImporting] = useState(false)

  function reset() {
    setError(null)
    setParsed([])
    setRawPreview([])
  }

  async function handleFile(file: File) {
    reset()
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<RawRow>(sheet)
      setRawPreview(rows.slice(0, 5))
      const result = parseRows(rows, studyId, siteId)
      if (result.error) {
        setError(result.error)
        setParsed([])
      } else {
        setParsed(result.rows)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file.')
    }
  }

  async function handleImport() {
    if (parsed.length === 0) return
    setImporting(true)
    try {
      await bulkCreateEnrollmentSnapshots(parsed)
      await createImportRecord({
        type: 'enrollment_snapshot',
        siteId,
        uploadedBy: user?.displayName ?? 'Unknown',
        uploadedAt: new Date().toISOString(),
        rowCount: parsed.length,
        status: 'complete',
        mappingUsed: {},
        errors: [],
      })
      reset()
      onOpenChange(false)
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

  const previewKeys = rawPreview.length > 0 ? Object.keys(rawPreview[0]) : []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Enrollment Snapshots</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label htmlFor="snap-file" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
              Upload .xlsx or .csv file
            </label>
            <input
              id="snap-file"
              aria-label="Upload snapshots file"
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
              className="block w-full text-sm text-slate-700 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-teal-600 file:text-white hover:file:bg-teal-700"
            />
            <p className="text-xs text-slate-400 mt-1">
              Expected columns: date, prescreens, screens, randomizations, active, completions.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md px-3 py-2 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700">
              {error}
            </p>
          )}

          {rawPreview.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase">Preview (first 5 rows)</p>
              <div className="overflow-x-auto">
                <table className="text-xs border border-slate-200 dark:border-slate-700">
                  <thead className="bg-slate-100 dark:bg-slate-700">
                    <tr>
                      {previewKeys.map((k) => (
                        <th key={k} className="px-2 py-1 text-left font-medium">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawPreview.map((r, i) => (
                      <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                        {previewKeys.map((k) => (
                          <td key={k} className="px-2 py-1 tabular-nums">{String(r[k] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {parsed.length > 0 && !error && (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Ready to import <span className="font-semibold">{parsed.length}</span> rows.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={importing || parsed.length === 0}
            onClick={handleImport}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {importing ? 'Importing…' : `Import ${parsed.length} rows`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
