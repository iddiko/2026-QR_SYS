"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ComplexScopeSelect from './ComplexScopeSelect'
import useAppSession from '../../lib/authSession'
import { useAdminCustomization } from '../../lib/adminCustomization'

type DashboardSidebarProps = {
  userLabel: string
  roleLabel?: string
  complexLabel?: string
}

const fallbackFlatItems = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/dashboard/menus', label: '권한별 메뉴 관리' },
  { href: '/dashboard/gas', label: '가스검침' },
  { href: '/dashboard/logs', label: '활동 로그' },
  { href: '/dashboard/settings', label: '설정' },
]

const fallbackManagementItems = [
  { href: '/dashboard/complexes', label: '단지 관리' },
  { href: '/dashboard/buildings', label: '동 관리' },
  { href: '/dashboard/resident-qr', label: '입주민/QR 관리' },
]

const fallbackGroupItems = [
  {
    id: 'ads',
    label: '소식/광고 관리',
    children: [
      { href: '/dashboard/ads/news', label: '소식 관리' },
      { href: '/dashboard/ads/ads', label: '광고 관리' },
    ],
  },
]

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200/70 bg-white/60 text-slate-600 transition dark:border-white/10 dark:bg-white/10 dark:text-slate-200 ${
        open ? 'rotate-90' : ''
      }`}
      aria-hidden="true"
    >
      &gt;
    </span>
  )
}

export default function DashboardSidebar({ userLabel, roleLabel, complexLabel }: DashboardSidebarProps) {
  const pathname = usePathname()
  const { session } = useAppSession()
  const isSuper = session?.role === 'SUPER'
  const { state } = useAdminCustomization()

  const isActiveHref = (href: string) => pathname === href

  const managementItems =
    state.menus.find((m) => m.id === 'management')?.children?.filter((c) => c.href) ?? fallbackManagementItems

  const otherGroups = state.menus
    .filter((m) => m.id !== 'management')
    .filter((m) => (m.children?.length ?? 0) > 0)
    .map((m) => ({
      id: m.id,
      label: m.label,
      children: (m.children ?? []).filter((c) => c.href).map((c) => ({ href: c.href as string, label: c.label })),
    }))

  const flatItemsFromState = state.menus
    .filter((m) => m.id !== 'management')
    .filter((m) => m.href)
    .filter((m) => (m.children?.length ?? 0) === 0)
    .map((m) => ({ href: m.href as string, label: m.label }))

  const effectiveGroups = otherGroups.length ? otherGroups : fallbackGroupItems
  const effectiveFlatItems = flatItemsFromState.length ? flatItemsFromState : fallbackFlatItems

  const dashboardItem =
    effectiveFlatItems.find((i) => i.href === '/dashboard') ?? ({ href: '/dashboard', label: '대시보드' } as const)
  const otherFlatItems = effectiveFlatItems.filter((i) => i.href !== '/dashboard')

  const isActiveManagement = managementItems.some((item) => pathname === item.href)

  const [openGroupId, setOpenGroupId] = React.useState<string | null>('management')

  React.useEffect(() => {
    if (isActiveManagement) {
      setOpenGroupId('management')
      return
    }
    const activeGroup = effectiveGroups.find((g) => g.children.some((c) => c.href === pathname))
    if (activeGroup) setOpenGroupId(activeGroup.id)
  }, [effectiveGroups, isActiveManagement, pathname])

  const toggleGroup = (groupId: string) => {
    setOpenGroupId((prev) => (prev === groupId ? null : groupId))
  }

  return (
    <aside className="fixed left-0 top-16 z-20 hidden h-[calc(100vh-4rem-60px)] w-72 overflow-y-auto border-r border-slate-200/80 bg-white/70 px-4 py-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/60 lg:block">
      <div className="rounded-3xl border border-slate-200/70 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">사용자</p>
        <p className="mt-2 truncate text-lg font-semibold text-slate-950 dark:text-white">{userLabel}</p>

        {isSuper ? (
          <ComplexScopeSelect />
        ) : complexLabel ? (
          <p className="mt-2 truncate text-sm text-slate-500 dark:text-slate-400">{complexLabel}</p>
        ) : null}

        {roleLabel && (
          <div className="mt-3 inline-flex rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-blue-700 dark:text-sky-300">
            {roleLabel}
          </div>
        )}
      </div>

      <nav className="mt-6 space-y-2">
        <Link
          href={dashboardItem.href}
          className={`block rounded-2xl border px-4 py-3 text-sm transition ${
            isActiveHref(dashboardItem.href)
              ? 'border-blue-500/30 bg-blue-500/10 text-slate-950 dark:text-white'
              : 'border-slate-200/70 bg-transparent text-slate-800 hover:border-blue-500/20 hover:bg-white/50 dark:border-white/5 dark:text-slate-200 dark:hover:bg-white/5'
          }`}
        >
          <span className="font-semibold">{dashboardItem.label}</span>
        </Link>

        <button
          type="button"
          onClick={() => toggleGroup('management')}
          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
            isActiveManagement
              ? 'border-blue-500/30 bg-blue-500/10 text-slate-950 dark:text-white'
              : 'border-slate-200/70 bg-transparent text-slate-800 hover:border-blue-500/20 hover:bg-white/50 dark:border-white/5 dark:text-slate-200 dark:hover:bg-white/5'
          }`}
        >
          <span className="font-semibold">단지/동/입주민 관리</span>
          <Chevron open={openGroupId === 'management'} />
        </button>

        {openGroupId === 'management' && (
          <div className="space-y-2 pl-3">
            {managementItems.map((item) => {
              const isActive = isActiveHref(item.href as string)
              return (
                <Link
                  key={item.href}
                  href={item.href as string}
                  className={`block rounded-2xl border px-4 py-2.5 text-sm transition ${
                    isActive
                      ? 'border-blue-500/30 bg-blue-500/10 text-slate-950 dark:text-white'
                      : 'border-slate-200/70 bg-transparent text-slate-700 hover:border-blue-500/20 hover:bg-white/50 dark:border-white/5 dark:text-slate-300 dark:hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        )}

        {effectiveGroups.map((group) => {
          const isOpen = openGroupId === group.id
          const isActiveGroup = group.children.some((c) => pathname === c.href)
          return (
            <div key={group.id} className="space-y-2">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  isActiveGroup
                    ? 'border-blue-500/30 bg-blue-500/10 text-slate-950 dark:text-white'
                    : 'border-slate-200/70 bg-transparent text-slate-800 hover:border-blue-500/20 hover:bg-white/50 dark:border-white/5 dark:text-slate-200 dark:hover:bg-white/5'
                }`}
              >
                <span className="font-semibold">{group.label}</span>
                <Chevron open={isOpen} />
              </button>

              {isOpen && (
                <div className="space-y-2 pl-3">
                  {group.children.map((item) => {
                    const isActive = isActiveHref(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block rounded-2xl border px-4 py-2.5 text-sm transition ${
                          isActive
                            ? 'border-blue-500/30 bg-blue-500/10 text-slate-950 dark:text-white'
                            : 'border-slate-200/70 bg-transparent text-slate-700 hover:border-blue-500/20 hover:bg-white/50 dark:border-white/5 dark:text-slate-300 dark:hover:bg-white/5'
                        }`}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {otherFlatItems.map((item) => {
          const isActive = isActiveHref(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-2xl border px-4 py-3 text-sm transition ${
                isActive
                  ? 'border-blue-500/30 bg-blue-500/10 text-slate-950 dark:text-white'
                  : 'border-slate-200/70 bg-transparent text-slate-800 hover:border-blue-500/20 hover:bg-white/50 dark:border-white/5 dark:text-slate-200 dark:hover:bg-white/5'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

