import axios from 'axios'

// Relative requests use the Vite same-origin proxy, including through a public
// forwarded frontend URL. Set VITE_API_BASE_URL only when intentionally bypassing it.
const configuredBase = import.meta.env.VITE_API_BASE_URL || ''
const api = axios.create({
  baseURL: `${configuredBase.replace(/\/$/, '')}/api`,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
})

export const TOKEN_KEY = 'nexora.auth.token'

api.interceptors.request.use((config) => {
  const token = window.sessionStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.sessionStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new Event('nexora:session-expired'))
    }
    return Promise.reject(error)
  },
)

export function getErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return error.code === 'ECONNABORTED'
        ? 'The request took too long. Check your connection and try again.'
        : 'Nexora could not reach the backend. Make sure the API is running, then try again.'
    }
    const message = error.response.data?.error
    if (typeof message === 'string' && error.response.status < 500) return message
    if (error.response.status === 503) return 'This feature is temporarily unavailable. Please try again later.'
    if (error.response.status >= 500) return 'The server could not complete that request. Try again shortly.'
  }
  return error instanceof Error && error.message === 'Unexpected AI response'
    ? 'The AI response could not be read. Please try again.'
    : 'Something went wrong. Please try again.'
}

export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  me: () => api.get('/auth/me'),
}

export const profileApi = {
  get: () => api.get('/profile'),
  update: (payload) => api.patch('/profile', payload),
  uploadResume: (file) => {
    const body = new FormData()
    body.append('resume', file)
    return api.post('/profile/resume', body)
  },
  removeResume: () => api.delete('/profile/resume'),
}

export const applicationsApi = {
  list: (params = {}) => api.get('/applications', { params }),
  create: (payload) => api.post('/applications', payload),
  update: (id, payload) => api.patch(`/applications/${id}`, payload),
  remove: (id) => api.delete(`/applications/${id}`),
  statusCounts: async (statuses) => {
    const entries = await Promise.all(statuses.map(async (status) => {
      const { data } = await api.get('/applications', { params: { status, limit: 1, page: 1 } })
      return [status, data.total]
    }))
    return Object.fromEntries(entries)
  },
}

export const resourcesApi = {
  list: (kind) => api.get(`/${kind}`),
  create: (kind, data) => api.post(`/${kind}`, { data }),
  update: (kind, id, data) => api.patch(`/${kind}/${id}`, { data }),
  remove: (kind, id) => api.delete(`/${kind}/${id}`),
}

export const aiApi = {
  complete: (messages) => api.post('/ai/chat/completions', { messages }),
}

export default api
