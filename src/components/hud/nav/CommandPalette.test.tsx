import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { CommandPalette } from './CommandPalette'

const renderIt = (props: Partial<React.ComponentProps<typeof CommandPalette>> = {}) =>
  render(
    <MemoryRouter>
      <CommandPalette
        open
        onOpenChange={() => {}}
        role="management"
        onAction={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  )

describe('CommandPalette', () => {
  it('shows page entries by default', () => {
    renderIt()
    expect(screen.getByText(/overview/i)).toBeInTheDocument()
  })
  it('filters by query', async () => {
    renderIt()
    await userEvent.type(screen.getByPlaceholderText(/search or jump/i), 'deviation')
    // Allow cmdk's async filter to settle
    await new Promise(r => setTimeout(r, 10))
    expect(screen.getByText(/deviations/i)).toBeInTheDocument()
    expect(screen.queryByText(/^overview$/i)).not.toBeInTheDocument()
  })
  it('hides management actions for staff role', () => {
    renderIt({ role: 'staff' })
    expect(screen.queryByText(/new study/i)).not.toBeInTheDocument()
  })
  it('hides the Actions group entirely when no onAction handler is provided', () => {
    render(
      <MemoryRouter>
        <CommandPalette
          open
          onOpenChange={() => {}}
          role="management"
        />
      </MemoryRouter>,
    )
    expect(screen.queryByText(/^new study$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^log visit$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^import csv$/i)).not.toBeInTheDocument()
    // Pages still render
    expect(screen.getByText(/^overview$/i)).toBeInTheDocument()
  })
})
