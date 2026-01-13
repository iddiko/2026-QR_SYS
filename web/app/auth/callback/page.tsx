"use client"

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import supabase from '../../../lib/supabaseClient'

export default function AuthCallbackPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [message, setMessage] = React.useState('로그인 처리 중...')

  React.useEffect(() => {
    let cancelled = false

    async function run() {
      const code = params.get('code')
      const next = params.get('next') ?? '/dashboard'

      if (!code) {
        if (!cancelled) setMessage('인증 코드가 없습니다. 초대 메일 링크로 다시 접속해 주세요.')
        return
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        if (!cancelled) setMessage(error.message)
        return
      }

      router.replace(next)
    }

    run()
    return () => {
      cancelled = true
    }
  }, [params, router])

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-6 py-16 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200/80 bg-white/80 p-8 text-sm text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200">
        {message}
      </div>
    </main>
  )
}

