import { useState, useEffect } from 'react'
import { updateEnrollmentData } from '@/lib/studies'
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

  useEffect(() => {
    setForm(study.enrollmentData ?? { prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0 })
  }, [study.id])
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
    { label: 'Prescreens',     key: 'prescreens',     value: form.prescreens },
    { label: 'Screens',        key: 'screens',        value: form.screens },
    { label: 'Randomizations', key: 'randomizations', value: form.randomizations },
    { label: 'Active',         key: 'active',         value: form.active },
    { label: 'Completions',    key: 'completions',    value: form.completions },
  ]

  const maxValue = Math.max(...stages.map((s) => s.value), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
          Enrollment Funnel
        </h2>
        {canEdit && dirty && (
          <button
            onClick={save}
            disabled={saving}
            style={{
              height: 32, padding: '0 14px', borderRadius: 8,
              background: 'var(--accent-primary)', border: 'none',
              color: '#fff', fontSize: 13, fontWeight: 500,
              cursor: saving ? 'default' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {stages.map((stage, idx) => (
          <div
            key={stage.key}
            style={{
              background: 'rgba(255 255 255 / 0.04)',
              border: '1px solid rgba(255 255 255 / 0.09)',
              borderRadius: 10,
              padding: '16px 12px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <p style={{
              margin: 0, fontSize: 10.5, fontWeight: 500,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--text-label)',
            }}>
              {stage.label}
            </p>

            {canEdit ? (
              <input
                type="number"
                min="0"
                value={form[stage.key]}
                onChange={(e) => set(stage.key, e.target.value)}
                style={{
                  width: '100%', textAlign: 'center',
                  fontSize: 24, fontWeight: 700, color: 'var(--text-primary)',
                  background: 'rgba(255 255 255 / 0.06)',
                  border: '1px solid rgba(255 255 255 / 0.12)',
                  borderRadius: 8, padding: '8px 4px',
                  fontVariantNumeric: 'tabular-nums',
                  fontFamily: 'inherit', outline: 'none',
                  height: 'auto',
                  appearance: 'none',
                  MozAppearance: 'textfield',
                }}
              />
            ) : (
              <p style={{
                margin: 0, fontSize: 28, fontWeight: 700,
                color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums',
              }}>
                {stage.value}
              </p>
            )}

            <div style={{ height: 4, background: 'rgba(255 255 255 / 0.08)', borderRadius: 9999, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.round((stage.value / maxValue) * 100)}%`,
                  minWidth: stage.value > 0 ? 6 : 0,
                  borderRadius: 9999,
                  background: 'var(--accent-primary)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            {idx > 0 && (
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                {conversionRate(stage.value, stages[idx - 1].value)} from prev
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
