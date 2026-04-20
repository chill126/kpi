import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSite } from '@/hooks/useSite'
import { StudyTable } from '@/components/studies/StudyTable'
import { StudyFilters, type StudyFilterState } from '@/components/studies/StudyFilters'
import { StudyForm } from '@/components/studies/StudyForm'
import { StudyComparison } from '@/components/studies/StudyComparison'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, GitCompareArrows } from 'lucide-react'

export function Studies() {
  const navigate = useNavigate()
  const { siteId } = useSite()
  const { studies, loading: studiesLoading } = useStudies()
  const { investigators, loading: invLoading } = useInvestigators()
  const [filters, setFilters] = useState<StudyFilterState>({
    status: 'all',
    therapeuticArea: '',
    piId: '',
  })
  const [formOpen, setFormOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const loading = studiesLoading || invLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Studies</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {studies.length} {studies.length === 1 ? 'study' : 'studies'} at this site
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length === 2 && (
            <Button variant="outline" size="sm" onClick={() => setCompareOpen(true)}>
              <GitCompareArrows size={14} className="mr-1.5" aria-hidden="true" />
              Compare
            </Button>
          )}
          <Button
            onClick={() => setFormOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Plus size={16} className="mr-1.5" aria-hidden="true" />
            Add Study
          </Button>
        </div>
      </div>

      <StudyFilters filters={filters} onChange={setFilters} investigators={investigators} />

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => <Skeleton key={n} className="h-12 w-full rounded-md" />)}
        </div>
      ) : (
        <StudyTable
          studies={studies}
          investigators={investigators}
          filters={filters}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          onViewDetail={(id) => navigate(`/studies/${id}`)}
        />
      )}

      <StudyForm
        open={formOpen}
        onOpenChange={setFormOpen}
        investigators={investigators}
        siteId={siteId}
        onSave={(id) => {
          setFormOpen(false)
          navigate(`/studies/${id}`)
        }}
      />

      {selectedIds.length === 2 && (
        <StudyComparison
          studyIds={selectedIds as [string, string]}
          studies={studies}
          investigators={investigators}
          open={compareOpen}
          onOpenChange={setCompareOpen}
        />
      )}
    </div>
  )
}
