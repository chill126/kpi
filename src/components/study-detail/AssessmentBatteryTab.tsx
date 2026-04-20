import { useState } from 'react'
import { updateStudy } from '@/lib/studies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SCALE_NAMES } from '@/lib/scaleDefaults'
import type { Study } from '@/types'
import { Plus, X } from 'lucide-react'

interface Props {
  study: Study
  canEdit: boolean
}

export function AssessmentBatteryTab({ study, canEdit }: Props) {
  const [battery, setBattery] = useState<Record<string, string[]>>(study.assessmentBattery)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(battery) !== JSON.stringify(study.assessmentBattery)

  const visitNames = study.visitSchedule.map((v) => v.visitName).filter(Boolean)

  function addScale(visitName: string, scale: string) {
    if (!scale.trim()) return
    setBattery((b) => ({
      ...b,
      [visitName]: [...(b[visitName] ?? []), scale.trim()],
    }))
  }

  function removeScale(visitName: string, scaleIdx: number) {
    setBattery((b) => ({
      ...b,
      [visitName]: (b[visitName] ?? []).filter((_, i) => i !== scaleIdx),
    }))
  }

  async function save() {
    setSaving(true)
    try {
      await updateStudy(study.id, { assessmentBattery: battery })
    } finally {
      setSaving(false)
    }
  }

  if (visitNames.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-8 text-center">
        Define visits in the Visit Schedule tab before adding assessments.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Assessment Battery</h2>
        {canEdit && dirty && (
          <Button size="sm" onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {visitNames.map((visitName) => {
          const scales = battery[visitName] ?? []
          return (
            <div key={visitName} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-2">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">{visitName}</h3>
              <div className="flex flex-wrap gap-2">
                {scales.map((scale, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2.5 py-1"
                  >
                    {scale}
                    {canEdit && (
                      <button onClick={() => removeScale(visitName, idx)} aria-label={`Remove ${scale}`}>
                        <X size={10} aria-hidden="true" />
                      </button>
                    )}
                  </span>
                ))}
                {scales.length === 0 && (
                  <span className="text-xs text-slate-400">No assessments</span>
                )}
              </div>
              {canEdit && (
                <AddScaleInput onAdd={(scale) => addScale(visitName, scale)} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AddScaleInput({ onAdd }: { onAdd: (scale: string) => void }) {
  const [value, setValue] = useState('')

  return (
    <div className="flex items-center gap-2 mt-1">
      <datalist id="scale-suggestions">
        {SCALE_NAMES.map((s) => <option key={s} value={s} />)}
      </datalist>
      <Input
        list="scale-suggestions"
        placeholder="Add scale…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) {
            onAdd(value.trim())
            setValue('')
          }
        }}
        className="h-7 text-sm w-48"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => { if (value.trim()) { onAdd(value.trim()); setValue('') } }}
        className="h-7 px-2"
      >
        <Plus size={12} aria-hidden="true" />
      </Button>
    </div>
  )
}
