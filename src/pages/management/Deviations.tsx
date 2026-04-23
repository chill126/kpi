import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSite } from '@/hooks/useSite'
import { useStudies } from '@/hooks/useStudies'
import { useAllProtocolDeviations } from '@/hooks/useAllProtocolDeviations'
import { DeviationAnalyticsPanel } from '@/components/deviations/DeviationAnalyticsPanel'
import { DeviationForm } from '@/components/deviations/DeviationForm'
import { DeviationTable } from '@/components/deviations/DeviationTable'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/hud/Skeleton'
import { Panel } from '@/components/hud/Panel'
import type { ProtocolDeviation } from '@/types'

export function Deviations() {
  const { user, role } = useAuth()
  const { siteId } = useSite()
  const { studies } = useStudies()
  const { deviations, loading } = useAllProtocolDeviations()

  const canManage = role === 'management'

  const [filterStudyId, setFilterStudyId] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingDeviation, setEditingDeviation] = useState<ProtocolDeviation | undefined>()

  const visibleStudies = useMemo(
    () =>
      canManage
        ? studies
        : studies.filter((s) => user?.assignedStudies.includes(s.id)),
    [studies, canManage, user],
  )

  const studyOptions = useMemo(
    () => visibleStudies.map((s) => ({ id: s.id, name: s.name })),
    [visibleStudies],
  )

  const studyNameById = useMemo(
    () => Object.fromEntries(studies.map((s) => [s.id, s.name])),
    [studies],
  )

  const filtered = useMemo(
    () =>
      filterStudyId
        ? deviations.filter((d) => d.studyId === filterStudyId)
        : deviations,
    [deviations, filterStudyId],
  )

  function openCreate() {
    setEditingDeviation(undefined)
    setFormOpen(true)
  }

  function openEdit(deviation: ProtocolDeviation) {
    setEditingDeviation(deviation)
    setFormOpen(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
            Protocol Deviations
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            Log and track protocol deviations across all studies.
          </p>
        </div>
        <Button
          onClick={openCreate}
          style={{ background: 'var(--accent-primary)', border: 'none', color: 'oklch(0.09 0.015 275)' }}
        >
          + Log Deviation
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', flexShrink: 0 }}>
          Study
        </label>
        <select
          aria-label="Filter by study"
          value={filterStudyId}
          onChange={(e) => setFilterStudyId(e.target.value)}
          style={{ height: 36, background: 'rgba(255 255 255 / 0.06)', border: '1px solid rgba(255 255 255 / 0.12)', borderRadius: 8, color: 'var(--text-primary)', padding: '0 10px', fontSize: 13, width: '100%' }}
        >
          <option value="">All Studies</option>
          {visibleStudies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton height={160} />
          <Skeleton height={40} />
          <Skeleton height={40} />
        </div>
      ) : (
        <>
          <DeviationAnalyticsPanel deviations={filtered} />

          <Panel
            title="Deviation Log"
            action={
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {filtered.length} record{filtered.length !== 1 ? 's' : ''}
              </p>
            }
          >
            <DeviationTable
              deviations={filtered}
              canManage={canManage}
              onEdit={openEdit}
              studyNameById={!filterStudyId ? studyNameById : undefined}
            />
          </Panel>
        </>
      )}

      <DeviationForm
        open={formOpen}
        onOpenChange={(next) => {
          setFormOpen(next)
          if (!next) setEditingDeviation(undefined)
        }}
        studyId={editingDeviation?.studyId ?? ''}
        studyOptions={editingDeviation ? undefined : studyOptions}
        siteId={siteId}
        reportedBy={user?.displayName ?? user?.email ?? ''}
        canManage={canManage}
        deviation={editingDeviation}
      />
    </div>
  )
}
