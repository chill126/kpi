import { useState } from 'react'
import * as XLSX from 'xlsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createDelegationEntry } from '@/lib/delegationLog'
import { createImportRecord } from '@/lib/imports'
import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useAuth } from '@/hooks/useAuth'
import { useSite } from '@/hooks/useSite'
import type { DelegationLog } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type RawRow = Record<string, unknown>

interface ParsedEntry {
  data: Omit<DelegationLog, 'id' | 'siteId'>
  rowNumber: number
}

interface ParseOutcome {
  entries: ParsedEntry[]
  errors: string[]
}

const COLUMN_KEYWORDS = {
  investigator: ['investigator_name', 'investigator'],
  study: ['study_name', 'study'],
  tasks: ['delegated_tasks', 'task_list', 'tasks'],
  effectiveDate: ['effective_date', 'date'],
} as const

function findColumn(row: RawRow, keywords: readonly string[]): string | null {
  const keys = Object.keys(row)
  for (const kw of keywords) {
    const exact = keys.find((k) => k.toLowerCase() === kw)
    if (exact) return exact
  }
  for (const kw of keywords) {
    const partial = keys.find((k) => k.toLowerCase().includes(kw))
    if (partial) return partial
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

function findByName<T extends { id: string; name: string }>(
  items: T[],
  name: string | undefined,
): T | undefined {
  if (!name) return undefined
  const lower = name.trim().toLowerCase()
  if (!lower) return undefined
  return items.find((item) => item.name.toLowerCase().includes(lower))
}

function parseRows(
  rawRows: RawRow[],
  studies: { id: string; name: string }[],
  investigators: { id: string; name: string }[],
): ParseOutcome {
  if (rawRows.length === 0) {
    return { entries: [], errors: ['File contains no rows.'] }
  }
  const sample = rawRows[0]
  const investigatorCol = findColumn(sample, COLUMN_KEYWORDS.investigator)
  const studyCol = findColumn(sample, COLUMN_KEYWORDS.study)
  const tasksCol = findColumn(sample, COLUMN_KEYWORDS.tasks)
  const effectiveCol = findColumn(sample, COLUMN_KEYWORDS.effectiveDate)

  const errors: string[] = []
  if (!investigatorCol) errors.push('Missing investigator column.')
  if (!studyCol) errors.push('Missing study column.')
  if (!tasksCol) errors.push('Missing tasks column.')
  if (!effectiveCol) errors.push('Missing effective_date column.')
  if (errors.length > 0) {
    return { entries: [], errors }
  }

  const entries: ParsedEntry[] = []
  rawRows.forEach((row, idx) => {
    const rowNumber = idx + 2
    const investigatorName = String(row[investigatorCol!] ?? '').trim()
    const investigator = findByName(investigators, investigatorName)
    if (!investigator) {
      errors.push(`Row ${rowNumber}: investigator "${investigatorName}" not found.`)
      return
    }
    const studyName = String(row[studyCol!] ?? '').trim()
    const study = findByName(studies, studyName)
    if (!study) {
      errors.push(`Row ${rowNumber}: study "${studyName}" not found.`)
      return
    }
    const tasksRaw = String(row[tasksCol!] ?? '').trim()
    const delegatedTasks = tasksRaw
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
    if (delegatedTasks.length === 0) {
      errors.push(`Row ${rowNumber}: no delegated tasks provided.`)
      return
    }
    const effectiveDate = parseDateValue(row[effectiveCol!])
    if (!effectiveDate) {
      errors.push(`Row ${rowNumber}: invalid effective_date.`)
      return
    }

    entries.push({
      rowNumber,
      data: {
        investigatorId: investigator.id,
        studyId: study.id,
        delegatedTasks,
        effectiveDate,
        source: 'advarra_import',
      },
    })
  })

  return { entries, errors }
}

export function AdvarraImportDialog({ open, onOpenChange }: Props) {
  const { studies } = useStudies()
  const { investigators } = useInvestigators()
  const { user } = useAuth()
  const { siteId } = useSite()

  const [error, setError] = useState<string | null>(null)
  const [parsedEntries, setParsedEntries] = useState<ParsedEntry[]>([])
  const [rowErrors, setRowErrors] = useState<string[]>([])
  const [rawPreview, setRawPreview] = useState<RawRow[]>([])
  const [importing, setImporting] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  function reset() {
    setError(null)
    setParsedEntries([])
    setRowErrors([])
    setRawPreview([])
    setSummary(null)
  }

  async function handleFile(file: File) {
    reset()
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<RawRow>(sheet)
      setRawPreview(rows.slice(0, 5))
      const outcome = parseRows(rows, studies, investigators)
      setParsedEntries(outcome.entries)
      setRowErrors(outcome.errors)
      if (outcome.entries.length === 0 && outcome.errors.length > 0) {
        setError(outcome.errors[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file.')
    }
  }

  async function handleImport() {
    if (parsedEntries.length === 0) return
    setImporting(true)
    try {
      await Promise.all(parsedEntries.map((e) => createDelegationEntry({ ...e.data, siteId })))
      await createImportRecord({
        type: 'advarra_ereg',
        siteId,
        uploadedBy: user?.displayName ?? 'Unknown',
        uploadedAt: new Date().toISOString(),
        rowCount: parsedEntries.length,
        status: rowErrors.length > 0 ? 'error' : 'complete',
        mappingUsed: {},
        errors: rowErrors,
      })
      setSummary(
        `Imported ${parsedEntries.length} delegation entr${parsedEntries.length === 1 ? 'y' : 'ies'}.`,
      )
      if (rowErrors.length === 0) {
        setTimeout(() => handleOpenChange(false), 500)
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

  const previewKeys = rawPreview.length > 0 ? Object.keys(rawPreview[0]) : []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Advarra e-Reg Delegations</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label
              htmlFor="advarra-file"
              className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block"
            >
              Upload .xlsx or .csv file
            </label>
            <input
              id="advarra-file"
              aria-label="Upload Advarra e-Reg file"
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
              className="block w-full text-sm text-slate-700 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-teal-600 file:text-white hover:file:bg-teal-700"
            />
            <p className="text-xs text-slate-400 mt-1">
              Expected columns: investigator, study, delegated_tasks (comma separated), effective_date.
            </p>
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

          {rawPreview.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase">
                Preview (first 5 rows)
              </p>
              <div className="overflow-x-auto">
                <table className="text-xs border border-slate-200 dark:border-slate-700">
                  <thead className="bg-slate-100 dark:bg-slate-700">
                    <tr>
                      {previewKeys.map((k) => (
                        <th key={k} className="px-2 py-1 text-left font-medium">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawPreview.map((r, i) => (
                      <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                        {previewKeys.map((k) => (
                          <td key={k} className="px-2 py-1 tabular-nums">
                            {String(r[k] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {parsedEntries.length > 0 && !summary && (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Ready to import <span className="font-semibold">{parsedEntries.length}</span>{' '}
              delegation entr{parsedEntries.length === 1 ? 'y' : 'ies'}.
            </p>
          )}

          {rowErrors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-amber-700 uppercase">
                Row issues ({rowErrors.length})
              </p>
              <ul className="text-xs text-amber-700 border border-amber-200 bg-amber-50 rounded-md px-3 py-2 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700 max-h-32 overflow-y-auto">
                {rowErrors.map((msg, i) => (
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
            disabled={importing || parsedEntries.length === 0 || summary !== null}
            onClick={handleImport}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {importing
              ? 'Importing…'
              : `Import ${parsedEntries.length} entr${parsedEntries.length === 1 ? 'y' : 'ies'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
