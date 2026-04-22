import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('renders message', () => {
    render(<ErrorState message="Kaboom" />)
    expect(screen.getByText(/kaboom/i)).toBeInTheDocument()
  })
  it('invokes onRetry when retry button clicked', async () => {
    const onRetry = vi.fn()
    render(<ErrorState message="fail" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
  it('renders URLs in the message as external links', () => {
    render(<ErrorState message="Index needed: https://console.firebase.google.com/abc" />)
    const link = screen.getByRole('link', { name: /console\.firebase\.google\.com/i })
    expect(link).toHaveAttribute('href', 'https://console.firebase.google.com/abc')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })
})
