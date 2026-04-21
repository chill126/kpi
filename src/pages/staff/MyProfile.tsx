import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useStudies } from '@/hooks/useStudies'
import { updateUser } from '@/lib/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { Role } from '@/types'

function RoleBadge({ role }: { role: Role }) {
  const cls =
    role === 'management'
      ? 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700'
      : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${cls}`}>
      {role}
    </span>
  )
}

export function MyProfile() {
  const { user } = useAuth()
  const { studies, loading: studiesLoading } = useStudies()

  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user) setDisplayName(user.displayName)
  }, [user])

  const dirty = displayName.trim() !== (user?.displayName ?? '')

  const assignedStudies = studies.filter((s) => user?.assignedStudies.includes(s.id))

  async function handleSave() {
    if (!user || !dirty) return
    setSaving(true)
    try {
      await updateUser(user.uid, { displayName: displayName.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return <Skeleton className="h-64 w-full" />
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your display name and view your site assignments.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-4">
        <div className="space-y-1">
          <Label htmlFor="profile-name">Display Name</Label>
          <Input
            id="profile-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label>Email</Label>
          <p className="text-sm text-slate-700 dark:text-slate-200 h-9 flex items-center px-3 rounded-md bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
            {user.email}
          </p>
        </div>

        <div className="space-y-1">
          <Label>Role</Label>
          <div className="h-9 flex items-center">
            <RoleBadge role={user.role} />
          </div>
        </div>

        <div className="flex justify-end items-center gap-3">
          {saved && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved!</p>
          )}
          <Button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Assigned Studies
        </h2>
        {studiesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        ) : assignedStudies.length === 0 ? (
          <p className="text-sm text-slate-400 italic">
            No studies assigned. Contact your site manager.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {assignedStudies.map((study) => (
              <li key={study.id} className="py-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {study.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {study.sponsor} · {study.phase}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
