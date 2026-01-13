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
    <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/90 p-8 shadow-[0_15px_35px_rgba(2,6,23,0.08)] backdrop-blur dark:bg-slate-950/60 dark:shadow-[0_15px_35px_rgba(2,6,23,0.9)]">
      <h2 className="text-xl font-semibold text-slate-950 dark:text-white">로그인</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        회원가입은 받지 않습니다. 메인/서브 관리자가 초대(이메일)한 계정만 로그인할 수 있습니다.
      </p>

      <form className="mt-6 space-y-4" onSubmit={(event) => event.preventDefault()}>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
            이메일
          </label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
            placeholder="superadmin@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
            비밀번호
          </label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
            placeholder="********"
            autoComplete="current-password"
          />
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!isFormValid || status === 'loading'}
          className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] transition ${
            isFormValid
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-500'
          }`}
        >
          {status === 'loading' ? '로그인 중…' : '로그인'}
        </button>
      </form>

      {message ? (
        <p className={`mt-4 text-xs ${status === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>{message}</p>
      ) : null}

      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">로그인 후 권한에 따라 대시보드/메뉴가 자동 구성됩니다.</p>
    </div>
  )
}

