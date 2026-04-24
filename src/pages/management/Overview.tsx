import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { useSites } from '@/hooks/useSites'
import { useAllStudies } from '@/hooks/useAllStudies'
import { useAuthContext } from '@/context/AuthContext'
import { useDashboardConfig } from '@/hooks/useDashboardConfig'
import { getWeekStart, computeWeekMetrics } from '@/lib/capacity'
import { computeCapacityForecast } from '@/lib/capacityForecast'

import { Tile } from '@/components/hud/Tile'
import { Panel } from '@/components/hud/Panel'
import { Skeleton } from '@/components/hud/Skeleton'
import { ErrorState } from '@/components/hud/ErrorState'
import { EmptyState } from '@/components/hud/EmptyState'
import { HeroSentence } from '@/components/hud/HeroSentence'
import { HUDTabBar } from '@/components/hud/TabBar'
import { HUDBarChart } from '@/components/hud/charts/HUDBarChart'
import { HUDAreaChart } from '@/components/hud/charts/HUDAreaChart'
import { NearCapacityList } from '@/components/hud/panels/NearCapacityList'
import { ActiveParticipantsPanel } from '@/components/hud/panels/ActiveParticipantsPanel'
import type { OverviewTileId, Site, Study } from '@/types'

// ── Network Overview tab ────────────────────────────────────────────────────

function NetworkOverviewTab() {
  const { sites, loading: sitesLoading, error: sitesError } = useSites()
  const { studies, loading: studiesLoading, error: studiesError } = useAllStudies()

  const activeSites = useMemo(() => sites.filter((s) => s.active), [sites])
  const totalEnrolled = useMemo(
    () => studies.reduce((s, st) => s + (st.enrollmentData?.randomizations ?? 0), 0),
    [studies],
  )
  const totalTarget = useMemo(
    () => studies.reduce((s, st) => s + st.targetEnrollment, 0),
    [studies],
  )

  if (sitesLoading || studiesLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} height={110} rounded={14} />)}
        </div>
        <Skeleton height={200} rounded={14} />
      </div>
    )
  }

  if (sitesError || studiesError) {
    return <ErrorState message={(sitesError || studiesError)?.message ?? 'Failed to load network data'} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <Tile label="Active Sites" value={activeSites.length} sub="in network" signal="neutral" />
        <Tile label="Studies" value={studies.length} sub="across network" signal="neutral" />
        <Tile
          label="Enrolled"
          value={totalEnrolled}
          sub={`of ${totalTarget} target`}
          signal={
            totalTarget === 0 ? 'neutral'
            : totalEnrolled >= totalTarget ? 'good'
            : totalEnrolled >= totalTarget * 0.8 ? 'neutral'
            : 'warn'
          }
        />
      </div>

      <Panel title="Site Network">
        {sites.length === 0 ? (
          <EmptyState title="No sites in network" body="Add sites in Settings." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sites.map((site: Site) => {
              const siteStudies = studies.filter((s: Study) => s.siteId === site.id)
              const siteEnrolled = siteStudies.reduce(
                (s, st) => s + (st.enrollmentData?.randomizations ?? 0), 0,
              )
              const siteTarget = siteStudies.reduce((s, st) => s + st.targetEnrollment, 0)
              return (
                <div
                  key={site.id}
                  className="glass"
                  style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16, borderRadius: 10 }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {site.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{site.location}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 80, textAlign: 'right' }}>
                    {siteStudies.length} {siteStudies.length === 1 ? 'study' : 'studies'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 120, textAlign: 'right' }}>
                    {siteEnrolled} / {siteTarget} enrolled
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, flexShrink: 0,
                    background: site.active ? 'rgba(22 163 74 / 0.15)' : 'rgba(255 255 255 / 0.06)',
                    color: site.active ? 'var(--signal-good)' : 'var(--text-muted)',
                    border: site.active ? '1px solid rgba(22 163 74 / 0.3)' : '1px solid rgba(255 255 255 / 0.10)',
                  }}>
                    {site.active ? 'active' : 'inactive'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Panel>
    </div>
  )
}

// ── helpers ─────────────────────────────────────────────────────────────────

function weekNumber(d: Date): number {
  const oneJan = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7)
}

// ── Overview ─────────────────────────────────────────────────────────────────

export function Overview() {
  const { user } = useAuthContext()
  const navigate = useNavigate()
  const firstName = ((user?.displayName ?? user?.email ?? 'there').trim().split(/[\s@]/)[0]) || 'there'

  const [overviewTab, setOverviewTab] = useState<'dashboard' | 'network'>('dashboard')

  const { studies, loading: studiesLoading, error: studiesError } = useStudies()
  const { investigators, loading: invLoading, error: invError } = useInvestigators()
  const { visits } = useSiteVisits()
  const { assessments } = useSiteAssessments()
  const { config } = useDashboardConfig()

  const loading = studiesLoading || invLoading
  const weekStart = getWeekStart(new Date())
  const todayStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  const activeStudies = useMemo(
    () => studies.filter((s) => s.status === 'enrolling' || s.status === 'open'),
    [studies],
  )

  const piSubIInvestigators = useMemo(
    () => investigators.filter((inv) => inv.role === 'PI' || inv.role === 'Sub-I'),
    [investigators],
  )

  const utilizationData = useMemo(
    () => piSubIInvestigators
      .map((inv) => {
        const m = computeWeekMetrics(inv.id, inv.weeklyCapacityHours * 60, visits, assessments, weekStart)
        return {
          name: inv.name,
          utilization: m.utilizationPct,
          totalHours: +(m.totalMinutes / 60).toFixed(1),
          capacityHours: inv.weeklyCapacityHours,
        }
      }),
    [piSubIInvestigators, visits, assessments, weekStart],
  )

  const siteCapacityPct = useMemo(() => {
    if (utilizationData.length === 0) return 0
    const avg = utilizationData.reduce((s, d) => s + d.utilization, 0) / utilizationData.length
    return Math.round(avg)
  }, [utilizationData])

  const alertCount = useMemo(
    () => utilizationData.filter((d) => d.utilization >= 75).length,
    [utilizationData],
  )

  const totalParticipants = useMemo(
    () => activeStudies.reduce((s, st) => s + (st.enrollmentData?.active ?? 0), 0),
    [activeStudies],
  )

  const totalScreens = useMemo(
    () => activeStudies.reduce((s, st) => s + (st.enrollmentData?.screens ?? 0), 0),
    [activeStudies],
  )
  const totalRands = useMemo(
    () => activeStudies.reduce((s, st) => s + (st.enrollmentData?.randomizations ?? 0), 0),
    [activeStudies],
  )
  const totalCompletions = useMemo(
    () => activeStudies.reduce((s, st) => s + (st.enrollmentData?.completions ?? 0), 0),
    [activeStudies],
  )

  const todayActivityCount = useMemo(() => {
    const todayVisits = visits.filter((v) => v.scheduledDate === todayStr).length
    const todayAssessments = assessments.filter((a) => a.date === todayStr).length
    return todayVisits + todayAssessments
  }, [visits, assessments, todayStr])

  const enrollmentChartData = useMemo(
    () => activeStudies.map((s) => ({
      name: s.name.length > 18 ? s.name.slice(0, 16) + '…' : s.name,
      enrolled: s.enrollmentData?.randomizations ?? 0,
      target: s.targetEnrollment,
    })),
    [activeStudies],
  )

  const utilizationForChart = useMemo(
    () => utilizationData.map((d) => ({ name: d.name, value: d.utilization })),
    [utilizationData],
  )

  const forecastData = useMemo(
    () => computeCapacityForecast(piSubIInvestigators, visits, assessments, 4),
    [piSubIInvestigators, visits, assessments],
  )

  function renderTile(id: OverviewTileId): React.ReactNode {
    switch (id) {
      case 'capacity':
        return (
          <Tile
            variant="hero"
            label="Capacity"
            value={siteCapacityPct}
            suffix="%"
            sub="avg utilization"
            signal={siteCapacityPct >= 90 ? 'alert' : siteCapacityPct >= 75 ? 'warn' : 'good'}
          />
        )
      case 'studies':
        return <Tile label="Studies" value={activeStudies.length} sub="enrolling or open" signal="neutral" />
      case 'alerts':
        return (
          <Tile
            label="Alerts"
            value={alertCount}
            sub="capacity warnings"
            signal={alertCount > 0 ? 'alert' : 'good'}
          />
        )
      case 'enrollment':
        return (
          <div
            className="glass"
            style={{ borderRadius: 14, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}
          >
            <span style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-label)' }}>
              Enrollment
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>{totalScreens}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Screened</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>{totalRands}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Randomized</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--signal-good)' }}>{totalParticipants}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Active</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>{totalCompletions}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Completed</div>
              </div>
            </div>
          </div>
        )
      case 'today-activity':
        return (
          <button
            aria-label="Today's Activity — open operations"
            onClick={() => navigate('/operations')}
            style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer' }}
          >
            <Tile
              label="Today's Activity"
              value={todayActivityCount}
              sub="visits & assessments"
              signal="neutral"
            />
          </button>
        )
      default: {
        const _: never = id
        void _
        return null
      }
    }
  }

  const visibleTiles = useMemo(
    () => config.tiles.filter((t) => t.visible).sort((a, b) => a.order - b.order),
    [config.tiles],
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1440 }}>
        <Skeleton height={60} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={110} rounded={14} />)}
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

      <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {user?.displayName ?? ''} · Week {weekNumber(new Date(weekStart))}
        </div>
      </header>

      <HeroSentence firstName={firstName} utilizations={utilizationData.map((d) => d.utilization)} />

      <HUDTabBar
        tabs={[
          { value: 'dashboard', label: 'My Dashboard' },
          { value: 'network', label: 'Network Overview' },
        ]}
        value={overviewTab}
        onChange={(v) => setOverviewTab(v as 'dashboard' | 'network')}
      />

      {overviewTab === 'network' && <NetworkOverviewTab />}

      {overviewTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {visibleTiles.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>
              No tiles visible — configure in{' '}
              <button
                onClick={() => navigate('/settings')}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: 13, padding: 0 }}
              >
                Settings
              </button>
              .
            </div>
          ) : (
            <div
              style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleTiles.length}, 1fr)`, gap: 14 }}
              role="region"
              aria-label="Key metrics"
            >
              {visibleTiles.map((t) => (
                <div key={t.id}>{renderTile(t.id)}</div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
            <Panel title="Enrollment Progress">
              {enrollmentChartData.length === 0 ? (
                <EmptyState title="No active studies" body="Create a study to start tracking enrollment." />
              ) : (
                <HUDBarChart data={enrollmentChartData} xKey="name" yKey="enrolled" height={220} />
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
                <EmptyState title="No staff found" body="Add a staff member on the Staff page." />
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
      )}
    </div>
  )
}
