const SESSION_STORAGE_KEY = 'scholarfund.sessionToken'

let csrfToken = ''
let sessionToken = ''

try {
  sessionToken = window.sessionStorage.getItem(SESSION_STORAGE_KEY) || ''
} catch {
  sessionToken = ''
}

function updateTokens(data) {
  if (!data || typeof data !== 'object') return
  if (typeof data.csrfToken === 'string' && data.csrfToken) {
    csrfToken = data.csrfToken
  }
  if (typeof data.sessionToken === 'string' && data.sessionToken) {
    sessionToken = data.sessionToken
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionToken)
    } catch {
      // Ignore storage restrictions
    }
  }
}

export function clearStoredTokens() {
  csrfToken = ''
  sessionToken = ''
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // Ignore storage restrictions
  }
}

async function rawRequest(method, path, body) {
  const headers = {}
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers['X-CSRF-Token'] = csrfToken
  }
  if (sessionToken) {
    headers['X-Session-Token'] = sessionToken
  }

  const response = await fetch(path, {
    method,
    credentials: 'include',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => ({}))
  updateTokens(data)
  return { ok: response.ok, status: response.status, data }
}

export async function apiRequest(method, path, body) {
  if (!csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    await rawRequest('GET', '/api/session')
  }

  let res = await rawRequest(method, path, body)

  if (res.status === 403 && res.data?.code === 'CSRF_INVALID') {
    await rawRequest('GET', '/api/session')
    res = await rawRequest(method, path, body)
  }

  if (!res.ok) {
    const err = new Error(res.data?.error || 'Request could not be completed.')
    err.status = res.status
    err.code = res.data?.code
    throw err
  }

  return res.data
}

export const api = {
  getSession: () => apiRequest('GET', '/api/session'),
  login: (payload) => apiRequest('POST', '/api/auth/login', payload),
  register: (payload) => apiRequest('POST', '/api/auth/register', payload),
  logout: async () => {
    try {
      await apiRequest('POST', '/api/auth/logout', {})
    } finally {
      clearStoredTokens()
      await rawRequest('GET', '/api/session')
    }
  },
  uploadPhoto: (payload) => apiRequest('POST', '/api/uploads/photo', payload),
  updateProfile: (payload) => apiRequest('PATCH', '/api/profile', payload),
  listCampaigns: ({ q = '', category = 'All', status = 'public' } = {}) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (category && category !== 'All') params.set('category', category)
    if (status && status !== 'public') params.set('status', status)
    const qs = params.toString()
    return apiRequest('GET', `/api/campaigns${qs ? `?${qs}` : ''}`)
  },
  getCampaign: (slug) => apiRequest('GET', `/api/campaigns/${encodeURIComponent(slug)}`),
  donate: (slug, payload) =>
    apiRequest('POST', `/api/campaigns/${encodeURIComponent(slug)}/donations`, payload),
  donorDashboard: () => apiRequest('GET', '/api/donor/dashboard'),
  studentDashboard: () => apiRequest('GET', '/api/student/dashboard'),
  myApplications: () => apiRequest('GET', '/api/applications/mine'),
  submitApplication: (payload) => apiRequest('POST', '/api/applications', payload),
  postMilestone: (campaignId, payload) =>
    apiRequest('POST', `/api/student/campaigns/${campaignId}/milestones`, payload),
  adminOverview: () => apiRequest('GET', '/api/admin/overview'),
  reviewApplication: (id, payload) =>
    apiRequest('POST', `/api/admin/applications/${id}/review`, payload),
  updateCampaign: (id, payload) =>
    apiRequest('PATCH', `/api/admin/campaigns/${id}`, payload),
}
