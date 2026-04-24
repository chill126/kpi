import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStudy } from '@/hooks/useStudy'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useAuth } from '@/hooks/useAuth'
import { HUDTabBar } from '@/components/hud/TabBar'
import { StudyDetailHeader } from '@/components/study-detail/StudyDetailHeader'
import { VisitScheduleTab } from '@/components/study-detail/VisitScheduleTab'
import { AssessmentBatteryTab } from '@/components/study-detail/AssessmentBatteryTab'
import { InvestigatorsTab } from '@/components/study-detail/InvestigatorsTab'
import { EnrollmentTab } from '@/components/study-detail/EnrollmentTab'
import { DelegationLogTab } from '@/components/study-detail/DelegationLogTab'
import { ContractTab } from '@/components/study-detail/ContractTab'
import { DeviationsTab } from '@/components/study-detail/DeviationsTab'
import { ProtocolTab } from '@/components/study-detail/ProtocolTab'
import { ChevronLeft } from 'lucide-react'

const BASE_TABS = [
  { value: 'visit-schedule',     label: 'Visit Schedule' },
  { value: 'assessment-battery', label: 'Assessments' },
  { value: 'protocol',           label: 'Protocol' },
  { value: 'investigators',      label: 'Investigators' },
  { value: 'enrollment',         label: 'Enrollment' },
  { value: 'delegation-log',     label: 'Delegation Log' },
  { value: 'deviations',         label: 'Deviations' },
]

const CONTRACT_TAB = { value: 'contract', label: 'Contract' }

export function StudyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { study, loading } = useStudy(id ?? '')
  const { investigators } = useInvestigators()
  const { role } = useAuth()
  const [activeTab, setActiveTab] = useState('visit-schedule')

  const canEdit = role === 'management'
  const tabs = canEdit ? [...BASE_TABS, CONTRACT_TAB] : BASE_TABS

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="glass" style={{ height: 32, width: 256 }} />
        <div className="glass" style={{ height: 128 }} />
      </div>
    )
  }

  if (!study) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
          Study not found.{' '}
          <button
            type="button"
            onClick={() => navigate('/studies')}
            style={{ color: 'var(--signal-good)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Back to studies
          </button>
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button
        onClick={() => navigate('/studies')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', padding: 0,
          fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer',
          alignSelf: 'flex-start',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        <ChevronLeft size={14} aria-hidden="true" />
        Studies
      </button>

      <StudyDetailHeader study={study} investigators={investigators} />

      <div>
        <HUDTabBar tabs={tabs} value={activeTab} onChange={setActiveTab} />
        <div style={{ paddingTop: 24 }}>
          {activeTab === 'visit-schedule'     && <VisitScheduleTab study={study} canEdit={canEdit} />}
          {activeTab === 'assessment-battery' && <AssessmentBatteryTab study={study} canEdit={canEdit} />}
          {activeTab === 'protocol'           && <ProtocolTab study={study} canEdit={canEdit} />}
          {activeTab === 'investigators'      && <InvestigatorsTab study={study} investigators={investigators} canEdit={canEdit} />}
          {activeTab === 'enrollment'         && <EnrollmentTab study={study} canEdit={canEdit} />}
          {activeTab === 'delegation-log'     && <DelegationLogTab studyId={study.id} investigators={investigators} canEdit={canEdit} />}
          {activeTab === 'deviations'         && <DeviationsTab studyId={study.id} canManage={canEdit} />}
          {activeTab === 'contract' && canEdit && <ContractTab study={study} canEdit={canEdit} />}
        </div>
      </div>
    </div>
  )
}
