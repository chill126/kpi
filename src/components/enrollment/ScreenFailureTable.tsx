import { Button } from '@/components/ui/button'
import { CATEGORY_LABELS } from './ScreenFailureForm'
import type { ScreenFailure, Study } from '@/types'

interface Props {
  failures: ScreenFailure[]
  study: Study
  onEdit: (failure: ScreenFailure) => void
  onDelete: (id: string) => void
}

function formatReasons(failure: ScreenFailure): string {
  return failure.reasons
    .map((r) => {
      const label = CATEGORY_LABELS[r.category] ?? r.category
      return r.detail ? `${label} (${r.detail})` : label
    })
    .join(', ')
}

export function ScreenFailureTable({ failures, study, onEdit, onDelete }: Props) {
  const screens = study.enrollmentData?.screens ?? 0
  const randomizations = study.enrollmentData?.randomizations ?? 0
  const failureRate = screens > 0 ? Math.round(((screens - randomizations) / screens) * 100) : 0

  const rateColor =
    failureRate >= 50 ? 'var(--signal-alert)'
    : failureRate >= 30 ? 'var(--signal-warn)'
    : 'var(--signal-good)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        className="glass"
        style={{ borderRadius: 10, padding: '12px 16px', display: 'inline-flex', flexDirection: 'column', gap: 4 }}
      >
        <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Screen Failure Rate
        </p>
        <p style={{ margin: 0, fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: screens > 0 ? rateColor : 'var(--text-muted)' }}>
          {screens > 0 ? `${failureRate}%` : '—'}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
          {screens > 0 ? `${screens - randomizations} of ${screens} screens` : 'No screens recorded'}
        </p>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid rgba(255 255 255 / 0.08)', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ borderBottom: '1px solid rgba(255 255 255 / 0.08)' }}>
            <tr>
              {['Date', 'Reasons', 'Source', 'Notes'].map((h) => (
                <th
                  key={h}
                  style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  {h}
                </th>
              ))}
              <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 500, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {failures.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                  No screen failures recorded.
                </td>
              </tr>
            )}
            {failures.map((f) => (
              <tr key={f.id} style={{ borderTop: '1px solid rgba(255 255 255 / 0.05)' }}>
                <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {f.date}
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                  {formatReasons(f)}
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                  {f.source ?? '—'}
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.notes ?? '—'}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: 8 }}>
                    <Button size="sm" variant="outline" onClick={() => onEdit(f)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(f.id)}>Delete</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
