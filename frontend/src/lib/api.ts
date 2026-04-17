// Use environment variable or fallback to localhost for dev
export const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api'

console.log('[API Client] Initialized with BASE_URL:', BASE_URL)
console.log('[API Client] VITE_API_URL env var:', import.meta.env.VITE_API_URL)

// ============================================
// Unified API Endpoints Configuration
// ============================================

export const PHASE1_ENDPOINTS = {
  // Auth
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
    updateProfile: '/auth/me',
  },
  // Hackathons
  hackathons: {
    list: '/hackathons',
    create: '/hackathons',
    detail: (id: number) => `/hackathons/${id}`,
    update: (id: number) => `/hackathons/${id}`,
    stats: (id: number) => `/hackathons/${id}/stats`,
  },
  // Teams
  teams: {
    list: (hackathonId: number) => `/hackathons/${hackathonId}/teams`,
    create: '/teams',
    update: (id: number) => `/teams/${id}`,
    delete: (id: number) => `/teams/${id}`,
    import: (hackathonId: number) => `/hackathons/${hackathonId}/teams/import`,
  },
  // Projects
  projects: {
    submit: '/projects',
    list: (hackathonId: number) => `/hackathons/${hackathonId}/projects`,
  },
  // Evaluations
  evaluations: {
    submit: '/evaluations',
    queue: '/judge/queue',
    assigned: '/judge/evaluations/assigned',
    history: '/judge/evaluations/history',
  },
  // Announcements
  announcements: {
    create: (hackathonId: number) => `/hackathons/${hackathonId}/announcements`,
    list: (hackathonId: number) => `/hackathons/${hackathonId}/announcements`,
  },
  // Leaderboard
  leaderboard: {
    get: (hackathonId: number) => `/hackathons/${hackathonId}/leaderboard`,
  },
  // Stats
  stats: {
    platform: '/stats',
    hackathon: (hackathonId: number) => `/hackathons/${hackathonId}/stats`,
  },
}

export const PHASE2_ENDPOINTS = {
  // Judge Portal
  judge: {
    dashboard: '/judge/dashboard',
    assigned: '/judge/evaluations/assigned',
    detail: (assignmentId: number) => `/judge/evaluations/assigned/${assignmentId}`,
    submit: '/judge/evaluations/submit',
    update: (assignmentId: number) => `/judge/evaluations/${assignmentId}`,
    history: '/judge/evaluations/history',
    progress: '/judge/progress',
  },
  // Judge Assignments
  assignments: {
    create: (hackathonId: number) => `/me/hackathons/${hackathonId}/judge-assignments`,
    list: (hackathonId: number) => `/me/hackathons/${hackathonId}/judge-assignments`,
    update: (hackathonId: number, assignmentId: number) => `/me/hackathons/${hackathonId}/judge-assignments/${assignmentId}`,
    delete: (hackathonId: number, assignmentId: number) => `/me/hackathons/${hackathonId}/judge-assignments/${assignmentId}`,
  },
  // Rounds
  rounds: {
    list: (hackathonId: number) => `/me/hackathons/${hackathonId}/rounds`,
    create: (hackathonId: number) => `/me/hackathons/${hackathonId}/rounds`,
    update: (hackathonId: number, roundId: number) => `/me/hackathons/${hackathonId}/rounds/${roundId}`,
    delete: (hackathonId: number, roundId: number) => `/me/hackathons/${hackathonId}/rounds/${roundId}`,
  },
  // Analytics
  analytics: {
    live: (hackathonId: number) => `/me/hackathons/${hackathonId}/analytics/live`,
    progress: (hackathonId: number) => `/me/hackathons/${hackathonId}/analytics/progress`,
  },
}

export const PHASE3_ENDPOINTS = {
  // AI Insights
  ai: {
    predictions: '/ai/scoring/predictions',
    scoreTeam: (teamId: number) => `/ai/scoring/predict/${teamId}`,
  },
  // Mentorship
  mentorship: {
    requests: '/mentorship/requests',
    create: '/mentorship/requests',
    sessions: '/mentorship/sessions',
  },
  // Messaging
  messaging: {
    teamMessages: (teamId: number) => `/messaging/teams/${teamId}/messages`,
    sendMessage: (teamId: number) => `/messaging/teams/${teamId}/messages`,
  },
  // Achievements
  achievements: {
    list: '/achievements',
    userAchievements: (userId: number) => `/achievements/users/${userId}`,
  },
  // Reporting
  reporting: {
    generate: '/reporting/generate',
    export: (reportId: number) => `/reporting/${reportId}/export`,
  },
}

export const ORG_ENDPOINTS = {
  // Organizer Portal
  hackathons: {
    myHackathons: '/me/hackathons',
    detail: (hackathonId: number) => `/me/hackathons/${hackathonId}`,
    update: (hackathonId: number) => `/me/hackathons/${hackathonId}`,
  },
  // Judge Credentials
  judges: {
    create: (hackathonId: number) => `/me/hackathons/${hackathonId}/judges`,
    list: (hackathonId: number) => `/me/hackathons/${hackathonId}/judges`,
    delete: (hackathonId: number, judgeId: number) => `/me/hackathons/${hackathonId}/judges/${judgeId}`,
  },
  // Coordinator Credentials
  coordinators: {
    create: (hackathonId: number) => `/me/hackathons/${hackathonId}/coordinators`,
    list: (hackathonId: number) => `/me/hackathons/${hackathonId}/coordinators`,
    delete: (hackathonId: number, coordinatorId: number) => `/me/hackathons/${hackathonId}/coordinators/${coordinatorId}`,
  },
  // Participants
  participants: {
    list: (hackathonId: number) => `/me/hackathons/${hackathonId}/participants`,
    sendEmail: (hackathonId: number) => `/me/hackathons/${hackathonId}/send-email`,
  },
  // Results
  results: {
    publish: (hackathonId: number) => `/organizer/hackathons/${hackathonId}/publish-results`,
  },
}

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
