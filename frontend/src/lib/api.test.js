import { AxiosError } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import api, { getErrorMessage, TOKEN_KEY } from './api.js'

afterEach(() => window.sessionStorage.clear())

describe('API client', () => {
  it('defaults to the same-origin API path for dev-server proxying', () => {
    expect(api.defaults.baseURL).toBe('/api')
  })

  it('adds the tab-scoped bearer token to protected requests', async () => {
    window.sessionStorage.setItem(TOKEN_KEY, 'test.jwt.token')
    let sentConfig
    await api.get('/auth/me', { adapter: async (config) => { sentConfig = config; return { data: {}, status: 200, statusText: 'OK', headers: {}, config } } })
    expect(sentConfig.headers.Authorization).toBe('Bearer test.jwt.token')
  })

  it('clears the token and notifies the auth context after a 401', async () => {
    window.sessionStorage.setItem(TOKEN_KEY, 'expired.jwt.token')
    const onExpired = vi.fn()
    window.addEventListener('nexora:session-expired', onExpired)
    const adapter = async (config) => Promise.reject(new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, { status: 401, statusText: 'Unauthorized', headers: {}, config, data: { error: 'Invalid token' } }))
    await expect(api.get('/auth/me', { adapter })).rejects.toBeInstanceOf(AxiosError)
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(onExpired).toHaveBeenCalledOnce()
    window.removeEventListener('nexora:session-expired', onExpired)
  })

  it('shows safe messages for unavailable servers and AI capability errors', () => {
    const offline = new AxiosError('Network Error', 'ERR_NETWORK')
    expect(getErrorMessage(offline)).toMatch(/could not reach the backend/i)
    const unavailable = new AxiosError('Unavailable', 'ERR_BAD_RESPONSE', undefined, undefined, { status: 503, statusText: 'Unavailable', headers: {}, config: {}, data: { error: 'private provider details' } })
    expect(getErrorMessage(unavailable)).toMatch(/temporarily unavailable/i)
    expect(getErrorMessage(unavailable)).not.toContain('private provider details')
  })
})
