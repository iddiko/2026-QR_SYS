"use client"

import React from 'react'

export type ComplexScope =
  | { type: 'all'; id: null; name: string }
  | { type: 'complex'; id: string; name: string }

const STORAGE_KEY = 'qr_sys_complex_scope'
const DEFAULT_SCOPE: ComplexScope = { type: 'all', id: null, name: '전체' }

function safeParse(value: string | null): ComplexScope | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<ComplexScope>
    if (parsed.type === 'all') return { type: 'all', id: null, name: '전체' }
    if (parsed.type === 'complex' && typeof parsed.id === 'string' && typeof parsed.name === 'string') {
      return { type: 'complex', id: parsed.id, name: parsed.name }
    }
    return null
  } catch {
    return null
  }
}

export function useComplexScope(defaultScope: ComplexScope = DEFAULT_SCOPE) {
  const [scope, setScopeState] = React.useState<ComplexScope>(() => {
    if (typeof window === 'undefined') return defaultScope
    return safeParse(localStorage.getItem(STORAGE_KEY)) ?? defaultScope
  })

  React.useEffect(() => {
    const stored = safeParse(localStorage.getItem(STORAGE_KEY))
    if (stored) setScopeState(stored)
  }, [])

  const setScope = React.useCallback((next: ComplexScope) => {
    setScopeState(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  return { scope, setScope }
}

