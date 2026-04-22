import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createScreenFailure, updateScreenFailure } from '@/lib/screenFailures'
import { SCREEN_FAILURE_CATEGORIES } from '@/types'
import type { ScreenFailure, ScreenFailureReason } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  studyId: string
  siteId: string
  customReasons?: string[]
  failure?: ScreenFailure
}

const CATEGORY_LABELS: Record<string, string> = {
  inclusion_criteria: 'Inclusion Criteria',
  exclusion_criteria: 'Exclusion Criteria',
  lab_values: 'Lab Values',
  scales: 'Scales',
  prohibited_con_meds: 'Prohibited Con Meds',
  consent: 'Consent',
  logistical: 'Logistical',
  lost_to_follow_up: 'Lost to Follow Up',
  investigator_decision: 'Investigator Decision',
}

const MAX_REASONS = 3

const selectClass =
  'w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'

interface ReasonRow {
  category: string
  detail: string
}

function toRows(reasons: ScreenFailureReason[]): ReasonRow[] {
  return reasons.map((r) => ({ category: r.category, detail: r.detail ?? '' }))
}

export function ScreenFailureForm({
  open,
  onOpenChange,
  studyId,
  siteId,
  customReasons = [],
  failure,
}: Props) {
  const [date, setDate] = useState('')
  const [source, setSource] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<ReasonRow[]>([{ category: '', detail: '' }])
  const [errors, setErrors] = useState<{ date?: string; reasons?: string }>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      if (failure) {
        setDate(failure.date)
        setSource(failure.source ?? '')
        setNotes(failure.notes ?? '')
        setRows(failure.reasons.length ? toRows(failure.reasons) : [{ category: '', detail: '' }])
      } else {
        setDate('')
        setSource('')
        setNotes('')
        setRows([{ category: '', detail: '' }])
      }
      setErrors({})
    }
  }, [open, failure])

  function updateRow(index: number, patch: Partial<ReasonRow>) {
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, ...patch } : r)))
    setErrors((e) => ({ ...e, reasons: undefined }))
  }

  function addRow() {
    if (rows.length < MAX_REASONS) {
      setRows((rs) => [...rs, { category: '', detail: '' }])
    }
  }

  function removeRow(index: number) {
    if (rows.length > 1) {
      setRows((rs) => rs.filter((_, i) => i !== index))
    }
  }

  async function handleSave() {
    const next: { date?: string; reasons?: string } = {}
    if (!date) next.date = 'Date is required'
    const validRows = rows.filter((r) => r.category.trim())
    if (validRows.length === 0) next.reasons = 'At least one reason is required'
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }

    const reasons: ScreenFailureReason[] = validRows.map((r) => {
      const reason: ScreenFailureReason = { category: r.category }
      if (r.detail.trim()) reason.detail = r.detail.trim()
      return reason
    })

    setLoading(true)
    try {
      const data: Omit<ScreenFailure, 'id'> = {
        studyId,
        siteId,
        date,
        reasons,
        ...(source.trim() ? { source: source.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }
      if (failure) {
        await updateScreenFailure(failure.id, data)
      } else {
        await createScreenFailure(data)
      }
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const allCategories = [...SCREEN_FAILURE_CATEGORIES, ...customReasons]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{failure ? 'Edit Screen Failure' : 'Add Screen Failure'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="sff-date">Date *</Label>
              <Input
                id="sff-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  setErrors((er) => ({ ...er, date: undefined }))
                }}
              />
              {errors.date && <p className="text-xs text-red-600">{errors.date}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="sff-source">Source</Label>
              <Input
                id="sff-source"
                placeholder="Site or location"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reasons *</Label>
            {rows.map((row, i) => {
              const showDetail = row.category === 'lab_values' || row.category === 'scales'
              const detailPlaceholder =
                row.category === 'lab_values'
                  ? 'Which lab?'
                  : row.category === 'scales'
                    ? 'Which scale?'
                    : ''
              return (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <select
                      aria-label={`Reason category ${i + 1}`}
                      value={row.category}
                      onChange={(e) => updateRow(i, { category: e.target.value, detail: '' })}
                      className={selectClass}
                    >
                      <option value="">Select reason…</option>
                      {allCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {CATEGORY_LABELS[cat] ?? cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  {showDetail && (
                    <div className="flex-1">
                      <Input
                        aria-label={`Reason detail ${i + 1}`}
                        placeholder={detailPlaceholder}
                        value={row.detail}
                        onChange={(e) => updateRow(i, { detail: e.target.value })}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={rows.length === 1}
                    aria-label={`Remove reason ${i + 1}`}
                    className="h-9 px-2 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ×
                  </button>
                </div>
              )
            })}
            {errors.reasons && <p className="text-xs text-red-600">{errors.reasons}</p>}
            {rows.length < MAX_REASONS && (
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                + Add another reason
              </Button>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="sff-notes">Notes</Label>
            <textarea
              id="sff-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={loading}
            onClick={handleSave}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { CATEGORY_LABELS }
