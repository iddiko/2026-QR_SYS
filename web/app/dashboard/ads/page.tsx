"use client"

import Link from 'next/link'
import EditablePageNote from '../../../components/admin/EditablePageNote'
import PageEditButton from '../../../components/admin/PageEditButton'

export default function AdsHubPage() {
  const routeKey = '/dashboard/ads'

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">관리</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">소식/광고 관리</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            단지 소식 게시판과 광고(이미지 게시판)를 운영합니다.
          </p>
        </div>
        <PageEditButton routeKey={routeKey} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/dashboard/ads/news"
          className="group rounded-3xl border border-slate-200/70 bg-white/70 p-5 transition hover:border-blue-500/30 hover:bg-white dark:border-white/10 dark:bg-white/5"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">게시판</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">소식 관리</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">일반 게시판 형태로 공지/소식을 등록합니다.</p>
          <p className="mt-4 text-sm font-semibold text-blue-700 dark:text-sky-300">이동하기 →</p>
        </Link>

        <Link
          href="/dashboard/ads/ads"
          className="group rounded-3xl border border-slate-200/70 bg-white/70 p-5 transition hover:border-blue-500/30 hover:bg-white dark:border-white/10 dark:bg-white/5"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">이미지</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">광고 관리</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">이미지 카드 형태로 광고를 등록합니다.</p>
          <p className="mt-4 text-sm font-semibold text-blue-700 dark:text-sky-300">이동하기 →</p>
        </Link>
      </div>

      <EditablePageNote routeKey={routeKey} />
    </section>
  )
}

