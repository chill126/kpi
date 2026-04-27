import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Reports } from '@/pages/management/Reports'
import type { Investigator } from '@/types'

vi.mock('@/hooks/useStudies', () => ({ useStudies: vi.fn() }))
vi.mock('@/hooks/useAllProtocolDeviations', () => ({ useAllProtocolDeviations: vi.fn() }))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: vi.fn() }))
vi.mock('@/hooks/useInvestigators', () => ({ useInvestigators: vi.fn() }))
vi.mock('@/hooks/useSiteAssessments', () => ({ useSiteAssessments: vi.fn() }))
vi.mock('@/hooks/useAllScreenFailures', () => ({ useAllScreenFailures: vi.fn() }))

import * as studiesModule from '@/hooks/useStudies'
import * as deviationsModule from '@/hooks/useAllProtocolDeviations'
import * as siteVisitsModule from '@/hooks/useSiteVisits'
import * as investigatorsModule from '@/hooks/useInvestigators'
import * as siteAssessmentsModule from '@/hooks/useSiteAssessments'
import * as screenFailuresModule from '@/hooks/useAllScreenFailures'

const mockInvestigator: Investigator = {
  id: 'inv-1', name: 'Dr. Wilson', credentials: 'MD', role: 'PI',
  siteId: 'tampa', weeklyCapacityHours: 40, siteBaselinePct: 15, assignedStudies: [],
}

Object.defineProperty(globalThis, 'URL', {
  value: { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() },
  writable: true,
})

beforeEach(() => {
  vi.clearAllMocks()
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
  vi.mocked(studiesModule.useStudies).mockReturnValue({ studies: [], loading: false, error: null })
  vi.mocked(deviationsModule.useAllProtocolDeviations).mockReturnValue({ deviations: [], loading: false, error: null })
  vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits: [], loading: false, error: null })
  vi.mocked(investigatorsModule.useInvestigators).mockReturnValue({ investigators: [mockInvestigator], loading: false, error: null })
  vi.mocked(siteAssessmentsModule.useSiteAssessments).mockReturnValue({ assessments: [], loading: false, error: null })
  vi.mocked(screenFailuresModule.useAllScreenFailures).mockReturnValue({ failures: [], loading: false, error: null })
})

describe('Reports', () => {
  it('renders the page heading', () => {
    render(<MemoryRouter><Reports /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /reports/i })).toBeInTheDocument()
  })

  it('renders all 5 tabs', () => {
    render(<MemoryRouter><Reports /></MemoryRouter>)
    expect(screen.getByRole('tab', { name: /site summary/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /enrollment/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /deviations/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /visit quality/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /investigator/i })).toBeInTheDocument()
  })

  it('shows investigator heatmap on Investigator tab', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><Reports /></MemoryRouter>)
    await user.click(screen.getByRole('tab', { name: /investigator/i }))
    expect(screen.getByText('Dr. Wilson')).toBeInTheDocument()
  })

  it('shows Download CSV button on Investigator tab', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><Reports /></MemoryRouter>)
    await user.click(screen.getByRole('tab', { name: /investigator/i }))
    expect(screen.getByRole('button', { name: /download csv/i })).toBeInTheDocument()
  })

  it('clicking Download CSV triggers a file download', async () => {
    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi.spyOn(document, 'createElement')
    const mockAnchor = { href: '', download: '', click: vi.fn(), style: { display: '' } }
    createElementSpy.mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor as unknown as HTMLElement
      return originalCreateElement(tag) as HTMLElement
    })

    const user = userEvent.setup()
    render(<MemoryRouter><Reports /></MemoryRouter>)
    await user.click(screen.getByRole('tab', { name: /investigator/i }))
    await user.click(screen.getByRole('button', { name: /download csv/i }))

    expect(mockAnchor.click).toHaveBeenCalled()
    createElementSpy.mockRestore()
  })
})
