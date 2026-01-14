"use client"

import React from 'react'

export type BuildingScope =
  | { type: 'all'; id: null; name: string }
  | { type: 'building'; id: string; name: string }

const STORAGE_KEY = 'qr_sys_building_scope'
const DEFAULT_SCOPE: BuildingScope = { type: 'all', id: null, name: '전체' }

function safeParse(value: string | null): BuildingScope | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<BuildingScope>
    if (parsed.type === 'all') return { type: 'all', id: null, name: '전체' }
    if (parsed.type === 'building' && typeof parsed.id === 'string' && typeof parsed.name === 'string') {
      return { type: 'building', id: parsed.id, name: parsed.name }
    }
    return null
  } catch {
    return null
  }
}

export function useBuildingScope(defaultScope: BuildingScope = DEFAULT_SCOPE) {
  const [scope, setScopeState] = React.useState<BuildingScope>(() => {
    if (typeof window === 'undefined') return defaultScope
    return safeParse(localStorage.getItem(STORAGE_KEY)) ?? defaultScope
  })

  React.useEffect(() => {
    const stored = safeParse(localStorage.getItem(STORAGE_KEY))
    if (stored) setScopeState(stored)
  }, [])

  const setScope = React.useCallback((next: BuildingScope) => {
    setScopeState(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  return { scope, setScope }
}

