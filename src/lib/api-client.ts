const API_BASE = ''

class ApiClient {
  async fetch<T = unknown>(url: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; error?: string }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    }

    let res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
      credentials: 'include', // Send httpOnly cookies automatically
    })

    // If 401, try to refresh via cookie-based refresh token
    if (res.status === 401) {
      const refreshed = await this.refreshToken()
      if (refreshed) {
        res = await fetch(`${API_BASE}${url}`, {
          ...options,
          headers,
          credentials: 'include',
        })
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
      return json.success
    } catch {}
    return false
  }
}

export const api = new ApiClient()
