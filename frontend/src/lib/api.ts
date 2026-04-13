// Use environment variable or fallback to localhost for dev
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api'

console.log('[API Client] Initialized with BASE_URL:', BASE_URL)
console.log('[API Client] VITE_API_URL env var:', import.meta.env.VITE_API_URL)

export const api = {
  getAuthToken: () => localStorage.getItem('evalence_token'),
  getRefreshToken: () => localStorage.getItem('evalence_refresh_token'),
  
  setAuthToken: (token: string, refreshToken?: string) => {
    if (token) {
      localStorage.setItem('evalence_token', token)
      if (refreshToken) {
        localStorage.setItem('evalence_refresh_token', refreshToken)
      }
    } else {
      localStorage.removeItem('evalence_token')
      localStorage.removeItem('evalence_refresh_token')
    }
  },

  clearAuth: () => {
    console.log('[Auth] Clearing authentication tokens')
    localStorage.removeItem('evalence_token')
    localStorage.removeItem('evalence_refresh_token')
    localStorage.removeItem('evalence_user_id')
    localStorage.removeItem('evalence_user_role')
    // Only redirect if not already on login page
    const currentPath = window.location.pathname
    if (!currentPath.includes('/auth/login') && !currentPath.includes('/auth/register')) {
      console.log('[Auth] Redirecting to login from:', currentPath)
      window.location.href = '/auth/login'
    } else {
      console.log('[Auth] Already on auth page, no redirect needed')
    }
  },

  async refreshToken() {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      console.log('[Auth] No refresh token available')
      return null
    }

    try {
      console.log('[Auth] Attempting to refresh token')
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (response.ok) {
        const data = await response.json()
        this.setAuthToken(data.access_token)
        console.log('[Auth] Token refreshed successfully')
        return data.access_token
      } else {
        console.log('[Auth] Token refresh failed with status:', response.status)
        return null
      }
    } catch (error) {
      console.error('[Auth] Token refresh error:', error)
      return null
    }
  },

  async request(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
    const token = this.getAuthToken()
    const headers: Record<string, string> = {}

    if (token) headers['Authorization'] = `Bearer ${token}`

    // Don't set Content-Type for FormData - browser will handle it
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    const fullUrl = `${BASE_URL}${endpoint}`
    const requestInit = {
      ...options,
      headers: { ...(options.headers as Record<string, string>), ...headers },
    }

    const method = options.method || 'GET'
    console.log(`[API] REQUEST: ${method} ${endpoint}`, {
      url: fullUrl,
      hasToken: !!token,
      bodyType: options.body instanceof FormData ? 'FormData' : 'JSON',
    })

    try {
      const response = await fetch(fullUrl, requestInit)
      console.log(`[API] RESPONSE: ${endpoint} <- Status ${response.status}`)

      // Handle token expiration (401) - but ONLY if we had a token and it's not a login/register endpoint
      if (response.status === 401 && token && retryCount === 0 && !endpoint.includes('/token') && !endpoint.includes('/register')) {
        console.warn('[API] 401 error with existing token, attempting refresh...')
        const newToken = await this.refreshToken()
        
        if (newToken) {
          console.log('[API] Token refreshed, retrying request...')
          // Retry the request with new token
          return this.request(endpoint, options, 1)
        } else {
          console.warn('[API] Token refresh failed, clearing auth')
          this.clearAuth()
          throw new Error('Session expired. Please log in again.')
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.detail || `HTTP ${response.status}: ${response.statusText}`
        console.error(`[API] ERROR: ${endpoint}: ${errorMessage}`)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log(`[API] SUCCESS: ${endpoint}`, data)
      return data
    } catch (error: any) {
      console.error(`[API] EXCEPTION: ${endpoint}:`, error.message)
      throw error
    }
  },

  // Helpers
  get: (endpoint: string) => api.request(endpoint, { method: 'GET' }),
  post: (endpoint: string, body: any) => api.request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint: string, body: any) => api.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint: string) => api.request(endpoint, { method: 'DELETE' }),
}
