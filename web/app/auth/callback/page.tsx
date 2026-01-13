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
      const tokenHash = params.get('token_hash')
      const type = params.get('type')
      const next = params.get('next') ?? '/dashboard'

      // 1) PKCE code flow (OAuth/초대/매직링크 일부)
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          if (!cancelled) setMessage(error.message)
          return
        }
        router.replace(next)
        return
      }

      // 2) token_hash verify (invite / recovery / magiclink)
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ type: type as any, token_hash: tokenHash })
        if (error) {
          if (!cancelled) setMessage(error.message)
          return
        }
        router.replace(next)
        return
      }

      // 3) Implicit tokens in URL hash (#access_token=..., #refresh_token=...)
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) {
            if (!cancelled) setMessage(error.message)
            return
          }
          router.replace(next)
          return
        }
      }

      if (!cancelled) {
        setMessage('인증 코드가 없습니다. 초대/비밀번호 재설정 메일의 링크를 다시 눌러 접속해 주세요.')
      }
    }

    void run()
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
