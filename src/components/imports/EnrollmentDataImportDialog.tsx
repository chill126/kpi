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
import { updateEnrollmentData } from '@/lib/studies'
import { createImportRecord } from '@/lib/imports'
import { useStudies } from '@/hooks/useStudies'
import { useAuth } from '@/hooks/useAuth'
import { useSite } from '@/hooks/useSite'
import type { EnrollmentData } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type RawRow = Record<string, unknown>

interface ParsedUpdate {
  studyId: string
  studyName: string
  data: EnrollmentData
  rowNumber: number
}

interface ParseOutcome {
  updates: ParsedUpdate[]
  errors: string[]
}

const FIELD_KEYWORDS: Record<keyof EnrollmentData, string[]> = {
  prescreens:      ['prescreen'],
  screens:         ['screen'],
  randomizations:  ['random', 'rand'],
  active:          ['active'],
  completions:     ['complet'],
}

function findColumn(row: RawRow, keywords: string[]): string | null {
  for (const key of Object.keys(row)) {
    const lower = key.toLowerCase()
    if (keywords.some((k) => lower.includes(k))) return key
  }
  return null
}

function findStudyCol(row: RawRow): string | null {
  const candidates = ['study_name', 'study name', 'study', 'protocol', 'name']
  for (const key of Object.keys(row)) {
    const lower = key.toLowerCase()
    if (candidates.some((c) => lower === c || lower.includes(c))) return key
  }
  return null
}

function toInt(val: unknown): number {
  if (val == null || val === '') return 0
  const n = Number(val)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}

function parseRows(
  rawRows: RawRow[],
  studies: { id: string; name: string }[],
): ParseOutcome {
  if (rawRows.length === 0) return { updates: [], errors: ['File contains no rows.'] }

  const sample = rawRows[0]
  const studyCol = findStudyCol(sample)
  const colMap = Object.fromEntries(
    Object.entries(FIELD_KEYWORDS).map(([field, kws]) => [field, findColumn(sample, kws)]),
  ) as Record<keyof EnrollmentData, string | null>

  const errors: string[] = []
  if (!studyCol) errors.push('Missing study name column.')
  if (errors.length > 0) return { updates: [], errors }

  const updates: ParsedUpdate[] = []
  rawRows.forEach((row, idx) => {
    const rowNumber = idx + 2
    const rawName = String(row[studyCol!] ?? '').trim()
    if (!rawName) return

    const lower = rawName.toLowerCase()
    const study = studies.find((s) => s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase()))
    if (!study) {
      errors.push(`Row ${rowNumber}: study "${rawName}" not found.`)
      return
    }

    const data: EnrollmentData = {
      prescreens:     colMap.prescreens     ? toInt(row[colMap.prescreens])     : 0,
      screens:        colMap.screens        ? toInt(row[colMap.screens])        : 0,
      randomizations: colMap.randomizations ? toInt(row[colMap.randomizations]) : 0,
      active:         colMap.active         ? toInt(row[colMap.active])         : 0,
      completions:    colMap.completions    ? toInt(row[colMap.completions])    : 0,
    }

    updates.push({ studyId: study.id, studyName: study.name, data, rowNumber })
  })

  return { updates, errors }
}

export function EnrollmentDataImportDialog({ open, onOpenChange }: Props) {
  const { studies } = useStudies()
  const { user } = useAuth()
  const { siteId } = useSite()

  const [error, setError] = useState<string | null>(null)
  const [parsedUpdates, setParsedUpdates] = useState<ParsedUpdate[]>([])
  const [rowErrors, setRowErrors] = useState<string[]>([])
  const [rawPreview, setRawPreview] = useState<RawRow[]>([])
  const [importing, setImporting] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  function reset() {
    setError(null)
    setParsedUpdates([])
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
      const outcome = parseRows(rows, studies)
      setParsedUpdates(outcome.updates)
      setRowErrors(outcome.errors)
      if (outcome.updates.length === 0 && outcome.errors.length > 0) {
        setError(outcome.errors[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file.')
    }
  }

  async function handleImport() {
    if (parsedUpdates.length === 0) return
    setImporting(true)
    try {
      await Promise.all(parsedUpdates.map((u) => updateEnrollmentData(u.studyId, u.data)))
      await createImportRecord({
        type: 'enrollment_data_update',
        siteId,
        uploadedBy: user?.displayName ?? 'Unknown',
        uploadedAt: new Date().toISOString(),
        rowCount: parsedUpdates.length,
        status: rowErrors.length > 0 ? 'error' : 'complete',
        mappingUsed: {},
        errors: rowErrors,
      })
      setSummary(`Updated enrollment data for ${parsedUpdates.length} stud${parsedUpdates.length === 1 ? 'y' : 'ies'}.`)
      if (rowErrors.length === 0) {
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

  const previewKeys = rawPreview.length > 0 ? Object.keys(rawPreview[0]) : []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Enrollment Numbers</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label
              htmlFor="enroll-data-file"
              style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}
            >
              Upload .xlsx or .csv file
            </label>
            <input
              id="enroll-data-file"
              aria-label="Upload enrollment data file"
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f) }}
              style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', width: '100%' }}
            />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Expected columns: study (name), prescreens, screens, randomizations, active, completions.
              Any column order is accepted; column names are matched by keyword.
            </p>
          </div>

          {error && (
            <p role="alert" style={{ fontSize: 13, color: 'var(--signal-alert)', background: 'rgba(239 68 68 / 0.10)', border: '1px solid rgba(239 68 68 / 0.25)', borderRadius: 8, padding: '8px 12px' }}>
              {error}
            </p>
          )}

          {summary && (
            <p style={{ fontSize: 13, color: 'var(--signal-good)', background: 'rgba(52 211 153 / 0.10)', border: '1px solid rgba(52 211 153 / 0.25)', borderRadius: 8, padding: '8px 12px' }}>
              {summary}
            </p>
          )}

          {rawPreview.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: 6 }}>
                File preview (first 5 rows)
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: 12, borderCollapse: 'collapse', border: '1px solid rgba(255 255 255 / 0.10)', borderRadius: 6 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255 255 255 / 0.04)' }}>
                      {previewKeys.map((k) => (
                        <th key={k} style={{ padding: '4px 10px', textAlign: 'left', fontWeight: 500, color: 'var(--text-label)', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255 255 255 / 0.08)' }}>
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawPreview.map((r, i) => (
                      <tr key={i}>
                        {previewKeys.map((k) => (
                          <td key={k} style={{ padding: '4px 10px', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255 255 255 / 0.05)', fontVariantNumeric: 'tabular-nums' }}>
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

          {parsedUpdates.length > 0 && !summary && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: 6 }}>
                Will update {parsedUpdates.length} {parsedUpdates.length === 1 ? 'study' : 'studies'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {parsedUpdates.map((u) => (
                  <div key={u.studyId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '6px 10px', background: 'rgba(255 255 255 / 0.03)', borderRadius: 6, border: '1px solid rgba(255 255 255 / 0.07)' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.studyName}</span>
                    <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {u.data.prescreens} pre · {u.data.screens} screen · {u.data.randomizations} rand · {u.data.active} active · {u.data.completions} comp
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rowErrors.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--signal-warn)', marginBottom: 4 }}>
                Row issues ({rowErrors.length})
              </p>
              <ul style={{ fontSize: 12, color: 'var(--signal-warn)', background: 'rgba(245 158 11 / 0.08)', border: '1px solid rgba(245 158 11 / 0.25)', borderRadius: 8, padding: '8px 12px', maxHeight: 120, overflowY: 'auto', listStyle: 'none', margin: 0 }}>
                {rowErrors.map((msg, i) => <li key={i}>{msg}</li>)}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={importing || parsedUpdates.length === 0 || summary !== null}
            onClick={() => void handleImport()}
            style={{ background: 'var(--accent-primary)', border: 'none', color: 'oklch(0.09 0.015 275)' }}
          >
            {importing ? 'Importing…' : `Update ${parsedUpdates.length} ${parsedUpdates.length === 1 ? 'study' : 'studies'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
