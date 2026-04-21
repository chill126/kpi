import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TrendChip } from './TrendChip'

describe('TrendChip', () => {
  it('renders label text', () => {
    render(<TrendChip signal="good">+4%</TrendChip>)
    expect(screen.getByText('+4%')).toBeInTheDocument()
  })
  it('applies signal data attribute', () => {
    render(<TrendChip signal="alert">-2%</TrendChip>)
    expect(screen.getByText('-2%').closest('[data-signal]'))
      .toHaveAttribute('data-signal', 'alert')
  })
})
