"use client"

import React from 'react'
import supabase from '../lib/supabaseClient'
import Footer from '../components/layout/Footer'
import Header from '../components/layout/Header'
import LoginCard from '../components/auth/LoginCard'

const splashDurationMs = 2200

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

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
  }

  const handleLogin = async () => {
    if (!form.email || !form.password) return

    setStatus('loading')
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }

    setStatus('success')
    setMessage('로그인 성공! 역할별 대시보드로 이동합니다.')
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-white transition-opacity duration-500 ${
          isReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.5em] text-emerald-400">PARKING QR HUB</p>
          <h1 className="mt-4 text-5xl font-black tracking-[0.2em]">QR PARKING SYS</h1>
          <p className="mt-2 text-sm text-slate-400">Loading...</p>
        </div>
      </div>

      <div className={`min-h-screen bg-slate-950 text-white pb-[100px] ${isReady ? 'opacity-100' : 'opacity-0'}`}>
        <Header />

        <main className="flex flex-1 flex-col justify-center px-6 py-12">
          <LoginCard
            form={form}
            onChange={handleChange}
            onSubmit={handleLogin}
            status={status}
            message={message}
          />
        </main>

        <Footer />
      </div>
    </>
  )
}
