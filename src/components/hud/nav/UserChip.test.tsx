import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { UserChip } from './UserChip'

describe('UserChip', () => {
  it('renders display name and role in the trigger', () => {
    render(<UserChip displayName="Chris Hill" email="chris@k2.com" role="Manager" onSignOut={vi.fn()} />)
    expect(screen.getByText('Chris Hill')).toBeInTheDocument()
    expect(screen.getByText('Manager')).toBeInTheDocument()
  })

  it('trigger is a button with an accessible label that includes the display name', () => {
    render(<UserChip displayName="Chris Hill" email="chris@k2.com" role="Manager" onSignOut={vi.fn()} />)
    const trigger = screen.getByRole('button', { name: /chris hill/i })
    expect(trigger).toHaveAttribute('aria-label', expect.stringContaining('Chris Hill'))
    expect(trigger).toHaveAttribute('aria-label', expect.stringContaining('Manager'))
  })

  it('opens a menu with the email and a Sign out item when the trigger is clicked', async () => {
    render(<UserChip displayName="Chris Hill" email="chris@k2.com" role="Manager" onSignOut={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /chris hill/i }))
    expect(await screen.findByText('chris@k2.com')).toBeInTheDocument()
    expect(await screen.findByRole('menuitem', { name: /sign out/i })).toBeInTheDocument()
  })

  it('invokes onSignOut when the Sign out menu item is selected', async () => {
    const onSignOut = vi.fn()
    render(<UserChip displayName="Chris Hill" email="chris@k2.com" role="Manager" onSignOut={onSignOut} />)
    await userEvent.click(screen.getByRole('button', { name: /chris hill/i }))
    await userEvent.click(await screen.findByRole('menuitem', { name: /sign out/i }))
    expect(onSignOut).toHaveBeenCalledOnce()
  })
})
