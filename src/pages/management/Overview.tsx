import { useMemo } from 'react'
import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { useAuthContext } from '@/context/AuthContext'
import { getWeekStart, computeWeekMetrics } from '@/lib/capacity'
import { computeCapacityForecast } from '@/lib/capacityForecast'

import { Tile } from '@/components/hud/Tile'
import { Panel } from '@/components/hud/Panel'
import { Skeleton } from '@/components/hud/Skeleton'
import { ErrorState } from '@/components/hud/ErrorState'
import { EmptyState } from '@/components/hud/EmptyState'
import { HeroSentence } from '@/components/hud/HeroSentence'
import { HUDBarChart } from '@/components/hud/charts/HUDBarChart'
import { HUDAreaChart } from '@/components/hud/charts/HUDAreaChart'
import { NearCapacityList } from '@/components/hud/panels/NearCapacityList'
import { ActiveParticipantsPanel } from '@/components/hud/panels/ActiveParticipantsPanel'

export function Overview() {
  const { user } = useAuthContext()
  const firstName = (user?.displayName ?? user?.email ?? 'there').split(/[\s@]/)[0]

  const { studies, loading: studiesLoading, error: studiesError } = useStudies()
  const { investigators, loading: invLoading, error: invError } = useInvestigators()
  const { visits } = useSiteVisits()
  const { assessments } = useSiteAssessments()

  const loading = studiesLoading || invLoading
  const weekStart = getWeekStart(new Date())

  const activeStudies = useMemo(
    () => studies.filter(s => s.status === 'enrolling' || s.status === 'maintenance'),
    [studies],
  )

  const utilizationData = useMemo(
    () => investigators.map(inv => {
      const m = computeWeekMetrics(inv.id, inv.weeklyCapacityHours * 60, visits, assessments, weekStart)
      return {
        name: inv.name,
        utilization: m.utilizationPct,
        totalHours: +(m.totalMinutes / 60).toFixed(1),
        capacityHours: inv.weeklyCapacityHours,
      }
    }),
    [investigators, visits, assessments, weekStart],
  )

  const siteCapacityPct = useMemo(() => {
    if (utilizationData.length === 0) return 0
    const avg = utilizationData.reduce((s, d) => s + d.utilization, 0) / utilizationData.length
    return Math.round(avg)
  }, [utilizationData])

  const alertCount = useMemo(
    () => utilizationData.filter(d => d.utilization >= 75).length,
    [utilizationData],
  )

  const totalParticipants = useMemo(
    () => activeStudies.reduce((s, st) => s + (st.enrollmentData?.active ?? 0), 0),
    [activeStudies],
  )

  const totalTarget = useMemo(
    () => activeStudies.reduce((s, st) => s + (st.targetEnrollment ?? 0), 0),
    [activeStudies],
  )

  const enrollPct = totalTarget === 0 ? 0 : Math.round((totalParticipants / totalTarget) * 100)

  const enrollmentChartData = useMemo(
    () => activeStudies.map(s => ({
      name: s.name.length > 18 ? s.name.slice(0, 16) + '…' : s.name,
      enrolled: s.enrollmentData?.randomizations ?? 0,
      target: s.targetEnrollment,
    })),
    [activeStudies],
  )

  const utilizationForChart = useMemo(
    () => utilizationData.map(d => ({ name: d.name, value: d.utilization })),
    [utilizationData],
  )

  const forecastData = useMemo(
    () => computeCapacityForecast(investigators, visits, assessments, 4),
    [investigators, visits, assessments],
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1440 }}>
        <Skeleton height={60} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[0, 1, 2, 3].map(i => <Skeleton key={i} height={110} rounded={14} />)}
        </div>
        <Skeleton height={240} rounded={14} />
        <Skeleton height={200} rounded={14} />
        <Skeleton height={240} rounded={14} />
      </div>
    )
  }

  if (studiesError || invError) {
    return <ErrorState message={(studiesError || invError)?.message ?? 'Failed to load'} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1440 }}>
      <h1 style={{
        position: 'absolute', width: 1, height: 1, margin: -1, padding: 0,
        overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
      }}>Management Overview</h1>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-label)' }}>
          K2 · Tampa
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {user?.displayName ?? ''} · Week {weekNumber(new Date(weekStart))}
        </div>
      </header>

      <HeroSentence firstName={firstName} utilizations={utilizationData.map(d => d.utilization)} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }} role="region" aria-label="Key metrics">
        <Tile
          variant="hero"
          label="Capacity"
          value={siteCapacityPct}
          suffix="%"
          sub="avg utilization"
          signal={siteCapacityPct >= 90 ? 'alert' : siteCapacityPct >= 75 ? 'warn' : 'good'}
        />
        <Tile label="Studies" value={activeStudies.length} sub="enrolling or maintenance" signal="neutral" />
        <Tile
          label="Alerts"
          value={alertCount}
          sub="capacity warnings"
          signal={alertCount > 0 ? 'alert' : 'good'}
        />
        <Tile
          label="Enrollment"
          value={enrollPct}
          suffix="%"
          sub="of YTD target"
          signal={enrollPct >= 100 ? 'good' : enrollPct >= 80 ? 'neutral' : 'warn'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <Panel title="Enrollment Progress">
          {enrollmentChartData.length === 0 ? (
            <EmptyState title="No active studies" body="Create a study to start tracking enrollment." />
          ) : (
            <HUDBarChart
              data={enrollmentChartData}
              xKey="name"
              yKey="enrolled"
              height={220}
            />
          )}
        </Panel>
        <ActiveParticipantsPanel
          total={totalParticipants}
          activeStudiesCount={activeStudies.length}
          snapshots={[]}
        />
      </div>

      <Panel title="Projected Capacity · Next 4 Weeks">
        {investigators.length === 0 ? (
          <EmptyState title="Not enough data" body="Add investigators and schedule visits to see projections." />
        ) : (
          <HUDAreaChart
            data={forecastData}
            xKey="label"
            series={[
              { key: 'avg', name: 'Avg Utilization' },
              { key: 'max', name: 'Peak Investigator' },
            ]}
            height={200}
            referenceLines={[
              { y: 75, label: '75%', signal: 'warn' },
              { y: 90, label: '90%', signal: 'alert' },
            ]}
            valueFormatter={(v) => `${Math.round(v)}%`}
          />
        )}
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <Panel title="Investigator Utilization — This Week">
          {utilizationData.length === 0 ? (
            <EmptyState title="No investigators found" body="Add an investigator on the Investigators page." />
          ) : (
            <HUDBarChart
              data={utilizationForChart}
              xKey="name"
              yKey="value"
              height={220}
              signalByValue
              valueFormatter={(v) => `${Math.round(v)}%`}
            />
          )}
        </Panel>
        <NearCapacityList entries={utilizationData} />
      </div>
    </div>
  )
}

function weekNumber(d: Date): number {
  const oneJan = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7)
}
