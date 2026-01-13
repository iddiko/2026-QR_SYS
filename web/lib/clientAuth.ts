"use client"

import supabase from './supabaseClient'

const DEMO_SESSION_KEY = 'qr_sys_demo_session'

type DemoSession = {
  email?: string
  role?: string
  createdAt?: string
}

export async function getClientAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {}

  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    headers.Authorization = `Bearer ${token}`
    return headers
  }

  if (process.env.NODE_ENV !== 'production') {
    try {
      const stored = localStorage.getItem(DEMO_SESSION_KEY)
      if (stored) {
        const demo = JSON.parse(stored) as DemoSession
        if (demo.role) headers['x-demo-role'] = String(demo.role)
      }
    } catch {
      localStorage.removeItem(DEMO_SESSION_KEY)
    }
  }

  return headers
}

