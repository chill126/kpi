interface Props { label: string; children: React.ReactNode }

export function NavGroup({ label, children }: Props) {
  return (
    <nav aria-label={label} style={{ marginTop: 12 }}>
      <div style={{
        padding: '6px 18px 4px',
        fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
        color: 'var(--text-label)', fontWeight: 500,
      }}>{label}</div>
      <div>{children}</div>
    </nav>
  )
}
