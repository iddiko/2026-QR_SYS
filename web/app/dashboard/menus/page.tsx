"use client"

import React from 'react'
import EditablePageNote from '../../../components/admin/EditablePageNote'
import PageEditButton from '../../../components/admin/PageEditButton'
import useAppSession from '../../../lib/authSession'
import { MenuItem, useAdminCustomization } from '../../../lib/adminCustomization'
import { getClientAuthHeaders } from '../../../lib/clientAuth'

type RoleKey = 'SUPER' | 'MAIN' | 'SUB' | 'GUARD' | 'RESIDENT'
type TargetRole = Exclude<RoleKey, 'SUPER'>

type MenuRow = {
  key: string
  label: string
  depth: number
  hidden: boolean
}

function flattenMenus(nodes: MenuItem[], depth = 0): MenuRow[] {
  const rows: MenuRow[] = []
  for (const node of nodes) {
    rows.push({ key: node.id, label: node.label, depth, hidden: node.hidden === true })
    if (node.children?.length) rows.push(...flattenMenus(node.children, depth + 1))
  }
  return rows
}

const roleLabels: Record<TargetRole, string> = {
  MAIN: '메인 관리자',
  SUB: '서브 관리자',
  GUARD: '경비',
  RESIDENT: '입주민',
}

type ToggleState = Record<string, Record<TargetRole, boolean>>
const DEFAULT_ROLE_STATE: Record<TargetRole, boolean> = { MAIN: false, SUB: false, GUARD: false, RESIDENT: false }

function canManage(currentRole: RoleKey, targetRole: TargetRole) {
  if (currentRole === 'SUPER') return true
  if (currentRole === 'MAIN') return targetRole === 'SUB' || targetRole === 'GUARD' || targetRole === 'RESIDENT'
  if (currentRole === 'SUB') return targetRole === 'GUARD' || targetRole === 'RESIDENT'
  return false
}

function visibleColumns(currentRole: RoleKey): TargetRole[] {
  if (currentRole === 'SUPER') return ['MAIN', 'SUB', 'GUARD', 'RESIDENT']
  if (currentRole === 'MAIN') return ['SUB', 'GUARD', 'RESIDENT']
  if (currentRole === 'SUB') return ['GUARD', 'RESIDENT']
  return []
}

async function fetchJsonWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController()
  const id = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(input, { ...init, signal: controller.signal })
    const json = (await res.json().catch(() => ({}))) as any
    return { res, json }
  } finally {
    window.clearTimeout(id)
  }
}

async function fetchRoleConfig(targetRole: TargetRole) {
  const headers = await getClientAuthHeaders()
  if (!headers.Authorization && !headers['x-demo-role']) throw new Error('로그인이 필요합니다. 다시 로그인해주세요.')

  const { res, json } = await fetchJsonWithTimeout(
    `/api/menu-config?targetRole=${encodeURIComponent(targetRole)}`,
    { headers, cache: 'no-store' },
    8000
  )

  if (!res.ok) throw new Error((json?.error as string) ?? '메뉴 설정을 불러오지 못했습니다.')
  return (json?.config as Record<string, boolean> | undefined) ?? {}
}

async function saveRoleConfig(targetRole: TargetRole, menuKey: string, enabled: boolean) {
  const headers = await getClientAuthHeaders()
  if (!headers.Authorization && !headers['x-demo-role']) throw new Error('로그인이 필요합니다. 다시 로그인해주세요.')

  const { res, json } = await fetchJsonWithTimeout(
    '/api/menu-config',
    {
      method: 'PUT',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ targetRole, menuKey, enabled }),
    },
    8000
  )

  if (!res.ok) throw new Error((json?.error as string) ?? '저장에 실패했습니다.')
}

type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; message: string }
  | { kind: 'error'; message: string }

export default function RoleMenusPage() {
  const { session } = useAppSession()
  const currentRole = (session?.role as RoleKey | undefined) ?? 'SUPER'
  const columns = React.useMemo(() => visibleColumns(currentRole), [currentRole])
  const routeKey = '/dashboard/menus'

  const { state } = useAdminCustomization()
  const rows = React.useMemo(() => flattenMenus(state.menus ?? []), [state.menus])

  const menuRelations = React.useMemo(() => {
    const parentById = new Map<string, string | null>()
    const childrenById = new Map<string, string[]>()

    const visit = (nodes: MenuItem[], parentId: string | null) => {
      for (const node of nodes) {
        parentById.set(node.id, parentId)
        childrenById.set(node.id, (node.children ?? []).map((c) => c.id))
        if (node.children?.length) visit(node.children, node.id)
      }
    }

    visit(state.menus ?? [], null)

    const descendants = (id: string) => {
      const result: string[] = []
      const stack = [...(childrenById.get(id) ?? [])]
      while (stack.length) {
        const current = stack.pop()
        if (!current) continue
        result.push(current)
        const kids = childrenById.get(current)
        if (kids?.length) stack.push(...kids)
      }
      return result
    }

    const ancestors = (id: string) => {
      const result: string[] = []
      let current = parentById.get(id) ?? null
      while (current) {
        result.push(current)
        current = parentById.get(current) ?? null
      }
      return result
    }

    return { descendants, ancestors }
  }, [state.menus])

  const [toggles, setToggles] = React.useState<ToggleState>(() => ({}))
  const [baseline, setBaseline] = React.useState<ToggleState>(() => ({}))
  const [loadingConfig, setLoadingConfig] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [status, setStatus] = React.useState<SaveStatus>({ kind: 'idle' })

  React.useEffect(() => {
    setToggles((prev) => {
      const next: ToggleState = { ...prev }
      for (const row of rows) {
        if (!next[row.key]) next[row.key] = { ...DEFAULT_ROLE_STATE }
      }
      for (const key of Object.keys(next)) {
        if (!rows.some((r) => r.key === key)) delete next[key]
      }
      return next
    })

    setBaseline((prev) => {
      const next: ToggleState = { ...prev }
      for (const row of rows) {
        if (!next[row.key]) next[row.key] = { ...DEFAULT_ROLE_STATE }
      }
      for (const key of Object.keys(next)) {
        if (!rows.some((r) => r.key === key)) delete next[key]
      }
      return next
    })
  }, [rows])

  const loadConfigs = React.useCallback(async () => {
    if (columns.length === 0) return
    setLoadingConfig(true)
    setStatus({ kind: 'idle' })

    try {
      const results = await Promise.all(
        columns.map(async (targetRole) => ({ targetRole, config: await fetchRoleConfig(targetRole) }))
      )

      const nextState: ToggleState = {}
      for (const row of rows) nextState[row.key] = { ...DEFAULT_ROLE_STATE }
      for (const r of results) {
        for (const menuKey of Object.keys(nextState)) {
          const v = r.config[menuKey]
          if (typeof v === 'boolean') nextState[menuKey][r.targetRole] = v
        }
      }

      setToggles(nextState)
      setBaseline(nextState)
    } catch (e) {
      console.error(e)
      setStatus({ kind: 'error', message: '메뉴 설정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' })
    } finally {
      setLoadingConfig(false)
    }
  }, [columns, rows])

  React.useEffect(() => {
    void loadConfigs()
  }, [loadConfigs])

  React.useEffect(() => {
    if (status.kind !== 'saved') return
    const id = window.setTimeout(() => setStatus({ kind: 'idle' }), 2000)
    return () => window.clearTimeout(id)
  }, [status.kind])

  const setToggle = (menuKey: string, target: TargetRole, nextValue: boolean) => {
    setStatus({ kind: 'idle' })
    setToggles((prev) => {
      const next: ToggleState = { ...prev }

      const setValue = (key: string, value: boolean) => {
        next[key] = { ...(next[key] ?? DEFAULT_ROLE_STATE), [target]: value }
      }

      setValue(menuKey, nextValue)

      if (nextValue) {
        for (const parentId of menuRelations.ancestors(menuKey)) {
          setValue(parentId, true)
        }
      } else {
        for (const childId of menuRelations.descendants(menuKey)) {
          setValue(childId, false)
        }
      }

      return next
    })
  }

  const dirtyCount = React.useMemo(() => {
    let count = 0
    for (const menuKey of Object.keys(toggles)) {
      for (const targetRole of columns) {
        const a = toggles[menuKey]?.[targetRole] ?? false
        const b = baseline[menuKey]?.[targetRole] ?? false
        if (a !== b) count += 1
      }
    }
    return count
  }, [baseline, columns, toggles])

  const saveAll = async () => {
    if (saving) return
    if (dirtyCount === 0) return

    setSaving(true)
    setStatus({ kind: 'saving' })

    try {
      for (const menuKey of Object.keys(toggles)) {
        for (const targetRole of columns) {
          const nextValue = toggles[menuKey]?.[targetRole] ?? false
          const prevValue = baseline[menuKey]?.[targetRole] ?? false
          if (nextValue === prevValue) continue
          await saveRoleConfig(targetRole, menuKey, nextValue)
        }
      }
      setBaseline(toggles)
      setStatus({ kind: 'saved', message: '저장 완료' })
    } catch (e) {
      console.error(e)
      setStatus({ kind: 'error', message: '저장에 실패했습니다. 잠시 후 다시 시도해주세요.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-600 dark:text-sky-300">권한</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">권한별 메뉴 관리</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            가로: {columns.map((c) => roleLabels[c]).join(' / ') || '없음'} · 세로: 모든 메뉴(대분류/하위메뉴 포함) · 각 셀에서 ON/OFF를 변경한 뒤
            저장 버튼으로 반영합니다.
          </p>
        </div>
        <PageEditButton routeKey={routeKey} />
      </div>

      <EditablePageNote routeKey={routeKey} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/60 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div>
            변경사항: <span className="font-semibold text-slate-900 dark:text-white">{dirtyCount}</span>건
          </div>
          {loadingConfig ? <div className="text-slate-500">불러오는 중…</div> : null}
          {status.kind === 'saving' ? <div className="text-slate-500">저장 중…</div> : null}
          {status.kind === 'saved' ? <div className="text-emerald-700 dark:text-emerald-300">{status.message}</div> : null}
          {status.kind === 'error' ? <div className="text-rose-700 dark:text-rose-300">{status.message}</div> : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadConfigs}
            disabled={loadingConfig || saving}
            className="rounded-full border border-slate-200/70 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            새로고침
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus({ kind: 'idle' })
              setToggles(baseline)
            }}
            disabled={dirtyCount === 0 || saving}
            className="rounded-full border border-slate-200/70 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            변경 취소
          </button>
          <button
            type="button"
            onClick={saveAll}
            disabled={dirtyCount === 0 || saving}
            className="rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            저장
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
        <p className="font-semibold text-slate-900 dark:text-white">규칙</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-400">
          <li>최고관리자(SUPER)는 모든 메뉴/데이터 제약이 없습니다.</li>
          <li>메인 관리자는 서브/경비/입주민 메뉴만 ON/OFF 할 수 있습니다.</li>
          <li>서브 관리자는 경비/입주민 메뉴만 ON/OFF 할 수 있습니다.</li>
          <li>같은 레벨끼리는 서로의 메뉴를 볼 수도, 조절할 수도 없습니다.</li>
          <li>대분류 메뉴를 OFF 하면 하위 메뉴도 자동으로 OFF 됩니다.</li>
        </ul>
      </div>

      {columns.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          현재 역할에서는 메뉴 ON/OFF를 관리할 수 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10">
          <table className="w-full min-w-[760px] border-collapse bg-white/70 text-sm dark:bg-slate-950/40">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/10">
                <th className="w-[360px] px-4 py-3 text-left text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  메뉴
                </th>
                {columns.map((role) => (
                  <th
                    key={role}
                    className="px-4 py-3 text-left text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400"
                  >
                    {roleLabels[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-white/5 last:border-b-0">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-2 ${
                        row.depth === 0 ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                      } ${row.hidden ? 'opacity-60' : ''}`}
                      style={{ paddingLeft: `${row.depth * 14}px` }}
                    >
                      {row.depth > 0 ? <span className="mr-1 text-slate-300 dark:text-slate-600">└</span> : null}
                      {row.label}
                      {row.hidden ? (
                        <span className="rounded-full border border-slate-200/70 bg-white px-2 py-0.5 text-[10px] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                          숨김
                        </span>
                      ) : null}
                    </span>
                  </td>
                  {columns.map((targetRole) => {
                    const allowed = canManage(currentRole, targetRole)
                    const value = toggles[row.key]?.[targetRole] ?? false
                    return (
                      <td key={`${row.key}:${targetRole}`} className="px-4 py-3">
                        <button
                          type="button"
                          disabled={!allowed}
                          onClick={() => setToggle(row.key, targetRole, !value)}
                          className={`inline-flex w-24 items-center justify-between rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                            !allowed
                              ? 'cursor-not-allowed border-slate-200/80 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5'
                              : value
                                ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 hover:bg-blue-500/15 dark:text-sky-300'
                                : 'border-rose-500/30 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 dark:text-rose-300'
                          }`}
                        >
                          <span>{value ? 'ON' : 'OFF'}</span>
                          <span
                            className={`h-4 w-4 rounded-full ${
                              !allowed ? 'bg-slate-300 dark:bg-slate-700' : value ? 'bg-blue-500' : 'bg-rose-500'
                            }`}
                          />
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
