import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  const mql = {
    matches: false, media: '', onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockReturnValue(mql) })
})

afterEach(() => { vi.unstubAllGlobals() })

vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Line: () => null, Bar: () => null, XAxis: () => null, YAxis: () => null,
  CartesianGrid: () => null, Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => null,
}))

vi.mock('@/hooks/useBoardSessions', () => ({ useBoardSessions: vi.fn() }))
vi.mock('@/hooks/useK2BoardToday', () => ({ useK2BoardToday: vi.fn() }))

import { useBoardSessions } from '@/hooks/useBoardSessions'
import { useK2BoardToday } from '@/hooks/useK2BoardToday'
import { Operations } from './Operations'
import type { BoardSession } from '@/types'

const mockUseBoardSessions = vi.mocked(useBoardSessions)
const mockUseK2BoardToday = vi.mocked(useK2BoardToday)

const emptyHistory = { sessions: [], loading: false, error: null, circuitOpen: false }
const emptyBoard = { entries: [], loading: false, error: null, circuitOpen: false, snapshotCount: 0 }

function makeSession(overrides: Partial<BoardSession> = {}): BoardSession {
  return {
    id: 'session-1',
    siteId: 'site-1',
    sessionDate: '2026-04-22',
    importedAt: '2026-04-22T12:00:00Z',
    importedBy: 'user-1',
    entryCount: 5,
    metrics: {
      totalScheduled: 10,
      arrivals: 8,
      completedVisits: 7,
      noShows: 2,
      avgVisitDurationMin: 90,
      byStudy: { 'Study A': { scheduled: 10, arrivals: 8, noShows: 2, avgDurationMin: 90 } },
      byInvestigator: { Wilson: { visits: 8 } },
    },
    entries: [],
    ...overrides,
  }
}

describe('Operations', () => {
  it('shows page heading', () => {
    mockUseBoardSessions.mockReturnValue(emptyHistory)
    mockUseK2BoardToday.mockReturnValue(emptyBoard)
    render(<Operations />)
    expect(screen.getByRole('heading', { name: /operations/i })).toBeInTheDocument()
  })

  it('shows empty state when no sessions imported', () => {
    mockUseBoardSessions.mockReturnValue(emptyHistory)
    mockUseK2BoardToday.mockReturnValue(emptyBoard)
    render(<Operations />)
    expect(screen.getByText(/No sessions imported/i)).toBeInTheDocument()
  })

  it('shows summary tiles when sessions exist', () => {
    mockUseBoardSessions.mockReturnValue({ sessions: [makeSession()], loading: false, error: null, circuitOpen: false })
    mockUseK2BoardToday.mockReturnValue(emptyBoard)
    render(<Operations />)
    expect(screen.getByText('Total Sessions')).toBeInTheDocument()
    expect(screen.getByText(/Avg No-Show Rate/i)).toBeInTheDocument()
    expect(screen.getByText('Avg Visit Duration')).toBeInTheDocument()
  })

  it('shows session log table with formatted date', () => {
    mockUseBoardSessions.mockReturnValue({ sessions: [makeSession({ sessionDate: '2026-04-22' })], loading: false, error: null, circuitOpen: false })
    mockUseK2BoardToday.mockReturnValue(emptyBoard)
    render(<Operations />)
    expect(screen.getByText('Apr 22')).toBeInTheDocument()
  })

  it('shows sessions error state', () => {
    mockUseBoardSessions.mockReturnValue({ sessions: [], loading: false, error: new Error('permission denied'), circuitOpen: false })
    mockUseK2BoardToday.mockReturnValue(emptyBoard)
    render(<Operations />)
    expect(screen.getByText(/permission denied/i)).toBeInTheDocument()
  })

  it('shows live empty state when no board entries', () => {
    mockUseBoardSessions.mockReturnValue(emptyHistory)
    mockUseK2BoardToday.mockReturnValue(emptyBoard)
    render(<Operations />)
    expect(screen.getByText(/No participants yet today/i)).toBeInTheDocument()
  })

  it('shows circuit breaker warning when board circuit is open', () => {
    mockUseBoardSessions.mockReturnValue(emptyHistory)
    mockUseK2BoardToday.mockReturnValue({ ...emptyBoard, circuitOpen: true })
    render(<Operations />)
    expect(screen.getByText(/Live subscription paused/i)).toBeInTheDocument()
  })

  it('shows live board error state', () => {
    mockUseBoardSessions.mockReturnValue(emptyHistory)
    mockUseK2BoardToday.mockReturnValue({ ...emptyBoard, error: new Error('k2 auth failed') })
    render(<Operations />)
    expect(screen.getByText(/k2 auth failed/i)).toBeInTheDocument()
  })
})
