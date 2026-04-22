import { useParams, useNavigate } from 'react-router-dom'
import { useStudy } from '@/hooks/useStudy'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useAuth } from '@/hooks/useAuth'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StudyDetailHeader } from '@/components/study-detail/StudyDetailHeader'
import { VisitScheduleTab } from '@/components/study-detail/VisitScheduleTab'
import { AssessmentBatteryTab } from '@/components/study-detail/AssessmentBatteryTab'
import { InvestigatorsTab } from '@/components/study-detail/InvestigatorsTab'
import { EnrollmentTab } from '@/components/study-detail/EnrollmentTab'
import { DelegationLogTab } from '@/components/study-detail/DelegationLogTab'
import { ContractTab } from '@/components/study-detail/ContractTab'
import { DeviationsTab } from '@/components/study-detail/DeviationsTab'
import { ChevronLeft } from 'lucide-react'

export function StudyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { study, loading } = useStudy(id ?? '')
  const { investigators } = useInvestigators()
  const { role } = useAuth()

  const canEdit = role === 'management'

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!study) {
    return (
      <div className="text-center py-12 text-slate-500">
        Study not found.{' '}
        <button onClick={() => navigate('/studies')} className="underline text-teal-600">
          Back to studies
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/studies')}
        className="text-slate-500 hover:text-slate-700 -ml-2"
      >
        <ChevronLeft size={16} aria-hidden="true" className="mr-1" />
        Studies
      </Button>

      <StudyDetailHeader study={study} investigators={investigators} />

      <Tabs defaultValue="visit-schedule">
        <TabsList className="border-b border-slate-200 dark:border-slate-700 w-full justify-start rounded-none bg-transparent h-auto p-0 gap-0">
          {[
            'visit-schedule',
            'assessment-battery',
            'investigators',
            'enrollment',
            'delegation-log',
            'deviations',
            ...(canEdit ? ['contract'] : []),
          ].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:text-teal-600 pb-3 px-4 text-sm font-medium capitalize"
            >
              {tab.replace(/-/g, ' ')}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="pt-6">
          <TabsContent value="visit-schedule">
            <VisitScheduleTab study={study} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="assessment-battery">
            <AssessmentBatteryTab study={study} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="investigators">
            <InvestigatorsTab study={study} investigators={investigators} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="enrollment">
            <EnrollmentTab study={study} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="delegation-log">
            <DelegationLogTab studyId={study.id} investigators={investigators} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="deviations">
            <DeviationsTab studyId={study.id} canManage={canEdit} />
          </TabsContent>
          {canEdit && (
            <TabsContent value="contract">
              <ContractTab study={study} canEdit={canEdit} />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  )
}
