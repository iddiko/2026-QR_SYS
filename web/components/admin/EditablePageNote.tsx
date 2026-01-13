"use client"

import React from 'react'
import { useAdminCustomization } from '../../lib/adminCustomization'

type EditablePageNoteProps = {
  routeKey: string
  defaultNote?: string
}

export default function EditablePageNote({ routeKey, defaultNote }: EditablePageNoteProps) {
  const { state } = useAdminCustomization()
  const note = (state.pages[routeKey]?.note ?? defaultNote ?? '').trim()

  if (!note && !state.editMode) return null

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
      <p className="text-xs uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">안내</p>
      {note ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">{note}</p>
      ) : (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          (편집 모드) 우측 상단의 <span className="font-semibold">페이지 수정</span> 버튼에서 이 페이지 안내문을 설정할 수 있습니다.
        </p>
      )}
    </section>
  )
}
