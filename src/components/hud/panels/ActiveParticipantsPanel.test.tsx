import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
vi.mock('../charts/HUDAreaChart', () => ({
  HUDAreaChart: () => <div data-testid="sparkline" />,
}))
import { ActiveParticipantsPanel } from './ActiveParticipantsPanel'

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(cb, 16) as unknown as number)
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id as unknown as NodeJS.Timeout))
  const mql = { matches: true, media: '', onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() } as unknown as MediaQueryList
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockReturnValue(mql) })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('ActiveParticipantsPanel', () => {
  it('renders total participant count and study subtitle', () => {
    render(<ActiveParticipantsPanel total={247} activeStudiesCount={12} snapshots={[]} />)
    expect(screen.getByText('247')).toBeInTheDocument()
    expect(screen.getByText(/across 12 studies/i)).toBeInTheDocument()
  })
  it('renders the sparkline when at least 2 snapshots exist', () => {
    render(
      <ActiveParticipantsPanel
        total={10}
        activeStudiesCount={3}
        snapshots={[
          { weekStart: '2026-04-06', value: 5 },
          { weekStart: '2026-04-13', value: 8 },
          { weekStart: '2026-04-20', value: 10 },
        ]}
      />,
    )
    expect(screen.getByTestId('sparkline')).toBeInTheDocument()
  })
  it('shows trend chip when delta available', () => {
    render(
      <ActiveParticipantsPanel
        total={10}
        activeStudiesCount={3}
        snapshots={[
          { weekStart: '2026-03-23', value: 2 },
          { weekStart: '2026-04-20', value: 10 },
        ]}
      />,
    )
    expect(screen.getByText(/\+8 this month/i)).toBeInTheDocument()
  })
  it('renders empty state when total is zero', () => {
    render(<ActiveParticipantsPanel total={0} activeStudiesCount={0} snapshots={[]} />)
    expect(screen.getByText(/no participants yet/i)).toBeInTheDocument()
  })
})
