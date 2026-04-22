import { StatusDot } from '../StatusDot'

interface Props { mode?: 'sidebar' | 'inline' }

export function BrandLockup({ mode = 'sidebar' }: Props) {
  const inline = mode === 'inline'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      flexDirection: inline ? 'row' : 'row',
    }}>
      <div className="glass-strong" style={{
        width: 28, height: 28, display: 'grid', placeItems: 'center',
        fontFamily: 'Geist, Inter, system-ui', fontSize: 12, fontWeight: 600,
        color: 'var(--text-primary)', borderRadius: 10,
      }}>K2</div>
      <StatusDot signal="good" />
      <span style={{
        fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase',
        color: 'var(--text-label)', fontWeight: 500,
      }}>{inline ? 'K2 · Tampa' : 'K2 Medical · Tampa'}</span>
    </div>
  )
}
