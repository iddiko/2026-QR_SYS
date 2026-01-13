"use client"

import EditablePageNote from '../../../components/admin/EditablePageNote'
import PageEditButton from '../../../components/admin/PageEditButton'

export default function ManagementPage() {
  const routeKey = '/dashboard/management'

  return (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-white/70 p-6 backdrop-blur dark:bg-slate-950/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">관리</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">단지/동/입주민 관리</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            이 페이지는 그룹형 메뉴 예시용입니다. 실제 기능은 하위 메뉴로 분리되어 있습니다.
          </p>
        </div>
        <PageEditButton routeKey={routeKey} />
      </div>

      <EditablePageNote routeKey={routeKey} />
    </section>
  )
}

