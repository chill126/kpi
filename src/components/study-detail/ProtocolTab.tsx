import { useState } from 'react'
import { FileText, CheckCircle, Upload, Clock } from 'lucide-react'
import { ProtocolPdfImportDialog } from '@/components/imports/ProtocolPdfImportDialog'
import type { Study } from '@/types'

interface Props {
  study: Study
  canEdit: boolean
}

export function ProtocolTab({ study, canEdit }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const visitCount = study.visitSchedule.length
  const totalScales = Object.values(study.assessmentBattery).reduce(
    (sum, scales) => sum + scales.length,
    0,
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Status card */}
      <div
        className="glass"
        style={{ padding: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div
            style={{
              borderRadius: 10,
              padding: 10,
              background: study.parsedFromProtocol
                ? 'rgba(52 211 153 / 0.12)'
                : 'rgba(255 255 255 / 0.06)',
              color: study.parsedFromProtocol ? 'var(--signal-good)' : 'var(--text-muted)',
              flexShrink: 0,
            }}
          >
            {study.parsedFromProtocol
              ? <CheckCircle size={22} aria-hidden="true" />
              : <FileText size={22} aria-hidden="true" />}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {study.parsedFromProtocol ? 'Protocol imported' : 'No protocol uploaded'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '3px 0 0' }}>
              {study.parsedFromProtocol
                ? `${visitCount} visit${visitCount === 1 ? '' : 's'} · ${totalScales} assessment scale${totalScales === 1 ? '' : 's'} defined`
                : 'Upload a protocol PDF to auto-populate the visit schedule and assessment battery.'}
            </p>
          </div>
        </div>

        {canEdit && (
          <button
            onClick={() => setDialogOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8, border: 'none', flexShrink: 0,
              background: 'var(--accent-primary)', color: 'oklch(0.09 0.018 238)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            <Upload size={14} aria-hidden="true" />
            {study.parsedFromProtocol ? 'Replace PDF' : 'Upload PDF'}
          </button>
        )}
      </div>

      {/* Visit schedule summary */}
      {visitCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-label)', margin: 0 }}>
            Visit Schedule ({visitCount} visits)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {study.visitSchedule.map((v, i) => {
              const scales = study.assessmentBattery[v.visitName] ?? []
              return (
                <div
                  key={i}
                  className="glass"
                  style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                      {v.visitName}
                    </p>
                    {v.visitWindow && (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '1px 0 0' }}>
                        Window: {v.visitWindow}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                    {(v.investigatorTimeMinutes > 0 || v.coordinatorTimeMinutes > 0) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                        <Clock size={11} aria-hidden="true" />
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {v.investigatorTimeMinutes}m PI
                          {v.coordinatorTimeMinutes > 0 && ` · ${v.coordinatorTimeMinutes}m coord`}
                        </span>
                      </div>
                    )}
                    {scales.length > 0 && (
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 99,
                        background: 'rgba(30 120 255 / 0.12)',
                        border: '1px solid rgba(30 120 255 / 0.25)',
                        color: 'var(--accent-primary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {scales.length} scale{scales.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <ProtocolPdfImportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        studyId={study.id}
      />
    </div>
  )
}
