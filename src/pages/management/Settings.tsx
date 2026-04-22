import { useEffect, useState } from 'react'
import { useSite } from '@/hooks/useSite'
import { useSiteData } from '@/hooks/useSiteData'
import { useSiteUsers } from '@/hooks/useSiteUsers'
import { useStudies } from '@/hooks/useStudies'
import { createSite, updateSite } from '@/lib/sites'
import { updateUser } from '@/lib/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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

const SELECT_CLASS =
  'w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'

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

function SiteConfigurationTab() {
  const { siteId } = useSite()
  const { site, loading } = useSiteData()
  const [form, setForm] = useState<SiteForm | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (site) setForm(siteToForm(site))
  }, [site])

  if (loading) {
    return (
      <div className="space-y-3 pt-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (!site || !form) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 pt-4">
        Site document not found.
      </p>
    )
  }

  const original = siteToForm(site)
  const dirty = !formsEqual(form, original)

  async function handleSave() {
    if (!form) return
    setSaving(true)
    try {
      await updateSite(siteId, {
        name: form.name,
        location: form.location,
        timezone: form.timezone,
        active: form.active,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pt-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-4">
        <div className="space-y-1">
          <Label htmlFor="site-name">Site Name</Label>
          <Input
            id="site-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="site-location">Location</Label>
          <Input
            id="site-location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="site-timezone">Timezone</Label>
          <select
            id="site-timezone"
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            className={SELECT_CLASS}
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
            id="site-active"
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <Label htmlFor="site-active" className="cursor-pointer">
            Active
          </Label>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <AddSiteCard />
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
    <div className="mt-4">
      {!open ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          + Add Site to Network
        </Button>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-4">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">New Site</p>
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
            <select id="new-site-timezone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className={SELECT_CLASS}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setOpen(false); setForm(BLANK_SITE_FORM) }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim() || saving} className="bg-teal-600 hover:bg-teal-700 text-white">
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
              className={SELECT_CLASS}
            >
              <option value="management">management</option>
              <option value="staff">staff</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Assigned Studies</Label>
            {studies.length === 0 ? (
              <p className="text-xs text-slate-500">No studies available.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border border-slate-200 dark:border-slate-700 p-2">
                {studies.map((study) => (
                  <label
                    key={study.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={assignedStudies.includes(study.id)}
                      onChange={() => toggleStudy(study.id)}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-slate-700 dark:text-slate-200">
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
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RoleBadge({ role }: { role: Role }) {
  const className =
    role === 'management'
      ? 'bg-teal-50 text-teal-700 border border-teal-200'
      : 'bg-slate-100 text-slate-600 border border-slate-200'
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${className}`}
    >
      {role}
    </span>
  )
}

function UserManagementTab() {
  const { users, loading } = useSiteUsers()
  const { studies } = useStudies()
  const [editUser, setEditUser] = useState<AppUser | null>(null)

  if (loading) {
    return (
      <div className="space-y-2 pt-4">
        {[1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="pt-4 space-y-4">
      {users.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">
          No users found for this site.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Assigned Studies
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {users.map((user) => (
                <tr
                  key={user.uid}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {user.displayName}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 tabular-nums">
                    {user.assignedStudies.length}
                  </td>
                  <td className="px-4 py-3 text-right">
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
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-200">
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
    <div className="pt-4 space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-200">
        Seeds initial investigators and studies for the active site. Safe to run
        multiple times — skips if data already exists.
      </div>
      <Button
        onClick={handleSeed}
        disabled={running}
        className="bg-teal-600 hover:bg-teal-700 text-white"
      >
        {running ? 'Seeding…' : 'Seed Site Data'}
      </Button>
      {result && (
        <p className="text-sm text-slate-700 dark:text-slate-200">{result}</p>
      )}
    </div>
  )
}

export function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
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
