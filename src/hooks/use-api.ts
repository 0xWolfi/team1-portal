'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'

export function useApi<T>(url: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!!url)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!url) { setLoading(false); return }
    setLoading(true)
    setError(null)
    const res = await api.get<T>(url)
    if (res.success && res.data !== undefined) setData(res.data)
    else setError(res.error || 'Failed to load')
    setLoading(false)
  }, [url, ...deps])

  useEffect(() => { fetchData() }, [fetchData])

  return { data, loading, error, refetch: fetchData, setData }
}

export function useMutation<TInput = unknown, TOutput = unknown>() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = async (
    url: string,
    method: 'POST' | 'PUT' | 'DELETE',
    body?: TInput
  ): Promise<{ success: boolean; data?: TOutput; error?: string }> => {
    setLoading(true)
    setError(null)
    let res: { success: boolean; data?: TOutput; error?: string }
    if (method === 'DELETE') res = await api.del<TOutput>(url)
    else if (method === 'PUT') res = await api.put<TOutput>(url, body)
    else res = await api.post<TOutput>(url, body)
    if (!res.success) setError(res.error || 'Operation failed')
    setLoading(false)
    return res
  }

  return { mutate, loading, error }
}
