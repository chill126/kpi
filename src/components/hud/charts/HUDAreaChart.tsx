import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { chartPalette } from './palette'
import { HUDChartDefs } from './defs'
import { HUDTooltip } from './HUDTooltip'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

const gradientNames = ['violet', 'cyan', 'mint', 'amber', 'coral'] as const

interface Datum { [key: string]: string | number }
interface Series { key: string; name?: string }
interface ReferenceLineSpec { y: number; label?: string; signal?: 'warn' | 'alert' }

interface Props {
  data: Datum[]
  xKey: string
  series: Series[]
  height?: number
  stacked?: boolean
  showAxes?: boolean
  referenceLines?: ReferenceLineSpec[]
  valueFormatter?: (v: number) => string
}

export function HUDAreaChart({
  data, xKey, series, height = 200,
  stacked = false, showAxes = true, referenceLines = [], valueFormatter,
}: Props) {
  const reduced = usePrefersReducedMotion()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <HUDChartDefs />
        {showAxes && (
          <>
            <CartesianGrid stroke={chartPalette.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={(props: any) => <HUDTooltip {...props} valueFormatter={valueFormatter} />}
            />
          </>
        )}
        {referenceLines.map((r) => (
          <ReferenceLine
            key={r.y}
            y={r.y}
            stroke={r.signal === 'alert' ? chartPalette.series[4] : chartPalette.series[3]}
            strokeDasharray="4 4"
            label={r.label ? {
              value: r.label, position: 'insideTopRight',
              fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11,
            } : undefined}
          />
        ))}
        {series.map((s, i) => {
          const name = gradientNames[i % gradientNames.length]
          return (
            <Area
              key={s.key} type="monotone" dataKey={s.key} name={s.name ?? s.key}
              stackId={stacked ? '1' : undefined}
              stroke={chartPalette.series[i % chartPalette.series.length]} strokeWidth={1.5}
              fill={`url(#hud-area-${name})`}
              isAnimationActive={!reduced}
            />
          )
        })}
      </AreaChart>
    </ResponsiveContainer>
  )
}
