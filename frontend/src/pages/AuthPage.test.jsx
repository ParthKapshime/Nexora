import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext.jsx'
import AuthPage from './AuthPage.jsx'

vi.mock('../lib/api.js', () => ({
  authApi: { login: vi.fn(), register: vi.fn(), me: vi.fn() },
  getErrorMessage: (error) => error.message,
  TOKEN_KEY: 'nexora.auth.token',
}))

import { authApi } from '../lib/api.js'

function renderAuthPage(mode = 'login') {
  const route = `/${mode}`
  return render(<MemoryRouter initialEntries={[route]}><AuthProvider><Routes>
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route path="/dashboard" element={<p>Protected dashboard</p>} />
  </Routes></AuthProvider></MemoryRouter>)
}

describe('authentication form', () => {
  beforeEach(() => {
    authApi.login.mockReset()
    authApi.register.mockReset()
    authApi.me.mockReset()
  })

  it('validates email and password without sending invalid credentials', async () => {
    const user = userEvent.setup()
    renderAuthPage('login')
    await user.type(screen.getByLabelText(/email address/i), 'not-an-email')
    await user.type(screen.getByLabelText(/^password$/i), 'short')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument()
    expect(await screen.findByText(/at least 10 characters/i)).toBeInTheDocument()
    expect(authApi.login).not.toHaveBeenCalled()
  })

  it('stores a successful tab session and opens the protected destination', async () => {
    const user = userEvent.setup()
    authApi.login.mockResolvedValue({ data: { token: 'test-session-token', user: { id: 'user-1', email: 'reader@example.com' } } })
    renderAuthPage('login')
    await user.type(screen.getByLabelText(/email address/i), 'reader@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'correct horse battery staple')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText('Protected dashboard')).toBeInTheDocument()
    expect(window.sessionStorage.getItem('nexora.auth.token')).toBe('test-session-token')
    expect(authApi.login).toHaveBeenCalledWith({ email: 'reader@example.com', password: 'correct horse battery staple' })
  })

  it('shows an API credential error and keeps the form available', async () => {
    const user = userEvent.setup()
    authApi.login.mockRejectedValue(new Error('Invalid email or password'))
    renderAuthPage('login')
    await user.type(screen.getByLabelText(/email address/i), 'reader@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'correct horse battery staple')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
  })
})
