import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { StudyTable } from '@/components/studies/StudyTable'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}))
import type { Study, Investigator } from '@/types'
import type { StudyFilterState } from '@/components/studies/StudyFilters'

const investigator: Investigator = {
  id: 'inv-1',
  name: 'Dr. Wilson',
  credentials: 'MD',
  role: 'PI',
  siteId: 'tampa',
  weeklyCapacityHours: 40,
  siteBaselinePct: 15,
  assignedStudies: [],
}

const study: Study = {
  id: 'study-1',
  name: 'Study Alpha',
  sponsor: 'Pharma Co',
  sponsorProtocolId: 'PC-001',
  therapeuticArea: 'Psychiatry',
  phase: 'Phase II',
  status: 'enrolling',
  siteId: 'tampa',
  piId: 'inv-1',
  assignedInvestigators: [{ investigatorId: 'inv-1', role: 'PI' }],
  targetEnrollment: 20,
  startDate: '2026-01-01',
  expectedEndDate: '2026-12-31',
  visitSchedule: [],
  assessmentBattery: {},
  adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
  parsedFromProtocol: false,
  enrollmentData: { prescreens: 5, screens: 4, randomizations: 3, active: 3, completions: 0 },
  statusHistory: [],
}

const noFilters: StudyFilterState = { status: 'all', therapeuticArea: '' }

const renderTable = (filters = noFilters) =>
  render(
    <MemoryRouter>
      <StudyTable
        studies={[study]}
        investigators={[investigator]}
        filters={filters}
        selectedIds={[]}
        onSelectChange={vi.fn()}
        onViewDetail={vi.fn()}
      />
    </MemoryRouter>,
  )

describe('StudyTable', () => {
  it('renders study name and sponsor', () => {
    renderTable()
    expect(screen.getByText('Study Alpha')).toBeInTheDocument()
    expect(screen.getByText('Pharma Co')).toBeInTheDocument()
  })

  it('renders PI name', () => {
    renderTable()
    expect(screen.getByText('Dr. Wilson')).toBeInTheDocument()
  })

  it('filters out studies that do not match status filter', () => {
    renderTable({ status: 'paused', therapeuticArea: '' })
    expect(screen.queryByText('Study Alpha')).not.toBeInTheDocument()
  })

  it('calls onViewDetail when row is clicked', async () => {
    const onViewDetail = vi.fn()
    render(
      <MemoryRouter>
        <StudyTable
          studies={[study]}
          investigators={[investigator]}
          filters={noFilters}
          selectedIds={[]}
          onSelectChange={vi.fn()}
          onViewDetail={onViewDetail}
        />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByText('Study Alpha'))
    expect(onViewDetail).toHaveBeenCalledWith('study-1')
  })

  it('shows enrollment percentage', () => {
    renderTable()
    expect(screen.getByText('15%')).toBeInTheDocument()
  })
})
