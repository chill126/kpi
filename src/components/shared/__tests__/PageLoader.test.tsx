import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PageLoader } from '../PageLoader'

describe('PageLoader', () => {
  it('renders a loading skeleton', () => {
    render(<PageLoader />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has accessible label', () => {
    render(<PageLoader />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading page')
  })
})
