"use client"

import React from 'react'
import useAppSession from '../../lib/authSession'
import { useAdminCustomization } from '../../lib/adminCustomization'

type PageEditButtonProps = {
  routeKey: string
  defaultNote?: string
}

export default function PageEditButton({ routeKey, defaultNote }: PageEditButtonProps) {
  const { session } = useAppSession()
  const isSuper = session?.role === 'SUPER'
  const { state, setPageCustomization } = useAdminCustomization()
  const [open, setOpen] = React.useState(false)

  if (!isSuper || !state.editMode) return null

  const current = state.pages[routeKey]?.note ?? defaultNote ?? ''

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-blue-700 hover:bg-blue-500/15 dark:text-sky-300"
      >
        페이지 수정
      </button>

      <div
        className={`absolute right-0 top-[calc(100%+10px)] w-[360px] rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_20px_40px_rgba(2,6,23,0.15)] backdrop-blur transition-all dark:border-white/10 dark:bg-slate-950/85 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">페이지 안내문</p>
        <textarea
          value={current}
          onChange={(e) => setPageCustomization(routeKey, { note: e.target.value })}
          className="mt-2 h-28 w-full resize-none rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          placeholder="이 페이지 상단에 노출할 안내문을 입력하세요."
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.3em] text-slate-700 hover:bg-white/20 dark:text-slate-200 dark:hover:bg-white/10"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
