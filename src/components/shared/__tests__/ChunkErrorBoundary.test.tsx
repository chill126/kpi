import { render, screen } from '@testing-library/react'
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import { ChunkErrorBoundary } from '../ChunkErrorBoundary'

const ThrowingComponent = ({ message }: { message: string }) => {
  throw new Error(message)
}

describe('ChunkErrorBoundary', () => {
  let reloadSpy: ReturnType<typeof vi.fn>
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    sessionStorage.clear()
    reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, reload: reloadSpy },
    })
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('renders children when no error', () => {
    render(
      <ChunkErrorBoundary>
        <div>page content</div>
      </ChunkErrorBoundary>,
    )
    expect(screen.getByText('page content')).toBeInTheDocument()
  })

  it('auto-reloads once when a chunk-load error is caught', () => {
    render(
      <ChunkErrorBoundary>
        <ThrowingComponent message="ChunkLoadError: Loading chunk failed" />
      </ChunkErrorBoundary>,
    )
    expect(reloadSpy).toHaveBeenCalledOnce()
    expect(sessionStorage.getItem('k2.chunk-reload-attempt')).toBe('1')
    expect(screen.getByText(/reloading to fetch the latest version/i)).toBeInTheDocument()
  })

  it('does not reload a second time within the same session for a chunk-load error', () => {
    sessionStorage.setItem('k2.chunk-reload-attempt', '1')
    render(
      <ChunkErrorBoundary>
        <ThrowingComponent message="Failed to fetch dynamically imported module: https://example.com/chunk-abc.js" />
      </ChunkErrorBoundary>,
    )
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('shows the manual Reload fallback for non-chunk errors without auto-reloading', () => {
    render(
      <ChunkErrorBoundary>
        <ThrowingComponent message="Unrelated crash" />
      </ChunkErrorBoundary>,
    )
    expect(reloadSpy).not.toHaveBeenCalled()
    expect(screen.getByText('Failed to load page.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()
  })
})
