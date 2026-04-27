export function HUDChartDefs() {
  return (
    <defs>
      {/* bar gradients keyed by signal */}
      <linearGradient id="hud-bar-good" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="oklch(0.78 0.15 162)" />
        <stop offset="100%" stopColor="oklch(0.78 0.15 162 / 0.15)" />
      </linearGradient>
      <linearGradient id="hud-bar-warn" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="oklch(0.79 0.16 82)" />
        <stop offset="100%" stopColor="oklch(0.79 0.16 82 / 0.15)" />
      </linearGradient>
      <linearGradient id="hud-bar-alert" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="oklch(0.72 0.17 13)" />
        <stop offset="100%" stopColor="oklch(0.72 0.17 13 / 0.15)" />
      </linearGradient>
      <linearGradient id="hud-bar-primary" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="oklch(0.65 0.26 222)" />
        <stop offset="100%" stopColor="oklch(0.65 0.26 222 / 0.15)" />
      </linearGradient>

      {/* area gradients — series[0..4] */}
      {[
        ['blue',   'oklch(0.65 0.26 222)'],
        ['cyan',   'oklch(0.80 0.12 220)'],
        ['mint',   'oklch(0.78 0.15 162)'],
        ['amber',  'oklch(0.79 0.16 82)'],
        ['coral',  'oklch(0.72 0.17 13)'],
      ].map(([name, color]) => (
        <linearGradient key={name} id={`hud-area-${name}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      ))}
    </defs>
  )
}
