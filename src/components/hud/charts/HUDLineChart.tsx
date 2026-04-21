import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartPalette } from './palette'
import { HUDTooltip } from './HUDTooltip'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

interface Datum { [key: string]: string | number }
interface Props {
  data: Datum[]
  xKey: string
  yKey: string
  height?: number
  valueFormatter?: (v: number) => string
}

export function HUDLineChart({ data, xKey, yKey, height = 220, valueFormatter }: Props) {
  const reduced = usePrefersReducedMotion()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={chartPalette.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content={(props: any) => <HUDTooltip {...props} valueFormatter={valueFormatter} />}
          cursor={{ stroke: 'rgba(255 255 255 / 0.2)', strokeDasharray: '3 3' }}
        />
        <Line
          type="monotone" dataKey={yKey}
          stroke={chartPalette.series[0]} strokeWidth={2}
          dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
          isAnimationActive={!reduced} connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
