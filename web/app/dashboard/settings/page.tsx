"use client"

import EditablePageNote from '../../../components/admin/EditablePageNote'
import PageEditButton from '../../../components/admin/PageEditButton'

export default function SettingsPage() {
  const routeKey = '/dashboard/settings'

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">설정</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">프로젝트 설정</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            단지 운영 정책/권한/알림 등 설정을 모아두는 화면입니다. (추가 예정)
          </p>
        </div>
        <PageEditButton routeKey={routeKey} />
      </div>

      <EditablePageNote routeKey={routeKey} />
    </section>
  )
}
