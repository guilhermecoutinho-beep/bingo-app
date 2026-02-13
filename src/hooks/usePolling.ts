import { useEffect, useRef, useCallback, useState } from 'react'

// Simple polling hook - much more stable than Supabase Realtime
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 3000,
  enabled: boolean = true,
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<number | null>(null)
  const isMountedRef = useRef(true)

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const result = await fetcher()
      if (isMountedRef.current) {
        setData(result)
        setError(null)
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Erro ao carregar dados')
      }
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [fetcher])

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true
    if (enabled) {
      fetchData(true)
    } else {
      setLoading(false)
    }
    return () => {
      isMountedRef.current = false
    }
  }, [enabled])

  // Polling interval
  useEffect(() => {
    if (!enabled) return
    intervalRef.current = window.setInterval(() => {
      fetchData(false)
    }, intervalMs)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchData, intervalMs, enabled])

  // Refetch on tab visibility
  useEffect(() => {
    if (!enabled) return
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchData(false)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchData, enabled])

  const refetch = useCallback(() => fetchData(false), [fetchData])

  return { data, loading, error, refetch }
}
