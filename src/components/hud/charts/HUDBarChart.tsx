import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { chartPalette } from './palette'
import { HUDChartDefs } from './defs'
import { HUDTooltip } from './HUDTooltip'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

type Datum = object

interface Props {
  data: Datum[]
  xKey: string
  yKey: string
  height?: number
  signalByValue?: boolean
  valueFormatter?: (v: number) => string
}

export function HUDBarChart({
  data, xKey, yKey, height = 220, signalByValue = false, valueFormatter,
}: Props) {
  const reduced = usePrefersReducedMotion()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <HUDChartDefs />
        <CartesianGrid
          stroke={chartPalette.grid}
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey={xKey}
          tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }}
          axisLine={false} tickLine={false} width={36}
        />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content={(props: any) => <HUDTooltip {...props} valueFormatter={valueFormatter} />}
          cursor={{ fill: 'rgba(255 255 255 / 0.04)' }}
        />
        <Bar
          dataKey={yKey}
          radius={[4, 4, 2, 2]}
          isAnimationActive={!reduced}
          fill="url(#hud-bar-primary)"
        >
          {signalByValue && data.map((d, i) => {
            const v = Number((d as Record<string, unknown>)[yKey])
            const id = v >= 90 ? 'hud-bar-alert' : v >= 75 ? 'hud-bar-warn' : 'hud-bar-good'
            return <Cell key={i} fill={`url(#${id})`} />
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
