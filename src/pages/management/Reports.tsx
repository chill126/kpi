import { useState } from 'react'
import { HUDTabBar } from '@/components/hud/TabBar'
import { SiteSummaryTab } from '@/components/reports/SiteSummaryTab'
import { EnrollmentTab } from '@/components/reports/EnrollmentTab'
import { DeviationsTab } from '@/components/reports/DeviationsTab'
import { VisitQualityTab } from '@/components/reports/VisitQualityTab'
import { InvestigatorTab } from '@/components/reports/InvestigatorTab'

const TABS = [
  { value: 'summary',       label: 'Site Summary' },
  { value: 'enrollment',    label: 'Enrollment' },
  { value: 'deviations',    label: 'Deviations' },
  { value: 'visit-quality', label: 'Visit Quality' },
  { value: 'investigator',  label: 'Investigator' },
]

export function Reports() {
  const [tab, setTab] = useState('summary')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
          Reports
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
          Site performance analytics and exportable reports.
        </p>
      </div>

      <HUDTabBar tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'summary'       && <SiteSummaryTab />}
      {tab === 'enrollment'    && <EnrollmentTab />}
      {tab === 'deviations'    && <DeviationsTab />}
      {tab === 'visit-quality' && <VisitQualityTab />}
      {tab === 'investigator'  && <InvestigatorTab />}
    </div>
  )
}
