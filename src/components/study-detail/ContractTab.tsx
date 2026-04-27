import { useState, useEffect } from 'react'
import { updateStudy } from '@/lib/studies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { ContractMilestone, Study, StudyContract } from '@/types'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface Props {
  study: Study
  canEdit: boolean
}

interface SummaryForm {
  totalValue: string
  ratio: string
  maxPaid: string
}

function toSummaryForm(contract: StudyContract | undefined): SummaryForm {
  return {
    totalValue: contract?.totalValue !== undefined ? String(contract.totalValue) : '',
    ratio: contract?.paidScreenFails?.ratio !== undefined ? String(contract.paidScreenFails.ratio) : '',
    maxPaid: contract?.paidScreenFails?.maxPaid !== undefined ? String(contract.paidScreenFails.maxPaid) : '',
  }
}

function formatCurrency(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return '—'
  return `$${value.toLocaleString()}`
}

function parseNumberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

export function ContractTab({ study, canEdit }: Props) {
  const contract = study.contract
  const milestones = contract?.milestones ?? []

  const [form, setForm] = useState<SummaryForm>(toSummaryForm(contract))
  const [savingSummary, setSavingSummary] = useState(false)

  useEffect(() => {
    setForm(toSummaryForm(study.contract))
  }, [study.id])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<{ milestone: ContractMilestone; index: number } | null>(null)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  const saved = toSummaryForm(contract)
  const dirty =
    form.totalValue !== saved.totalValue ||
    form.ratio !== saved.ratio ||
    form.maxPaid !== saved.maxPaid

  function setField(field: keyof SummaryForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function saveSummary() {
    setSavingSummary(true)
    try {
      const totalValue = parseNumberOrUndefined(form.totalValue)
      const ratio = parseNumberOrUndefined(form.ratio)
      const maxPaid = parseNumberOrUndefined(form.maxPaid)
      // Strip undefined keys so Firestore update stays clean.
      const cleanContract: StudyContract = {}
      if (totalValue !== undefined) cleanContract.totalValue = totalValue
      if (contract?.milestones) cleanContract.milestones = contract.milestones
      const cleanPaid: { ratio?: number; maxPaid?: number } = {}
      if (ratio !== undefined) cleanPaid.ratio = ratio
      if (maxPaid !== undefined) cleanPaid.maxPaid = maxPaid
      if (Object.keys(cleanPaid).length > 0) cleanContract.paidScreenFails = cleanPaid
      await updateStudy(study.id, { contract: cleanContract })
    } finally {
      setSavingSummary(false)
    }
  }

  async function handleSaveMilestone(milestone: ContractMilestone) {
    let nextMilestones: ContractMilestone[]
    if (editing) {
      nextMilestones = milestones.map((m, i) => (i === editing.index ? milestone : m))
    } else {
      nextMilestones = [...milestones, milestone]
    }
    const nextContract: StudyContract = { ...contract, milestones: nextMilestones }
    await updateStudy(study.id, { contract: nextContract })
    setDialogOpen(false)
    setEditing(null)
  }

  async function handleDeleteMilestone() {
    if (deleteIndex === null) return
    const nextMilestones = milestones.filter((_, i) => i !== deleteIndex)
    const nextContract: StudyContract = { ...contract, milestones: nextMilestones }
    await updateStudy(study.id, { contract: nextContract })
    setDeleteIndex(null)
  }

  const totalMilestoneValue = milestones.reduce((sum, m) => sum + (m.amount || 0), 0)
  const achievedValue = milestones
    .filter((m) => m.achieved)
    .reduce((sum, m) => sum + (m.amount || 0), 0)
  const remaining =
    contract?.totalValue !== undefined ? contract.totalValue - achievedValue : undefined

  return (
    <div className="space-y-6">
      {/* Section 1: Contract Summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Contract Summary</h2>
          {canEdit && dirty && (
            <Button
              size="sm"
              onClick={saveSummary}
              disabled={savingSummary}
              style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none' }}
            >
              {savingSummary ? 'Saving…' : 'Save Changes'}
            </Button>
          )}
        </div>

        <div style={{ background: 'rgba(255 255 255 / 0.04)', border: '1px solid rgba(255 255 255 / 0.09)', borderRadius: 10, padding: 16 }}>
          {canEdit ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ct-total" className="text-xs">Total Contract Value ($)</Label>
                <Input
                  id="ct-total"
                  type="number"
                  min="0"
                  value={form.totalValue}
                  onChange={(e) => setField('totalValue', e.target.value)}
                  placeholder="Not set"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ct-ratio" className="text-xs">Paid Screen Fail Ratio</Label>
                <Input
                  id="ct-ratio"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.ratio}
                  onChange={(e) => setField('ratio', e.target.value)}
                  placeholder="e.g. 0.25"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ct-maxpaid" className="text-xs">Max Paid Screen Fails</Label>
                <Input
                  id="ct-maxpaid"
                  type="number"
                  min="0"
                  value={form.maxPaid}
                  onChange={(e) => setField('maxPaid', e.target.value)}
                  placeholder="e.g. 5"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Contract Value</p>
                <p className="text-slate-900 dark:text-slate-100 mt-1">{formatCurrency(contract?.totalValue)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Paid Screen Fail Ratio</p>
                <p className="text-slate-900 dark:text-slate-100 mt-1">
                  {contract?.paidScreenFails?.ratio !== undefined ? contract.paidScreenFails.ratio : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Max Paid Screen Fails</p>
                <p className="text-slate-900 dark:text-slate-100 mt-1">
                  {contract?.paidScreenFails?.maxPaid !== undefined ? contract.paidScreenFails.maxPaid : '—'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Milestones */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Milestones</h2>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(null)
                setDialogOpen(true)
              }}
            >
              <Plus size={14} className="mr-1" aria-hidden="true" />
              Add Milestone
            </Button>
          )}
        </div>

        {milestones.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">
            No milestones added. Add milestone payments to enable revenue forecasting.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Expected Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Achieved Date</th>
                  {canEdit && <th className="w-20" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {milestones.map((m, idx) => (
                  <tr key={`${m.name}-${m.expectedDate}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{m.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 tabular-nums">
                      {formatCurrency(m.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">
                      {m.expectedDate}
                    </td>
                    <td className="px-4 py-3">
                      {m.achieved ? (
                        <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 9999, background: 'rgba(52 211 153 / 0.15)', color: 'var(--signal-good)', border: '1px solid rgba(52 211 153 / 0.3)' }}>
                          ✓ Achieved
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 9999, background: 'rgba(255 255 255 / 0.06)', color: 'var(--text-muted)', border: '1px solid rgba(255 255 255 / 0.10)' }}>
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">
                      {m.achievedDate ?? '—'}
                    </td>
                    {canEdit && (
                      <td className="px-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditing({ milestone: m, index: idx })
                              setDialogOpen(true)
                            }}
                            aria-label={`Edit ${m.name}`}
                            className="text-slate-400 hover:text-teal-600"
                          >
                            <Pencil size={14} aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => setDeleteIndex(idx)}
                            aria-label={`Delete ${m.name}`}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 3: Read-only summary */}
      <div style={{ background: 'rgba(255 255 255 / 0.04)', border: '1px solid rgba(255 255 255 / 0.09)', borderRadius: 10, padding: 16 }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Contract Value</p>
            <p className="text-slate-900 dark:text-slate-100 mt-1 tabular-nums font-semibold">
              {formatCurrency(contract?.totalValue)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Milestone Value</p>
            <p className="text-slate-900 dark:text-slate-100 mt-1 tabular-nums font-semibold">
              {milestones.length > 0 ? formatCurrency(totalMilestoneValue) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Achieved to Date</p>
            <p className="text-slate-900 dark:text-slate-100 mt-1 tabular-nums font-semibold">
              {milestones.length > 0 ? formatCurrency(achievedValue) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Remaining</p>
            <p className="text-slate-900 dark:text-slate-100 mt-1 tabular-nums font-semibold">
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>
      </div>

      <MilestoneDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditing(null)
        }}
        milestone={editing?.milestone}
        onSave={handleSaveMilestone}
      />

      <ConfirmDialog
        open={deleteIndex !== null}
        onOpenChange={(open) => { if (!open) setDeleteIndex(null) }}
        title="Delete Milestone"
        description="This will permanently remove this milestone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteMilestone}
      />
    </div>
  )
}

interface MilestoneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  milestone?: ContractMilestone
  onSave: (m: ContractMilestone) => void | Promise<void>
}

interface MilestoneForm {
  name: string
  amount: string
  expectedDate: string
  achieved: boolean
  achievedDate: string
}

interface MilestoneErrors {
  name?: string
  amount?: string
  expectedDate?: string
}

function toMilestoneForm(milestone: ContractMilestone | undefined): MilestoneForm {
  return {
    name: milestone?.name ?? '',
    amount: milestone?.amount !== undefined ? String(milestone.amount) : '',
    expectedDate: milestone?.expectedDate ?? '',
    achieved: milestone?.achieved ?? false,
    achievedDate: milestone?.achievedDate ?? '',
  }
}

function MilestoneDialog({ open, onOpenChange, milestone, onSave }: MilestoneDialogProps) {
  const [form, setForm] = useState<MilestoneForm>(toMilestoneForm(milestone))
  const [errors, setErrors] = useState<MilestoneErrors>({})
  const [saving, setSaving] = useState(false)

  // Reset form when dialog opens or milestone changes.
  useEffect(() => {
    if (open) {
      setForm(toMilestoneForm(milestone))
      setErrors({})
    }
  }, [open, milestone])

  function setField<K extends keyof MilestoneForm>(field: K, value: MilestoneForm[K]) {
    setForm((f) => ({ ...f, [field]: value }))
    if (field === 'name' || field === 'amount' || field === 'expectedDate') {
      setErrors((e) => ({ ...e, [field]: undefined }))
    }
  }

  async function handleSave() {
    const next: MilestoneErrors = {}
    if (!form.name.trim()) next.name = 'Required'
    const amountNum = Number(form.amount)
    if (!form.amount.trim() || !Number.isFinite(amountNum)) next.amount = 'Required'
    if (!form.expectedDate) next.expectedDate = 'Required'
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }

    setSaving(true)
    try {
      const result: ContractMilestone = {
        name: form.name.trim(),
        amount: amountNum,
        expectedDate: form.expectedDate,
        achieved: form.achieved,
        ...(form.achieved && form.achievedDate ? { achievedDate: form.achievedDate } : {}),
      }
      await onSave(result)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{milestone ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="ms-name" className="text-xs">Name *</Label>
            <Input
              id="ms-name"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="e.g. Site Initiation"
              className="h-9 text-sm"
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="ms-amount" className="text-xs">Amount ($) *</Label>
            <Input
              id="ms-amount"
              type="number"
              min="0"
              value={form.amount}
              onChange={(e) => setField('amount', e.target.value)}
              placeholder="e.g. 25000"
              className="h-9 text-sm"
            />
            {errors.amount && <p className="text-xs text-red-600">{errors.amount}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="ms-expected" className="text-xs">Expected Date *</Label>
            <Input
              id="ms-expected"
              type="date"
              value={form.expectedDate}
              onChange={(e) => setField('expectedDate', e.target.value)}
              className="h-9 text-sm"
            />
            {errors.expectedDate && <p className="text-xs text-red-600">{errors.expectedDate}</p>}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="ms-achieved"
              checked={form.achieved}
              onCheckedChange={(checked) => setField('achieved', checked === true)}
            />
            <Label htmlFor="ms-achieved" className="text-xs cursor-pointer">Achieved</Label>
          </div>

          {form.achieved && (
            <div className="space-y-1">
              <Label htmlFor="ms-achieved-date" className="text-xs">Achieved Date</Label>
              <Input
                id="ms-achieved-date"
                type="date"
                value={form.achievedDate}
                onChange={(e) => setField('achievedDate', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
