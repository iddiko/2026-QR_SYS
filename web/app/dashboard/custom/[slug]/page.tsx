"use client"

import React from 'react'
import { useParams } from 'next/navigation'
import EditablePageNote from '../../../../components/admin/EditablePageNote'
import PageEditButton from '../../../../components/admin/PageEditButton'
import { MenuItem, useAdminCustomization } from '../../../../lib/adminCustomization'

function findLabel(menus: MenuItem[], href: string): string | null {
  for (const item of menus) {
    if (item.href === href) return item.label
    if (item.children?.length) {
      const nested = findLabel(item.children, href)
      if (nested) return nested
    }
  }
  return null
}

export default function CustomPage() {
  const params = useParams<{ slug?: string | string[] }>()
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug
  const routeKey = `/dashboard/custom/${slug ?? ''}`
  const { state } = useAdminCustomization()
  const title = findLabel(state.menus, routeKey) ?? '커스텀 페이지'

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">커스텀</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            최고관리자가 “메뉴 편집”에서 추가한 페이지입니다. 이 페이지도 동일하게 “페이지 수정”을 지원합니다.
          </p>
        </div>
        <PageEditButton routeKey={routeKey} />
      </div>

      <EditablePageNote routeKey={routeKey} />

      <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
        slug: <span className="font-mono text-slate-800 dark:text-slate-200">{slug ?? '(없음)'}</span>
      </div>
    </section>
  )
}
