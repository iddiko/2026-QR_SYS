"use client"

import React from 'react'
import useAppSession from './authSession'
import { getClientAuthHeaders } from './clientAuth'

export type MenuItem = {
  id: string
  label: string
  hidden?: boolean
  href?: string
  defaultChildId?: string
  children?: MenuItem[]
}

export type PageCustomization = {
  note?: string
}

type CustomizationState = {
  editMode: boolean
  menus: MenuItem[]
  pages: Record<string, PageCustomization>
}

type AdminCustomizationContextValue = {
  state: CustomizationState
  setEditMode: (value: boolean) => void
  toggleEditMode: () => void
  setMenus: (menus: MenuItem[]) => void
  setPageCustomization: (route: string, partial: PageCustomization) => void
  resetAll: () => void
}

const AdminCustomizationContext = React.createContext<AdminCustomizationContextValue | null>(null)

const STORAGE_KEY = 'qr_sys_admin_customization_v3'

const defaultMenus: MenuItem[] = [
  { id: 'dashboard', label: '대시보드', href: '/dashboard' },
  {
    id: 'management',
    label: '단지/동/입주민 관리',
    children: [
      { id: 'complexes', label: '단지 관리', href: '/dashboard/complexes' },
      { id: 'buildings', label: '동 관리', href: '/dashboard/buildings' },
      { id: 'resident-qr', label: '입주민/QR 관리', href: '/dashboard/resident-qr' },
    ],
  },
  { id: 'menus', label: '권한별 메뉴 관리', href: '/dashboard/menus' },
  { id: 'gas', label: '가스검침', href: '/dashboard/gas' },
  {
    id: 'ads',
    label: '소식/광고 관리',
    children: [
      { id: 'news', label: '소식 관리', href: '/dashboard/ads/news' },
      { id: 'ads-board', label: '광고 관리', href: '/dashboard/ads/ads' },
    ],
  },
  { id: 'logs', label: '활동 로그', href: '/dashboard/logs' },
  { id: 'settings', label: '설정', href: '/dashboard/settings' },
]

function getDefaultState(): CustomizationState {
  return { editMode: false, menus: defaultMenus, pages: {} }
}

function safeParse(value: string | null): CustomizationState | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<CustomizationState>
    if (!parsed || typeof parsed !== 'object') return null

    const editMode = parsed.editMode === true
    const menus = Array.isArray(parsed.menus) && parsed.menus.length > 0 ? (parsed.menus as MenuItem[]) : defaultMenus
    const pages =
      parsed.pages && typeof parsed.pages === 'object' ? (parsed.pages as Record<string, PageCustomization>) : {}

    return { editMode, menus, pages }
  } catch {
    return null
  }
}

function useDebouncedEffect(effect: () => void | (() => void), deps: React.DependencyList, delayMs: number) {
  React.useEffect(() => {
    const id = window.setTimeout(() => {
      const cleanup = effect()
      if (typeof cleanup === 'function') cleanup()
    }, delayMs)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export default function AdminCustomizationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAppSession()
  const isSuper = session?.role === 'SUPER'

  const [state, setState] = React.useState<CustomizationState>(() => {
    if (typeof window === 'undefined') return getDefaultState()
    return safeParse(localStorage.getItem(STORAGE_KEY)) ?? getDefaultState()
  })

  const serverSyncEnabledRef = React.useRef(false)
  const hydratedRef = React.useRef(false)

  React.useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    const stored = safeParse(localStorage.getItem(STORAGE_KEY))
    if (stored) setState(stored)
  }, [])

  React.useEffect(() => {
    if (!isSuper) return
    let cancelled = false

    async function loadFromDb() {
      const headers = await getClientAuthHeaders()
      if (!headers.Authorization && !headers['x-demo-role']) return

      const res = await fetch('/api/admin/customization', { headers, cache: 'no-store' })
      const json = (await res.json().catch(() => ({}))) as { menus?: unknown; pages?: unknown }
      if (!res.ok) return
      if (cancelled) return

      const rawMenus = Array.isArray(json.menus) ? (json.menus as MenuItem[]) : undefined
      const rawPages =
        json.pages && typeof json.pages === 'object' ? (json.pages as Record<string, PageCustomization>) : undefined

      const hasMenus = Array.isArray(rawMenus) && rawMenus.length > 0
      const hasPages = rawPages && Object.keys(rawPages).length > 0

      // DB가 비어있으면(초기 상태) 기본 메뉴를 저장해서 UI가 초기화되지 않게 한다.
      if (!hasMenus && !hasPages) {
        setState((prev) => ({ ...prev, menus: prev.menus.length > 0 ? prev.menus : defaultMenus }))
        serverSyncEnabledRef.current = true

        await fetch('/api/admin/customization', {
          method: 'PUT',
          headers: { ...headers, 'content-type': 'application/json' },
          body: JSON.stringify({ menus: defaultMenus, pages: {} }),
        })
        return
      }

      setState((prev) => ({
        ...prev,
        menus: hasMenus ? (rawMenus as MenuItem[]) : prev.menus,
        pages: hasPages ? (rawPages as Record<string, PageCustomization>) : prev.pages,
      }))
      serverSyncEnabledRef.current = true
    }

    void loadFromDb()
    return () => {
      cancelled = true
    }
  }, [isSuper])

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useDebouncedEffect(
    () => {
      if (!isSuper) return
      if (!serverSyncEnabledRef.current) return

      void (async () => {
        const headers = await getClientAuthHeaders()
        if (!headers.Authorization && !headers['x-demo-role']) return

        await fetch('/api/admin/customization', {
          method: 'PUT',
          headers: { ...headers, 'content-type': 'application/json' },
          body: JSON.stringify({ menus: state.menus, pages: state.pages }),
        })
      })()
    },
    [isSuper, state.menus, state.pages],
    600
  )

  const setEditMode = React.useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, editMode: value }))
  }, [])

  const toggleEditMode = React.useCallback(() => {
    setState((prev) => ({ ...prev, editMode: !prev.editMode }))
  }, [])

  const setMenus = React.useCallback((menus: MenuItem[]) => {
    setState((prev) => ({ ...prev, menus }))
  }, [])

  const setPageCustomization = React.useCallback((route: string, partial: PageCustomization) => {
    setState((prev) => ({
      ...prev,
      pages: {
        ...prev.pages,
        [route]: {
          ...(prev.pages[route] ?? {}),
          ...partial,
        },
      },
    }))
  }, [])

  const resetAll = React.useCallback(() => {
    setState(getDefaultState())
    localStorage.removeItem(STORAGE_KEY)

    if (!isSuper) return
    void (async () => {
      const headers = await getClientAuthHeaders()
      if (!headers.Authorization && !headers['x-demo-role']) return

      await fetch('/api/admin/customization', {
        method: 'PUT',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ menus: defaultMenus, pages: {} }),
      })
    })()
  }, [isSuper])

  const value = React.useMemo<AdminCustomizationContextValue>(
    () => ({ state, setEditMode, toggleEditMode, setMenus, setPageCustomization, resetAll }),
    [resetAll, setEditMode, setMenus, setPageCustomization, state, toggleEditMode]
  )

  return <AdminCustomizationContext.Provider value={value}>{children}</AdminCustomizationContext.Provider>
}

export function useAdminCustomization() {
  const ctx = React.useContext(AdminCustomizationContext)
  if (!ctx) throw new Error('AdminCustomizationProvider가 필요합니다.')
  return ctx
}

