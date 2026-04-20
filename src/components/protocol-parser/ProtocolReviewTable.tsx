import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ParsedProtocol } from '@/lib/protocolParser'
import type { VisitScheduleEntry } from '@/types'

interface Props {
  parsed: ParsedProtocol
  onConfirm: (visits: VisitScheduleEntry[], battery: Record<string, string[]>) => void | Promise<void>
  onCancel: () => void
}

const CONFIDENCE_STYLES = {
  high: 'text-green-700 bg-green-50 border border-green-200',
  medium: 'text-amber-700 bg-amber-50 border border-amber-200',
  low: 'text-red-700 bg-red-50 border border-red-200',
}

export function ProtocolReviewTable({ parsed, onConfirm, onCancel }: Props) {
  const [visits, setVisits] = useState<VisitScheduleEntry[]>(parsed.visits)
  const [battery] = useState<Record<string, string[]>>(parsed.assessmentBattery)
  const [saving, setSaving] = useState(false)

  function updateVisit(idx: number, field: keyof VisitScheduleEntry, value: string | number | boolean) {
    setVisits((v) => v.map((row, i) => (i === idx ? { ...row, [field]: value } : row)))
  }

  async function handleConfirm() {
    setSaving(true)
    try {
      await onConfirm(visits, battery)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Review Extracted Protocol
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and edit the extracted schedule before saving. Amber/red rows have lower confidence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {saving ? 'Saving…' : `Confirm ${visits.length} Visits`}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Confidence</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Visit Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Window</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Inv. Min</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Coord. Min</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Inv. Req.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assessments</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {visits.map((visit, idx) => {
              const conf = parsed.confidence[visit.visitName] ?? 'high'
              const rowBg = conf === 'high' ? '' : conf === 'medium' ? 'bg-amber-50/30' : 'bg-red-50/30'
              const assessments = battery[visit.visitName] ?? []

              return (
                <tr key={idx} className={`${rowBg} hover:bg-slate-50 dark:hover:bg-slate-700/50`}>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CONFIDENCE_STYLES[conf]}`}>
                      {conf}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      value={visit.visitName}
                      onChange={(e) => updateVisit(idx, 'visitName', e.target.value)}
                      className="h-7 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      value={visit.visitWindow}
                      onChange={(e) => updateVisit(idx, 'visitWindow', e.target.value)}
                      className="h-7 text-sm w-32"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      value={visit.investigatorTimeMinutes}
                      onChange={(e) => updateVisit(idx, 'investigatorTimeMinutes', Number(e.target.value))}
                      className="h-7 text-sm w-20 text-right"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      value={visit.coordinatorTimeMinutes}
                      onChange={(e) => updateVisit(idx, 'coordinatorTimeMinutes', Number(e.target.value))}
                      className="h-7 text-sm w-20 text-right"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={visit.isInvestigatorRequired}
                      onChange={(e) => updateVisit(idx, 'isInvestigatorRequired', e.target.checked)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {assessments.length > 0 ? assessments.join(', ') : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
