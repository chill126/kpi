import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createVisitBatch } from '@/lib/visits'
import type { Investigator, Study, VisitStatus } from '@/types'
import { Plus, Trash2 } from 'lucide-react'

interface ParticipantRow {
  participantId: string
  status: VisitStatus
  actualDurationMinutes: string
}

interface Props {
  studies: Study[]
  investigators: Investigator[]
  siteId: string
  onSaved: () => void
}

const STATUSES: VisitStatus[] = ['completed', 'scheduled', 'missed', 'no_show']

export function BulkVisitLogForm({ studies, investigators, siteId, onSaved }: Props) {
  const [studyId, setStudyId] = useState('')
  const [investigatorId, setInvestigatorId] = useState('')
  const [visitType, setVisitType] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [rows, setRows] = useState<ParticipantRow[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  const selectedStudy = studies.find((s) => s.id === studyId)
  const visitTypes = selectedStudy?.visitSchedule.map((v) => v.visitName) ?? []
  const defaultDuration =
    selectedStudy?.visitSchedule.find((v) => v.visitName === visitType)
      ?.investigatorTimeMinutes ?? 30

  function addRow() {
    setRows((r) => [...r, { participantId: '', status: 'completed', actualDurationMinutes: '' }])
  }

  function updateRow(idx: number, field: keyof ParticipantRow, value: string) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, [field]: value } : row)))
  }

  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx))
  }

  async function handleSubmit() {
    const next: Record<string, string> = {}
    if (!studyId) next.studyId = 'Study is required'
    if (!investigatorId) next.investigatorId = 'Investigator is required'
    if (!date) next.date = 'Date is required'
    if (rows.length === 0) next.rows = 'Add at least one participant'

    rows.forEach((row, idx) => {
      if (!row.participantId.trim()) next[`pid-${idx}`] = 'Required'
    })

    if (Object.keys(next).length) { setErrors(next); return }

    setLoading(true)
    try {
      const visits = rows.map((row) => ({
        participantId: row.participantId.trim(),
        studyId,
        investigatorId,
        siteId,
        visitType: visitType || 'Unspecified',
        scheduledDate: date,
        completedDate: row.status === 'completed' ? date : null,
        status: row.status as VisitStatus,
        durationMinutes: defaultDuration,
        actualDurationMinutes: row.actualDurationMinutes ? Number(row.actualDurationMinutes) : null,
        source: 'manual' as const,
      }))
      await createVisitBatch(visits)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setRows([])
        onSaved()
      }, 100)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Bulk Visit Log</h2>

      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {rows.length} visit{rows.length !== 1 ? 's' : ''} logged successfully.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label htmlFor="bvl-study">Study *</Label>
          <select
            id="bvl-study"
            value={studyId}
            onChange={(e) => { setStudyId(e.target.value); setVisitType('') }}
            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">Select study…</option>
            {studies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {errors.studyId && <p className="text-xs text-red-600">{errors.studyId}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="bvl-inv">Investigator *</Label>
          <select
            id="bvl-inv"
            value={investigatorId}
            onChange={(e) => setInvestigatorId(e.target.value)}
            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">Select investigator…</option>
            {investigators.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          {errors.investigatorId && <p className="text-xs text-red-600">{errors.investigatorId}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="bvl-visittype">Visit Type</Label>
          <select
            id="bvl-visittype"
            value={visitType}
            onChange={(e) => setVisitType(e.target.value)}
            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">Select visit…</option>
            {visitTypes.map((vt) => <option key={vt} value={vt}>{vt}</option>)}
            <option value="Unscheduled">Unscheduled</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="bvl-date">Date *</Label>
          <Input id="bvl-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {errors.date && <p className="text-xs text-red-600">{errors.date}</p>}
        </div>
      </div>

      {errors.rows && <p className="text-xs text-red-600">{errors.rows}</p>}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Participant ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Actual Duration (min)</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2">
                    <Input
                      value={row.participantId}
                      onChange={(e) => updateRow(idx, 'participantId', e.target.value)}
                      placeholder={`P${String(idx + 1).padStart(3, '0')}`}
                      className={`h-7 text-sm font-mono ${errors[`pid-${idx}`] ? 'border-red-500' : ''}`}
                    />
                    {errors[`pid-${idx}`] && <p className="text-xs text-red-600">{errors[`pid-${idx}`]}</p>}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.status}
                      onChange={(e) => updateRow(idx, 'status', e.target.value)}
                      className="h-7 rounded border border-slate-200 bg-white px-2 text-xs dark:bg-slate-800 dark:border-slate-700"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="1"
                      value={row.actualDurationMinutes}
                      onChange={(e) => updateRow(idx, 'actualDurationMinutes', e.target.value)}
                      placeholder={String(defaultDuration)}
                      className="h-7 text-sm w-24"
                    />
                  </td>
                  <td className="px-2">
                    <button
                      onClick={() => removeRow(idx)}
                      aria-label="Remove row"
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus size={14} className="mr-1" aria-hidden="true" />
          Add Participant
        </Button>
        {rows.length > 0 && (
          <Button
            onClick={handleSubmit}
            disabled={loading || success}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {loading ? 'Logging…' : `Log ${rows.length} Visit${rows.length !== 1 ? 's' : ''}`}
          </Button>
        )}
      </div>
    </div>
  )
}
