interface Props {
  title: string
  action?: React.ReactNode
}

export function SectionHeader({ title, action }: Props) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingBottom: 8, marginBottom: 12,
      borderBottom: '1px solid rgba(255 255 255 / 0.06)',
    }}>
      <h2 style={{
        margin: 0, fontFamily: 'Inter, system-ui', fontSize: 10.5, fontWeight: 500,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--text-label)',
      }}>{title}</h2>
      {action}
    </header>
  )
}
