"use client"

import React from 'react'

export type MenuItem = {
  id: string
  label: string
  href?: string
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

const STORAGE_KEY = 'qr_sys_admin_customization_v2'

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
    const menus = Array.isArray(parsed.menus) ? (parsed.menus as MenuItem[]) : defaultMenus
    const pages =
      parsed.pages && typeof parsed.pages === 'object'
        ? (parsed.pages as Record<string, PageCustomization>)
        : {}
    return { editMode, menus, pages }
  } catch {
    return null
  }
}

export default function AdminCustomizationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<CustomizationState>(getDefaultState)

  React.useEffect(() => {
    const stored = safeParse(localStorage.getItem(STORAGE_KEY))
    if (stored) setState(stored)
  }, [])

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

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
  }, [])

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
