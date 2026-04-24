import { useState } from 'react'
import { updateStudy } from '@/lib/studies'
import { SCALE_NAMES } from '@/lib/scaleDefaults'
import type { Study } from '@/types'
import { Plus, X, Clock } from 'lucide-react'

interface Props {
  study: Study
  canEdit: boolean
}

export function AssessmentBatteryTab({ study, canEdit }: Props) {
  const visitNames = study.visitSchedule.map((v) => v.visitName).filter(Boolean)

  const [battery, setBattery] = useState<Record<string, string[]>>(study.assessmentBattery)
  const [durations, setDurations] = useState<Record<string, Record<string, number>>>(
    study.scaleDurations ?? {}
  )
  const [saving, setSaving] = useState(false)

  const batteryDirty = JSON.stringify(battery) !== JSON.stringify(study.assessmentBattery)
  const durationsDirty = JSON.stringify(durations) !== JSON.stringify(study.scaleDurations ?? {})
  const dirty = batteryDirty || durationsDirty

  function addScale(visitName: string, scale: string) {
    if (!scale.trim()) return
    setBattery((b) => ({ ...b, [visitName]: [...(b[visitName] ?? []), scale.trim()] }))
  }

  function removeScale(visitName: string, scaleIdx: number) {
    const scaleName = battery[visitName]?.[scaleIdx]
    setBattery((b) => ({ ...b, [visitName]: (b[visitName] ?? []).filter((_, i) => i !== scaleIdx) }))
    if (scaleName) {
      setDurations((d) => {
        const visitDurs = { ...(d[visitName] ?? {}) }
        delete visitDurs[scaleName]
        return { ...d, [visitName]: visitDurs }
      })
    }
  }

  function setDuration(visitName: string, scaleName: string, minutes: number) {
    setDurations((d) => ({
      ...d,
      [visitName]: { ...(d[visitName] ?? {}), [scaleName]: Math.max(0, minutes) },
    }))
  }

  function totalMinutes(visitName: string): number {
    const scales = battery[visitName] ?? []
    const visitDurs = durations[visitName] ?? {}
    return scales.reduce((sum, s) => sum + (visitDurs[s] ?? 0), 0)
  }

  async function save() {
    setSaving(true)
    try {
      await updateStudy(study.id, { assessmentBattery: battery, scaleDurations: durations })
    } finally {
      setSaving(false)
    }
  }

  if (visitNames.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>
        Define visits in the Visit Schedule tab before adding assessments.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Assessment Battery
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            Assign scales to each visit and enter expected durations.
          </p>
        </div>
        {canEdit && dirty && (
          <button
            onClick={() => void save()}
            disabled={saving}
            style={{
              padding: '6px 16px', borderRadius: 8, border: 'none',
              background: 'var(--accent-primary)', color: 'oklch(0.09 0.018 238)',
              fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visitNames.map((visitName) => {
          const scales = battery[visitName] ?? []
          const visitDurs = durations[visitName] ?? {}
          const total = totalMinutes(visitName)

          return (
            <div
              key={visitName}
              className="glass"
              style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {visitName}
                </h3>
                {total > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                    <Clock size={11} aria-hidden="true" />
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{total} min total</span>
                  </div>
                )}
              </div>

              {scales.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {scales.map((scaleName, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '6px 10px', borderRadius: 8,
                        background: 'rgba(255 255 255 / 0.04)',
                        border: '1px solid rgba(255 255 255 / 0.07)',
                      }}
                    >
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, minWidth: 0 }}>
                        {scaleName}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {canEdit ? (
                          <>
                            <input
                              type="number"
                              min={0}
                              max={999}
                              value={visitDurs[scaleName] ?? 0}
                              onChange={(e) =>
                                setDuration(visitName, scaleName, parseInt(e.target.value) || 0)
                              }
                              aria-label={`Duration for ${scaleName}`}
                              style={{
                                width: 52, textAlign: 'right', padding: '2px 6px',
                                background: 'rgba(255 255 255 / 0.06)',
                                border: '1px solid rgba(255 255 255 / 0.12)',
                                borderRadius: 6, fontSize: 12, color: 'var(--text-primary)',
                                outline: 'none', fontVariantNumeric: 'tabular-nums',
                              }}
                            />
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 22 }}>min</span>
                            <button
                              onClick={() => removeScale(visitName, idx)}
                              aria-label={`Remove ${scaleName}`}
                              style={{
                                background: 'none', border: 'none', padding: 2,
                                cursor: 'pointer', color: 'var(--text-muted)',
                                display: 'flex', alignItems: 'center',
                              }}
                            >
                              <X size={13} aria-hidden="true" />
                            </button>
                          </>
                        ) : (
                          visitDurs[scaleName] ? (
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                              {visitDurs[scaleName]} min
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>No assessments assigned.</p>
              )}

              {canEdit && <AddScaleInput onAdd={(scale) => addScale(visitName, scale)} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AddScaleInput({ onAdd }: { onAdd: (scale: string) => void }) {
  const [value, setValue] = useState('')

  function submit() {
    if (!value.trim()) return
    onAdd(value.trim())
    setValue('')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <datalist id="scale-suggestions">
        {SCALE_NAMES.map((s) => <option key={s} value={s} />)}
      </datalist>
      <input
        list="scale-suggestions"
        placeholder="Add assessment scale…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        style={{
          flex: 1, height: 30, padding: '0 10px',
          background: 'rgba(255 255 255 / 0.05)',
          border: '1px solid rgba(255 255 255 / 0.12)',
          borderRadius: 8, fontSize: 12, color: 'var(--text-primary)', outline: 'none',
        }}
      />
      <button
        onClick={submit}
        style={{
          height: 30, padding: '0 12px', borderRadius: 8,
          background: 'rgba(30 120 255 / 0.15)',
          border: '1px solid rgba(30 120 255 / 0.30)',
          color: 'var(--accent-primary)', fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        <Plus size={12} aria-hidden="true" />
        Add
      </button>
    </div>
  )
}
