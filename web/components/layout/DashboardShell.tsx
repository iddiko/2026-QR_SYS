"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import DashboardFooter from './DashboardFooter'
import DashboardHeader from './DashboardHeader'
import DashboardSidebar from './DashboardSidebar'
import useAppSession, { clearAppSession } from '../../lib/authSession'
import AdminEditControls from '../admin/AdminEditControls'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { session, loading } = useAppSession()

  const handleLogout = async () => {
    await clearAppSession()
    router.replace('/')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200/60 bg-white/80 p-8 shadow-sm backdrop-blur">
          로딩 중...
        </div>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200/60 bg-white/80 p-8 shadow-sm backdrop-blur">
          <p className="text-sm text-rose-700">로그인이 필요합니다.</p>
          <button
            type="button"
            onClick={() => router.replace('/')}
            className="mt-4 rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-800 hover:bg-white"
          >
            로그인 화면으로
          </button>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen pb-[60px]">
      <DashboardHeader
        title="단지별 관리 대시보드"
        right={<AdminEditControls email={session.email} role={session.role} onLogout={handleLogout} />}
      />

      <DashboardSidebar userLabel={session.email} roleLabel={session.role} />

      <div className="relative z-0 min-w-0 px-6 py-8 lg:pl-[19.5rem]">
        <div className="w-full">{children}</div>
      </div>

      <DashboardFooter />
    </div>
  )
}

