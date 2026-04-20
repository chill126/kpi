import { useState } from 'react'
import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useAuth } from '@/hooks/useAuth'
import { useSite } from '@/hooks/useSite'
import { VisitLogForm } from '@/components/workload/VisitLogForm'
import { BulkVisitLogForm } from '@/components/workload/BulkVisitLogForm'
import { AssessmentLogForm } from '@/components/workload/AssessmentLogForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function DataEntry() {
  const { user } = useAuth()
  const { siteId } = useSite()
  const { studies } = useStudies()
  const { investigators } = useInvestigators()
  const [refreshKey, setRefreshKey] = useState(0)

  // Staff see only their assigned studies
  const visibleStudies =
    user?.role === 'staff'
      ? studies.filter((s) => user.assignedStudies.includes(s.id))
      : studies

  function handleSaved() {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Data Entry</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Log visits and assessments for your assigned studies.
        </p>
      </div>

      <Tabs defaultValue="single-visit">
        <TabsList>
          <TabsTrigger value="single-visit">Single Visit</TabsTrigger>
          <TabsTrigger value="bulk-visit">Bulk Visit Log</TabsTrigger>
          <TabsTrigger value="assessment">Assessment</TabsTrigger>
        </TabsList>

        <div className="pt-6">
          <TabsContent value="single-visit" key={`sv-${refreshKey}`}>
            <VisitLogForm
              studies={visibleStudies}
              investigators={investigators}
              siteId={siteId}
              onSaved={handleSaved}
            />
          </TabsContent>

          <TabsContent value="bulk-visit" key={`bv-${refreshKey}`}>
            <BulkVisitLogForm
              studies={visibleStudies}
              investigators={investigators}
              siteId={siteId}
              onSaved={handleSaved}
            />
          </TabsContent>

          <TabsContent value="assessment" key={`as-${refreshKey}`}>
            <AssessmentLogForm
              studies={visibleStudies}
              investigators={investigators}
              siteId={siteId}
              onSaved={handleSaved}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
