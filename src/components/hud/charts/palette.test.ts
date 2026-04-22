import { describe, it, expect } from 'vitest'
import { chartPalette } from './palette'

describe('chartPalette.signalBar', () => {
  it('returns mint under 75', () => {
    expect(chartPalette.signalBar(50)).toContain('162')
  })
  it('returns amber at 75..89', () => {
    expect(chartPalette.signalBar(80)).toContain('82')
  })
  it('returns coral at 90+', () => {
    expect(chartPalette.signalBar(95)).toContain('13')
  })
  it('boundary at 75 uses amber', () => {
    expect(chartPalette.signalBar(75)).toContain('82')
  })
  it('boundary at 90 uses coral', () => {
    expect(chartPalette.signalBar(90)).toContain('13')
  })
})
