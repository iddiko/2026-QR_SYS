"use client"

import EditablePageNote from '../../../components/admin/EditablePageNote'
import PageEditButton from '../../../components/admin/PageEditButton'

export default function GasPage() {
  const routeKey = '/dashboard/gas'

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">업무</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">가스검침</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            입주민 자가 입력 또는 관리자의 검침 기록을 저장/조회하는 기능을 연결합니다.
          </p>
        </div>
        <PageEditButton routeKey={routeKey} />
      </div>

      <EditablePageNote routeKey={routeKey} />
    </section>
  )
}
