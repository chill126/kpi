import { FORECAST_CONFIG } from '../forecast-config'

describe('FORECAST_CONFIG', () => {
  it('has all required numeric constants', () => {
    expect(typeof FORECAST_CONFIG.WARNING_THRESHOLD_PCT).toBe('number')
    expect(typeof FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT).toBe('number')
    expect(typeof FORECAST_CONFIG.ALERT_LOOKAHEAD_WEEKS).toBe('number')
    expect(typeof FORECAST_CONFIG.FORECAST_WEEKS).toBe('number')
    expect(typeof FORECAST_CONFIG.SIMULATOR_WEEKS).toBe('number')
  })

  it('warning threshold is lower than critical', () => {
    expect(FORECAST_CONFIG.WARNING_THRESHOLD_PCT).toBeLessThan(
      FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT,
    )
  })

  it('ramp checkpoints are in ascending order', () => {
    const sorted = [...FORECAST_CONFIG.RAMP_CHECKPOINTS].sort((a, b) => a - b)
    expect(FORECAST_CONFIG.RAMP_CHECKPOINTS).toEqual(sorted)
  })
})
