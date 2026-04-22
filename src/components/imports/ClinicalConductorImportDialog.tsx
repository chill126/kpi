import { useState } from 'react'
import * as XLSX from 'xlsx'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createImportRecord } from '@/lib/imports'
import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useAuth } from '@/hooks/useAuth'
import { useSite } from '@/hooks/useSite'
import type { Visit, VisitStatus } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type RawRow = Record<string, unknown>

interface ParsedVisit {
  data: Omit<Visit, 'id'>
  rowNumber: number
}

interface ParseOutcome {
  visits: ParsedVisit[]
  errors: string[]
}

const COLUMN_KEYWORDS = {
  participantId: ['participant_id', 'subject_id', 'subject'],
  study: ['study_id', 'study_name', 'study'],
  investigator: ['investigator_name', 'investigator'],
  visitType: ['visit_type', 'visit'],
  scheduledDate: ['scheduled_date', 'date'],
  status: ['status'],
  duration: ['duration_minutes', 'duration'],
} as const

function findColumn(row: RawRow, keywords: readonly string[]): string | null {
  const keys = Object.keys(row)
  // Prefer exact match first (case insensitive).
  for (const kw of keywords) {
    const exact = keys.find((k) => k.toLowerCase() === kw)
    if (exact) return exact
  }
  // Fallback to substring match.
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

function normalizeStatus(raw: unknown): VisitStatus {
  const str = String(raw ?? '').toLowerCase().trim()
  if (str === 'complete' || str === 'completed') return 'completed'
  if (str === 'no show' || str === 'no_show' || str === 'noshow') return 'no_show'
  if (str === 'missed') return 'missed'
  if (str === 'scheduled') return 'scheduled'
  return 'completed'
}

function toNumber(val: unknown, fallback: number): number {
  if (val == null || val === '') return fallback
  const n = typeof val === 'number' ? val : Number(val)
  return Number.isFinite(n) ? n : fallback
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
  siteId: string,
): ParseOutcome {
  if (rawRows.length === 0) {
    return { visits: [], errors: ['File contains no rows.'] }
  }
  const sample = rawRows[0]
  const participantCol = findColumn(sample, COLUMN_KEYWORDS.participantId)
  const studyCol = findColumn(sample, COLUMN_KEYWORDS.study)
  const investigatorCol = findColumn(sample, COLUMN_KEYWORDS.investigator)
  const visitTypeCol = findColumn(sample, COLUMN_KEYWORDS.visitType)
  const dateCol = findColumn(sample, COLUMN_KEYWORDS.scheduledDate)
  const statusCol = findColumn(sample, COLUMN_KEYWORDS.status)
  const durationCol = findColumn(sample, COLUMN_KEYWORDS.duration)

  const errors: string[] = []
  if (!participantCol) errors.push('Missing participant_id / subject column.')
  if (!studyCol) errors.push('Missing study column.')
  if (!investigatorCol) errors.push('Missing investigator column.')
  if (!visitTypeCol) errors.push('Missing visit_type column.')
  if (!dateCol) errors.push('Missing scheduled_date / date column.')
  if (errors.length > 0) {
    return { visits: [], errors }
  }

  const visits: ParsedVisit[] = []
  rawRows.forEach((row, idx) => {
    const rowNumber = idx + 2 // account for header row
    const participantId = String(row[participantCol!] ?? '').trim()
    if (!participantId) {
      errors.push(`Row ${rowNumber}: missing participant id.`)
      return
    }
    const studyName = String(row[studyCol!] ?? '').trim()
    const study = findByName(studies, studyName)
    if (!study) {
      errors.push(`Row ${rowNumber}: study "${studyName}" not found.`)
      return
    }
    const investigatorName = String(row[investigatorCol!] ?? '').trim()
    const investigator = findByName(investigators, investigatorName)
    if (!investigator) {
      errors.push(`Row ${rowNumber}: investigator "${investigatorName}" not found.`)
      return
    }
    const scheduledDate = parseDateValue(row[dateCol!])
    if (!scheduledDate) {
      errors.push(`Row ${rowNumber}: invalid scheduled_date.`)
      return
    }
    const visitType = String(row[visitTypeCol!] ?? '').trim() || 'Unscheduled'
    const status = statusCol ? normalizeStatus(row[statusCol]) : 'completed'
    const durationMinutes = durationCol ? toNumber(row[durationCol], 30) : 30

    visits.push({
      rowNumber,
      data: {
        participantId,
        studyId: study.id,
        investigatorId: investigator.id,
        siteId,
        visitType,
        scheduledDate,
        completedDate: status === 'completed' ? scheduledDate : null,
        status,
        durationMinutes,
        actualDurationMinutes: null,
        source: 'cc_import',
      },
    })
  })

  return { visits, errors }
}

export function ClinicalConductorImportDialog({ open, onOpenChange }: Props) {
  const { studies } = useStudies()
  const { investigators } = useInvestigators()
  const { user } = useAuth()
  const { siteId } = useSite()

  const [error, setError] = useState<string | null>(null)
  const [parsedVisits, setParsedVisits] = useState<ParsedVisit[]>([])
  const [rowErrors, setRowErrors] = useState<string[]>([])
  const [rawPreview, setRawPreview] = useState<RawRow[]>([])
  const [importing, setImporting] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  function reset() {
    setError(null)
    setParsedVisits([])
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
      const outcome = parseRows(rows, studies, investigators, siteId)
      setParsedVisits(outcome.visits)
      setRowErrors(outcome.errors)
      if (outcome.visits.length === 0 && outcome.errors.length > 0) {
        setError(outcome.errors[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file.')
    }
  }

  async function handleImport() {
    if (parsedVisits.length === 0) return
    setImporting(true)
    try {
      await Promise.all(
        parsedVisits.map((v) => addDoc(collection(db, 'visits'), v.data)),
      )
      await createImportRecord({
        type: 'clinical_conductor',
        siteId,
        uploadedBy: user?.displayName ?? 'Unknown',
        uploadedAt: new Date().toISOString(),
        rowCount: parsedVisits.length,
        status: rowErrors.length > 0 ? 'error' : 'complete',
        mappingUsed: {},
        errors: rowErrors,
      })
      setSummary(
        `Imported ${parsedVisits.length} visit${parsedVisits.length === 1 ? '' : 's'}.`,
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
          <DialogTitle>Import Clinical Conductor Visits</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label
              htmlFor="cc-file"
              className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block"
            >
              Upload .xlsx or .csv file
            </label>
            <input
              id="cc-file"
              aria-label="Upload Clinical Conductor file"
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
              className="block w-full text-sm text-slate-700 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-teal-600 file:text-white hover:file:bg-teal-700"
            />
            <p className="text-xs text-slate-400 mt-1">
              Expected columns: participant_id, study, investigator, visit_type, scheduled_date, status, duration_minutes.
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

          {parsedVisits.length > 0 && !summary && (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Ready to import <span className="font-semibold">{parsedVisits.length}</span> visit
              {parsedVisits.length === 1 ? '' : 's'}.
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
            disabled={importing || parsedVisits.length === 0 || summary !== null}
            onClick={handleImport}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {importing
              ? 'Importing…'
              : `Import ${parsedVisits.length} visit${parsedVisits.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
