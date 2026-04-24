import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Import } from '@/pages/management/Import'
import type { AppUser, Import as ImportRecord, Investigator, Study } from '@/types'

vi.mock('@/hooks/useImports', () => ({ useImports: vi.fn() }))
vi.mock('@/hooks/useStudies', () => ({ useStudies: vi.fn() }))
vi.mock('@/hooks/useInvestigators', () => ({ useInvestigators: vi.fn() }))
vi.mock('@/hooks/useSite', () => ({ useSite: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))

import * as importsModule from '@/hooks/useImports'
import * as studiesModule from '@/hooks/useStudies'
import * as investigatorsModule from '@/hooks/useInvestigators'
import * as siteModule from '@/hooks/useSite'
import * as authModule from '@/hooks/useAuth'

function makeStudy(overrides: Partial<Study> = {}): Study {
  return {
    id: 'study-1',
    name: 'Study Alpha',
    sponsor: 'Pharma Co',
    sponsorProtocolId: 'PC-001',
    therapeuticArea: 'Psychiatry',
    phase: 'Phase II',
    status: 'enrolling',
    siteId: 'tampa',
    piId: 'inv-1',
    assignedInvestigators: [],
    targetEnrollment: 20,
    startDate: '2026-01-01',
    expectedEndDate: '2026-12-31',
    visitSchedule: [],
    assessmentBattery: {},
    adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
    parsedFromProtocol: false,
    enrollmentData: {
      prescreens: 0,
      screens: 0,
      randomizations: 0,
      active: 0,
      completions: 0,
    },
    statusHistory: [],
    ...overrides,
  }
}

function makeInvestigator(overrides: Partial<Investigator> = {}): Investigator {
  return {
    id: 'inv-1',
    name: 'Dr. Wilson',
    credentials: 'MD',
    role: 'PI',
    siteId: 'tampa',
    weeklyCapacityHours: 40,
    siteBaselinePct: 15,
    assignedStudies: [],
    ...overrides,
  }
}

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    uid: 'user-1',
    email: 'user1@example.com',
    displayName: 'Alice Example',
    role: 'management',
    siteId: 'tampa',
    assignedStudies: [],
    ...overrides,
  }
}

function makeImport(overrides: Partial<ImportRecord> = {}): ImportRecord {
  return {
    id: 'import-1',
    siteId: 'site-1',
    type: 'clinical_conductor',
    uploadedBy: 'Alice Example',
    uploadedAt: '2026-04-15T10:30:00.000Z',
    rowCount: 42,
    status: 'complete',
    mappingUsed: {},
    errors: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(importsModule.useImports).mockReturnValue({
    imports: [],
    loading: false,
    error: null,
  })
  vi.mocked(studiesModule.useStudies).mockReturnValue({
    studies: [makeStudy()],
    loading: false,
    error: null,
  })
  vi.mocked(investigatorsModule.useInvestigators).mockReturnValue({
    investigators: [makeInvestigator()],
    loading: false,
    error: null,
  })
  vi.mocked(siteModule.useSite).mockReturnValue({
    siteId: 'tampa',
    setActiveSite: vi.fn(),
  })
  vi.mocked(authModule.useAuth).mockReturnValue({
    user: makeUser(),
    role: 'management',
    loading: false,
  })
})

describe('Import', () => {
  it('renders the page heading', () => {
    render(<Import />)
    expect(screen.getByRole('heading', { name: /^import$/i })).toBeInTheDocument()
  })

  it('renders all import type cards', () => {
    render(<Import />)
    expect(screen.getByText('Clinical Conductor')).toBeInTheDocument()
    expect(screen.getByText('Advarra e-Reg')).toBeInTheDocument()
    expect(screen.getByText('Enrollment Numbers')).toBeInTheDocument()
    expect(screen.getByText('Enrollment Snapshots')).toBeInTheDocument()
    expect(screen.getByText('Protocol PDF')).toBeInTheDocument()
  })

  it('shows "No imports yet" when history is empty', () => {
    render(<Import />)
    expect(screen.getByText(/no imports yet/i)).toBeInTheDocument()
  })

  it('shows import rows when history exists', () => {
    vi.mocked(importsModule.useImports).mockReturnValue({
      imports: [
        makeImport(),
        makeImport({
          id: 'import-2',
          type: 'advarra_ereg',
          uploadedBy: 'Bob Tester',
          rowCount: 7,
          status: 'error',
          errors: ['Row 3: bad data'],
        }),
      ],
      loading: false,
      error: null,
    })
    render(<Import />)
    expect(screen.getByText('Alice Example')).toBeInTheDocument()
    expect(screen.getByText('Bob Tester')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText(/1 issue/i)).toBeInTheDocument()
  })

  it('opens the Clinical Conductor dialog when its Import button is clicked', async () => {
    const user = userEvent.setup()
    render(<Import />)
    const ccCard = screen.getByText('Clinical Conductor').closest('div')
    const button = ccCard?.parentElement?.parentElement?.querySelector('button')
    // Prefer a more robust lookup: find all Import buttons, click the first one (CC is first card).
    const importButtons = screen.getAllByRole('button', { name: /^import$/i })
    await user.click(importButtons[0])
    expect(
      screen.getByRole('dialog', { name: /import clinical conductor visits/i }),
    ).toBeInTheDocument()
    // silence unused-var linters
    void button
    void ccCard
  })

  it('opens the Protocol PDF dialog with a study selector', async () => {
    const user = userEvent.setup()
    render(<Import />)
    const importButtons = screen.getAllByRole('button', { name: /^import$/i })
    // Protocol PDF is the 5th card (Enrollment Numbers added at position 3).
    await user.click(importButtons[4])
    const dialog = await screen.findByRole('dialog', { name: /import protocol pdf/i })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByLabelText(/select study/i)).toBeInTheDocument()
  })
})
