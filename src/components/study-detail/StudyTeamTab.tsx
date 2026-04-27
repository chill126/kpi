import { useState } from 'react'
import { updateStudy } from '@/lib/studies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/hud/EmptyState'
import { Plus, Pencil, Trash2, Phone, Mail } from 'lucide-react'
import type { Study, StudyTeamContact } from '@/types'

interface Props {
  study: Study
  canEdit: boolean
}

const COMMON_ROLES = [
  'CRA',
  'Medical Monitor',
  'Sponsor Contact',
  'Data Manager',
  'Biostatistician',
  'Safety Officer',
  'Study Coordinator',
  'Pharmacist',
  'IRB Contact',
  'Other',
]

function newContact(): Omit<StudyTeamContact, 'id'> {
  return { role: '', name: '', email: '', phone: '', organization: '', notes: '' }
}

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

interface FormState {
  role: string
  name: string
  email: string
  phone: string
  organization: string
  notes: string
}

function toForm(c: StudyTeamContact): FormState {
  return {
    role: c.role,
    name: c.name,
    email: c.email,
    phone: c.phone,
    organization: c.organization ?? '',
    notes: c.notes ?? '',
  }
}

export function StudyTeamTab({ study, canEdit }: Props) {
  const contacts = study.teamContacts ?? []
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(newContact() as FormState)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StudyTeamContact | null>(null)

  function openAdd() {
    setEditingId(null)
    setForm(newContact() as FormState)
    setDialogOpen(true)
  }

  function openEdit(c: StudyTeamContact) {
    setEditingId(c.id)
    setForm(toForm(c))
    setDialogOpen(true)
  }

  function field(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    const trimmed = form.name.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      let updated: StudyTeamContact[]
      if (editingId) {
        updated = contacts.map((c) =>
          c.id === editingId
            ? { id: c.id, role: form.role, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), organization: form.organization.trim() || undefined, notes: form.notes.trim() || undefined }
            : c,
        )
      } else {
        const contact: StudyTeamContact = {
          id: nanoid(),
          role: form.role,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          organization: form.organization.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }
        updated = [...contacts, contact]
      }
      await updateStudy(study.id, { teamContacts: updated })
      setDialogOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(c: StudyTeamContact) {
    const updated = contacts.filter((x) => x.id !== c.id)
    await updateStudy(study.id, { teamContacts: updated })
    setDeleteTarget(null)
  }

  const roleColor: Record<string, string> = {
    'CRA': 'rgba(30 120 255 / 0.15)',
    'Medical Monitor': 'rgba(139 92 246 / 0.15)',
    'Sponsor Contact': 'rgba(22 163 74 / 0.15)',
    'Safety Officer': 'rgba(220 38 38 / 0.15)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Study Team</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            CRAs, monitors, sponsor contacts, and other key personnel for this study.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} aria-hidden="true" />
            Add Contact
          </Button>
        )}
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          title="No team contacts yet"
          body={canEdit ? 'Add CRAs, monitors, and sponsor contacts for quick reference.' : 'No contacts have been added.'}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {contacts.map((c) => (
            <div
              key={c.id}
              className="glass"
              style={{ padding: 16, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{c.name}</p>
                  {c.organization && (
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{c.organization}</p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, flexShrink: 0,
                    background: roleColor[c.role] ?? 'rgba(255 255 255 / 0.06)',
                    color: 'var(--text-secondary)',
                    border: '1px solid rgba(255 255 255 / 0.10)',
                  }}>
                    {c.role || 'Contact'}
                  </span>
                  {canEdit && (
                    <>
                      <button
                        onClick={() => openEdit(c)}
                        aria-label={`Edit ${c.name}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 4 }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
                      >
                        <Pencil size={13} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        aria-label={`Remove ${c.name}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 4 }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--signal-alert)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)' }}
                  >
                    <Phone size={12} style={{ flexShrink: 0, color: 'var(--text-muted)' }} aria-hidden="true" />
                    {c.phone}
                  </a>
                )}
                {c.email && (
                  <a
                    href={`mailto:${c.email}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent-primary)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)' }}
                  >
                    <Mail size={12} style={{ flexShrink: 0, color: 'var(--text-muted)' }} aria-hidden="true" />
                    {c.email}
                  </a>
                )}
              </div>

              {c.notes && (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid rgba(255 255 255 / 0.06)', paddingTop: 8 }}>
                  {c.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) setDialogOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label htmlFor="ct-name">Name *</Label>
                <Input id="ct-name" value={form.name} onChange={(e) => field('name', e.target.value)} placeholder="Jane Smith" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label htmlFor="ct-role">Role</Label>
                <select
                  id="ct-role"
                  value={form.role}
                  onChange={(e) => field('role', e.target.value)}
                  style={{
                    height: 36, borderRadius: 6, border: '1px solid rgba(255 255 255 / 0.12)',
                    background: 'rgba(255 255 255 / 0.04)', color: 'var(--text-primary)',
                    fontSize: 14, padding: '0 8px',
                  }}
                >
                  <option value="">Select role</option>
                  {COMMON_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label htmlFor="ct-org">Organization</Label>
              <Input id="ct-org" value={form.organization} onChange={(e) => field('organization', e.target.value)} placeholder="Sponsor / CRO name" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label htmlFor="ct-phone">Phone</Label>
                <Input id="ct-phone" type="tel" value={form.phone} onChange={(e) => field('phone', e.target.value)} placeholder="+1 555-000-0000" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label htmlFor="ct-email">Email</Label>
                <Input id="ct-email" type="email" value={form.email} onChange={(e) => field('email', e.target.value)} placeholder="jane@sponsor.com" />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label htmlFor="ct-notes">Notes</Label>
              <Input id="ct-notes" value={form.notes} onChange={(e) => field('notes', e.target.value)} placeholder="Optional — coverage schedule, timezone, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? 'Saving…' : editingId ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Remove Contact</DialogTitle>
            </DialogHeader>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0' }}>
              Remove <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong> from this study's team?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                style={{ background: 'var(--signal-alert)', border: 'none', color: '#fff' }}
                onClick={() => handleDelete(deleteTarget)}
              >
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
