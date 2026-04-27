import { useState } from 'react'

interface Props {
  info: string
}

export function ReportInfoIcon({ info }: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-label="Report information"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, borderRadius: '50%',
          border: '1px solid rgba(255 255 255 / 0.18)',
          background: 'rgba(255 255 255 / 0.06)',
          color: 'var(--text-muted)',
          fontSize: 10, fontWeight: 600, cursor: 'default',
          fontFamily: 'Inter, system-ui',
          padding: 0, lineHeight: 1, flexShrink: 0,
        }}
      >
        ?
      </button>
      {visible && (
        <div style={{
          position: 'absolute', right: 0, bottom: 'calc(100% + 6px)',
          width: 280, padding: '8px 10px',
          background: 'oklch(0.13 0.020 275)',
          border: '1px solid rgba(255 255 255 / 0.10)',
          borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)',
          lineHeight: 1.6, zIndex: 50, pointerEvents: 'none',
          boxShadow: '0 8px 24px rgba(0 0 0 / 0.4)',
          whiteSpace: 'pre-wrap',
        }}>
          {info}
        </div>
      )}
    </div>
  )
}
