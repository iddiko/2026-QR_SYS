"use client"

import React from 'react'
import supabase from './supabaseClient'
import useAppSession from './authSession'
import { getClientAuthHeaders } from './clientAuth'

export type RoleKey = 'SUPER' | 'MAIN' | 'SUB' | 'GUARD' | 'RESIDENT'

export type MenuConfigMap = Record<string, boolean>

async function fetchMenuConfig(targetRole?: RoleKey): Promise<{ targetRole: RoleKey; config: MenuConfigMap } | null> {
  try {
    const headers = await getClientAuthHeaders()
    if (!headers.Authorization && !headers['x-demo-role']) return null

    const qs = new URLSearchParams()
    if (targetRole) qs.set('targetRole', targetRole)

    const res = await fetch(`/api/menu-config?${qs.toString()}`, { headers, cache: 'no-store' })
    if (!res.ok) return null

    return (await res.json()) as { targetRole: RoleKey; config: MenuConfigMap }
  } catch {
    // 네트워크/서버 재시작 등으로 fetch가 실패해도 UI 전체가 죽지 않게 방어
    return null
  }
}

export function useEffectiveMenuConfig() {
  const { session } = useAppSession()
  const role = (session?.role as RoleKey | undefined) ?? null
  const isSuper = role === 'SUPER'

  const [config, setConfig] = React.useState<MenuConfigMap>({})
  const [loading, setLoading] = React.useState(true)
  const mountedRef = React.useRef(false)

  const refresh = React.useCallback(
    async (opts?: { showSpinner?: boolean }) => {
      const showSpinner = opts?.showSpinner === true
      if (showSpinner) setLoading(true)

      if (!role || isSuper) {
        setConfig({})
        if (showSpinner) setLoading(false)
        return
      }

      const json = await fetchMenuConfig(role)
      setConfig(json?.config ?? {})
      if (showSpinner) setLoading(false)
    },
    [isSuper, role]
  )

  React.useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    void refresh({ showSpinner: true })
  }, [refresh])

  // best-effort realtime (falls back to polling)
  React.useEffect(() => {
    if (!role || isSuper) {
      setLoading(false)
      return
    }

    let cancelled = false

    const channel = supabase
      .channel(`menu_config_${role}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_configurations', filter: `target_role=eq.${role}` },
        async () => {
          if (cancelled) return
          const json = await fetchMenuConfig(role)
          if (cancelled) return
          setConfig(json?.config ?? {})
        }
      )
      .subscribe()

    const pollId = window.setInterval(() => {
      void refresh({ showSpinner: false })
    }, 10000)

    return () => {
      cancelled = true
      window.clearInterval(pollId)
      supabase.removeChannel(channel)
    }
  }, [isSuper, refresh, role])

  return { role: role ?? 'RESIDENT', config, loading, refresh }
}
