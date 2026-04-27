import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSite } from '@/hooks/useSite'
import { StudyTable } from '@/components/studies/StudyTable'
import { StudyFilters, type StudyFilterState } from '@/components/studies/StudyFilters'
import { StudyForm } from '@/components/studies/StudyForm'
import { StudyComparison } from '@/components/studies/StudyComparison'
import { Skeleton } from '@/components/hud/Skeleton'
import { Plus, GitCompareArrows } from 'lucide-react'

export function Studies() {
  const navigate = useNavigate()
  const { siteId } = useSite()
  const { studies, loading: studiesLoading } = useStudies()
  const { investigators, loading: invLoading } = useInvestigators()
  const [filters, setFilters] = useState<StudyFilterState>({
    status: 'all',
    therapeuticArea: '',
    hideCompleted: false,
  })
  const [formOpen, setFormOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const loading = studiesLoading || invLoading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>Studies</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            {studies.length} {studies.length === 1 ? 'study' : 'studies'} at this site
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectedIds.length === 2 && (
            <button
              onClick={() => setCompareOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 34, padding: '0 12px', borderRadius: 8,
                background: 'rgba(255 255 255 / 0.06)',
                border: '1px solid rgba(255 255 255 / 0.14)',
                color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255 255 255 / 0.10)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255 255 255 / 0.06)' }}
            >
              <GitCompareArrows size={14} aria-hidden="true" />
              Compare
            </button>
          )}
          <button
            onClick={() => setFormOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 34, padding: '0 14px', borderRadius: 8,
              background: 'var(--accent-primary)',
              border: 'none',
              color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            <Plus size={15} aria-hidden="true" />
            Add Study
          </button>
        </div>
      </div>

      <StudyFilters filters={filters} onChange={setFilters} />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map((n) => <Skeleton key={n} height={48} />)}
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
