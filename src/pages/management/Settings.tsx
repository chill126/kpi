import { useEffect, useMemo, useRef, useState } from 'react'
import { useSite } from '@/hooks/useSite'
import { useSites } from '@/hooks/useSites'
import { useSiteUsers } from '@/hooks/useSiteUsers'
import { useStudies } from '@/hooks/useStudies'
import { createSite, deleteSite, updateSite } from '@/lib/sites'
import { deleteUser, updateUser } from '@/lib/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HUDSelect } from '@/components/hud/HUDSelect'
import { Skeleton } from '@/components/hud/Skeleton'
import { Panel } from '@/components/hud/Panel'
import { EmptyState } from '@/components/hud/EmptyState'
import { HUDTabBar } from '@/components/hud/TabBar'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDashboardConfig, DEFAULT_DASHBOARD_CONFIG } from '@/hooks/useDashboardConfig'
import type { AppUser, Role, Site, Study, OverviewTileId } from '@/types'

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
] as const


const TILE_DISPLAY: Record<OverviewTileId, { label: string; description: string }> = {
  'studies': { label: 'Studies', description: 'Enrolling and open study counts' },
  'enrollment': { label: 'Enrollment', description: 'Screened, randomized, active, and completed counts' },
  'today-activity': { label: "Today's Activity", description: 'Visits and assessments logged today' },
}

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => Promise<void>
}

function DeleteConfirmDialog({ open, onOpenChange, title, description, onConfirm }: DeleteConfirmDialogProps) {
  const [deleting, setDeleting] = useState(false)
  async function handleConfirm() {
    setDeleting(true)
    try { await onConfirm(); onOpenChange(false) }
    finally { setDeleting(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{description}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={deleting}
            style={{ background: 'oklch(0.55 0.20 25)', border: 'none', color: '#fff' }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
            <HUDSelect
              id="edit-site-timezone"
              value={form.timezone}
              onChange={(v) => setForm({ ...form, timezone: v })}
              options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
            />
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

function ActiveSiteSelector() {
  const { sites } = useSites()
  const { siteId, setActiveSite } = useSite()

  if (sites.length <= 1) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label htmlFor="active-site-select" style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        Viewing site
      </label>
      <HUDSelect
        id="active-site-select"
        aria-label="Viewing site"
        value={siteId}
        onChange={setActiveSite}
        options={sites.map((site) => ({ value: site.id, label: site.name }))}
      />
    </div>
  )
}

function SiteConfigurationTab() {
  const { sites, loading } = useSites()
  const { siteId: activeSiteId } = useSite()
  const [editSite, setEditSite] = useState<Site | null>(null)
  const [deleteSiteTarget, setDeleteSiteTarget] = useState<Site | null>(null)

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
      <ActiveSiteSelector />
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
                          <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 99, background: 'rgba(30 120 255 / 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(30 120 255 / 0.3)' }}>
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
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <Button size="sm" variant="outline" onClick={() => setEditSite(site)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={site.id === activeSiteId}
                          onClick={() => setDeleteSiteTarget(site)}
                          style={{ color: 'oklch(0.70 0.18 25)', borderColor: 'rgba(220 60 40 / 0.3)' }}
                        >
                          Remove
                        </Button>
                      </div>
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
          onOpenChange={(open) => { if (!open) setEditSite(null) }}
        />
      )}
      {deleteSiteTarget && (
        <DeleteConfirmDialog
          open={deleteSiteTarget !== null}
          onOpenChange={(open) => { if (!open) setDeleteSiteTarget(null) }}
          title="Remove Site"
          description={`Remove "${deleteSiteTarget.name}" from the network? This cannot be undone.`}
          onConfirm={() => deleteSite(deleteSiteTarget.id)}
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
            <HUDSelect
              id="new-site-timezone"
              value={form.timezone}
              onChange={(v) => setForm({ ...form, timezone: v })}
              options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
            />
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
            <HUDSelect
              id="user-role"
              value={role}
              onChange={(v) => setRole(v as Role)}
              options={[
                { value: 'management', label: 'management' },
                { value: 'staff', label: 'staff' },
              ]}
            />
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
      ? { display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: 'rgba(30 120 255 / 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(30 120 255 / 0.3)' }
      : { display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: 'rgba(255 255 255 / 0.06)', color: 'var(--text-secondary)', border: '1px solid rgba(255 255 255 / 0.10)' }
  return <span style={style}>{role}</span>
}

function UserManagementTab() {
  const { users, loading } = useSiteUsers()
  const { studies } = useStudies()
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [deleteUserTarget, setDeleteUserTarget] = useState<AppUser | null>(null)

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
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <Button size="sm" variant="outline" onClick={() => setEditUser(user)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteUserTarget(user)}
                          style={{ color: 'oklch(0.70 0.18 25)', borderColor: 'rgba(220 60 40 / 0.3)' }}
                        >
                          Remove
                        </Button>
                      </div>
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
          onOpenChange={(open) => { if (!open) setEditUser(null) }}
        />
      )}
      {deleteUserTarget && (
        <DeleteConfirmDialog
          open={deleteUserTarget !== null}
          onOpenChange={(open) => { if (!open) setDeleteUserTarget(null) }}
          title="Remove User"
          description={`Remove "${deleteUserTarget.displayName}" from the system? Their Firebase Auth account will remain but they will no longer appear in the app.`}
          onConfirm={() => deleteUser(deleteUserTarget.uid)}
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

function DashboardTab() {
  const { config, saveConfig } = useDashboardConfig()
  const [saving, setSaving] = useState(false)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const dragSrc = useRef<number | null>(null)

  const sorted = useMemo(
    () => [...config.tiles].sort((a, b) => a.order - b.order),
    [config.tiles],
  )

  async function handleToggle(id: OverviewTileId) {
    if (saving) return
    setSaving(true)
    try {
      const newTiles = sorted.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t))
      await saveConfig({ tiles: newTiles })
    } catch (err) {
      console.error('[DashboardTab] Failed to save config:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDrop(toIdx: number) {
    const fromIdx = dragSrc.current
    setDragOver(null)
    dragSrc.current = null
    if (fromIdx === null || fromIdx === toIdx || saving) return
    setSaving(true)
    try {
      const reordered = [...sorted]
      const [moved] = reordered.splice(fromIdx, 1)
      reordered.splice(toIdx, 0, moved)
      await saveConfig({ tiles: reordered.map((t, i) => ({ ...t, order: i })) })
    } catch (err) {
      console.error('[DashboardTab] Failed to save config:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (saving) return
    setSaving(true)
    try {
      await saveConfig(DEFAULT_DASHBOARD_CONFIG)
    } catch (err) {
      console.error('[DashboardTab] Failed to reset config:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Panel title="Overview Tile Layout">
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-muted)' }}>
          Drag to reorder. Toggle visibility with the checkbox.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map((tile, idx) => (
            <div
              key={tile.id}
              draggable={!saving}
              onDragStart={() => { dragSrc.current = idx }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(idx) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => void handleDrop(idx)}
              onDragEnd={() => { setDragOver(null); dragSrc.current = null }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 8,
                background: dragOver === idx
                  ? 'rgba(30 120 255 / 0.12)'
                  : 'rgba(255 255 255 / 0.03)',
                border: dragOver === idx
                  ? '1px solid rgba(30 120 255 / 0.4)'
                  : '1px solid rgba(255 255 255 / 0.08)',
                transition: 'background 0.1s, border-color 0.1s',
                cursor: saving ? 'not-allowed' : 'grab',
              }}
            >
              {/* drag handle */}
              <span style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1, flexShrink: 0, cursor: 'grab' }} aria-hidden>⠿</span>

              <input
                type="checkbox"
                id={`tile-toggle-${tile.id}`}
                checked={tile.visible}
                disabled={saving}
                onChange={() => void handleToggle(tile.id)}
                aria-labelledby={`tile-label-${tile.id}`}
                style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)', flexShrink: 0 }}
              />
              <label htmlFor={`tile-toggle-${tile.id}`} style={{ flex: 1, cursor: 'pointer' }}>
                <div id={`tile-label-${tile.id}`} style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {TILE_DISPLAY[tile.id].label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {TILE_DISPLAY[tile.id].description}
                </div>
              </label>
            </div>
          ))}
        </div>
      </Panel>

      <button
        disabled={saving}
        onClick={() => void handleReset()}
        style={{
          alignSelf: 'flex-start', padding: '6px 14px', borderRadius: 8,
          border: '1px solid rgba(255 255 255 / 0.15)',
          background: 'rgba(255 255 255 / 0.06)',
          color: 'var(--text-secondary)', fontSize: 12, cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        Reset to defaults
      </button>
    </div>
  )
}

export function Settings() {
  const [tab, setTab] = useState('site')

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

      <HUDTabBar
        tabs={[
          { value: 'site', label: 'Site Configuration' },
          { value: 'users', label: 'User Management' },
          { value: 'seed', label: 'Seed Data' },
          { value: 'dashboard', label: 'My Dashboard' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'site' && <SiteConfigurationTab />}
      {tab === 'users' && <UserManagementTab />}
      {tab === 'seed' && <SeedDataTab />}
      {tab === 'dashboard' && <DashboardTab />}
    </div>
  )
}
