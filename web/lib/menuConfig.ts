"use client"

import React from 'react'
import useAppSession from './authSession'
import { getClientAuthHeaders } from './clientAuth'

export type RoleKey = 'SUPER' | 'MAIN' | 'SUB' | 'GUARD' | 'RESIDENT'

export type MenuConfigMap = Record<string, boolean>

function cacheKey(role: RoleKey) {
  return `qr_sys_menu_config_cache_${role}`
}

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
  const lastRoleRef = React.useRef<RoleKey | null>(null)

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
      if (json?.config) {
        setConfig(json.config)
        try {
          localStorage.setItem(cacheKey(role), JSON.stringify(json.config))
        } catch {
          // ignore
        }
      }
      if (showSpinner) setLoading(false)
    },
    [isSuper, role]
  )

  React.useEffect(() => {
    if (!role) return
    if (lastRoleRef.current === role) return
    lastRoleRef.current = role

    if (!isSuper) {
      try {
        const cached = localStorage.getItem(cacheKey(role))
        if (cached) setConfig(JSON.parse(cached) as MenuConfigMap)
      } catch {
        // ignore
      }
    }

    void refresh({ showSpinner: true })
  }, [isSuper, refresh, role])

  React.useEffect(() => {
    if (!role || isSuper) setLoading(false)
  }, [isSuper, role])

  React.useEffect(() => {
    if (!role || isSuper) return
    if (typeof window === 'undefined') return

    const lastRef = { ts: 0 }
    const run = () => {
      const now = Date.now()
      if (now - lastRef.ts < 3000) return
      lastRef.ts = now
      void refresh({ showSpinner: false })
    }

    const onFocus = () => run()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') run()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isSuper, refresh, role])

  return { role: role ?? 'RESIDENT', config, loading, refresh }
}
