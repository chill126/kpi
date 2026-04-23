import { useMemo } from 'react'
import { Panel } from '@/components/hud/Panel'
import { Tile } from '@/components/hud/Tile'
import { Skeleton } from '@/components/hud/Skeleton'
import { EmptyState } from '@/components/hud/EmptyState'
import { HUDBarChart } from '@/components/hud/charts/HUDBarChart'
import { useAllProtocolDeviations } from '@/hooks/useAllProtocolDeviations'
import { useStudies } from '@/hooks/useStudies'
import type { ProtocolDeviation } from '@/types'

function formatCategory(category: string): string {
  const words = category.replace(/_/g, ' ').split(' ')
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1)
  return words.join(' ')
}

function daysOpen(dev: ProtocolDeviation): number {
  return Math.floor((Date.now() - new Date(dev.createdAt).getTime()) / 86400000)
}

function agingColor(days: number): string {
  if (days > 30) return 'var(--signal-alert)'
  if (days > 14) return 'var(--signal-warn)'
  return 'var(--signal-good)'
}

export function DeviationsTab() {
  const { deviations, loading } = useAllProtocolDeviations()
  const { studies } = useStudies()

  const openCount = useMemo(
    () => deviations.filter((d) => d.status === 'open').length,
    [deviations],
  )
  const piReviewedCount = useMemo(
    () => deviations.filter((d) => d.status === 'pi_reviewed').length,
    [deviations],
  )
  const closedCount = useMemo(
    () => deviations.filter((d) => d.status === 'closed').length,
    [deviations],
  )

  const openSignal =
    openCount === 0 ? 'good' : openCount <= 2 ? 'warn' : 'alert'

  const categoryChartData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const dev of deviations) {
      counts.set(dev.category, (counts.get(dev.category) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([category, count]) => ({ label: formatCategory(category), count }))
  }, [deviations])

  const studyNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of studies) map.set(s.id, s.name)
    return map
  }, [studies])

  const byStudyRows = useMemo(() => {
    const rows = new Map<
      string,
      { studyId: string; open: number; piReviewed: number; closed: number; total: number }
    >()
    for (const dev of deviations) {
      if (!rows.has(dev.studyId)) {
        rows.set(dev.studyId, {
          studyId: dev.studyId,
          open: 0,
          piReviewed: 0,
          closed: 0,
          total: 0,
        })
      }
      const row = rows.get(dev.studyId)!
      row.total += 1
      if (dev.status === 'open') row.open += 1
      else if (dev.status === 'pi_reviewed') row.piReviewed += 1
      else if (dev.status === 'closed') row.closed += 1
    }
    return Array.from(rows.values()).sort((a, b) => b.total - a.total)
  }, [deviations])

  const openDeviationsSorted = useMemo(
    () =>
      deviations
        .filter((d) => d.status === 'open')
        .map((d) => ({ ...d, days: daysOpen(d) }))
        .sort((a, b) => b.days - a.days),
    [deviations],
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <Skeleton height={88} />
          <Skeleton height={88} />
          <Skeleton height={88} />
        </div>
        <Skeleton height={240} />
        <Skeleton height={180} />
        <Skeleton height={240} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Section 1 — Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Tile label="Open" value={openCount} signal={openSignal} />
        <Tile label="PI Reviewed" value={piReviewedCount} signal="neutral" />
        <Tile label="Closed" value={closedCount} signal={closedCount > 0 ? 'good' : 'neutral'} />
      </div>

      {/* Section 2 — By Category */}
      <Panel title="By Category">
        {categoryChartData.length === 0 ? (
          <EmptyState title="No deviations recorded" />
        ) : (
          <HUDBarChart data={categoryChartData} xKey="label" yKey="count" height={200} />
        )}
      </Panel>

      {/* Section 3 — By Study */}
      <Panel title="By Study">
        {byStudyRows.length === 0 ? (
          <EmptyState title="No deviations recorded" />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Study Name', 'Open', 'PI Reviewed', 'Closed', 'Total'].map((col) => (
                  <th
                    key={col}
                    style={{
                      textAlign: col === 'Study Name' ? 'left' : 'right',
                      padding: '4px 8px',
                      fontFamily: 'Inter, system-ui',
                      fontSize: 10.5,
                      fontWeight: 500,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--text-label)',
                      borderBottom: '1px solid rgba(255 255 255 / 0.08)',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byStudyRows.map((row) => (
                <tr key={row.studyId}>
                  <td style={{ padding: '6px 8px', color: 'var(--text-primary)' }}>
                    {studyNameById.get(row.studyId) ?? row.studyId}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-primary)', fontFeatureSettings: '"tnum"' }}>
                    {row.open}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-primary)', fontFeatureSettings: '"tnum"' }}>
                    {row.piReviewed}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-primary)', fontFeatureSettings: '"tnum"' }}>
                    {row.closed}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-primary)', fontFeatureSettings: '"tnum"', fontWeight: 500 }}>
                    {row.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {/* Section 4 — Open Deviations Aging */}
      <Panel title="Open Deviations — Aging">
        {openDeviationsSorted.length === 0 ? (
          <EmptyState title="No open deviations" />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Subject', 'Study', 'Category', 'Date', 'Days Open'].map((col) => (
                  <th
                    key={col}
                    style={{
                      textAlign: col === 'Days Open' ? 'right' : 'left',
                      padding: '4px 8px',
                      fontFamily: 'Inter, system-ui',
                      fontSize: 10.5,
                      fontWeight: 500,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--text-label)',
                      borderBottom: '1px solid rgba(255 255 255 / 0.08)',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {openDeviationsSorted.map((dev) => (
                <tr key={dev.id}>
                  <td style={{ padding: '6px 8px', color: 'var(--text-primary)' }}>
                    {dev.subjectId}
                  </td>
                  <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>
                    {studyNameById.get(dev.studyId) ?? dev.studyId}
                  </td>
                  <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>
                    {formatCategory(dev.category)}
                  </td>
                  <td style={{ padding: '6px 8px', color: 'var(--text-secondary)', fontFeatureSettings: '"tnum"' }}>
                    {dev.date}
                  </td>
                  <td
                    style={{
                      padding: '6px 8px',
                      textAlign: 'right',
                      fontFeatureSettings: '"tnum"',
                      fontWeight: 600,
                      color: agingColor(dev.days),
                    }}
                  >
                    {dev.days}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  )
}
