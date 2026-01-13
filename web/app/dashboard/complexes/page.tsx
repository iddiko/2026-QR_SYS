"use client"

import React from 'react'
import EditablePageNote from '../../../components/admin/EditablePageNote'
import PageEditButton from '../../../components/admin/PageEditButton'
import useComplexes from '../../../hooks/useComplexes'
import useAppSession from '../../../lib/authSession'
import { getClientAuthHeaders } from '../../../lib/clientAuth'

type AdminRole = 'MAIN' | 'SUB' | 'GUARD'

type AdminCandidate = {
  id: string
  email: string
  displayName: string
  phone: string
  roleId: AdminRole
  complexId: string | null
  buildingId: string | null
  createdAt: string
}

type BuildingPreview = {
  id: string
  name: string
}

function roleLabel(role: AdminRole) {
  if (role === 'MAIN') return '단지(메인)'
  if (role === 'SUB') return '동(서브)'
  return '경비'
}

export default function ComplexesPage() {
  const { session } = useAppSession()
  const isSuper = session?.role === 'SUPER'
  const routeKey = '/dashboard/complexes'

  const { complexes, loading, error, hasMore, loadMore, refresh, filter, setFilter } = useComplexes(12)

  const [actionLoading, setActionLoading] = React.useState(false)
  const [actionMessage, setActionMessage] = React.useState<string | null>(null)

  const [createName, setCreateName] = React.useState('')
  const [createRegion, setCreateRegion] = React.useState('')

  const [newAdminComplexId, setNewAdminComplexId] = React.useState('')
  const [newAdminEmail, setNewAdminEmail] = React.useState('')
  const [newAdminName, setNewAdminName] = React.useState('')
  const [newAdminPhone, setNewAdminPhone] = React.useState('')
  const [newAdminRole, setNewAdminRole] = React.useState<AdminRole>('MAIN')

  const [assignComplexId, setAssignComplexId] = React.useState('')
  const [assignRole, setAssignRole] = React.useState<AdminRole>('MAIN')
  const [assignBuildingId, setAssignBuildingId] = React.useState('')
  const [assignAdminEmail, setAssignAdminEmail] = React.useState('')
  const [assignSearch, setAssignSearch] = React.useState('')
  const [assignCandidates, setAssignCandidates] = React.useState<AdminCandidate[]>([])
  const [buildings, setBuildings] = React.useState<BuildingPreview[]>([])

  const loadBuildings = React.useCallback(async (complexId: string) => {
    setBuildings([])
    setAssignBuildingId('')
    if (!complexId) return
    const headers = await getClientAuthHeaders()
    if (!headers.Authorization && !headers['x-demo-role']) return
    const res = await fetch(`/api/buildings?complexId=${encodeURIComponent(complexId)}&limit=200`, { headers })
    const json = (await res.json()) as { error?: string; buildings?: BuildingPreview[] }
    if (!res.ok) return
    setBuildings(json.buildings ?? [])
  }, [])

  React.useEffect(() => {
    if (assignRole === 'MAIN') {
      setBuildings([])
      setAssignBuildingId('')
      return
    }
    void loadBuildings(assignComplexId)
  }, [assignComplexId, assignRole, loadBuildings])

  const loadCandidates = React.useCallback(async () => {
    const headers = await getClientAuthHeaders()
    if (!headers.Authorization && !headers['x-demo-role']) return

    const qs = new URLSearchParams()
    qs.set('limit', '200')
    qs.set('roleId', assignRole)
    if (assignComplexId) qs.set('complexId', assignComplexId)
    if (assignRole !== 'MAIN' && assignBuildingId) qs.set('buildingId', assignBuildingId)
    if (assignSearch.trim()) qs.set('q', assignSearch.trim())

    const res = await fetch(`/api/admins?${qs.toString()}`, { headers })
    const json = (await res.json()) as { error?: string; admins?: AdminCandidate[] }
    if (!res.ok) {
      setAssignCandidates([])
      return
    }
    setAssignCandidates(json.admins ?? [])
  }, [assignBuildingId, assignComplexId, assignRole, assignSearch])

  React.useEffect(() => {
    if (!isSuper) return
    if (!assignComplexId) {
      setAssignCandidates([])
      return
    }
    void loadCandidates()
  }, [assignBuildingId, assignComplexId, assignRole, assignSearch, isSuper, loadCandidates])

  const createComplex = async () => {
    setActionMessage(null)
    const name = createName.trim()
    const region = createRegion.trim()
    if (!name) {
      setActionMessage('단지명을 입력하세요.')
      return
    }

    const headers = await getClientAuthHeaders()
    if (!headers.Authorization && !headers['x-demo-role']) {
      setActionMessage('로그인 정보가 없습니다.')
      return
    }

    setActionLoading(true)
    const res = await fetch('/api/complexes', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ name, region }),
    })
    const json = (await res.json()) as { error?: string; emailSent?: boolean }
    if (!res.ok) {
      setActionMessage(json.error ?? '단지 생성에 실패했습니다.')
      setActionLoading(false)
      return
    }

    setActionMessage(
      json.emailSent
        ? '관리자 임명 및 초대 메일 발송 완료'
        : '관리자 임명 완료 (기존 계정이면 초대 메일은 발송되지 않을 수 있습니다)'
    )
    setActionLoading(false)
    return

    setCreateName('')
    setCreateRegion('')
    setActionMessage('단지를 생성했습니다.')
    refresh()
    setActionLoading(false)
  }

  const inviteAdmin = async () => {
    setActionMessage(null)
    const email = newAdminEmail.trim().toLowerCase()
    if (!newAdminComplexId) {
      setActionMessage('단지를 선택하세요.')
      return
    }
    if (!email) {
      setActionMessage('이메일을 입력하세요.')
      return
    }

    const headers = await getClientAuthHeaders()
    if (!headers.Authorization && !headers['x-demo-role']) {
      setActionMessage('로그인 정보가 없습니다.')
      return
    }

    setActionLoading(true)
    const res = await fetch('/api/admins/invite', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        roleId: newAdminRole,
        displayName: newAdminName,
        phone: newAdminPhone,
      }),
    })
    const json = (await res.json()) as { error?: string; userId?: string }
    if (!res.ok) {
      setActionMessage(json.error ?? '관리자 생성(초대)에 실패했습니다.')
      setActionLoading(false)
      return
    }

    setActionMessage(`관리자 초대가 완료되었습니다. (userId: ${json.userId ?? '-'})`)
    setNewAdminEmail('')
    setNewAdminName('')
    setNewAdminPhone('')

    setAssignComplexId(newAdminComplexId)
    setAssignRole(newAdminRole)
    setAssignAdminEmail(email)
    setAssignSearch(email)

    setActionLoading(false)
  }

  const assignAdmin = async () => {
    setActionMessage(null)
    if (!assignComplexId) {
      setActionMessage('단지를 선택하세요.')
      return
    }
    if (!assignAdminEmail.trim()) {
      setActionMessage('임명할 관리자를 선택하세요.')
      return
    }
    if (assignRole === 'MAIN') {
      // ok
    } else if (!assignBuildingId) {
      setActionMessage('동을 선택하세요.')
      return
    }

    const headers = await getClientAuthHeaders()
    if (!headers.Authorization && !headers['x-demo-role']) {
      setActionMessage('로그인 정보가 없습니다.')
      return
    }

    setActionLoading(true)
    const res = await fetch('/api/admins/assign', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        email: assignAdminEmail.trim().toLowerCase(),
        roleId: assignRole,
        complexId: assignRole === 'MAIN' ? assignComplexId : undefined,
        buildingId: assignRole === 'MAIN' ? undefined : assignBuildingId,
      }),
    })
    const json = (await res.json()) as { error?: string }
    if (!res.ok) {
      setActionMessage(json.error ?? '관리자 임명에 실패했습니다.')
      setActionLoading(false)
      return
    }

    setActionMessage('관리자를 임명했습니다.')
    setActionLoading(false)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[260px]">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">단지</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">단지 관리</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            단지를 생성하고, 단지 관리자(메인)·동 관리자(서브)·경비를 생성/임명합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-[240px] rounded-full border border-slate-200/80 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            placeholder="단지 검색"
          />
          <PageEditButton routeKey={routeKey} />
        </div>
      </div>

      <EditablePageNote routeKey={routeKey} />

      {actionMessage ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          {actionMessage}
        </div>
      ) : null}

      {!isSuper ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          최고 관리자만 이 페이지에서 단지/관리자 관리가 가능합니다.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 bg-white/70 p-5 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">단지 목록</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{complexes.length}개</p>
          </div>

          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

          {loading && complexes.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">불러오는 중…</p>
          ) : complexes.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">단지가 없습니다.</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {complexes.map((c) => (
                <div key={c.id} className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-base font-semibold text-slate-950 dark:text-white">{c.name}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {c.region ? `지역: ${c.region}` : '지역: -'} · {new Date(c.created_at).toLocaleString('ko-KR')}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewAdminComplexId(c.id)
                        setAssignComplexId(c.id)
                      }}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                    >
                      이 단지 선택
                    </button>
                    <span className="text-xs text-slate-400">ID: {c.id.slice(0, 8)}…</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasMore ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => loadMore()}
                disabled={loading}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              >
                더 보기
              </button>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/70 p-5 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">단지 생성</p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">단지명</label>
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                placeholder="예) 테스트 단지"
                disabled={!isSuper}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">지역(선택)</label>
              <input
                value={createRegion}
                onChange={(e) => setCreateRegion(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                placeholder="예) 서울"
                disabled={!isSuper}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!isSuper || actionLoading}
                onClick={() => void createComplex()}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                생성
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">단지 관리자 생성</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            단지 선택 후 관리자(메인/서브/경비)를 생성(초대)합니다.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">단지 선택</label>
              <select
                value={newAdminComplexId}
                onChange={(e) => setNewAdminComplexId(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                disabled={!isSuper}
              >
                <option value="">선택하세요</option>
                {complexes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">이메일</label>
              <input
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                placeholder="admin@example.com"
                disabled={!isSuper}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">이름</label>
              <input
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                placeholder="홍길동"
                disabled={!isSuper}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">전화번호</label>
              <input
                value={newAdminPhone}
                onChange={(e) => setNewAdminPhone(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                placeholder="010-0000-0000"
                disabled={!isSuper}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">레벨 선택</label>
              <select
                value={newAdminRole}
                onChange={(e) => setNewAdminRole(e.target.value as AdminRole)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                disabled={!isSuper}
              >
                <option value="MAIN">{roleLabel('MAIN')}</option>
                <option value="SUB">{roleLabel('SUB')}</option>
                <option value="GUARD">{roleLabel('GUARD')}</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void inviteAdmin()}
              disabled={!isSuper || actionLoading}
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              관리자 생성(초대)
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">단지 관리자 임명</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            단지 선택 후 등록된 관리자를 찾아 임명합니다. (경비는 동 선택이 필요합니다.)
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">단지 선택</label>
              <select
                value={assignComplexId}
                onChange={(e) => setAssignComplexId(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                disabled={!isSuper}
              >
                <option value="">선택하세요</option>
                {complexes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">레벨 선택</label>
              <select
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value as AdminRole)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                disabled={!isSuper}
              >
                <option value="MAIN">{roleLabel('MAIN')}</option>
                <option value="SUB">{roleLabel('SUB')}</option>
                <option value="GUARD">{roleLabel('GUARD')}</option>
              </select>
            </div>

            {assignRole !== 'MAIN' ? (
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">동 선택</label>
                <select
                  value={assignBuildingId}
                  onChange={(e) => setAssignBuildingId(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                  disabled={!isSuper || !assignComplexId}
                >
                  <option value="">선택하세요</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">등록된 관리자 찾기</label>
              <input
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                placeholder="이메일/이름/전화번호로 검색"
                disabled={!isSuper || !assignComplexId}
              />
              <div className="mt-2">
                <select
                  value={assignAdminEmail}
                  onChange={(e) => setAssignAdminEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                  disabled={!isSuper || !assignComplexId}
                >
                  <option value="">선택하세요</option>
                  {assignCandidates.map((a) => (
                    <option key={a.id} value={a.email}>
                      {a.email || '(email 없음)'} · {a.displayName || '-'} · {roleLabel(a.roleId)}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">후보: {assignCandidates.length}명</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void assignAdmin()}
              disabled={!isSuper || actionLoading}
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              임명
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
