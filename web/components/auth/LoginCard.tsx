"use client"

import React from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

type LoginCardProps = {
  form: { email: string; password: string }
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: () => void
  status: Status
  message: string
}

export default function LoginCard({ form, onChange, onSubmit, status, message }: LoginCardProps) {
  const isFormValid = form.email !== '' && form.password !== ''

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-[0_15px_35px_rgba(2,6,23,0.9)]">
      <h2 className="text-xl font-semibold text-white">로그인 · 조직 확인</h2>
      <p className="mt-2 text-sm text-slate-400">
        슈퍼/메인/서브 관리자 또는 경비/입주민으로 로그인하면 역할별 대시보드로 이동합니다.
      </p>

      <form className="mt-6 space-y-4" onSubmit={(event) => event.preventDefault()}>
        <label className="block text-xs uppercase tracking-[0.4em] text-slate-400">이메일</label>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          placeholder="admin@example.com"
        />

        <label className="block text-xs uppercase tracking-[0.4em] text-slate-400">비밀번호</label>
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={onChange}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          placeholder="********"
        />

        <button
          type="button"
          onClick={onSubmit}
          disabled={!isFormValid || status === 'loading'}
          className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] transition ${
            isFormValid
              ? 'bg-emerald-500 text-slate-900 hover:bg-emerald-400'
              : 'bg-white/10 text-slate-500 cursor-not-allowed'
          }`}
        >
          {status === 'loading' ? '로그인 중...' : '로그인'}
        </button>
      </form>

      {message && (
        <p className={`mt-4 text-xs ${status === 'error' ? 'text-rose-400' : 'text-emerald-300'}`}>
          {message}
        </p>
      )}
      <p className="mt-2 text-xs text-slate-500">
        로그인 시 Supabase Auth와 역할별 메뉴 구성이 활성화됩니다.
      </p>
    </div>
  )
}
