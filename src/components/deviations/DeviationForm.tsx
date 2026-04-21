import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createProtocolDeviation, updateProtocolDeviation } from '@/lib/protocolDeviations'
import { DEVIATION_CATEGORIES } from '@/types'
import type { DeviationCategory, DeviationStatus, ProtocolDeviation } from '@/types'

export const DEVIATION_CATEGORY_LABELS: Record<DeviationCategory, string> = {
  procedural: 'Procedural',
  inclusion_exclusion: 'Inclusion / Exclusion Criteria',
  consent: 'Informed Consent',
  prohibited_con_med: 'Prohibited Con Med',
  missed_visit: 'Missed / Late Visit',
  assessment: 'Assessment',
  other: 'Other',
}

const DEVIATION_STATUS_LABELS: Record<DeviationStatus, string> = {
  open: 'Open',
  pi_reviewed: 'PI Reviewed',
  closed: 'Closed',
}

const SELECT_CLASS =
  'w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'

const TEXTAREA_CLASS =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 resize-none'

interface StudyOption {
  id: string
  name: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fixed studyId. If empty, studyOptions must be provided and a picker is shown. */
  studyId: string
  studyOptions?: StudyOption[]
  siteId: string
  reportedBy: string
  canManage: boolean
  deviation?: ProtocolDeviation
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

export function DeviationForm({
  open,
  onOpenChange,
  studyId,
  studyOptions,
  siteId,
  reportedBy,
  canManage,
  deviation,
}: Props) {
  const isEdit = !!deviation
  const needsStudyPicker = !studyId && !!studyOptions?.length

  const [selectedStudyId, setSelectedStudyId] = useState(studyOptions?.[0]?.id ?? '')
  const [subjectId, setSubjectId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [category, setCategory] = useState<DeviationCategory>('procedural')
  const [description, setDescription] = useState('')
  const [correctiveAction, setCorrectiveAction] = useState('')
  const [piReviewed, setPiReviewed] = useState(false)
  const [piReviewDate, setPiReviewDate] = useState('')
  const [status, setStatus] = useState<DeviationStatus>('open')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (deviation) {
        setSubjectId(deviation.subjectId)
        setDate(deviation.date)
        setCategory(deviation.category)
        setDescription(deviation.description)
        setCorrectiveAction(deviation.correctiveAction)
        setPiReviewed(deviation.piReviewed)
        setPiReviewDate(deviation.piReviewDate ?? '')
        setStatus(deviation.status)
      } else {
        setSelectedStudyId(studyOptions?.[0]?.id ?? '')
        setSubjectId('')
        setDate(todayIso())
        setCategory('procedural')
        setDescription('')
        setCorrectiveAction('')
        setPiReviewed(false)
        setPiReviewDate('')
        setStatus('open')
      }
    }
  }, [open, deviation, studyOptions])

  async function handleSave() {
    const effectiveStudyId = studyId || selectedStudyId
    if (!subjectId.trim() || !description.trim() || !effectiveStudyId) return
    setSaving(true)
    try {
      const payload = {
        siteId,
        studyId: effectiveStudyId,
        subjectId: subjectId.trim(),
        date,
        category,
        description: description.trim(),
        correctiveAction: correctiveAction.trim(),
        piReviewed,
        ...(piReviewed && piReviewDate ? { piReviewDate } : {}),
        status,
        reportedBy,
        createdAt: deviation?.createdAt ?? new Date().toISOString(),
      }
      if (isEdit && deviation) {
        await updateProtocolDeviation(deviation.id, payload)
      } else {
        await createProtocolDeviation(payload)
      }
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Protocol Deviation' : 'Log Protocol Deviation'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {needsStudyPicker && (
            <div className="space-y-1">
              <Label htmlFor="dev-study">Study *</Label>
              <select
                id="dev-study"
                value={selectedStudyId}
                onChange={(e) => setSelectedStudyId(e.target.value)}
                className={SELECT_CLASS}
              >
                {studyOptions!.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="dev-subject">Subject ID *</Label>
              <Input
                id="dev-subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                placeholder="e.g. K2-001"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dev-date">Date *</Label>
              <Input
                id="dev-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="dev-category">Category</Label>
            <select
              id="dev-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as DeviationCategory)}
              className={SELECT_CLASS}
            >
              {DEVIATION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {DEVIATION_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="dev-description">Description *</Label>
            <textarea
              id="dev-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what occurred..."
              className={TEXTAREA_CLASS}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="dev-corrective">Corrective / Preventive Action</Label>
            <textarea
              id="dev-corrective"
              rows={2}
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="Action taken or planned..."
              className={TEXTAREA_CLASS}
            />
          </div>

          {canManage && (
            <div className="space-y-3 rounded-md border border-slate-200 dark:border-slate-700 p-3">
              <div className="flex items-center gap-2">
                <input
                  id="dev-pi-reviewed"
                  type="checkbox"
                  checked={piReviewed}
                  onChange={(e) => setPiReviewed(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <Label htmlFor="dev-pi-reviewed" className="cursor-pointer">
                  PI Reviewed
                </Label>
              </div>

              {piReviewed && (
                <div className="space-y-1">
                  <Label htmlFor="dev-pi-date">PI Review Date</Label>
                  <Input
                    id="dev-pi-date"
                    type="date"
                    value={piReviewDate}
                    onChange={(e) => setPiReviewDate(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="dev-status">Status</Label>
                <select
                  id="dev-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as DeviationStatus)}
                  className={SELECT_CLASS}
                >
                  {(Object.keys(DEVIATION_STATUS_LABELS) as DeviationStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {DEVIATION_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !subjectId.trim() || !description.trim() || (!studyId && !selectedStudyId)}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Log Deviation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
