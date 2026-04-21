import { useState } from 'react'
import { useDelegationLog } from '@/hooks/useDelegationLog'
import { createDelegationEntry, deleteDelegationEntry } from '@/lib/delegationLog'
import { useSite } from '@/hooks/useSite'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { Investigator } from '@/types'
import { Plus, Trash2 } from 'lucide-react'

interface Props {
  studyId: string
  investigators: Investigator[]
  canEdit: boolean
}

interface NewEntryForm {
  investigatorId: string
  delegatedTasks: string
  effectiveDate: string
}

const EMPTY_FORM: NewEntryForm = { investigatorId: '', delegatedTasks: '', effectiveDate: '' }

export function DelegationLogTab({ studyId, investigators, canEdit }: Props) {
  const { siteId } = useSite()
  const { entries, loading } = useDelegationLog(studyId)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<NewEntryForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<NewEntryForm>>({})

  const invMap = Object.fromEntries(investigators.map((i) => [i.id, i]))

  function set(field: keyof NewEntryForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleAdd() {
    const next: typeof errors = {}
    if (!form.investigatorId) next.investigatorId = 'Required'
    if (!form.delegatedTasks.trim()) next.delegatedTasks = 'Required'
    if (!form.effectiveDate) next.effectiveDate = 'Required'
    if (Object.keys(next).length) { setErrors(next); return }

    setSaving(true)
    try {
      await createDelegationEntry({
        siteId,
        investigatorId: form.investigatorId,
        studyId,
        delegatedTasks: form.delegatedTasks.split(',').map((t) => t.trim()).filter(Boolean),
        effectiveDate: form.effectiveDate,
        source: 'manual',
      })
      setForm(EMPTY_FORM)
      setShowAdd(false)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="space-y-2">{[1, 2].map((n) => <Skeleton key={n} className="h-10 w-full" />)}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Delegation Log</h2>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setShowAdd((s) => !s)}>
            <Plus size={14} className="mr-1" aria-hidden="true" />
            Add Entry
          </Button>
        )}
      </div>

      {showAdd && canEdit && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="dl-inv" className="text-xs">Investigator *</Label>
              <select
                id="dl-inv"
                value={form.investigatorId}
                onChange={(e) => set('investigatorId', e.target.value)}
                className="w-full h-8 rounded-md border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600"
              >
                <option value="">Select…</option>
                {investigators.map((inv) => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
              </select>
              {errors.investigatorId && <p className="text-xs text-red-600">{errors.investigatorId}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="dl-tasks" className="text-xs">Delegated Tasks * <span className="font-normal text-slate-400">(comma-separated)</span></Label>
              <Input
                id="dl-tasks"
                value={form.delegatedTasks}
                onChange={(e) => set('delegatedTasks', e.target.value)}
                placeholder="Informed consent, Physical exam…"
                className="h-8 text-sm"
              />
              {errors.delegatedTasks && <p className="text-xs text-red-600">{errors.delegatedTasks}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="dl-date" className="text-xs">Effective Date *</Label>
              <Input
                id="dl-date"
                type="date"
                value={form.effectiveDate}
                onChange={(e) => set('effectiveDate', e.target.value)}
                className="h-8 text-sm"
              />
              {errors.effectiveDate && <p className="text-xs text-red-600">{errors.effectiveDate}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM) }}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? 'Saving…' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">No delegation log entries.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Investigator</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Delegated Tasks</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Effective Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Source</th>
                {canEdit && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {invMap[entry.investigatorId]?.name ?? entry.investigatorId}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {entry.delegatedTasks.join(', ')}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">
                    {entry.effectiveDate}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${entry.source === 'manual' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                      {entry.source === 'manual' ? 'Manual' : 'Advarra Import'}
                    </span>
                  </td>
                  {canEdit && entry.source === 'manual' && (
                    <td className="px-2">
                      <button
                        onClick={() => setDeleteId(entry.id)}
                        aria-label="Delete entry"
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </td>
                  )}
                  {canEdit && entry.source !== 'manual' && <td />}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Delete Delegation Entry"
        description="This will permanently remove this delegation log entry."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (deleteId) await deleteDelegationEntry(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
