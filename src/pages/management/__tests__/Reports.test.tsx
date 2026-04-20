import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Reports } from '@/pages/management/Reports'
import type { Investigator } from '@/types'

vi.mock('@/hooks/useInvestigators', () => ({ useInvestigators: vi.fn() }))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: vi.fn() }))
vi.mock('@/hooks/useSiteAssessments', () => ({ useSiteAssessments: vi.fn() }))

import * as investigatorsModule from '@/hooks/useInvestigators'
import * as siteVisitsModule from '@/hooks/useSiteVisits'
import * as siteAssessmentsModule from '@/hooks/useSiteAssessments'

const mockInvestigator: Investigator = {
  id: 'inv-1', name: 'Dr. Wilson', credentials: 'MD', role: 'PI',
  siteId: 'tampa', weeklyCapacityHours: 40, siteBaselinePct: 15, assignedStudies: [],
}

// Mock URL.createObjectURL and revokeObjectURL for CSV download test
Object.defineProperty(globalThis, 'URL', {
  value: { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() },
  writable: true,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(investigatorsModule.useInvestigators).mockReturnValue({ investigators: [mockInvestigator], loading: false, error: null })
  vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits: [], loading: false, error: null })
  vi.mocked(siteAssessmentsModule.useSiteAssessments).mockReturnValue({ assessments: [], loading: false, error: null })
})

describe('Reports', () => {
  it('renders the page heading', () => {
    render(<Reports />)
    expect(screen.getByRole('heading', { name: /reports/i })).toBeInTheDocument()
  })

  it('renders investigator names in the table', () => {
    render(<Reports />)
    expect(screen.getByText('Dr. Wilson')).toBeInTheDocument()
  })

  it('renders a Download CSV button', () => {
    render(<Reports />)
    expect(screen.getByRole('button', { name: /download csv/i })).toBeInTheDocument()
  })

  it('clicking Download CSV triggers a file download', async () => {
    // Spy on document.createElement to intercept the anchor click
    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi.spyOn(document, 'createElement')
    const mockAnchor = { href: '', download: '', click: vi.fn(), style: { display: '' } }
    createElementSpy.mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor as unknown as HTMLElement
      return originalCreateElement(tag) as HTMLElement
    })

    render(<Reports />)
    await userEvent.click(screen.getByRole('button', { name: /download csv/i }))

    expect(mockAnchor.click).toHaveBeenCalled()
    createElementSpy.mockRestore()
  })
})
