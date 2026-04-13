// Use environment variable or fallback to localhost for dev
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api'

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
    localStorage.removeItem('evalence_token')
    localStorage.removeItem('evalence_refresh_token')
    // Optional: redirect to login
    if (window.location.pathname !== '/auth/login') {
      window.location.href = '/auth/login'
    }
  },

  async refreshToken() {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      this.clearAuth()
      return null
    }

    try {
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
        return data.access_token
      } else {
        this.clearAuth()
        return null
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      this.clearAuth()
      return null
    }
  },

  async request(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
    const token = this.getAuthToken()
    const headers: Record<string, string> = {}

    if (token) headers['Authorization'] = `Bearer ${token}`

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: { ...(options.headers as Record<string, string>), ...headers },
      })

      // Handle token expiration (401)
      if (response.status === 401 && retryCount === 0) {
        console.warn('⚠️ Token expired, attempting refresh...')
        const newToken = await this.refreshToken()
        
        if (newToken) {
          // Retry the request with new token
          return this.request(endpoint, options, 1)
        } else {
          // Refresh failed, redirect to login
          throw new Error('Session expired. Please log in again.')
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }

      return response.json()
    } catch (error: any) {
      console.error(`API Error [${endpoint}]:`, error.message)
      throw error
    }
  },

  // Helpers
  get: (endpoint: string) => api.request(endpoint, { method: 'GET' }),
  post: (endpoint: string, body: any) => api.request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint: string, body: any) => api.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint: string) => api.request(endpoint, { method: 'DELETE' }),
}
