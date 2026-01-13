"use client"

import React from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import { useTheme } from '../theme/ThemeProvider'

type DashboardUserMenuProps = {
  email: string
  role?: string
  onLogout: () => void
}

export default function DashboardUserMenu({ email, onLogout }: DashboardUserMenuProps) {
  const { theme, toggleTheme } = useTheme()
  const [open, setOpen] = React.useState(false)
  const [qrUrl, setQrUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(email, { margin: 1, width: 160 })
      .then((url) => {
        if (!cancelled) setQrUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [email])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-full border border-slate-200/80 bg-white/70 p-2 text-slate-800 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/10"
        aria-label="마이페이지"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div
        className={`absolute right-0 top-[calc(100%+10px)] w-[220px] overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_20px_40px_rgba(2,6,23,0.14)] backdrop-blur transition-all duration-200 dark:border-white/10 dark:bg-slate-950/80 ${
          open ? 'max-h-[520px] opacity-100' : 'pointer-events-none max-h-0 opacity-0'
        }`}
      >
        <div className="p-5">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">계정</p>
          <p className="mt-1 truncate text-sm font-normal text-slate-700 dark:text-slate-200">{email}</p>

          <div className="mt-4 grid gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-left text-sm text-slate-800 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <p className="font-semibold">모드 설정</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">현재: {theme === 'dark' ? '다크' : '라이트'}</p>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-left text-sm text-rose-700 hover:bg-rose-500/15 dark:text-rose-300"
            >
              <p className="font-semibold">로그아웃</p>
              <p className="text-xs text-rose-600/80 dark:text-rose-300/80">세션을 종료합니다.</p>
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">QR</p>
            <div className="mt-3 flex items-center justify-center">
              {qrUrl ? (
                <Image
                  src={qrUrl}
                  alt="QR code"
                  width={100}
                  height={100}
                  className="rounded-2xl border border-slate-200/80 bg-white p-2 dark:border-white/10"
                />
              ) : (
                <div className="flex h-[100px] w-[100px] items-center justify-center rounded-2xl border border-slate-200/80 bg-white/70 text-xs text-slate-500 dark:border-white/10 dark:bg-white/5">
                  생성 실패
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 w-full rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/10"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
