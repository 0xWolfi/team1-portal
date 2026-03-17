const API_BASE = ''

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
    if (token) localStorage.setItem('access_token', token)
    else localStorage.removeItem('access_token')
  }

  getToken() {
    if (this.token) return this.token
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('access_token')
    }
    return this.token
  }

  async fetch<T = unknown>(url: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; error?: string }> {
    const token = this.getToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    let res = await fetch(`${API_BASE}${url}`, { ...options, headers })

    // If 401, try to refresh
    if (res.status === 401 && token) {
      const refreshed = await this.refreshToken()
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.token}`
        res = await fetch(`${API_BASE}${url}`, { ...options, headers })
      }
    }

    const json = await res.json().catch(() => ({ success: false, error: 'Network error' }))
    return json
  }

  async get<T = unknown>(url: string) {
    return this.fetch<T>(url)
  }

  async post<T = unknown>(url: string, body?: unknown) {
    return this.fetch<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
  }

  async put<T = unknown>(url: string, body?: unknown) {
    return this.fetch<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined })
  }

  async del<T = unknown>(url: string) {
    return this.fetch<T>(url, { method: 'DELETE' })
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json()
      if (json.success && json.data?.accessToken) {
        this.setToken(json.data.accessToken)
        return true
      }
    } catch {}
    this.setToken(null)
    return false
  }
}

export const api = new ApiClient()
