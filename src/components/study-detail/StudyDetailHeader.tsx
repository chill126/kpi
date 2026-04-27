import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { StudyStatusToggle } from '@/components/studies/StudyStatusToggle'
import { StudyCloneButton } from '@/components/studies/StudyCloneButton'
import { StudyForm } from '@/components/studies/StudyForm'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useSite } from '@/hooks/useSite'
import type { Investigator, Study } from '@/types'
import { Pencil } from 'lucide-react'

interface Props {
  study: Study
  investigators: Investigator[]
}

export function StudyDetailHeader({ study, investigators }: Props) {
  const { user, role } = useAuth()
  const { siteId } = useSite()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)

  const pi = investigators.find((i) => i.id === study.piId)
  const enrolled = study.enrollmentData?.randomizations ?? 0
  const pct = study.targetEnrollment > 0 ? Math.round((enrolled / study.targetEnrollment) * 100) : 0

  return (
    <div className="glass" style={{ borderRadius: 14, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {study.name}
            </h1>
            <StatusBadge status={study.status} />
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            {study.sponsor}{study.sponsorProtocolId ? ` · ${study.sponsorProtocolId}` : ''}
          </p>
        </div>

        {role === 'management' && user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <StudyStatusToggle study={study} currentUser={user} />
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil size={14} className="mr-1.5" aria-hidden="true" />
              Edit
            </Button>
            <StudyCloneButton study={study} onCloned={(id) => navigate(`/studies/${id}`)} />
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Phase',       value: study.phase },
          { label: 'Indication',  value: study.therapeuticArea },
          { label: 'PI',          value: pi?.name ?? '—' },
          { label: 'Dates',       value: `${study.startDate || '—'} → ${study.expectedEndDate || '—'}` },
          { label: 'Primary RC',  value: study.primaryCoordinator || '—' },
          { label: 'Backup RC',   value: study.backupCoordinator || '—' },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: 2 }}>
              {label}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-label)' }}>
            Enrollment
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            {enrolled} / {study.targetEnrollment} ({pct}%)
          </span>
        </div>
        <div style={{ height: 6, background: 'rgba(255 255 255 / 0.08)', borderRadius: 9999, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min(pct, 100)}%`,
              borderRadius: 9999,
              background: pct >= 100 ? 'var(--signal-good)' : pct >= 75 ? 'var(--signal-warn)' : 'var(--accent-primary)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {role === 'management' && user && (
        <StudyForm
          open={editOpen}
          onOpenChange={setEditOpen}
          study={study}
          investigators={investigators}
          siteId={siteId}
          onSave={() => setEditOpen(false)}
        />
      )}
    </div>
  )
}
