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

  React.useEffect(() => {
    let cancelled = false

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
      const email = data.session?.user?.email
      const role = (data.session?.user?.user_metadata as { role?: string } | null)?.role

      if (!cancelled) {
        setSession(email ? { email, role, source: 'supabase' } : null)
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { session, loading }
}

export async function clearAppSession() {
  localStorage.removeItem(DEMO_SESSION_KEY)
  await supabase.auth.signOut()
}

