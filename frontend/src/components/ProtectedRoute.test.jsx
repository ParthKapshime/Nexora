import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext.jsx'
import { ProtectedRoute } from './ProtectedRoute.jsx'

vi.mock('../lib/api.js', () => ({
  authApi: { login: vi.fn(), register: vi.fn(), me: vi.fn() },
  getErrorMessage: (error) => error.message,
  TOKEN_KEY: 'nexora.auth.token',
}))

describe('protected routes', () => {
  it('redirects an unauthenticated visitor to sign in', async () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><AuthProvider><Routes>
      <Route path="/dashboard" element={<ProtectedRoute><p>Private workspace</p></ProtectedRoute>} />
      <Route path="/login" element={<p>Sign in required</p>} />
    </Routes></AuthProvider></MemoryRouter>)
    expect(await screen.findByText('Sign in required')).toBeInTheDocument()
    expect(screen.queryByText('Private workspace')).not.toBeInTheDocument()
  })
})
