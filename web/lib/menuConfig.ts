"use client"

import React from 'react'
import supabase from './supabaseClient'
import useAppSession from './authSession'
import { getClientAuthHeaders } from './clientAuth'

export type RoleKey = 'SUPER' | 'MAIN' | 'SUB' | 'GUARD' | 'RESIDENT'

export type MenuConfigMap = Record<string, boolean>

async function fetchMenuConfig(targetRole?: RoleKey): Promise<{ targetRole: RoleKey; config: MenuConfigMap } | null> {
  const headers = await getClientAuthHeaders()
  if (!headers.Authorization && !headers['x-demo-role']) return null

  const qs = new URLSearchParams()
  if (targetRole) qs.set('targetRole', targetRole)
  const res = await fetch(`/api/menu-config?${qs.toString()}`, { headers })
  if (!res.ok) return null
  return (await res.json()) as { targetRole: RoleKey; config: MenuConfigMap }
}

export function useEffectiveMenuConfig() {
  const { session } = useAppSession()
  const role = (session?.role as RoleKey | undefined) ?? 'RESIDENT'

  const [config, setConfig] = React.useState<MenuConfigMap>({})
  const [loading, setLoading] = React.useState(true)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    const json = await fetchMenuConfig(role)
    setConfig(json?.config ?? {})
    setLoading(false)
  }, [role])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  // best-effort realtime (falls back to polling)
  React.useEffect(() => {
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
      void refresh()
    }, 10000)

    return () => {
      cancelled = true
      window.clearInterval(pollId)
      supabase.removeChannel(channel)
    }
  }, [refresh, role])

  return { role, config, loading, refresh }
}

