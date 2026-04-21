import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MyProfile } from '@/pages/staff/MyProfile'
import type { AppUser, Study } from '@/types'

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('@/hooks/useStudies', () => ({ useStudies: vi.fn() }))
vi.mock('@/lib/users', () => ({ updateUser: vi.fn().mockResolvedValue(undefined) }))

import * as authHook from '@/hooks/useAuth'
import * as studiesHook from '@/hooks/useStudies'
import * as usersLib from '@/lib/users'

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    uid: 'user-1',
    email: 'staff@example.com',
    displayName: 'Alice Staff',
    role: 'staff',
    siteId: 'site-1',
    assignedStudies: ['study-1'],
    ...overrides,
  }
}

function makeStudy(overrides: Partial<Study> = {}): Study {
  return {
    id: 'study-1',
    name: 'Study Alpha',
    sponsor: 'Pharma',
    sponsorProtocolId: 'PC-001',
    therapeuticArea: 'Oncology',
    phase: 'Phase II',
    status: 'enrolling',
    siteId: 'site-1',
    piId: 'inv-1',
    assignedInvestigators: [],
    targetEnrollment: 20,
    startDate: '2026-01-01',
    expectedEndDate: '2026-12-31',
    visitSchedule: [],
    assessmentBattery: {},
    adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
    parsedFromProtocol: false,
    enrollmentData: { prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0 },
    statusHistory: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(authHook.useAuth).mockReturnValue({
    user: makeUser(),
    role: 'staff',
    loading: false,
  } as ReturnType<typeof authHook.useAuth>)
  vi.mocked(studiesHook.useStudies).mockReturnValue({
    studies: [makeStudy()],
    loading: false,
    error: null,
  })
})

describe('MyProfile', () => {
  it('renders profile heading', () => {
    render(<MyProfile />)
    expect(screen.getByRole('heading', { name: /my profile/i })).toBeInTheDocument()
  })

  it('shows user display name and email', () => {
    render(<MyProfile />)
    expect(screen.getByLabelText(/display name/i)).toHaveValue('Alice Staff')
    expect(screen.getByText('staff@example.com')).toBeInTheDocument()
  })

  it('shows role badge', () => {
    render(<MyProfile />)
    expect(screen.getByText('staff')).toBeInTheDocument()
  })

  it('shows assigned studies', () => {
    render(<MyProfile />)
    expect(screen.getByText('Study Alpha')).toBeInTheDocument()
  })

  it('shows empty message when no assigned studies', () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: makeUser({ assignedStudies: [] }),
      role: 'staff',
      loading: false,
    } as ReturnType<typeof authHook.useAuth>)
    render(<MyProfile />)
    expect(screen.getByText(/no studies assigned/i)).toBeInTheDocument()
  })

  it('disables save button when display name unchanged', () => {
    render(<MyProfile />)
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
  })

  it('enables save button when display name changed', async () => {
    const user = userEvent.setup()
    render(<MyProfile />)
    const input = screen.getByLabelText(/display name/i)
    await user.clear(input)
    await user.type(input, 'Alice Renamed')
    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled()
  })

  it('calls updateUser with trimmed display name', async () => {
    const user = userEvent.setup()
    render(<MyProfile />)
    const input = screen.getByLabelText(/display name/i)
    await user.clear(input)
    await user.type(input, 'Alice Renamed')
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(usersLib.updateUser).toHaveBeenCalledWith('user-1', {
      displayName: 'Alice Renamed',
    })
  })

  it('shows Saved confirmation after successful save', async () => {
    const user = userEvent.setup()
    render(<MyProfile />)
    const input = screen.getByLabelText(/display name/i)
    await user.clear(input)
    await user.type(input, 'Alice New')
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText(/saved!/i)).toBeInTheDocument()
  })
})
