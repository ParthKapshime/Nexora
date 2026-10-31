import { useCallback, useEffect, useMemo, useState } from 'react'
import { authApi, getErrorMessage, TOKEN_KEY } from '../lib/api.js'
import { AuthContext } from './auth-context.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(() => window.sessionStorage.getItem(TOKEN_KEY) ? 'loading' : 'unauthenticated')
  const [sessionMessage, setSessionMessage] = useState('')

  const refreshSession = useCallback(async () => {
    try {
      const { data } = await authApi.me()
      setUser(data.user)
      setStatus('authenticated')
      setSessionMessage('')
    } catch (error) {
      if (error.response?.status === 401) {
        setUser(null)
        setStatus('unauthenticated')
        setSessionMessage('Your session has expired. Please sign in again.')
      } else {
        setStatus('offline')
        setSessionMessage(getErrorMessage(error))
      }
    }
  }, [])

  useEffect(() => {
    let current = true
    if (window.sessionStorage.getItem(TOKEN_KEY)) {
      authApi.me().then(({ data }) => {
        if (!current) return
        setUser(data.user)
        setStatus('authenticated')
        setSessionMessage('')
      }).catch((error) => {
        if (!current) return
        if (error.response?.status === 401) {
          setUser(null)
          setStatus('unauthenticated')
          setSessionMessage('Your session has expired. Please sign in again.')
        } else {
          setStatus('offline')
          setSessionMessage(getErrorMessage(error))
        }
      })
    }
    const expired = () => {
      setUser(null)
      setStatus('unauthenticated')
      setSessionMessage('Your session has expired. Please sign in again.')
    }
    window.addEventListener('nexora:session-expired', expired)
    return () => { current = false; window.removeEventListener('nexora:session-expired', expired) }
  }, [])

  const authenticate = useCallback(async (mode, credentials) => {
    const { data } = await authApi[mode](credentials)
    if (!data.token || !data.user) throw new Error('Authentication response did not include a session.')
    window.sessionStorage.setItem(TOKEN_KEY, data.token)
    setUser(data.user)
    setStatus('authenticated')
    setSessionMessage('')
    return data.user
  }, [])

  const logout = useCallback(() => {
    window.sessionStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setStatus('unauthenticated')
    setSessionMessage('You have signed out.')
  }, [])

  const retrySession = useCallback(() => {
    setStatus('loading')
    void refreshSession()
  }, [refreshSession])

  const value = useMemo(() => ({
    user, status, sessionMessage,
    login: (credentials) => authenticate('login', credentials),
    register: (credentials) => authenticate('register', credentials),
    logout, refreshSession, retrySession,
  }), [user, status, sessionMessage, authenticate, logout, refreshSession, retrySession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
