export const chartPalette = {
  series: [
    'oklch(0.72 0.17 295)',
    'oklch(0.80 0.12 220)',
    'oklch(0.78 0.15 162)',
    'oklch(0.79 0.16 82)',
    'oklch(0.72 0.17 13)',
  ] as const,
  signalBar(pct: number): string {
    if (pct >= 90) return 'oklch(0.72 0.17 13)'
    if (pct >= 75) return 'oklch(0.79 0.16 82)'
    return 'oklch(0.78 0.15 162)'
  },
  grid:   'rgba(255 255 255 / 0.06)',
  axis:   'oklch(0.55 0.01 275)',
  tooltip:{
    bg:     'oklch(0.13 0.020 275)',
    border: 'rgba(255 255 255 / 0.09)',
    text:   'oklch(0.97 0 0)',
    font:   'JetBrains Mono',
  },
} as const
