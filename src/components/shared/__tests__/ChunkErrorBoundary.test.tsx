import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { ChunkErrorBoundary } from '../ChunkErrorBoundary'

const ThrowingComponent = () => {
  throw new Error('ChunkLoadError: Loading chunk failed')
}

describe('ChunkErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ChunkErrorBoundary>
        <div>page content</div>
      </ChunkErrorBoundary>
    )
    expect(screen.getByText('page content')).toBeInTheDocument()
  })

  it('shows error UI when a child throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ChunkErrorBoundary>
        <ThrowingComponent />
      </ChunkErrorBoundary>
    )
    expect(screen.getByText('Failed to load page.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    consoleSpy.mockRestore()
  })
})
