import { useEffect, useState } from 'react'
import { useSite } from '@/hooks/useSite'
import { useSites } from '@/hooks/useSites'
import { useSiteUsers } from '@/hooks/useSiteUsers'
import { useStudies } from '@/hooks/useStudies'
import { createSite, updateSite } from '@/lib/sites'
import { updateUser } from '@/lib/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/hud/Skeleton'
import { Panel } from '@/components/hud/Panel'
import { EmptyState } from '@/components/hud/EmptyState'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AppUser, Role, Site, Study } from '@/types'

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
] as const

const HUD_SELECT_STYLE: React.CSSProperties = {
  height: 36,
  background: 'rgba(255 255 255 / 0.06)',
  border: '1px solid rgba(255 255 255 / 0.12)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  padding: '0 10px',
  fontSize: 13,
  width: '100%',
}

interface SiteForm {
  name: string
  location: string
  timezone: string
  active: boolean
}

function siteToForm(site: Site): SiteForm {
  return {
    name: site.name,
    location: site.location,
    timezone: site.timezone,
    active: site.active,
  }
}

function formsEqual(a: SiteForm, b: SiteForm): boolean {
  return (
    a.name === b.name &&
    a.location === b.location &&
    a.timezone === b.timezone &&
    a.active === b.active
  )
}

interface SiteEditDialogProps {
  site: Site
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SiteEditDialog({ site, open, onOpenChange }: SiteEditDialogProps) {
  const [form, setForm] = useState<SiteForm>(siteToForm(site))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(siteToForm(site))
  }, [open, site])

  const original = siteToForm(site)
  const dirty = !formsEqual(form, original)

  async function handleSave() {
    setSaving(true)
    try {
      await updateSite(site.id, {
        name: form.name,
        location: form.location,
        timezone: form.timezone,
        active: form.active,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Site</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="edit-site-name">Site Name</Label>
            <Input
              id="edit-site-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-site-location">Location</Label>
            <Input
              id="edit-site-location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-site-timezone">Timezone</Label>
            <select
              id="edit-site-timezone"
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              style={HUD_SELECT_STYLE}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="edit-site-active"
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
            />
            <Label htmlFor="edit-site-active" className="cursor-pointer">
              Active
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!dirty || saving}
            style={{ background: 'var(--accent-primary)', border: 'none', color: 'oklch(0.09 0.015 275)' }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SiteConfigurationTab() {
  const { sites, loading } = useSites()
  const { siteId: activeSiteId } = useSite()
  const [editSite, setEditSite] = useState<Site | null>(null)

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16 }}>
        <Skeleton height={40} />
        <Skeleton height={40} />
        <Skeleton height={40} />
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {sites.length === 0 ? (
        <EmptyState title="No sites found" />
      ) : (
        <Panel title="Site Network">
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full text-sm">
              <thead style={{ borderBottom: '1px solid rgba(255 255 255 / 0.08)' }}>
                <tr>
                  <th
                    className="px-4 py-3 text-left"
                    style={{ color: 'var(--text-label)' }}
                  >
                    Name
                  </th>
                  <th
                    className="px-4 py-3 text-left"
                    style={{ color: 'var(--text-label)' }}
                  >
                    Location
                  </th>
                  <th
                    className="px-4 py-3 text-left"
                    style={{ color: 'var(--text-label)' }}
                  >
                    Status
                  </th>
                  <th
                    className="px-4 py-3 text-right"
                    style={{ color: 'var(--text-label)' }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id}>
                    <td style={{ color: 'var(--text-primary)', padding: '12px 16px', fontWeight: 500 }}>
                      <div className="flex items-center gap-2">
                        <span>{site.name}</span>
                        {site.id === activeSiteId && (
                          <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 99, background: 'rgba(114 90 193 / 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(114 90 193 / 0.3)' }}>
                            current
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', padding: '12px 16px' }}>
                      {site.location}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {site.active ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: 'rgba(22 163 74 / 0.15)', color: 'var(--signal-good)', border: '1px solid rgba(22 163 74 / 0.3)' }}>
                          active
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: 'rgba(255 255 255 / 0.06)', color: 'var(--text-muted)', border: '1px solid rgba(255 255 255 / 0.10)' }}>
                          inactive
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditSite(site)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <AddSiteCard />

      {editSite && (
        <SiteEditDialog
          site={editSite}
          open={editSite !== null}
          onOpenChange={(open) => {
            if (!open) setEditSite(null)
          }}
        />
      )}
    </div>
  )
}

const BLANK_SITE_FORM: SiteForm = { name: '', location: '', timezone: 'America/New_York', active: true }

function AddSiteCard() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<SiteForm>(BLANK_SITE_FORM)
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await createSite(form)
      setForm(BLANK_SITE_FORM)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ marginTop: 4 }}>
      {!open ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          + Add Site to Network
        </Button>
      ) : (
        <div className="glass" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>New Site</p>
          <div className="space-y-1">
            <Label htmlFor="new-site-name">Site Name</Label>
            <Input id="new-site-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-site-location">Location</Label>
            <Input id="new-site-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-site-timezone">Timezone</Label>
            <select
              id="new-site-timezone"
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              style={HUD_SELECT_STYLE}
            >
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setOpen(false); setForm(BLANK_SITE_FORM) }}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!form.name.trim() || saving}
              style={{ background: 'var(--accent-primary)', border: 'none', color: 'oklch(0.09 0.015 275)' }}
            >
              {saving ? 'Creating…' : 'Create Site'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface UserEditDialogProps {
  user: AppUser
  studies: Study[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function UserEditDialog({
  user,
  studies,
  open,
  onOpenChange,
}: UserEditDialogProps) {
  const [displayName, setDisplayName] = useState(user.displayName)
  const [role, setRole] = useState<Role>(user.role)
  const [assignedStudies, setAssignedStudies] = useState<string[]>(
    user.assignedStudies,
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setDisplayName(user.displayName)
      setRole(user.role)
      setAssignedStudies(user.assignedStudies)
    }
  }, [open, user])

  function toggleStudy(studyId: string) {
    setAssignedStudies((prev) =>
      prev.includes(studyId)
        ? prev.filter((id) => id !== studyId)
        : [...prev, studyId],
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateUser(user.uid, {
        displayName,
        role,
        assignedStudies,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="user-display-name">Display Name</Label>
            <Input
              id="user-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="user-role">Role</Label>
            <select
              id="user-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              style={HUD_SELECT_STYLE}
            >
              <option value="management">management</option>
              <option value="staff">staff</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Assigned Studies</Label>
            {studies.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No studies available.</p>
            ) : (
              <div style={{ maxHeight: 192, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, borderRadius: 8, border: '1px solid rgba(255 255 255 / 0.10)', padding: 8, background: 'rgba(255 255 255 / 0.03)' }}>
                {studies.map((study) => (
                  <label
                    key={study.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={assignedStudies.includes(study.id)}
                      onChange={() => toggleStudy(study.id)}
                      style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
                    />
                    <span style={{ color: 'var(--text-primary)' }}>
                      {study.name}
                    </span>
                  </label>
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
            onClick={handleSave}
            disabled={saving}
            style={{ background: 'var(--accent-primary)', border: 'none', color: 'oklch(0.09 0.015 275)' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RoleBadge({ role }: { role: Role }) {
  const style: React.CSSProperties =
    role === 'management'
      ? { display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: 'rgba(114 90 193 / 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(114 90 193 / 0.3)' }
      : { display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: 'rgba(255 255 255 / 0.06)', color: 'var(--text-secondary)', border: '1px solid rgba(255 255 255 / 0.10)' }
  return <span style={style}>{role}</span>
}

function UserManagementTab() {
  const { users, loading } = useSiteUsers()
  const { studies } = useStudies()
  const [editUser, setEditUser] = useState<AppUser | null>(null)

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16 }}>
        <Skeleton height={40} />
        <Skeleton height={40} />
        <Skeleton height={40} />
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {users.length === 0 ? (
        <EmptyState title="No users found" body="Users appear here on first sign-in." />
      ) : (
        <Panel title="Users">
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full text-sm">
              <thead style={{ borderBottom: '1px solid rgba(255 255 255 / 0.08)' }}>
                <tr>
                  <th
                    className="px-4 py-3 text-left"
                    style={{ color: 'var(--text-label)' }}
                  >
                    Name
                  </th>
                  <th
                    className="px-4 py-3 text-left"
                    style={{ color: 'var(--text-label)' }}
                  >
                    Email
                  </th>
                  <th
                    className="px-4 py-3 text-left"
                    style={{ color: 'var(--text-label)' }}
                  >
                    Role
                  </th>
                  <th
                    className="px-4 py-3 text-left"
                    style={{ color: 'var(--text-label)' }}
                  >
                    Assigned Studies
                  </th>
                  <th
                    className="px-4 py-3 text-right"
                    style={{ color: 'var(--text-label)' }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.uid}>
                    <td style={{ color: 'var(--text-primary)', padding: '12px 16px', fontWeight: 500 }}>
                      {user.displayName}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', padding: '12px 16px' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <RoleBadge role={user.role} />
                    </td>
                    <td style={{ color: 'var(--text-secondary)', padding: '12px 16px' }}>
                      {user.assignedStudies.length}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditUser(user)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <div style={{ borderRadius: 8, border: '1px solid rgba(99 149 255 / 0.3)', background: 'rgba(99 149 255 / 0.08)', padding: '10px 12px', fontSize: 12, color: 'var(--accent-info)' }}>
        To add new users, create their Firebase Auth account in the Firebase
        Console, then their profile will appear here automatically on first
        sign-in.
      </div>

      {editUser && (
        <UserEditDialog
          user={editUser}
          studies={studies}
          open={editUser !== null}
          onOpenChange={(open) => {
            if (!open) setEditUser(null)
          }}
        />
      )}
    </div>
  )
}

function SeedDataTab() {
  const { siteId } = useSite()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleSeed() {
    setRunning(true)
    setResult(null)
    try {
      const { seedTampaData } = await import('@/lib/seed')
      const counts = await seedTampaData(siteId)
      setResult(
        `Seeded ${counts.investigators} investigators and ${counts.studies} studies.`,
      )
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ borderRadius: 8, border: '1px solid rgba(217 119 6 / 0.3)', background: 'rgba(217 119 6 / 0.08)', padding: '10px 12px', fontSize: 12, color: 'var(--signal-warn)' }}>
        Seeds initial investigators and studies for the active site. Safe to run
        multiple times — skips if data already exists.
      </div>
      <Button
        onClick={handleSeed}
        disabled={running}
        style={{ background: 'var(--accent-primary)', border: 'none', color: 'oklch(0.09 0.015 275)' }}
      >
        {running ? 'Seeding…' : 'Seed Site Data'}
      </Button>
      {result && (
        <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>{result}</p>
      )}
    </div>
  )
}

export function Settings() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
          Settings
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
          User management and site configuration.
        </p>
      </div>

      <Tabs defaultValue="site">
        <TabsList>
          <TabsTrigger value="site">Site Configuration</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="seed">Seed Data</TabsTrigger>
        </TabsList>

        <TabsContent value="site">
          <SiteConfigurationTab />
        </TabsContent>

        <TabsContent value="users">
          <UserManagementTab />
        </TabsContent>

        <TabsContent value="seed">
          <SeedDataTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
