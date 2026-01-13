"use client"

import React from 'react'
import supabase from '../lib/supabaseClient'
import Footer from '../components/layout/Footer'
import Header from '../components/layout/Header'
import LoginCard from '../components/auth/LoginCard'

const splashDurationMs = 1200
const DEMO_SESSION_KEY = 'qr_sys_demo_session'

type FormState = {
  email: string
  password: string
}

export default function Home() {
  const [isReady, setIsReady] = React.useState(false)
  const [form, setForm] = React.useState<FormState>({ email: '', password: '' })
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = React.useState('')

  React.useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), splashDurationMs)
    return () => clearTimeout(timer)
  }, [])

  React.useEffect(() => {
    let cancelled = false
    async function autoRedirectIfLoggedIn() {
      const { data } = await supabase.auth.getSession()
      if (!cancelled && data.session) {
        window.location.replace('/dashboard')
      }
    }
    void autoRedirectIfLoggedIn()
    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
  }

  const handleLogin = async () => {
    if (!form.email || !form.password) return

    setStatus('loading')
    setMessage('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }

    if (!data.session) {
      setStatus('error')
      setMessage('로그인 세션을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.')
      return
    }

    setStatus('success')
    setMessage('로그인 성공! 대시보드로 이동합니다.')

    await supabase.auth.getSession()
    window.location.assign('/dashboard')
  }

  const handleDevLogin = () => {
    if (process.env.NODE_ENV === 'production') return

    const email = form.email || 'dev-superadmin@example.com'
    localStorage.setItem(
      DEMO_SESSION_KEY,
      JSON.stringify({
        email,
        role: 'SUPER',
        createdAt: new Date().toISOString(),
      })
    )
    setStatus('success')
    setMessage('개발용(더미) 로그인으로 대시보드로 이동합니다.')
    window.location.assign('/dashboard')
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-sky-50 via-white to-indigo-50 text-slate-900 transition-opacity duration-500 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-white ${
          isReady ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.5em] text-blue-600 dark:text-sky-300">PARKING QR HUB</p>
          <h1 className="mt-4 text-5xl font-black tracking-[0.2em]">QR PARKING SYS</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">로딩 중…</p>
        </div>
      </div>

      <div className={`min-h-screen pb-[100px] ${isReady ? 'opacity-100' : 'opacity-0'}`}>
        <Header />

        <main className="flex flex-1 flex-col justify-center px-6 py-12">
          <LoginCard form={form} onChange={handleChange} onSubmit={handleLogin} status={status} message={message} />

          {process.env.NODE_ENV !== 'production' && (
            <div className="mx-auto mt-4 w-full max-w-md">
              <button
                type="button"
                onClick={handleDevLogin}
                className="w-full rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                개발용(더미) 로그인
              </button>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Supabase 계정 생성이 막혀 있을 때 UI 흐름을 확인할 수 있도록 제공되는 개발 모드 기능입니다. (프로덕션에서는 숨김)
              </p>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  )
}

