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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
          Data Entry
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
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
