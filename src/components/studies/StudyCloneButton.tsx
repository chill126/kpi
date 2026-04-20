import { useState } from 'react'
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
import { cloneStudy } from '@/lib/studies'
import type { Study } from '@/types'
import { Copy } from 'lucide-react'

interface Props {
  study: Study
  onCloned: (newStudyId: string) => void
}

export function StudyCloneButton({ study, onCloned }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleOpen() {
    setName(`${study.name} (Copy)`)
    setError('')
    setOpen(true)
  }

  async function handleClone() {
    if (!name.trim()) { setError('Name is required'); return }
    setLoading(true)
    try {
      const id = await cloneStudy(study, name.trim())
      onCloned(id)
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <Copy size={14} className="mr-1.5" aria-hidden="true" />
        Clone
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Study</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="clone-name">New Study Name</Label>
            <Input
              id="clone-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <p className="text-xs text-slate-500">
              Visit schedule, assessment battery, and admin settings are copied. Enrollment data is reset.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={loading} onClick={handleClone} className="bg-teal-600 hover:bg-teal-700 text-white">
              {loading ? 'Cloning…' : 'Clone Study'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
