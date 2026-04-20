import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import App from './App'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, role: null, loading: false })),
}))

describe('App', () => {
  it('renders login page when unauthenticated', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('K2 Medical Research')).toBeInTheDocument()
    })
  })
})
