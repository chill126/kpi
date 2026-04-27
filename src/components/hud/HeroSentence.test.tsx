import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { HeroSentence, heroLine } from './HeroSentence'

describe('heroLine', () => {
  it('returns "operating smoothly" with 0 near-cap', () => {
    const r = heroLine([50, 60, 70])
    expect(r.emphasis).toBe('operating smoothly')
    expect(r.emphasisSignal).toBe('good')
  })
  it('flags single near-cap', () => {
    const r = heroLine([60, 80])
    expect(r.suffix).toMatch(/1 investigator near capacity/)
    expect(r.emphasisSignal).toBe('good')
  })
  it('says running hot at 3+ near-cap', () => {
    const r = heroLine([80, 81, 82])
    expect(r.prefix).toMatch(/running hot/i)
    expect(r.emphasisSignal).toBe('warn')
  })
  it('raises attention when any at-capacity', () => {
    const r = heroLine([92])
    expect(r.prefix.toLowerCase()).toContain('attention')
    expect(r.emphasis).toMatch(/at capacity/i)
    expect(r.emphasisSignal).toBe('alert')
  })
})

describe('HeroSentence', () => {
  it('renders greeting and status sentence', () => {
    render(<HeroSentence firstName="Chris" utilizations={[50, 60]} />)
    expect(screen.getByText(/good morning, chris/i)).toBeInTheDocument()
    expect(screen.getByText(/operating smoothly/i)).toBeInTheDocument()
  })
})
