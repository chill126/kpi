import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useAuth } from '@/hooks/useAuth'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DelegationLogTab } from '@/components/study-detail/DelegationLogTab'
import { VisitCompletionTracker } from '@/components/workload/VisitCompletionTracker'
import { Skeleton } from '@/components/hud/Skeleton'
import { EmptyState } from '@/components/hud/EmptyState'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { useState } from 'react'

export function MyStudies() {
  const { user } = useAuth()
  const { studies, loading } = useStudies()
  const { investigators } = useInvestigators()
  const [activeStudyId, setActiveStudyId] = useState<string | null>(null)

  const myStudies = user
    ? studies.filter((s) => user.assignedStudies.includes(s.id))
    : []

  const selected = myStudies.find((s) => s.id === activeStudyId) ?? myStudies[0] ?? null

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton height={32} width={192} />
        <Skeleton height={256} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
          My Studies
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
          {myStudies.length} assigned {myStudies.length === 1 ? 'study' : 'studies'}
        </p>
      </div>

      {myStudies.length === 0 && (
        <EmptyState
          title="No studies assigned"
          body="Contact your site manager to be assigned to a study."
        />
      )}

      {myStudies.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myStudies.map((study) => (
              <button
                key={study.id}
                onClick={() => setActiveStudyId(study.id)}
                style={
                  (selected?.id ?? myStudies[0]?.id) === study.id
                    ? { width: '100%', textAlign: 'left', borderRadius: 8, padding: 12, border: '1px solid var(--accent-primary)', background: 'rgba(114 90 193 / 0.10)', cursor: 'pointer' }
                    : { width: '100%', textAlign: 'left', borderRadius: 8, padding: 12, border: '1px solid rgba(255 255 255 / 0.08)', background: 'transparent', cursor: 'pointer' }
                }
              >
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {study.name}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{study.sponsor}</p>
                <div className="mt-1.5">
                  <StatusBadge status={study.status} />
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="space-y-4">
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
                  {selected.name}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {selected.sponsor} · {selected.therapeuticArea} · {selected.phase}
                </p>
              </div>

              <Tabs defaultValue="visits">
                <TabsList>
                  <TabsTrigger value="visits">Visit Completion</TabsTrigger>
                  <TabsTrigger value="delegation">Delegation Log</TabsTrigger>
                </TabsList>
                <div className="pt-4">
                  <TabsContent value="visits">
                    <VisitCompletionTracker studyId={selected.id} />
                  </TabsContent>
                  <TabsContent value="delegation">
                    <DelegationLogTab
                      studyId={selected.id}
                      investigators={investigators}
                      canEdit={false}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
