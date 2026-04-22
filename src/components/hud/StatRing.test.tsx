import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatRing } from './StatRing'

describe('StatRing', () => {
  it('renders the percentage as inner text', () => {
    render(<StatRing value={67} label="Capacity" />)
    expect(screen.getByText('67%')).toBeInTheDocument()
    expect(screen.getByText(/capacity/i)).toBeInTheDocument()
  })
  it('clamps value to 0..100', () => {
    render(<StatRing value={142} label="x" />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})
