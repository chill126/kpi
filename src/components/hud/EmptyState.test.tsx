import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders title and body', () => {
    render(<EmptyState title="Nothing here" body="Add something." />)
    expect(screen.getByRole('heading', { name: /nothing here/i })).toBeInTheDocument()
    expect(screen.getByText(/add something/i)).toBeInTheDocument()
  })
  it('renders optional action', () => {
    render(<EmptyState title="Empty" action={<button>Do it</button>} />)
    expect(screen.getByRole('button', { name: /do it/i })).toBeInTheDocument()
  })
})
