import { useState } from 'react'
import { updateStudy } from '@/lib/studies'
import { Button } from '@/components/ui/button'
import type { Investigator, InvestigatorRole, Study, StudyInvestigator } from '@/types'
import { Trash2 } from 'lucide-react'

interface Props {
  study: Study
  investigators: Investigator[]
  canEdit: boolean
}

const ROLES: InvestigatorRole[] = ['PI', 'Sub-I', 'Provider']

export function InvestigatorsTab({ study, investigators, canEdit }: Props) {
  const [assignments, setAssignments] = useState<StudyInvestigator[]>(study.assignedInvestigators)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(assignments) !== JSON.stringify(study.assignedInvestigators)

  const invMap = Object.fromEntries(investigators.map((i) => [i.id, i]))
  const assignedIds = assignments.map((a) => a.investigatorId)
  const available = investigators.filter((i) => !assignedIds.includes(i.id))

  function addInvestigator(investigatorId: string) {
    setAssignments((a) => [...a, { investigatorId, role: 'Sub-I' }])
  }

  function updateRole(idx: number, role: InvestigatorRole) {
    setAssignments((a) => a.map((item, i) => (i === idx ? { ...item, role } : item)))
  }

  function remove(idx: number) {
    setAssignments((a) => a.filter((_, i) => i !== idx))
  }

  async function save() {
    setSaving(true)
    try {
      await updateStudy(study.id, { assignedInvestigators: assignments })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Investigators</h2>
        <div className="flex items-center gap-2">
          {canEdit && available.length > 0 && (
            <select
              onChange={(e) => { if (e.target.value) { addInvestigator(e.target.value); e.target.value = '' } }}
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600"
            >
              <option value="">Add investigator…</option>
              {available.map((inv) => (
                <option key={inv.id} value={inv.id}>{inv.name}</option>
              ))}
            </select>
          )}
          {canEdit && dirty && (
            <Button size="sm" onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Credentials</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role on Study</th>
              {canEdit && <th className="w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {assignments.map((a, idx) => {
              const inv = invMap[a.investigatorId]
              return (
                <tr key={a.investigatorId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {inv?.name ?? a.investigatorId}
                    {a.investigatorId === study.piId && (
                      <span className="ml-2 text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2 py-0.5">PI</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{inv?.credentials ?? '—'}</td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <select
                        value={a.role}
                        onChange={(e) => updateRole(idx, e.target.value as InvestigatorRole)}
                        className="h-7 rounded border border-slate-200 bg-white px-2 text-xs dark:bg-slate-800 dark:border-slate-700"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : a.role}
                  </td>
                  {canEdit && (
                    <td className="px-2">
                      <button
                        onClick={() => remove(idx)}
                        aria-label={`Remove ${inv?.name ?? a.investigatorId}`}
                        disabled={a.investigatorId === study.piId}
                        className="text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
