import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  const mql = { matches: false, media: '', onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() } as unknown as MediaQueryList
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockReturnValue(mql) })
})
afterEach(() => {
  vi.unstubAllGlobals()
})

vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => null, YAxis: () => null, CartesianGrid: () => null,
  Tooltip: () => null, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => null,
}))
import { HUDBarChart } from './HUDBarChart'

describe('HUDBarChart', () => {
  it('renders a bar chart with provided data', () => {
    render(
      <HUDBarChart
        data={[{ name: 'A', value: 50 }, { name: 'B', value: 80 }]}
        xKey="name" yKey="value"
      />,
    )
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })
})
