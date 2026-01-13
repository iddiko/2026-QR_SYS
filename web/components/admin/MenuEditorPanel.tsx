"use client"

import React from 'react'
import { MenuItem, useAdminCustomization } from '../../lib/adminCustomization'

function newId(prefix = 'menu') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

type MenuEditorPanelProps = {
  open: boolean
  onClose: () => void
}

export default function MenuEditorPanel({ open, onClose }: MenuEditorPanelProps) {
  const { state, setMenus, resetAll } = useAdminCustomization()
  const [draft, setDraft] = React.useState<MenuItem[]>(state.menus)

  React.useEffect(() => {
    setDraft(state.menus)
  }, [state.menus])

  const apply = () => setMenus(draft)

  const updateLabel = (path: number[], label: string) => {
    setDraft((prev) => {
      const next = structuredClone(prev) as MenuItem[]
      let current: MenuItem[] = next
      for (let i = 0; i < path.length - 1; i++) current = current[path[i]].children ?? []
      current[path[path.length - 1]].label = label
      return next
    })
  }

  const toggleHidden = (path: number[]) => {
    setDraft((prev) => {
      const next = structuredClone(prev) as MenuItem[]
      let current: MenuItem[] = next
      for (let i = 0; i < path.length - 1; i++) current = current[path[i]].children ?? []
      const target = current[path[path.length - 1]]
      target.hidden = !target.hidden
      return next
    })
  }

  const addMenu = () => {
    const pageId = newId('page')
    setDraft((prev) => [...prev, { id: newId('menu'), label: '새 메뉴', href: `/dashboard/custom/${pageId}` }])
  }

  const addSubMenu = (parentIndex: number) => {
    const pageId = newId('page')
    setDraft((prev) => {
      const next = structuredClone(prev) as MenuItem[]
      const parent = next[parentIndex]

      // 상위 메뉴가 링크(href)를 가진 상태에서 하위 메뉴를 추가하면,
      // 사이드바에서 "그룹"으로 처리되도록 href를 제거합니다.
      if (parent.href) parent.href = undefined

      const child: MenuItem = { id: newId('submenu'), label: '새 하위 메뉴', href: `/dashboard/custom/${pageId}` }
      parent.children = [...(parent.children ?? []), child]
      return next
    })
  }

  const removeAt = (path: number[]) => {
    setDraft((prev) => {
      const next = structuredClone(prev) as MenuItem[]
      if (path.length === 1) {
        next.splice(path[0], 1)
        return next
      }
      const parentIndex = path[0]
      const childIndex = path[1]
      const parent = next[parentIndex]
      parent.children = [...(parent.children ?? [])]
      parent.children.splice(childIndex, 1)
      return next
    })
  }

  const moveAt = (path: number[], dir: -1 | 1) => {
    setDraft((prev) => {
      const next = structuredClone(prev) as MenuItem[]
      if (path.length === 1) {
        const index = path[0]
        const target = index + dir
        if (target < 0 || target >= next.length) return prev
        return moveItem(next, index, target)
      }

      const parentIndex = path[0]
      const childIndex = path[1]
      const parent = next[parentIndex]
      const children = [...(parent.children ?? [])]
      const target = childIndex + dir
      if (target < 0 || target >= children.length) return prev
      parent.children = moveItem(children, childIndex, target)
      return next
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40" aria-hidden={!open}>
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      <aside className="absolute right-0 top-16 flex h-[calc(100vh-4rem-60px)] w-[420px] flex-col border-l border-slate-200/80 bg-white/90 p-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/85">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-600 dark:text-sky-300">
              최고관리자 편집 모드
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">메뉴 편집</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200/70 bg-white/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/10"
          >
            닫기
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
          메뉴/하위메뉴 이름 수정, 추가, 가리기, 삭제, 순서 변경이 가능합니다. 숨김 처리된 메뉴는 사이드바에서
          보이지 않습니다.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addMenu}
            className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white hover:bg-blue-500"
          >
            메뉴 추가
          </button>
          <button
            type="button"
            onClick={apply}
            className="rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-800 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/10"
          >
            저장
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-rose-700 hover:bg-rose-500/15 dark:text-rose-300"
          >
            기본값 초기화
          </button>
        </div>

        <div className="mt-3 flex-1 space-y-3 overflow-auto pr-1">
          {draft.map((item, index) => (
            <div
              key={item.id}
              className={`rounded-3xl border border-slate-200/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5 ${
                item.hidden ? 'opacity-70' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  value={item.label}
                  onChange={(e) => updateLabel([index], e.target.value)}
                  className="flex-1 rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                  aria-label="메뉴 이름"
                />

                <button
                  type="button"
                  onClick={() => moveAt([index], -1)}
                  className="rounded-2xl border border-slate-200/70 bg-white/60 px-3 py-2 text-xs text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                  aria-label="위로"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveAt([index], 1)}
                  className="rounded-2xl border border-slate-200/70 bg-white/60 px-3 py-2 text-xs text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                  aria-label="아래로"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => toggleHidden([index])}
                  className="rounded-2xl border border-slate-200/70 bg-white/60 px-3 py-2 text-xs text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                >
                  {item.hidden ? '보이기' : '가리기'}
                </button>
                <button
                  type="button"
                  onClick={() => removeAt([index])}
                  className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 hover:bg-rose-500/15 dark:text-rose-300"
                >
                  삭제
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {item.href ? `링크: ${item.href}` : '그룹(하위 메뉴를 펼쳐 표시)'}
                </p>
                <button
                  type="button"
                  onClick={() => addSubMenu(index)}
                  className="shrink-0 rounded-full border border-slate-200/70 bg-white/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  하위 메뉴 추가
                </button>
              </div>

              {item.children?.length ? (
                <div className="mt-3 space-y-2">
                  {item.children.map((child, childIndex) => (
                    <div
                      key={child.id}
                      className={`flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/80 p-2 dark:border-white/10 dark:bg-white/5 ${
                        child.hidden ? 'opacity-70' : ''
                      }`}
                    >
                      <span className="px-1 text-xs text-slate-400">└</span>
                      <input
                        value={child.label}
                        onChange={(e) => updateLabel([index, childIndex], e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                        aria-label="하위 메뉴 이름"
                      />

                      <button
                        type="button"
                        onClick={() => moveAt([index, childIndex], -1)}
                        className="rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2 text-xs text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                        aria-label="위로"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveAt([index, childIndex], 1)}
                        className="rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2 text-xs text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                        aria-label="아래로"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleHidden([index, childIndex])}
                        className="rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2 text-xs text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                      >
                        {child.hidden ? '보이기' : '가리기'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAt([index, childIndex])}
                        className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 hover:bg-rose-500/15 dark:text-rose-300"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

