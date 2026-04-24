import { useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { useStudies } from '@/hooks/useStudies'
import { useAuth } from '@/hooks/useAuth'
import { useSite } from '@/hooks/useSite'
import {
  getWeekStart,
  computeWeekMetrics,
  computeWeekHistory,
} from '@/lib/capacity'
import {
  createInvestigator,
  updateInvestigator,
  deleteInvestigator,
} from '@/lib/investigators'
import { Skeleton } from '@/components/hud/Skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Panel } from '@/components/hud/Panel'
import { Tile } from '@/components/hud/Tile'
import { EmptyState } from '@/components/hud/EmptyState'
import { HUDLineChart } from '@/components/hud/charts/HUDLineChart'
import type { Investigator, InvestigatorRole, Study, Visit, Assessment } from '@/types'

interface InvestigatorForm {
  name: string
  credentials: string
  role: InvestigatorRole
  weeklyCapacityHours: number
  siteBaselinePct: number
  boardName: string
}

const BLANK_INVESTIGATOR_FORM: InvestigatorForm = {
  name: '',
  credentials: '',
  role: 'PI',
  weeklyCapacityHours: 40,
  siteBaselinePct: 100,
  boardName: '',
}

function investigatorToForm(inv: Investigator): InvestigatorForm {
  return {
    name: inv.name,
    credentials: inv.credentials,
    role: inv.role,
    weeklyCapacityHours: inv.weeklyCapacityHours,
    siteBaselinePct: inv.siteBaselinePct,
    boardName: inv.boardName ?? '',
  }
}

function CapacityBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100)
  const color = pct >= 90 ? 'var(--signal-alert)' : pct >= 75 ? 'var(--signal-warn)' : 'var(--signal-good)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255 255 255 / 0.08)', overflow: 'hidden' }}>
        <div style={{ height: 4, borderRadius: 2, width: `${capped}%`, background: color, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, fontFeatureSettings: '"tnum"', color, minWidth: 36, textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  )
}

function InvestigatorDetail({
  investigator,
  visits,
  assessments,
  studies,
}: {
  investigator: Investigator
  visits: Visit[]
  assessments: Assessment[]
  studies: Study[]
}) {
  const capacityMinutes = investigator.weeklyCapacityHours * 60
  const history = useMemo(
    () => computeWeekHistory(investigator.id, capacityMinutes, visits, assessments, 12),
    [investigator.id, capacityMinutes, visits, assessments],
  )

  const chartData = history
    .slice()
    .reverse()
    .map((m) => ({
      week: m.weekStart.slice(5),
      utilization: m.utilizationPct,
      hours: +(m.totalMinutes / 60).toFixed(1),
    }))

  const assignedStudies = studies.filter((s) =>
    s.assignedInvestigators.some((a) => a.investigatorId === investigator.id),
  )

  const currentWeek = history[0]

  return (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <Tile
          label="This Week"
          value={+(currentWeek.totalMinutes / 60).toFixed(1)}
          suffix="h"
          sub={`cap ${investigator.weeklyCapacityHours}h`}
          signal={currentWeek.utilizationPct >= 90 ? 'alert' : currentWeek.utilizationPct >= 75 ? 'warn' : 'good'}
        />
        <Tile
          label="Role"
          value={investigator.role}
          sub={investigator.credentials}
        />
        <Tile
          label="Studies"
          value={assignedStudies.length}
        />
      </div>

      <div>
        <p style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: 8, marginTop: 0 }}>
          Weekly Utilization — Last 12 Weeks
        </p>
        <HUDLineChart
          data={chartData}
          xKey="week"
          yKey="utilization"
          height={160}
          valueFormatter={(v) => `${v}%`}
        />
      </div>

      {assignedStudies.length > 0 && (
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: 8, marginTop: 0 }}>
            Study Assignments
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {assignedStudies.map((s) => {
              const role = s.assignedInvestigators.find((a) => a.investigatorId === investigator.id)?.role
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {role && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{role}</span>}
                    <StatusBadge status={s.status} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface InvestigatorFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Investigator
}

function InvestigatorFormDialog({ open, onOpenChange, initial }: InvestigatorFormDialogProps) {
  const { siteId } = useSite()
  const [form, setForm] = useState<InvestigatorForm>(
    initial ? investigatorToForm(initial) : BLANK_INVESTIGATOR_FORM,
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(initial ? investigatorToForm(initial) : BLANK_INVESTIGATOR_FORM)
    }
  }, [open, initial])

  const isEdit = initial !== undefined

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        credentials: form.credentials,
        role: form.role,
        weeklyCapacityHours: form.weeklyCapacityHours,
        siteBaselinePct: form.siteBaselinePct,
        boardName: form.boardName.trim() || undefined,
      }
      if (isEdit && initial) {
        await updateInvestigator(initial.id, payload)
      } else {
        await createInvestigator({
          ...payload,
          siteId,
          assignedStudies: [],
        })
      }
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="inv-name">Name</Label>
            <Input
              id="inv-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="inv-credentials">Credentials</Label>
            <Input
              id="inv-credentials"
              value={form.credentials}
              onChange={(e) => setForm({ ...form, credentials: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="inv-role">Role</Label>
            <select
              id="inv-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as InvestigatorRole })}
              style={{ height: 36, background: 'rgba(255 255 255 / 0.06)', border: '1px solid rgba(255 255 255 / 0.12)', borderRadius: 8, color: 'var(--text-primary)', padding: '0 10px', fontSize: 13, width: '100%' }}
            >
              <option value="PI">PI</option>
              <option value="Sub-I">Sub-I</option>
              <option value="Provider">Provider</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="inv-capacity">Weekly Capacity (hours)</Label>
            <Input
              id="inv-capacity"
              type="number"
              min={1}
              max={80}
              value={form.weeklyCapacityHours}
              onChange={(e) =>
                setForm({ ...form, weeklyCapacityHours: Number(e.target.value) })
              }
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="inv-baseline">Site Baseline (%)</Label>
            <Input
              id="inv-baseline"
              type="number"
              min={0}
              max={100}
              value={form.siteBaselinePct}
              onChange={(e) =>
                setForm({ ...form, siteBaselinePct: Number(e.target.value) })
              }
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="inv-board-name">Board Name (optional)</Label>
            <Input
              id="inv-board-name"
              value={form.boardName}
              onChange={(e) => setForm({ ...form, boardName: e.target.value })}
              placeholder="e.g. Wilson"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
            style={{ background: 'var(--accent-primary)', border: 'none', color: 'oklch(0.09 0.015 275)' }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Investigators() {
  const { investigators, loading } = useInvestigators()
  const { visits } = useSiteVisits()
  const { assessments } = useSiteAssessments()
  const { studies } = useStudies()
  const { role } = useAuth()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Investigator | null>(null)

  const isManagement = role === 'management'
  const currentWeekStart = getWeekStart(new Date())

  const rows = useMemo(
    () =>
      investigators.map((inv) => {
        const m = computeWeekMetrics(
          inv.id,
          inv.weeklyCapacityHours * 60,
          visits,
          assessments,
          currentWeekStart,
        )
        return { investigator: inv, metrics: m }
      }),
    [investigators, visits, assessments, currentWeekStart],
  )

  const selectedInv = investigators.find(
    (i) => i.id === (selectedId ?? investigators[0]?.id),
  ) ?? null

  async function handleDelete(inv: Investigator) {
    if (!window.confirm(`Delete ${inv.name}?`)) return
    await deleteInvestigator(inv.id)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton height={28} width={240} />
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map((n) => <Skeleton key={n} height={56} />)}
          </div>
          <div style={{ flex: 1 }}><Skeleton height={400} /></div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
            Staff
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            {investigators.length} staff members · current week utilization
          </p>
        </div>
        {isManagement && (
          <Button
            onClick={() => setCreateOpen(true)}
            style={{ background: 'var(--accent-primary)', border: 'none', color: 'oklch(0.09 0.015 275)' }}
          >
            Add Staff Member
          </Button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Left column: investigator list */}
        <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map(({ investigator: inv, metrics }) => {
            const isSelected = (selectedId ?? investigators[0]?.id) === inv.id
            return (
              <button
                key={inv.id}
                onClick={() => setSelectedId(inv.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 14px',
                  borderRadius: 10,
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid rgba(255 255 255 / 0.08)',
                  background: isSelected ? 'rgba(114 90 193 / 0.10)' : 'rgba(255 255 255 / 0.03)',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{inv.name}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{inv.credentials} · {inv.role}</span>
                <CapacityBar pct={metrics.utilizationPct} />
              </button>
            )
          })}
          {investigators.length === 0 && (
            <EmptyState title="No investigators" body="Seed or add investigators to get started." />
          )}
        </div>

        {/* Right column: detail panel */}
        {selectedInv && (() => {
          return (
            <div style={{ flex: 1, minWidth: 0 }}>
              <Panel
                title={selectedInv.name}
                action={isManagement ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Edit ${selectedInv.name}`}
                      onClick={() => setEditTarget(selectedInv)}
                      style={{ height: 28, padding: '0 8px', fontSize: 12, color: 'var(--text-secondary)' }}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete ${selectedInv.name}`}
                      onClick={() => handleDelete(selectedInv)}
                      style={{ height: 28, padding: '0 8px', fontSize: 12, color: 'var(--signal-alert)' }}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                ) : undefined}
              >
                <InvestigatorDetail
                  investigator={selectedInv}
                  visits={visits}
                  assessments={assessments}
                  studies={studies}
                />
              </Panel>
            </div>
          )
        })()}
      </div>

      <InvestigatorFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {editTarget && (
        <InvestigatorFormDialog
          open={editTarget !== null}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null)
          }}
          initial={editTarget}
        />
      )}
    </div>
  )
}
