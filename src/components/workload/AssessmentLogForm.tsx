import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createAssessment } from '@/lib/assessments'
import { SCALE_NAMES, getScaleDuration } from '@/lib/scaleDefaults'
import type { Investigator, Study } from '@/types'

interface Props {
  studies: Study[]
  investigators: Investigator[]
  siteId: string
  onSaved: () => void
}

interface FormState {
  studyId: string
  investigatorId: string
  participantId: string
  scaleType: string
  date: string
  durationMinutes: string
}

export function AssessmentLogForm({ studies, investigators, siteId, onSaved }: Props) {
  const [form, setForm] = useState<FormState>({
    studyId: '',
    investigatorId: '',
    participantId: '',
    scaleType: '',
    date: new Date().toISOString().split('T')[0],
    durationMinutes: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function set(field: keyof FormState, value: string) {
    const next = { ...form, [field]: value }
    if (field === 'scaleType' && value) {
      next.durationMinutes = String(getScaleDuration(value))
    }
    setForm(next)
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleSubmit() {
    const next: typeof errors = {}
    if (!form.studyId) next.studyId = 'Study is required'
    if (!form.investigatorId) next.investigatorId = 'Investigator is required'
    if (!form.participantId.trim()) next.participantId = 'Participant ID is required'
    if (!form.scaleType.trim()) next.scaleType = 'Scale type is required'
    if (!form.date) next.date = 'Date is required'
    if (Object.keys(next).length) { setErrors(next); return }

    setLoading(true)
    try {
      await createAssessment({
        investigatorId: form.investigatorId,
        studyId: form.studyId,
        siteId,
        visitId: null,
        scaleType: form.scaleType.trim(),
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : getScaleDuration(form.scaleType),
        date: form.date,
      })
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setForm((f) => ({ ...f, participantId: '', scaleType: '', durationMinutes: '' }))
        onSaved()
      }, 100)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Log Assessment</h2>

      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          Assessment logged successfully.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="al-study">Study *</Label>
          <select
            id="al-study"
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
          <Label htmlFor="al-inv">Investigator *</Label>
          <select
            id="al-inv"
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
          <Label htmlFor="al-pid">Participant ID *</Label>
          <Input
            id="al-pid"
            value={form.participantId}
            onChange={(e) => set('participantId', e.target.value)}
            placeholder="e.g. P001"
            className="font-mono"
          />
          {errors.participantId && <p className="text-xs text-red-600">{errors.participantId}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="al-scale">Scale / Assessment *</Label>
          <datalist id="scale-list">
            {SCALE_NAMES.map((s) => <option key={s} value={s} />)}
          </datalist>
          <Input
            id="al-scale"
            list="scale-list"
            value={form.scaleType}
            onChange={(e) => set('scaleType', e.target.value)}
            placeholder="e.g. HAMD-17"
          />
          {errors.scaleType && <p className="text-xs text-red-600">{errors.scaleType}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="al-date">Date *</Label>
          <Input
            id="al-date"
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
          />
          {errors.date && <p className="text-xs text-red-600">{errors.date}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="al-duration">
            Duration (min) <span className="text-slate-400 font-normal text-xs">auto-filled from scale</span>
          </Label>
          <Input
            id="al-duration"
            type="number"
            min="1"
            value={form.durationMinutes}
            onChange={(e) => set('durationMinutes', e.target.value)}
            placeholder={form.scaleType ? String(getScaleDuration(form.scaleType)) : '15'}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={loading || success}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          {loading ? 'Logging…' : 'Log Assessment'}
        </Button>
      </div>
    </div>
  )
}
