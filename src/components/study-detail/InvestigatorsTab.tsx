import { useState, useEffect } from 'react'
import { updateStudy } from '@/lib/studies'
import type { Investigator, InvestigatorRole, Study, StudyInvestigator } from '@/types'
import { Trash2 } from 'lucide-react'

interface Props {
  study: Study
  investigators: Investigator[]
  canEdit: boolean
}

const ROLES: InvestigatorRole[] = ['PI', 'Sub-I', 'Provider']

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'left',
  fontSize: 10.5,
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-label)',
  borderBottom: '1px solid rgba(255 255 255 / 0.08)',
}

export function InvestigatorsTab({ study, investigators, canEdit }: Props) {
  const [assignments, setAssignments] = useState<StudyInvestigator[]>(study.assignedInvestigators)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setAssignments(study.assignedInvestigators)
  }, [study.id])
  const dirty = JSON.stringify(assignments) !== JSON.stringify(study.assignedInvestigators)

  const invMap = Object.fromEntries(investigators.map((i) => [i.id, i]))
  const assignedIds = assignments.map((a) => a.investigatorId)
  const available = investigators.filter((i) => !assignedIds.includes(i.id))

  function addInvestigator(investigatorId: string) {
    setAssignments((a) => [...a, { investigatorId, role: 'Sub-I' }])
  }

  function updateRole(idx: number, role: InvestigatorRole) {
    setAssignments((a) => a.map((item, i) => (i === idx ? { ...item, role } : item)))
  }

  function remove(idx: number) {
    setAssignments((a) => a.filter((_, i) => i !== idx))
  }

  async function save() {
    setSaving(true)
    try {
      await updateStudy(study.id, { assignedInvestigators: assignments })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
          Investigators
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {canEdit && available.length > 0 && (
            <select
              onChange={(e) => {
                if (e.target.value) { addInvestigator(e.target.value); e.target.value = '' }
              }}
              style={{ height: 32, fontSize: 12 }}
            >
              <option value="">Add investigator…</option>
              {available.map((inv) => (
                <option key={inv.id} value={inv.id}>{inv.name}</option>
              ))}
            </select>
          )}
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
      </div>

      <div style={{ borderRadius: 10, border: '1px solid rgba(255 255 255 / 0.09)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(255 255 255 / 0.04)' }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Credentials</th>
              <th style={thStyle}>Role on Study</th>
              {canEdit && <th style={{ width: 40, borderBottom: '1px solid rgba(255 255 255 / 0.08)' }} />}
            </tr>
          </thead>
          <tbody>
            {assignments.map((a, idx) => {
              const inv = invMap[a.investigatorId]
              return (
                <tr key={a.investigatorId} style={{ borderTop: '1px solid rgba(255 255 255 / 0.05)' }}>
                  <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    <span>{inv?.name ?? a.investigatorId}</span>
                    {a.investigatorId === study.piId && (
                      <span style={{
                        marginLeft: 8, fontSize: 10.5, fontWeight: 500,
                        padding: '2px 8px', borderRadius: 9999,
                        background: 'rgba(30 120 255 / 0.15)',
                        color: 'var(--accent-primary)',
                        border: '1px solid rgba(30 120 255 / 0.3)',
                      }}>
                        PI
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                    {inv?.credentials ?? '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {canEdit ? (
                      <select
                        value={a.role}
                        onChange={(e) => updateRole(idx, e.target.value as InvestigatorRole)}
                        disabled={a.investigatorId === study.piId}
                        style={{ height: 28, fontSize: 12, opacity: a.investigatorId === study.piId ? 0.5 : 1 }}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>{a.role}</span>
                    )}
                  </td>
                  {canEdit && (
                    <td style={{ padding: '0 8px' }}>
                      <button
                        onClick={() => remove(idx)}
                        aria-label={`Remove ${inv?.name ?? a.investigatorId}`}
                        disabled={a.investigatorId === study.piId}
                        style={{
                          background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                          color: 'var(--text-muted)',
                          opacity: a.investigatorId === study.piId ? 0.3 : 1,
                        }}
                        onMouseEnter={(e) => { if (a.investigatorId !== study.piId) e.currentTarget.style.color = 'var(--signal-alert)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
