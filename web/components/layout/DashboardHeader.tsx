"use client"

import React from 'react'

type DashboardHeaderProps = {
  title?: string
  subtitle?: string
  right?: React.ReactNode
}

export default function DashboardHeader({ title = '대시보드', subtitle, right }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-20 h-16 border-b border-slate-200/80 bg-slate-100/85 px-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
      <div className="flex h-16 w-full items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">
            QR Parking
          </p>
          <h1 className="truncate text-lg font-semibold text-slate-950 dark:text-white">{title}</h1>
          {subtitle ? <p className="mt-1 truncate text-xs text-slate-600 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">{right}</div>
      </div>
    </header>
  )
}

