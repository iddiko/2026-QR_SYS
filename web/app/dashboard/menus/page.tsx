"use client"

import React from 'react'
import EditablePageNote from '../../../components/admin/EditablePageNote'
import PageEditButton from '../../../components/admin/PageEditButton'
import useAppSession from '../../../lib/authSession'

type RoleKey = 'SUPER' | 'MAIN' | 'SUB' | 'GUARD' | 'RESIDENT'
type TargetRole = Exclude<RoleKey, 'SUPER'>

type MenuNode = {
  key: string
  label: string
  children?: MenuNode[]
}

const menuTree: MenuNode[] = [
  { key: 'dashboard', label: '대시보드' },
  {
    key: 'management',
    label: '단지/동/입주민 관리',
    children: [
      { key: 'complexes', label: '단지 관리' },
      { key: 'buildings', label: '동 관리' },
      { key: 'resident-qr', label: '입주민/QR 관리' },
    ],
  },
  { key: 'gas', label: '가스검침' },
  { key: 'ads', label: '소식/광고 관리' },
  { key: 'menus', label: '권한별 메뉴 관리' },
  { key: 'logs', label: '활동 로그' },
  { key: 'settings', label: '설정' },
]

type MenuRow = {
  key: string
  label: string
  depth: number
}

function flattenMenus(nodes: MenuNode[], depth = 0): MenuRow[] {
  const rows: MenuRow[] = []
  for (const node of nodes) {
    rows.push({ key: node.key, label: node.label, depth })
    if (node.children?.length) rows.push(...flattenMenus(node.children, depth + 1))
  }
  return rows
}

const rows = flattenMenus(menuTree)

const roleLabels: Record<TargetRole, string> = {
  MAIN: '메인 관리자',
  SUB: '서브 관리자',
  GUARD: '경비',
  RESIDENT: '입주민',
}

type ToggleState = Record<string, Record<TargetRole, boolean>>

function getDefaultToggles(): ToggleState {
  const initial: ToggleState = {}
  for (const row of rows) {
    initial[row.key] = { MAIN: true, SUB: true, GUARD: true, RESIDENT: true }
  }
  return initial
}

function canManage(currentRole: RoleKey, targetRole: TargetRole) {
  if (currentRole === 'SUPER') return true
  if (currentRole === 'MAIN') return targetRole === 'GUARD' || targetRole === 'RESIDENT'
  if (currentRole === 'SUB') return targetRole === 'GUARD' || targetRole === 'RESIDENT'
  return false
}

function visibleColumns(currentRole: RoleKey): TargetRole[] {
  if (currentRole === 'SUPER') return ['MAIN', 'SUB', 'GUARD', 'RESIDENT']
  if (currentRole === 'MAIN') return ['GUARD', 'RESIDENT']
  if (currentRole === 'SUB') return ['GUARD', 'RESIDENT']
  return []
}

export default function RoleMenusPage() {
  const { session } = useAppSession()
  const currentRole = (session?.role as RoleKey | undefined) ?? 'SUPER'
  const columns = visibleColumns(currentRole)
  const [toggles, setToggles] = React.useState<ToggleState>(() => getDefaultToggles())
  const routeKey = '/dashboard/menus'

  const setToggle = (menuKey: string, target: TargetRole, next: boolean) => {
    setToggles((prev) => ({
      ...prev,
      [menuKey]: {
        ...prev[menuKey],
        [target]: next,
      },
    }))
  }

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">관리</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">권한별 메뉴 관리</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            상위 관리자가 하위 권한의 메뉴를 ON/OFF 합니다. 동급/상위 권한의 메뉴는 볼 수도, 변경할 수도 없습니다.
          </p>
        </div>
        <PageEditButton routeKey={routeKey} />
      </div>

      <EditablePageNote routeKey={routeKey} />

      <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
        <p className="font-semibold text-slate-900 dark:text-white">규칙</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-400">
          <li>최고관리자는 메인/서브/경비/입주민 메뉴를 모두 관리합니다.</li>
          <li>메인/서브 관리자는 경비/입주민 메뉴만 관리합니다.</li>
          <li>같은 레벨(메인↔메인, 서브↔서브)끼리는 서로의 메뉴를 볼/수정할 수 없습니다.</li>
          <li>QR 발행/생성은 모든 관리자에게 열리되, 소속 단지/동 범위 내에서만 허용됩니다. (최고관리자는 제약 없음)</li>
        </ul>
      </div>

      {columns.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          이 역할은 권한별 메뉴를 관리할 수 없습니다.
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
                      className={`inline-flex items-center ${
                        row.depth === 0 ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                      }`}
                      style={{ paddingLeft: `${row.depth * 14}px` }}
                    >
                      {row.depth > 0 && <span className="mr-2 text-slate-300 dark:text-slate-600">↳</span>}
                      {row.label}
                    </span>
                  </td>
                  {columns.map((targetRole) => {
                    const allowed = canManage(currentRole, targetRole)
                    const value = toggles[row.key]?.[targetRole] ?? true
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
