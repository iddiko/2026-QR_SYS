"use client"

import React from 'react'
import supabase from './supabaseClient'

export type AppSession = {
  email: string
  role?: string
  source: 'supabase' | 'demo'
}

const DEMO_SESSION_KEY = 'qr_sys_demo_session'

type DemoSession = {
  email: string
  role: string
  createdAt: string
}

export default function useAppSession() {
  const [session, setSession] = React.useState<AppSession | null>(null)
  const [loading, setLoading] = React.useState(true)

  const isConfiguredSuperEmail = React.useCallback((email: string) => {
    const raw = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS ?? 'superadmin@example.com').trim()
    const list = raw
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
    return list.includes(email.toLowerCase())
  }, [])

  React.useEffect(() => {
    let cancelled = false

    const setFromSupabaseSession = (supabaseSession: any | null) => {
      const email = supabaseSession?.user?.email as string | undefined
      const meta = (supabaseSession?.user?.user_metadata ?? {}) as { role?: string } | null
      let role = meta?.role
      if (email && isConfiguredSuperEmail(email)) role = 'SUPER'

      if (!cancelled) {
        setSession(email ? { email, role, source: 'supabase' } : null)
        setLoading(false)
      }
    }

    async function load() {
      const stored = localStorage.getItem(DEMO_SESSION_KEY)
      if (stored) {
        try {
          const demo = JSON.parse(stored) as DemoSession
          if (!cancelled) {
            setSession({ email: demo.email, role: demo.role, source: 'demo' })
            setLoading(false)
          }
          return
        } catch {
          localStorage.removeItem(DEMO_SESSION_KEY)
        }
      }

      const { data } = await supabase.auth.getSession()
      setFromSupabaseSession(data.session ?? null)
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setFromSupabaseSession(nextSession)
    })

    load()
    return () => {
      cancelled = true
      subscription?.subscription?.unsubscribe()
    }
  }, [isConfiguredSuperEmail])

  return { session, loading }
}

export async function clearAppSession() {
  localStorage.removeItem(DEMO_SESSION_KEY)
  await supabase.auth.signOut()
}
