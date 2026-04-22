import { Users } from 'lucide-react'
import { Panel } from '../Panel'
import { EmptyState } from '../EmptyState'
import { TrendChip } from '../TrendChip'
import { HUDAreaChart } from '../charts/HUDAreaChart'
import { useCountUp } from '../hooks/useCountUp'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export interface Snapshot { weekStart: string; value: number }

interface Props {
  total: number
  activeStudiesCount: number
  snapshots: Snapshot[]
}

function monthDelta(snapshots: Snapshot[]): number | null {
  if (snapshots.length < 2) return null
  const sorted = [...snapshots].sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  const last = sorted[sorted.length - 1].value
  const fourBackIdx = Math.max(0, sorted.length - 5)
  const fourBack = sorted[fourBackIdx].value
  return last - fourBack
}

export function ActiveParticipantsPanel({ total, activeStudiesCount, snapshots }: Props) {
  const reduced = usePrefersReducedMotion()
  const animated = useCountUp(total, { reducedMotion: reduced })
  const delta = monthDelta(snapshots)

  if (total === 0) {
    return (
      <Panel title="Active Participants">
        <EmptyState
          icon={<Users size={32} />}
          title="No participants yet"
          body="Randomize a participant to see the trend."
        />
      </Panel>
    )
  }

  const trendChip = (() => {
    if (delta === null || delta === 0) return null
    if (delta > 0) return <TrendChip signal="good">+{delta} this month</TrendChip>
    return <TrendChip signal="alert">{delta} this month</TrendChip>
  })()

  return (
    <Panel title="Active Participants" action={trendChip ?? undefined}>
      <div style={{
        fontFamily: 'Geist, Inter, system-ui', fontSize: 56, fontWeight: 300,
        letterSpacing: '-0.03em', lineHeight: 1,
        color: 'var(--text-primary)', fontFeatureSettings: '"tnum"',
      }}>{animated}</div>
      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-muted)' }}>
        across {activeStudiesCount} studies
      </div>
      {snapshots.length >= 2 && (
        <div style={{ marginTop: 14 }}>
          <HUDAreaChart
            data={snapshots.map(s => ({ week: s.weekStart, v: s.value }))}
            xKey="week"
            series={[{ key: 'v', name: 'Participants' }]}
            height={72}
            showAxes={false}
          />
        </div>
      )}
    </Panel>
  )
}
