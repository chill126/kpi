import { useState } from 'react'
import { Select as RadixSelect } from 'radix-ui'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Investigator, Study, StudyStatus } from '@/types'
import { updateStudyStatus } from '@/lib/studies'
import { useAuth } from '@/hooks/useAuth'
import type { StudyFilterState } from './StudyFilters'

const STATUS_OPTIONS: StudyStatus[] = ['pending', 'enrolling', 'paused', 'open', 'completed']

const STATUS_STYLES: Record<StudyStatus, React.CSSProperties> = {
  pending:   { background: 'rgba(30 120 255 / 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(30 120 255 / 0.3)' },
  enrolling: { background: 'rgba(52 211 153 / 0.15)', color: 'var(--signal-good)',     border: '1px solid rgba(52 211 153 / 0.3)' },
  paused:    { background: 'rgba(245 158 11 / 0.15)',  color: 'var(--signal-warn)',     border: '1px solid rgba(245 158 11 / 0.3)' },
  open:      { background: 'rgba(99 149 255 / 0.15)',  color: 'var(--accent-info)',     border: '1px solid rgba(99 149 255 / 0.3)' },
  completed: { background: 'rgba(255 255 255 / 0.06)', color: 'var(--text-muted)',      border: '1px solid rgba(255 255 255 / 0.10)' },
}

const STATUS_LABELS: Record<StudyStatus, string> = {
  pending: 'Pending', enrolling: 'Enrolling', paused: 'Paused', open: 'Open', completed: 'Completed',
}

function StudyStatusPill({ study }: { study: Study }) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const canEdit = user?.role === 'management'
  const style = STATUS_STYLES[study.status as StudyStatus] ?? STATUS_STYLES.completed
  const label = STATUS_LABELS[study.status as StudyStatus] ?? study.status

  async function handleChange(next: string) {
    if (next === study.status || saving || !user) return
    setSaving(true)
    try {
      await updateStudyStatus(study.id, next as StudyStatus, user.uid)
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 9999, ...style }}>
        {label}
      </span>
    )
  }

  return (
    <RadixSelect.Root value={study.status} onValueChange={(v) => void handleChange(v)} disabled={saving}>
      <RadixSelect.Trigger
        aria-label={`Status for ${study.name}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 500, padding: '2px 6px 2px 8px',
          borderRadius: 9999, cursor: 'pointer', outline: 'none',
          opacity: saving ? 0.6 : 1, fontFamily: 'inherit',
          ...style,
        }}
      >
        <RadixSelect.Value>{label}</RadixSelect.Value>
        <RadixSelect.Icon style={{ display: 'flex' }}>
          <ChevronDown size={10} />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          style={{
            zIndex: 60, minWidth: 140,
            background: 'oklch(0.13 0.020 275)',
            border: '1px solid rgba(255 255 255 / 0.12)',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0 0 0 / 0.5)',
            overflow: 'hidden',
          }}
        >
          <RadixSelect.Viewport style={{ padding: 4 }}>
            {STATUS_OPTIONS.map((s) => (
              <RadixSelect.Item
                key={s}
                value={s}
                data-hud-select-item=""
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '8px 10px', borderRadius: 6,
                  fontSize: 13, color: 'var(--text-primary)',
                  cursor: 'pointer', outline: 'none', userSelect: 'none',
                }}
              >
                <RadixSelect.ItemText>{STATUS_LABELS[s]}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}

function applyFilters(studies: Study[], filters: StudyFilterState): Study[] {
  return studies.filter((s) => {
    if (filters.status !== 'all' && s.status !== filters.status) return false
    if (filters.therapeuticArea && !s.therapeuticArea.toLowerCase().includes(filters.therapeuticArea.toLowerCase())) return false
    return true
  })
}

interface Props {
  studies: Study[]
  investigators: Investigator[]
  filters: StudyFilterState
  selectedIds: string[]
  onSelectChange: (ids: string[]) => void
  onViewDetail: (studyId: string) => void
}

export function StudyTable({ studies, investigators, filters, selectedIds, onSelectChange, onViewDetail }: Props) {
  const invMap = Object.fromEntries(investigators.map((i) => [i.id, i]))
  const filtered = applyFilters(studies, filters)

  function toggleSelect(id: string) {
    if (selectedIds.includes(id)) {
      onSelectChange(selectedIds.filter((x) => x !== id))
    } else if (selectedIds.length < 2) {
      onSelectChange([...selectedIds, id])
    }
  }

  if (filtered.length === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        No studies match the current filters.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {filtered.map((study) => {
        const pi = invMap[study.piId]
        const enrolled = study.enrollmentData?.randomizations ?? 0
        const pct = study.targetEnrollment > 0 ? Math.round((enrolled / study.targetEnrollment) * 100) : 0
        const isSelected = selectedIds.includes(study.id)

        return (
          <div
            key={study.id}
            className="glass"
            style={{
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              outline: isSelected ? '2px solid var(--accent-primary)' : undefined,
            }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelect(study.id)}
              aria-label={`Select ${study.name}`}
              style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)', flexShrink: 0, cursor: 'pointer' }}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <button
                  onClick={() => onViewDetail(study.id)}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-primary)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
                >
                  {study.name}
                </button>
                <StudyStatusPill study={study} />
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                <span>{study.sponsor}</span>
                {study.sponsorProtocolId && <> · <span>{study.sponsorProtocolId}</span></>}
                {study.phase && <> · <span>{study.phase}</span></>}
                {study.therapeuticArea && <> · <span>{study.therapeuticArea}</span></>}
                {pi && <> · PI: <span>{pi.name}</span></>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, maxWidth: 200, height: 4, background: 'rgba(255 255 255 / 0.08)', borderRadius: 9999, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(pct, 100)}%`,
                      borderRadius: 9999,
                      background: pct >= 100 ? 'var(--signal-good)' : pct >= 75 ? 'var(--signal-warn)' : 'var(--accent-primary)',
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {enrolled}/{study.targetEnrollment}{' '}
                  <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{pct}%</span>
                </span>
              </div>
            </div>

            <button
              onClick={() => onViewDetail(study.id)}
              aria-label={`View ${study.name}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 12px', borderRadius: 8,
                background: 'rgba(255 255 255 / 0.06)',
                border: '1px solid rgba(255 255 255 / 0.10)',
                color: 'var(--text-secondary)', fontSize: 12,
                cursor: 'pointer', flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255 255 255 / 0.10)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255 255 255 / 0.06)' }}
            >
              View <ChevronRight size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
