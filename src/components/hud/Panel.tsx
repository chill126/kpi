import { useId } from 'react'

interface Props {
  title: string
  action?: React.ReactNode
  variant?: 'default' | 'strong'
  children: React.ReactNode
  className?: string
}

export function Panel({ title, action, variant = 'default', children, className }: Props) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className={[
        variant === 'strong' ? 'glass-strong' : 'glass',
        className,
      ].filter(Boolean).join(' ')}
      style={{ padding: 20 }}
    >
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <h3 id={headingId} style={{
          margin: 0, fontFamily: 'Inter, system-ui', fontSize: 10.5,
          fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--text-label)',
        }}>{title}</h3>
        {action && <div>{action}</div>}
      </header>
      {children}
    </section>
  )
}
