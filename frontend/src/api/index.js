const BASE = import.meta.env.VITE_API_URL || '/api'

function getToken() {
  return localStorage.getItem('auth_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })

  // 401 handling: always read the real error body first
  if (res.status === 401) {
    const err = await res.json().catch(() => ({ detail: 'Unauthorized' }))
    const isOnLoginPage = window.location.pathname.includes('/login')

    // Only clear token + redirect if we're NOT on the login page
    // (on the login page a 401 just means wrong credentials — don't wipe state or redirect)
    if (!isOnLoginPage) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }

    throw new Error(err.detail || 'Invalid credentials')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Auth
  login:          (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me:             ()     => request('/auth/me'),
  updateMe:       (data) => request('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  // Users (admin)
  listUsers:      ()           => request('/users'),
  changeRole:     (id, role)   =>
    request(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  deactivateUser: (id)         => request(`/users/${id}`, { method: 'DELETE' }),
  registerUser:   (data)       =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  // Core
  health:     ()                    => request('/health'),
  runTest:    ()                    => request('/speedtest/run', { method: 'POST' }),
  getStatus:  ()                    => request('/speedtest/status'),
  getResults: (skip = 0, limit = 200) => request(`/results?skip=${skip}&limit=${limit}`),
  getLatest:  ()                    => request('/results/latest'),
  getResult:  (id)                  => request(`/results/${id}`),
  deleteResult: (id)                => request(`/results/${id}`, { method: 'DELETE' }),
  deleteAll:  ()                    => request('/results', { method: 'DELETE' }),
  getStats:   ()                    => request('/stats'),
  getSchedule: ()                   => request('/schedule'),
  setSchedule: (cfg)                =>
    request('/schedule', { method: 'POST', body: JSON.stringify(cfg) }),

  // Alerts
  getAlertConfig: ()      => request('/alert-config'),
  setAlertConfig: (cfg)   =>
    request('/alert-config', { method: 'PUT', body: JSON.stringify(cfg) }),
  testAlert: (channel)    =>
    request('/alert-config/test', { method: 'POST', body: JSON.stringify({ channel }) }),

  // Backup / Restore
  backup: () => {
    const token = getToken()
    return fetch(`${BASE}/backup`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  restore: (file) => {
    const token = getToken()
    const form = new FormData()
    form.append('file', file)
    return fetch(`${BASE}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).then(async r => {
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail) }
      return r.json()
    })
  },
}
