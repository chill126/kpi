import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CapacityAlertSummary } from '../CapacityAlertSummary'
import type { Investigator, Visit } from '@/types'

function makeInv(id: string, name: string): Investigator {
  return {
    id, name, credentials: 'MD', role: 'PI',
    siteId: 'tampa', weeklyCapacityHours: 8, siteBaselinePct: 0, assignedStudies: [],
  }
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
)

describe('CapacityAlertSummary', () => {
  it('renders nothing when no investigators are near capacity', () => {
    const { container } = render(
      <CapacityAlertSummary investigators={[makeInv('i1', 'Dr. A')]} visits={[]} assessments={[]} />,
      { wrapper },
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows alert count and link when investigators approach threshold', () => {
    const now = new Date()
    const visits: Visit[] = Array.from({ length: 4 }, (_, i) => {
      const d = new Date(now)
      d.setUTCDate(now.getUTCDate() - i * 7 + 1)
      return {
        id: `v${i}`, participantId: 'p1', studyId: 's1',
        investigatorId: 'i1', siteId: 'tampa', visitType: 'W1',
        scheduledDate: d.toISOString().split('T')[0],
        completedDate: d.toISOString().split('T')[0],
        status: 'completed' as const, durationMinutes: 380,
        actualDurationMinutes: 380, source: 'manual' as const,
      }
    })
    render(
      <CapacityAlertSummary investigators={[makeInv('i1', 'Dr. A')]} visits={visits} assessments={[]} />,
      { wrapper },
    )
    expect(screen.getByText(/forecast/i)).toBeInTheDocument()
  })
})
