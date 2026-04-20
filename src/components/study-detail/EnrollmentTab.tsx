import { useState } from 'react'
import { updateEnrollmentData } from '@/lib/studies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { EnrollmentData, Study } from '@/types'

interface Props {
  study: Study
  canEdit: boolean
}

function conversionRate(numerator: number, denominator: number): string {
  if (denominator === 0) return '—'
  return `${Math.round((numerator / denominator) * 100)}%`
}

export function EnrollmentTab({ study, canEdit }: Props) {
  const data = study.enrollmentData ?? {
    prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0,
  }
  const [form, setForm] = useState<EnrollmentData>(data)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(form) !== JSON.stringify(data)

  function set(field: keyof EnrollmentData, value: string) {
    setForm((f) => ({ ...f, [field]: Number(value) || 0 }))
  }

  async function save() {
    setSaving(true)
    try {
      await updateEnrollmentData(study.id, form)
    } finally {
      setSaving(false)
    }
  }

  const stages: { label: string; key: keyof EnrollmentData; value: number }[] = [
    { label: 'Prescreens', key: 'prescreens', value: form.prescreens },
    { label: 'Screens', key: 'screens', value: form.screens },
    { label: 'Randomizations', key: 'randomizations', value: form.randomizations },
    { label: 'Active', key: 'active', value: form.active },
    { label: 'Completions', key: 'completions', value: form.completions },
  ]

  const maxValue = Math.max(...stages.map((s) => s.value), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Enrollment Funnel</h2>
        {canEdit && dirty && (
          <Button size="sm" onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {stages.map((stage, idx) => (
          <div key={stage.key} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-2 text-center">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{stage.label}</p>
            {canEdit ? (
              <Input
                type="number"
                min="0"
                value={form[stage.key]}
                onChange={(e) => set(stage.key, e.target.value)}
                className="text-center text-2xl font-bold h-12 tabular-nums"
              />
            ) : (
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {stage.value}
              </p>
            )}
            <div
              className="h-1.5 rounded-full bg-teal-500 mx-auto"
              style={{ width: `${Math.round((stage.value / maxValue) * 100)}%`, minWidth: stage.value > 0 ? '8px' : '0' }}
            />
            {idx > 0 && (
              <p className="text-xs text-slate-400">
                {conversionRate(stage.value, stages[idx - 1].value)} from prev
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
