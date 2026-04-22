import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusDot } from './StatusDot'

describe('StatusDot', () => {
  it('renders with good signal by default', () => {
    render(<StatusDot data-testid="dot" />)
    const dot = screen.getByTestId('dot')
    expect(dot).toHaveAttribute('data-signal', 'good')
  })

  it('applies alert signal via prop', () => {
    render(<StatusDot signal="alert" data-testid="dot" />)
    expect(screen.getByTestId('dot')).toHaveAttribute('data-signal', 'alert')
  })

  it('sets pulse data attribute when prop is true', () => {
    render(<StatusDot pulse data-testid="dot" />)
    expect(screen.getByTestId('dot')).toHaveAttribute('data-pulse', 'true')
  })
})
