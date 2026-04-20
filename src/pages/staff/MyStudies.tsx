import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useAuth } from '@/hooks/useAuth'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DelegationLogTab } from '@/components/study-detail/DelegationLogTab'
import { VisitCompletionTracker } from '@/components/workload/VisitCompletionTracker'
import { Skeleton } from '@/components/ui/skeleton'
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
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Studies</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {myStudies.length} assigned {myStudies.length === 1 ? 'study' : 'studies'}
        </p>
      </div>

      {myStudies.length === 0 && (
        <p className="text-slate-400 text-sm py-8 text-center">
          You have no assigned studies. Contact your site manager to be assigned to a study.
        </p>
      )}

      {myStudies.length > 0 && (
        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-1 space-y-2">
            {myStudies.map((study) => (
              <button
                key={study.id}
                onClick={() => setActiveStudyId(study.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  (selected?.id ?? myStudies[0]?.id) === study.id
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-tight">
                  {study.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{study.sponsor}</p>
                <div className="mt-1.5">
                  <StatusBadge status={study.status} />
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="col-span-3 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {selected.name}
                </h2>
                <p className="text-sm text-slate-500">
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
