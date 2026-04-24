import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useStudies } from '@/hooks/useStudies'
import { updateUser } from '@/lib/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/hud/Skeleton'
import { Panel } from '@/components/hud/Panel'
import { EmptyState } from '@/components/hud/EmptyState'
import type { Role } from '@/types'

function RoleBadge({ role }: { role: Role }) {
  const style: React.CSSProperties =
    role === 'management'
      ? {
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: 11,
          fontWeight: 500,
          padding: '3px 10px',
          borderRadius: 99,
          background: 'rgba(30 120 255 / 0.15)',
          color: 'var(--accent-primary)',
          border: '1px solid rgba(30 120 255 / 0.3)',
        }
      : {
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: 11,
          fontWeight: 500,
          padding: '3px 10px',
          borderRadius: 99,
          background: 'rgba(255 255 255 / 0.06)',
          color: 'var(--text-secondary)',
          border: '1px solid rgba(255 255 255 / 0.12)',
        }
  return <span style={style}>{role}</span>
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
    return <Skeleton height={256} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 512 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
          My Profile
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
          Manage your display name and view your site assignments.
        </p>
      </div>

      <Panel title="Profile">
        <div className="space-y-4">
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
            <p className="text-sm h-9 flex items-center px-3 rounded-md border border-slate-200 dark:border-slate-600"
               style={{ color: 'var(--text-primary)', background: 'rgba(255 255 255 / 0.04)' }}>
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
              <p style={{ fontSize: 13, color: 'var(--signal-good)' }}>Saved!</p>
            )}
            <Button
              onClick={handleSave}
              disabled={!dirty || saving}
              style={{ background: 'var(--accent-primary)', border: 'none', color: 'oklch(0.09 0.015 275)' }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="Assigned Studies">
        {studiesLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton height={24} />
            <Skeleton height={24} width={288} />
          </div>
        ) : assignedStudies.length === 0 ? (
          <EmptyState title="No studies assigned" body="Contact your site manager." />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {assignedStudies.map((study) => (
              <li key={study.id} className="py-2 flex items-center justify-between">
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {study.name}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {study.sponsor} · {study.phase}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
