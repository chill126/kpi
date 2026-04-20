import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Login } from '@/pages/Login'

vi.mock('@/lib/auth', () => ({
  signIn: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

import * as authModule from '@/lib/auth'

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  )

describe('Login', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders email and password fields and submit button', () => {
    renderLogin()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows error when email is empty on submit', async () => {
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(screen.getByText(/email is required/i)).toBeInTheDocument()
  })

  it('shows error when password is empty on submit', async () => {
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'test@k2.com')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
  })

  it('calls signIn with credentials on valid submit', async () => {
    vi.mocked(authModule.signIn).mockResolvedValue(undefined)

    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'test@k2.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(authModule.signIn).toHaveBeenCalledWith('test@k2.com', 'password123')
    })
  })

  it('shows error message on sign-in failure', async () => {
    vi.mocked(authModule.signIn).mockRejectedValue(new Error('auth/invalid-credential'))

    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'test@k2.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    })
  })
})
