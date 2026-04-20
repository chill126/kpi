import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createVisit } from '@/lib/visits'
import type { Investigator, Study, VisitStatus } from '@/types'

interface Props {
  studies: Study[]
  investigators: Investigator[]
  siteId: string
  preselectedStudyId?: string
  onSaved: () => void
}

const STATUSES: VisitStatus[] = ['completed', 'scheduled', 'missed', 'no_show']

interface FormState {
  studyId: string
  investigatorId: string
  participantId: string
  visitType: string
  scheduledDate: string
  status: VisitStatus
  actualDurationMinutes: string
}

export function VisitLogForm({
  studies,
  investigators,
  siteId,
  preselectedStudyId,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FormState>({
    studyId: preselectedStudyId ?? '',
    investigatorId: '',
    participantId: '',
    visitType: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    status: 'completed',
    actualDurationMinutes: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const selectedStudy = studies.find((s) => s.id === form.studyId)
  const visitTypes = selectedStudy?.visitSchedule.map((v) => v.visitName) ?? []
  const defaultDuration =
    selectedStudy?.visitSchedule.find((v) => v.visitName === form.visitType)
      ?.investigatorTimeMinutes ?? 30

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleSubmit() {
    const next: typeof errors = {}
    if (!form.studyId) next.studyId = 'Study is required'
    if (!form.investigatorId) next.investigatorId = 'Investigator is required'
    if (!form.participantId.trim()) next.participantId = 'Participant ID is required'
    if (!form.scheduledDate) next.scheduledDate = 'Date is required'
    if (Object.keys(next).length) { setErrors(next); return }

    setLoading(true)
    try {
      await createVisit({
        participantId: form.participantId.trim(),
        studyId: form.studyId,
        investigatorId: form.investigatorId,
        siteId,
        visitType: form.visitType || 'Unspecified',
        scheduledDate: form.scheduledDate,
        completedDate: form.status === 'completed' ? form.scheduledDate : null,
        status: form.status,
        durationMinutes: defaultDuration,
        actualDurationMinutes: form.actualDurationMinutes ? Number(form.actualDurationMinutes) : null,
        source: 'manual',
      })
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setForm((f) => ({ ...f, participantId: '', visitType: '', actualDurationMinutes: '' }))
        onSaved()
      }, 100)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Log Visit</h2>

      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          Visit logged successfully.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="vl-study">Study *</Label>
          <select
            id="vl-study"
            value={form.studyId}
            onChange={(e) => set('studyId', e.target.value)}
            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">Select study…</option>
            {studies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {errors.studyId && <p className="text-xs text-red-600">{errors.studyId}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="vl-inv">Investigator *</Label>
          <select
            id="vl-inv"
            value={form.investigatorId}
            onChange={(e) => set('investigatorId', e.target.value)}
            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">Select investigator…</option>
            {investigators.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          {errors.investigatorId && <p className="text-xs text-red-600">{errors.investigatorId}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="vl-pid">Participant ID *</Label>
          <Input
            id="vl-pid"
            value={form.participantId}
            onChange={(e) => set('participantId', e.target.value)}
            placeholder="e.g. P001"
            className="font-mono"
          />
          {errors.participantId && <p className="text-xs text-red-600">{errors.participantId}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="vl-visittype">Visit Type</Label>
          <select
            id="vl-visittype"
            value={form.visitType}
            onChange={(e) => set('visitType', e.target.value)}
            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">Select visit type…</option>
            {visitTypes.map((vt) => <option key={vt} value={vt}>{vt}</option>)}
            <option value="Unscheduled">Unscheduled</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="vl-date">Date *</Label>
          <Input
            id="vl-date"
            type="date"
            value={form.scheduledDate}
            onChange={(e) => set('scheduledDate', e.target.value)}
          />
          {errors.scheduledDate && <p className="text-xs text-red-600">{errors.scheduledDate}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="vl-status">Status</Label>
          <select
            id="vl-status"
            value={form.status}
            onChange={(e) => set('status', e.target.value as VisitStatus)}
            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="vl-duration">
            Actual Duration (min) <span className="text-slate-400 font-normal text-xs">optional override</span>
          </Label>
          <Input
            id="vl-duration"
            type="number"
            min="1"
            value={form.actualDurationMinutes}
            onChange={(e) => set('actualDurationMinutes', e.target.value)}
            placeholder={String(defaultDuration)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={loading || success}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          {loading ? 'Logging…' : 'Log Visit'}
        </Button>
      </div>
    </div>
  )
}
