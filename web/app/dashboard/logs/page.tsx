"use client"

import EditablePageNote from '../../../components/admin/EditablePageNote'
import PageEditButton from '../../../components/admin/PageEditButton'

export default function LogsPage() {
  const routeKey = '/dashboard/logs'

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">감사</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">활동 로그</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            QR 스캔, 메뉴 변경, 사용자 생성 등 주요 이벤트를 기록/조회하는 화면입니다. (DB 연결 예정)
          </p>
        </div>
        <PageEditButton routeKey={routeKey} />
      </div>

      <EditablePageNote routeKey={routeKey} />
    </section>
  )
}
