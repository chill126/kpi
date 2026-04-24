import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createStudy, updateStudy } from '@/lib/studies'
import type { Investigator, Study, StudyPhase, StudyStatus } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  study?: Study
  investigators: Investigator[]
  siteId: string
  onSave: (studyId: string) => void
}

const PHASES: StudyPhase[] = ['Phase I', 'Phase II', 'Phase III', 'Phase IV', 'Observational']
const INDICATION_OPTIONS = [
  { value: '', label: 'Select indication…' },
  { value: 'Psychiatry', label: 'Psychiatry' },
  { value: 'Neurology', label: 'Neurology' },
  { value: 'Dermatology', label: 'Dermatology' },
  { value: 'General Medicine', label: 'General Medicine' },
  { value: 'Cardiology', label: 'Cardiology' },
  { value: 'Oncology', label: 'Oncology' },
  { value: 'Other', label: 'Other' },
]
const STATUSES: StudyStatus[] = ['pending', 'enrolling', 'paused', 'open', 'completed']

interface FormState {
  name: string
  sponsor: string
  sponsorProtocolId: string
  therapeuticArea: string
  phase: StudyPhase
  status: StudyStatus
  piId: string
  targetEnrollment: string
  startDate: string
  expectedEndDate: string
  perStudyWeeklyHours: string
  perParticipantOverheadPct: string
  contractTotalValue: string
  paidScreenFailRatio: string
  paidScreenFailMax: string
}

const EMPTY: FormState = {
  name: '',
  sponsor: '',
  sponsorProtocolId: '',
  therapeuticArea: '',
  phase: 'Phase II',
  status: 'enrolling',
  piId: '',
  targetEnrollment: '20',
  startDate: '',
  expectedEndDate: '',
  perStudyWeeklyHours: '2',
  perParticipantOverheadPct: '10',
  contractTotalValue: '',
  paidScreenFailRatio: '',
  paidScreenFailMax: '',
}

function studyToForm(s: Study): FormState {
  return {
    name: s.name,
    sponsor: s.sponsor,
    sponsorProtocolId: s.sponsorProtocolId,
    therapeuticArea: s.therapeuticArea,
    phase: s.phase,
    status: s.status,
    piId: s.piId,
    targetEnrollment: String(s.targetEnrollment),
    startDate: s.startDate,
    expectedEndDate: s.expectedEndDate,
    perStudyWeeklyHours: String(s.adminOverride.perStudyWeeklyHours),
    perParticipantOverheadPct: String(s.adminOverride.perParticipantOverheadPct),
    contractTotalValue: s.contract?.totalValue != null ? String(s.contract.totalValue) : '',
    paidScreenFailRatio: s.contract?.paidScreenFails?.ratio != null
      ? String(s.contract.paidScreenFails.ratio)
      : '',
    paidScreenFailMax: s.contract?.paidScreenFails?.maxPaid != null
      ? String(s.contract.paidScreenFails.maxPaid)
      : '',
  }
}

const selectClass =
  'w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'

export function StudyForm({ open, onOpenChange, study, investigators, siteId, onSave }: Props) {
  const [form, setForm] = useState<FormState>(
    study ? studyToForm(study) : { ...EMPTY, piId: investigators[0]?.id ?? '' },
  )
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [loading, setLoading] = useState(false)
  const [customReasons, setCustomReasons] = useState<string[]>([])
  const [newReason, setNewReason] = useState('')

  useEffect(() => {
    if (open) {
      setForm(study ? studyToForm(study) : { ...EMPTY, piId: investigators[0]?.id ?? '' })
      setCustomReasons(study?.customScreenFailureReasons ?? [])
      setNewReason('')
    }
  }, [open, study, investigators])

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function addReason() {
    const trimmed = newReason.trim()
    if (trimmed && !customReasons.includes(trimmed)) {
      setCustomReasons((r) => [...r, trimmed])
    }
    setNewReason('')
  }

  function removeReason(reason: string) {
    setCustomReasons((r) => r.filter((x) => x !== reason))
  }

  async function handleSave() {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) next.name = 'Name is required'
    if (!form.sponsor.trim()) next.sponsor = 'Sponsor is required'
    if (!form.therapeuticArea.trim()) next.therapeuticArea = 'Therapeutic area is required'
    if (!form.piId) next.piId = 'PI is required'
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }

    const hasContract =
      form.contractTotalValue || form.paidScreenFailRatio || form.paidScreenFailMax

    const contract = hasContract
      ? {
          ...(study?.contract ?? {}),
          ...(form.contractTotalValue ? { totalValue: Number(form.contractTotalValue) } : {}),
          paidScreenFails: {
            ...(form.paidScreenFailRatio ? { ratio: Number(form.paidScreenFailRatio) } : {}),
            ...(form.paidScreenFailMax ? { maxPaid: Number(form.paidScreenFailMax) } : {}),
          },
        }
      : study?.contract

    setLoading(true)
    try {
      const data = {
        name: form.name.trim(),
        sponsor: form.sponsor.trim(),
        sponsorProtocolId: form.sponsorProtocolId.trim(),
        therapeuticArea: form.therapeuticArea.trim(),
        phase: form.phase,
        status: form.status,
        siteId,
        piId: form.piId,
        assignedInvestigators: [{ investigatorId: form.piId, role: 'PI' as const }],
        targetEnrollment: Number(form.targetEnrollment) || 0,
        startDate: form.startDate,
        expectedEndDate: form.expectedEndDate,
        visitSchedule: study?.visitSchedule ?? [],
        assessmentBattery: study?.assessmentBattery ?? {},
        adminOverride: {
          perStudyWeeklyHours: Number(form.perStudyWeeklyHours) || 2,
          perParticipantOverheadPct: Number(form.perParticipantOverheadPct) || 10,
        },
        parsedFromProtocol: study?.parsedFromProtocol ?? false,
        enrollmentData: study?.enrollmentData ?? {
          prescreens: 0,
          screens: 0,
          randomizations: 0,
          active: 0,
          completions: 0,
        },
        statusHistory: study?.statusHistory ?? [],
        ...(contract !== undefined ? { contract } : {}),
        customScreenFailureReasons: customReasons,
      }

      let id: string
      if (study) {
        await updateStudy(study.id, data)
        id = study.id
      } else {
        id = await createStudy(data)
      }
      onSave(id)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{study ? 'Edit Study' : 'Add Study'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2 space-y-1">
            <Label htmlFor="sf-name">Study Name *</Label>
            <Input id="sf-name" value={form.name} onChange={(e) => set('name', e.target.value)} />
            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-sponsor">Sponsor *</Label>
            <Input
              id="sf-sponsor"
              value={form.sponsor}
              onChange={(e) => set('sponsor', e.target.value)}
            />
            {errors.sponsor && <p className="text-xs text-red-600">{errors.sponsor}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-protocol">Protocol ID</Label>
            <Input
              id="sf-protocol"
              value={form.sponsorProtocolId}
              onChange={(e) => set('sponsorProtocolId', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-area">Therapeutic Area *</Label>
            <select
              id="sf-area"
              value={form.therapeuticArea}
              onChange={(e) => set('therapeuticArea', e.target.value)}
              className={selectClass}
            >
              {INDICATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {errors.therapeuticArea && (
              <p className="text-xs text-red-600">{errors.therapeuticArea}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-phase">Phase</Label>
            <select
              id="sf-phase"
              value={form.phase}
              onChange={(e) => set('phase', e.target.value)}
              className={selectClass}
            >
              {PHASES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-status">Status</Label>
            <select
              id="sf-status"
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className={selectClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-pi">Principal Investigator *</Label>
            <select
              id="sf-pi"
              value={form.piId}
              onChange={(e) => set('piId', e.target.value)}
              className={selectClass}
            >
              <option value="">Select PI…</option>
              {investigators.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.name}
                </option>
              ))}
            </select>
            {errors.piId && <p className="text-xs text-red-600">{errors.piId}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-target">Target Enrollment</Label>
            <Input
              id="sf-target"
              type="number"
              min="1"
              value={form.targetEnrollment}
              onChange={(e) => set('targetEnrollment', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-start">Start Date</Label>
            <Input
              id="sf-start"
              type="date"
              value={form.startDate}
              onChange={(e) => set('startDate', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-end">Expected End Date</Label>
            <Input
              id="sf-end"
              type="date"
              value={form.expectedEndDate}
              onChange={(e) => set('expectedEndDate', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-weekly">Admin Hours/Week</Label>
            <Input
              id="sf-weekly"
              type="number"
              min="0"
              step="0.5"
              value={form.perStudyWeeklyHours}
              onChange={(e) => set('perStudyWeeklyHours', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-overhead">Participant Overhead %</Label>
            <Input
              id="sf-overhead"
              type="number"
              min="0"
              max="100"
              value={form.perParticipantOverheadPct}
              onChange={(e) => set('perParticipantOverheadPct', e.target.value)}
            />
          </div>

          {/* Contract */}
          <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Contract <span className="text-slate-400 font-normal">(optional — can be filled in later)</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="sf-contract-value">Total Contract Value ($)</Label>
                <Input
                  id="sf-contract-value"
                  type="number"
                  min="0"
                  placeholder="e.g. 250000"
                  value={form.contractTotalValue}
                  onChange={(e) => set('contractTotalValue', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sf-fail-ratio">
                  Paid Screen Fail Ratio{' '}
                  <span className="text-slate-400 font-normal text-xs">(fails per enrolled)</span>
                </Label>
                <Input
                  id="sf-fail-ratio"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 0.25 = 1 per 4"
                  value={form.paidScreenFailRatio}
                  onChange={(e) => set('paidScreenFailRatio', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sf-fail-max">Max Paid Screen Fails</Label>
                <Input
                  id="sf-fail-max"
                  type="number"
                  min="0"
                  placeholder="e.g. 5"
                  value={form.paidScreenFailMax}
                  onChange={(e) => set('paidScreenFailMax', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Custom screen failure reasons */}
          <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Custom Screen Failure Reasons{' '}
              <span className="text-slate-400 font-normal">(study-specific, optional)</span>
            </p>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="e.g. Specific exclusion criterion…"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addReason())}
              />
              <Button type="button" variant="outline" onClick={addReason} disabled={!newReason.trim()}>
                Add
              </Button>
            </div>
            {customReasons.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customReasons.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-teal-50 text-teal-800 text-xs dark:bg-teal-900/30 dark:text-teal-300"
                  >
                    {r}
                    <button
                      type="button"
                      onClick={() => removeReason(r)}
                      className="ml-1 text-teal-500 hover:text-teal-800 dark:hover:text-teal-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={loading}
            onClick={handleSave}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
