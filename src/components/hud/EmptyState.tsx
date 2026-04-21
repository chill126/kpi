interface Props {
  icon?: React.ReactNode
  title: string
  body?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, body, action }: Props) {
  return (
    <div role="status" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      textAlign: 'center', padding: '32px 24px', gap: 10,
    }}>
      {icon && <div style={{ color: 'var(--text-label)', opacity: 0.9 }}>{icon}</div>}
      <h3 style={{
        margin: 0,
        fontFamily: 'Geist, Inter, system-ui', fontSize: 18, fontWeight: 500,
        letterSpacing: '-0.01em', color: 'var(--text-primary)',
      }}>{title}</h3>
      {body && <p style={{
        margin: 0, maxWidth: 360,
        fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55,
      }}>{body}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}
