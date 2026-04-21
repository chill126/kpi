interface Props { displayName: string; role: string; email?: string }

export function UserChip({ displayName, role }: Props) {
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px' }}>
      <div style={{
        width: 40, height: 40, borderRadius: 9999,
        display: 'grid', placeItems: 'center',
        background: 'linear-gradient(135deg, oklch(0.72 0.17 295), oklch(0.80 0.12 220))',
        color: 'white', fontFamily: 'Geist, Inter, system-ui',
        fontSize: 14, fontWeight: 500,
      }}>{initials || '?'}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span style={{
          fontSize: 13, color: 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{displayName}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{role}</span>
      </div>
    </div>
  )
}
