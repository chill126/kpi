import { AlertTriangle } from 'lucide-react'

interface Props {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: Props) {
  return (
    <div role="alert" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      textAlign: 'center', padding: '32px 24px', gap: 10,
    }}>
      <AlertTriangle size={32} color="var(--signal-alert)" />
      <h3 style={{
        margin: 0, fontFamily: 'Geist, Inter, system-ui',
        fontSize: 18, fontWeight: 500, color: 'var(--text-primary)',
      }}>Something went wrong</h3>
      <p style={{
        margin: 0, maxWidth: 360, fontSize: 13,
        color: 'var(--text-secondary)', lineHeight: 1.55,
      }}>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="hud-focus-ring"
          style={{
            marginTop: 6, padding: '8px 16px', borderRadius: 9999,
            background: 'rgba(255 255 255 / 0.06)',
            border: '1px solid rgba(255 255 255 / 0.12)',
            color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer',
          }}
        >Retry</button>
      )}
    </div>
  )
}
