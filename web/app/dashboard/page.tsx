"use client"

import MainAdminView from '../../components/dashboard/MainAdminView'
import SubAdminView from '../../components/dashboard/SubAdminView'
import SuperAdminView from '../../components/dashboard/SuperAdminView'
import EditablePageNote from '../../components/admin/EditablePageNote'
import PageEditButton from '../../components/admin/PageEditButton'
import useAppSession from '../../lib/authSession'
import { useComplexScope } from '../../lib/complexScope'

export default function DashboardPage() {
  const { session } = useAppSession()
  const role = session?.role ?? 'SUPER'
  const { scope } = useComplexScope()
  const routeKey = '/dashboard'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">
            {scope.name}
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">대시보드</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {session?.email ? `${session.email}님` : '로그인 사용자'} · 역할: {role}
          </p>
        </div>
        <PageEditButton routeKey={routeKey} />
      </div>

      <EditablePageNote routeKey={routeKey} />

      {role === 'SUPER' && <SuperAdminView />}
      {role === 'MAIN' && <MainAdminView />}
      {role === 'SUB' && <SubAdminView />}
      {(role === 'GUARD' || role === 'RESIDENT') && (
        <section className="rounded-3xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
          <p className="text-xs uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">안내</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">입주민/경비 화면 준비 중</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            현재는 관리자 중심의 기능부터 구현하고 있습니다. 다음 단계에서 입주민/경비 전용 메뉴와 QR 스캔 흐름을 연결합니다.
          </p>
        </section>
      )}
    </div>
  )
}
