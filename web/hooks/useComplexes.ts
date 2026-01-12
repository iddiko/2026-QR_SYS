import { useCallback, useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'

export type ComplexPreview = {
  id: string
  name: string
  region: string | null
  created_at: string
}

type UseComplexesResult = {
  complexes: ComplexPreview[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
  refresh: () => void
  filter: string
  setFilter: (value: string) => void
}

export default function useComplexes(pageSize = 12): UseComplexesResult {
  const [complexes, setComplexes] = useState<ComplexPreview[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState('')

  const fetchPage = useCallback(
    async (nextPage: number, replace = false) => {
      setLoading(true)
      setError(null)

      const offset = nextPage * pageSize
      let query = supabase
        .from('complexes')
        .select('id, name, region, created_at')
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (filter.length > 0) {
        query = query.ilike('name', `%${filter}%`)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      const payload: ComplexPreview[] = data ?? []
      setComplexes((prev) => (replace ? payload : [...prev, ...payload]))
      setPageIndex(nextPage)
      setHasMore(payload.length === pageSize)
      setLoading(false)
    },
    [filter, pageSize]
  )

  useEffect(() => {
    fetchPage(0, true)
  }, [fetchPage])

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return
    fetchPage(pageIndex + 1)
  }, [fetchPage, hasMore, loading, pageIndex])

  const refresh = useCallback(() => {
    setComplexes([])
    fetchPage(0, true)
  }, [fetchPage])

  return {
    complexes,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    filter,
    setFilter,
  }
}
