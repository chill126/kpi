import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Tile } from './Tile'

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(cb, 16) as unknown as number)
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id as unknown as NodeJS.Timeout))
  const mql = { matches: true, media: '', onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() } as unknown as MediaQueryList
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql))
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockReturnValue(mql) })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Tile', () => {
  it('renders label, value, suffix, sub', () => {
    render(<Tile label="Capacity" value={67} suffix="%" sub="avg" />)
    expect(screen.getByText('Capacity')).toBeInTheDocument()
    expect(screen.getByText('67')).toBeInTheDocument()
    expect(screen.getByText('%')).toBeInTheDocument()
    expect(screen.getByText('avg')).toBeInTheDocument()
  })
  it('renders trend chip when trend prop present', () => {
    render(<Tile label="Cap" value={1} trend={{ delta: '+4%', direction: 'up' }} />)
    expect(screen.getByText('+4%')).toBeInTheDocument()
  })
  it('applies data-variant="hero" when variant is hero', () => {
    render(<Tile label="Cap" value={1} variant="hero" data-testid="t" />)
    expect(screen.getByTestId('t')).toHaveAttribute('data-variant', 'hero')
  })
  it('sets aria-label composed from fields', () => {
    render(<Tile label="Capacity" value={67} suffix="%" sub="avg utilization" data-testid="t" />)
    expect(screen.getByTestId('t')).toHaveAttribute(
      'aria-label',
      'Capacity: 67%, avg utilization',
    )
  })
  it('prepends ⚠ glyph in the label when signal is alert', () => {
    render(<Tile label="Capacity" value={94} signal="alert" />)
    expect(screen.getByText(/⚠\s+Capacity/)).toBeInTheDocument()
  })
  it('prepends ▲ glyph in the label when signal is warn', () => {
    render(<Tile label="Capacity" value={80} signal="warn" />)
    expect(screen.getByText(/▲\s+Capacity/)).toBeInTheDocument()
  })
  it('renders string values literally without count-up animation', () => {
    render(<Tile label="Status" value="—" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
  it('tints the trend chip as alert when direction is down', () => {
    render(<Tile label="Cap" value={1} trend={{ delta: '-3%', direction: 'down' }} />)
    expect(screen.getByText('-3%').closest('[data-signal]'))
      .toHaveAttribute('data-signal', 'alert')
  })
})
