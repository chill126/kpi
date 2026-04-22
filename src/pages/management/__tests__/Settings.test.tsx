import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Settings } from '@/pages/management/Settings'
import type { AppUser, Site, Study } from '@/types'

vi.mock('@/hooks/useSite', () => ({ useSite: vi.fn() }))
vi.mock('@/hooks/useSites', () => ({ useSites: vi.fn() }))
vi.mock('@/hooks/useSiteUsers', () => ({ useSiteUsers: vi.fn() }))
vi.mock('@/hooks/useStudies', () => ({ useStudies: vi.fn() }))
vi.mock('@/lib/sites', () => ({ updateSite: vi.fn(), createSite: vi.fn() }))
vi.mock('@/lib/users', () => ({ updateUser: vi.fn() }))

import * as siteHook from '@/hooks/useSite'
import * as sitesHook from '@/hooks/useSites'
import * as siteUsersHook from '@/hooks/useSiteUsers'
import * as studiesHook from '@/hooks/useStudies'
import * as sitesLib from '@/lib/sites'
import * as usersLib from '@/lib/users'

function makeSite(overrides: Partial<Site> = {}): Site {
  return {
    id: 'tampa',
    name: 'Tampa Research',
    location: 'Tampa, FL',
    active: true,
    timezone: 'America/New_York',
    ...overrides,
  }
}

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    uid: 'user-1',
    email: 'user1@example.com',
    displayName: 'Alice Example',
    role: 'staff',
    siteId: 'tampa',
    assignedStudies: [],
    ...overrides,
  }
}

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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(siteHook.useSite).mockReturnValue({
    siteId: 'tampa',
    setActiveSite: vi.fn(),
  })
  vi.mocked(sitesHook.useSites).mockReturnValue({
    sites: [makeSite()],
    loading: false,
    error: null,
  })
  vi.mocked(siteUsersHook.useSiteUsers).mockReturnValue({
    users: [makeUser()],
    loading: false,
    error: null,
  })
  vi.mocked(studiesHook.useStudies).mockReturnValue({
    studies: [makeStudy()],
    loading: false,
    error: null,
  })
})

describe('Settings', () => {
  it('renders both tabs', () => {
    render(<Settings />)
    expect(
      screen.getByRole('tab', { name: /site configuration/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: /user management/i }),
    ).toBeInTheDocument()
  })

  it('shows site rows in the Site Configuration tab', () => {
    render(<Settings />)
    expect(screen.getByText('Tampa Research')).toBeInTheDocument()
    expect(screen.getByText('Tampa, FL')).toBeInTheDocument()
  })

  it('opens edit dialog pre-populated when site Edit is clicked', async () => {
    const user = userEvent.setup()
    render(<Settings />)
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(
      screen.getByRole('dialog', { name: /edit site/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/site name/i)).toHaveValue('Tampa Research')
    expect(screen.getByLabelText(/location/i)).toHaveValue('Tampa, FL')
    expect(screen.getByLabelText(/timezone/i)).toHaveValue('America/New_York')
    expect(screen.getByLabelText(/active/i)).toBeChecked()
  })

  it('disables save button when edit form is not dirty', async () => {
    const user = userEvent.setup()
    render(<Settings />)
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(
      screen.getByRole('button', { name: /save changes/i }),
    ).toBeDisabled()
  })

  it('enables save button when edit form changes', async () => {
    const user = userEvent.setup()
    render(<Settings />)
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    await user.clear(screen.getByLabelText(/site name/i))
    await user.type(screen.getByLabelText(/site name/i), 'New Name')
    expect(
      screen.getByRole('button', { name: /save changes/i }),
    ).toBeEnabled()
  })

  it('calls updateSite with correct data on save', async () => {
    const user = userEvent.setup()
    vi.mocked(sitesLib.updateSite).mockResolvedValue(undefined)
    render(<Settings />)
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    await user.clear(screen.getByLabelText(/location/i))
    await user.type(screen.getByLabelText(/location/i), 'Orlando, FL')
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(sitesLib.updateSite).toHaveBeenCalledWith('tampa', {
      name: 'Tampa Research',
      location: 'Orlando, FL',
      timezone: 'America/New_York',
      active: true,
    })
  })

  it('renders user rows in the User Management tab', async () => {
    const user = userEvent.setup()
    render(<Settings />)
    await user.click(screen.getByRole('tab', { name: /user management/i }))
    expect(screen.getByText('Alice Example')).toBeInTheDocument()
    expect(screen.getByText('user1@example.com')).toBeInTheDocument()
  })

  it('opens edit dialog when user Edit is clicked', async () => {
    const user = userEvent.setup()
    render(<Settings />)
    await user.click(screen.getByRole('tab', { name: /user management/i }))
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(
      screen.getByRole('dialog', { name: /edit user/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/display name/i)).toHaveValue('Alice Example')
  })

  it('calls updateUser with correct data on user save', async () => {
    const user = userEvent.setup()
    vi.mocked(usersLib.updateUser).mockResolvedValue(undefined)
    render(<Settings />)
    await user.click(screen.getByRole('tab', { name: /user management/i }))
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    await user.clear(screen.getByLabelText(/display name/i))
    await user.type(screen.getByLabelText(/display name/i), 'Alice Renamed')
    await user.click(screen.getByLabelText('Study Alpha'))
    await user.click(screen.getByRole('button', { name: /^save$/i }))
    expect(usersLib.updateUser).toHaveBeenCalledWith('user-1', {
      displayName: 'Alice Renamed',
      role: 'staff',
      assignedStudies: ['study-1'],
    })
  })
})
