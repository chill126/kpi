interface HUDTab {
  value: string
  label: string
}

interface HUDTabBarProps {
  tabs: HUDTab[]
  value: string
  onChange: (value: string) => void
}

export function HUDTabBar({ tabs, value, onChange }: HUDTabBarProps) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255 255 255 / 0.08)',
        gap: 0,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            style={{
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              color: active ? 'var(--text-primary)' : 'var(--text-muted)',
              background: 'none',
              border: 'none',
              borderBottom: active
                ? '2px solid var(--accent-primary)'
                : '2px solid transparent',
              marginBottom: -1,
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
              letterSpacing: active ? '-0.01em' : 'normal',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
