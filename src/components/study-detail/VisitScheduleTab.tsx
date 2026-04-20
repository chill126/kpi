import { useState } from 'react'
import { updateStudy } from '@/lib/studies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProtocolUpload } from '@/components/protocol-parser/ProtocolUpload'
import { ProtocolReviewTable } from '@/components/protocol-parser/ProtocolReviewTable'
import type { Study, VisitScheduleEntry } from '@/types'
import type { ParsedProtocol } from '@/lib/protocolParser'
import { Plus, Trash2 } from 'lucide-react'

interface Props {
  study: Study
  canEdit: boolean
}

export function VisitScheduleTab({ study, canEdit }: Props) {
  const [rows, setRows] = useState<VisitScheduleEntry[]>(study.visitSchedule)
  const [saving, setSaving] = useState(false)
  const [parsed, setParsed] = useState<ParsedProtocol | null>(null)
  const [parseError, setParseError] = useState('')
  const dirty = JSON.stringify(rows) !== JSON.stringify(study.visitSchedule)

  function addRow() {
    setRows((r) => [
      ...r,
      {
        visitName: '',
        visitWindow: '',
        investigatorTimeMinutes: 30,
        coordinatorTimeMinutes: 30,
        isInvestigatorRequired: true,
      },
    ])
  }

  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx))
  }

  function updateRow(idx: number, field: keyof VisitScheduleEntry, value: string | number | boolean) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, [field]: value } : row)))
  }

  async function save() {
    setSaving(true)
    try {
      await updateStudy(study.id, { visitSchedule: rows })
    } finally {
      setSaving(false)
    }
  }

  if (parsed) {
    return (
      <ProtocolReviewTable
        parsed={parsed}
        onConfirm={async (visits, battery) => {
          await updateStudy(study.id, { visitSchedule: visits, assessmentBattery: battery, parsedFromProtocol: true })
          setRows(visits)
          setParsed(null)
        }}
        onCancel={() => setParsed(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Visit Schedule</h2>
        {canEdit && (
          <div className="flex items-center gap-2">
            <ProtocolUpload
              onParsed={setParsed}
              onError={setParseError}
            />
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus size={14} className="mr-1" aria-hidden="true" />
              Add Visit
            </Button>
            {dirty && (
              <Button size="sm" onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
                {saving ? 'Saving…' : 'Save'}
              </Button>
            )}
          </div>
        )}
      </div>

      {parseError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {parseError}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">
          No visits defined.{canEdit ? ' Add visits manually or upload a protocol PDF.' : ''}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Visit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Window</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Inv. Min</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Coord. Min</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Inv. Required</th>
                {canEdit && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-2">
                    {canEdit ? (
                      <Input
                        value={row.visitName}
                        onChange={(e) => updateRow(idx, 'visitName', e.target.value)}
                        className="h-7 text-sm"
                      />
                    ) : row.visitName}
                  </td>
                  <td className="px-4 py-2">
                    {canEdit ? (
                      <Input
                        value={row.visitWindow}
                        onChange={(e) => updateRow(idx, 'visitWindow', e.target.value)}
                        className="h-7 text-sm w-28"
                      />
                    ) : row.visitWindow}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {canEdit ? (
                      <Input
                        type="number"
                        value={row.investigatorTimeMinutes}
                        onChange={(e) => updateRow(idx, 'investigatorTimeMinutes', Number(e.target.value))}
                        className="h-7 text-sm w-20 text-right"
                      />
                    ) : row.investigatorTimeMinutes}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {canEdit ? (
                      <Input
                        type="number"
                        value={row.coordinatorTimeMinutes}
                        onChange={(e) => updateRow(idx, 'coordinatorTimeMinutes', Number(e.target.value))}
                        className="h-7 text-sm w-20 text-right"
                      />
                    ) : row.coordinatorTimeMinutes}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {canEdit ? (
                      <input
                        type="checkbox"
                        checked={row.isInvestigatorRequired}
                        onChange={(e) => updateRow(idx, 'isInvestigatorRequired', e.target.checked)}
                        className="rounded border-slate-300"
                      />
                    ) : row.isInvestigatorRequired ? '✓' : '—'}
                  </td>
                  {canEdit && (
                    <td className="px-2 py-2">
                      <button
                        onClick={() => removeRow(idx)}
                        aria-label="Remove visit"
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
