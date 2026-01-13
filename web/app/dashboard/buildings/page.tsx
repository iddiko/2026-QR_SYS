"use client"

import React from 'react'
import EditablePageNote from '../../../components/admin/EditablePageNote'
import PageEditButton from '../../../components/admin/PageEditButton'
import useComplexes from '../../../hooks/useComplexes'
import useAppSession from '../../../lib/authSession'
import { getClientAuthHeaders } from '../../../lib/clientAuth'
import { useComplexScope } from '../../../lib/complexScope'

type BuildingRow = {
  id: string
  name: string
  created_at: string
}

type AdminRole = 'SUB' | 'GUARD'

type AdminCandidate = {
  id: string
  email: string
  displayName: string
  phone: string
  roleId: 'MAIN' | 'SUB' | 'GUARD'
  complexId: string | null
  buildingId: string | null
  createdAt: string
}

function roleLabel(role: AdminRole) {
  if (role === 'SUB') return '동(서브)'
  return '경비'
}

export default function BuildingsPage() {
  const routeKey = '/dashboard/buildings'
  const { session } = useAppSession()
  const isSuper = session?.role === 'SUPER'
  const { scope } = useComplexScope()

  const { complexes } = useComplexes(200)

  const [selectedComplexId, setSelectedComplexId] = React.useState<string>('')
  const [buildingName, setBuildingName] = React.useState('')
  const [buildingSearch, setBuildingSearch] = React.useState('')
  const [buildings, setBuildings] = React.useState<BuildingRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)

  const [newAdminBuildingId, setNewAdminBuildingId] = React.useState('')
  const [newAdminEmail, setNewAdminEmail] = React.useState('')
  const [newAdminName, setNewAdminName] = React.useState('')
  const [newAdminPhone, setNewAdminPhone] = React.useState('')
  const [newAdminRole, setNewAdminRole] = React.useState<AdminRole>('SUB')

  const [assignBuildingId, setAssignBuildingId] = React.useState('')
  const [assignRole, setAssignRole] = React.useState<AdminRole>('SUB')
  const [assignSearch, setAssignSearch] = React.useState('')
  const [assignAdminEmail, setAssignAdminEmail] = React.useState('')
  const [assignCandidates, setAssignCandidates] = React.useState<AdminCandidate[]>([])

  const selectedComplex = complexes.find((c) => c.id === selectedComplexId) ?? null

  React.useEffect(() => {
    if (!isSuper) return
    if (scope.type === 'complex') setSelectedComplexId(scope.id)
  }, [isSuper, scope.id, scope.type])

  const fetchBuildings = React.useCallback(async (complexId: string) => {
    setLoading(true)
    setMessage(null)
    const headers = await getClientAuthHeaders()
    if (!headers.Authorization && !headers['x-demo-role']) {
      setMessage('로그인 정보가 없습니다.')
      setLoading(false)
      return
    }

    const res = await fetch(`/api/buildings?complexId=${encodeURIComponent(complexId)}&limit=200`, { headers })
    const json = (await res.json()) as { error?: string; buildings?: BuildingRow[] }
    if (!res.ok) {
      setMessage(json.error ?? '동 목록을 불러오지 못했습니다.')
      setLoading(false)
      return
    }
    setBuildings(json.buildings ?? [])
    setLoading(false)
  }, [])

  React.useEffect(() => {
    if (!selectedComplexId) {
      setBuildings([])
      setNewAdminBuildingId('')
      setAssignBuildingId('')
      return
    }
    void fetchBuildings(selectedComplexId)
  }, [fetchBuildings, selectedComplexId])

  const createBuilding = async () => {
    setMessage(null)
    if (!selectedComplexId) {
      setMessage('단지를 선택하세요.')
      return
    }
    const name = buildingName.trim()
    if (!name) {
      setMessage('동 이름을 입력하세요.')
      return
    }

    const headers = await getClientAuthHeaders()
    if (!headers.Authorization && !headers['x-demo-role']) {
      setMessage('로그인 정보가 없습니다.')
      return
    }

    setLoading(true)
    const res = await fetch('/api/buildings', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ complexId: selectedComplexId, name }),
    })
    const json = (await res.json()) as { error?: string; emailSent?: boolean }
    if (!res.ok) {
      setMessage(json.error ?? '동 생성에 실패했습니다.')
      setLoading(false)
      return
    }

    setMessage(
      json.emailSent
        ? '동 관리자 임명 및 초대 메일 발송 완료'
        : '동 관리자 임명 완료 (기존 계정이면 초대 메일은 발송되지 않을 수 있습니다)'
    )
    setLoading(false)
    return

    setBuildingName('')
    setMessage('동을 생성했습니다.')
    await fetchBuildings(selectedComplexId)
    setLoading(false)
  }

  const inviteBuildingAdmin = async () => {
    setMessage(null)
    if (!selectedComplexId) {
      setMessage('단지를 먼저 선택하세요.')
      return
    }
    if (!newAdminBuildingId) {
      setMessage('동을 선택하세요.')
      return
    }
    const email = newAdminEmail.trim().toLowerCase()
    if (!email) {
      setMessage('이메일을 입력하세요.')
      return
    }

    const headers = await getClientAuthHeaders()
    if (!headers.Authorization && !headers['x-demo-role']) {
      setMessage('로그인 정보가 없습니다.')
      return
    }

    setLoading(true)
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
      setMessage(json.error ?? '동 관리자 생성(초대)에 실패했습니다.')
      setLoading(false)
      return
    }

    setMessage(`관리자 초대가 완료되었습니다. (userId: ${json.userId ?? '-'})`)
    setNewAdminEmail('')
    setNewAdminName('')
    setNewAdminPhone('')

    setAssignRole(newAdminRole)
    setAssignBuildingId(newAdminBuildingId)
    setAssignAdminEmail(email)
    setAssignSearch(email)

    setLoading(false)
  }

  const loadCandidates = React.useCallback(async () => {
    if (!selectedComplexId) {
      setAssignCandidates([])
      return
    }
    const headers = await getClientAuthHeaders()
    if (!headers.Authorization && !headers['x-demo-role']) return

    const qs = new URLSearchParams()
    qs.set('limit', '200')
    qs.set('roleId', assignRole)
    qs.set('complexId', selectedComplexId)
    if (assignBuildingId) qs.set('buildingId', assignBuildingId)
    if (assignSearch.trim()) qs.set('q', assignSearch.trim())

    const res = await fetch(`/api/admins?${qs.toString()}`, { headers })
    const json = (await res.json()) as { error?: string; admins?: AdminCandidate[] }
    if (!res.ok) {
      setAssignCandidates([])
      return
    }
    setAssignCandidates(json.admins ?? [])
  }, [assignBuildingId, assignRole, assignSearch, selectedComplexId])

  React.useEffect(() => {
    if (!isSuper) return
    if (!selectedComplexId) return
    void loadCandidates()
  }, [assignBuildingId, assignRole, assignSearch, isSuper, loadCandidates, selectedComplexId])

  const assignBuildingAdmin = async () => {
    setMessage(null)
    if (!selectedComplexId) {
      setMessage('단지를 먼저 선택하세요.')
      return
    }
    if (!assignBuildingId) {
      setMessage('동을 선택하세요.')
      return
    }
    if (!assignAdminEmail.trim()) {
      setMessage('임명할 관리자를 선택하세요.')
      return
    }

    const headers = await getClientAuthHeaders()
    if (!headers.Authorization && !headers['x-demo-role']) {
      setMessage('로그인 정보가 없습니다.')
      return
    }

    setLoading(true)
    const res = await fetch('/api/admins/assign', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        email: assignAdminEmail.trim().toLowerCase(),
        roleId: assignRole,
        buildingId: assignBuildingId,
      }),
    })
    const json = (await res.json()) as { error?: string }
    if (!res.ok) {
      setMessage(json.error ?? '동 관리자 임명에 실패했습니다.')
      setLoading(false)
      return
    }

    setMessage('동 관리자를 임명했습니다.')
    setLoading(false)
  }

  const filteredBuildings = buildingSearch.trim()
    ? buildings.filter((b) => b.name.toLowerCase().includes(buildingSearch.trim().toLowerCase()))
    : buildings

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">동</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">동 관리</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            단지를 선택한 뒤 동을 생성하고, 동 관리자(서브)·경비를 생성/임명합니다.
          </p>
        </div>
        <PageEditButton routeKey={routeKey} />
      </div>

      <EditablePageNote routeKey={routeKey} />

      {message ? <p className="text-sm text-rose-700">{message}</p> : null}

      {!isSuper ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          최고 관리자만 이 페이지에서 동/관리자 관리가 가능합니다.
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">동 생성</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">단지 선택 + 동 생성이 한 카드에서 진행됩니다.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">단지 선택</label>
            <select
              value={selectedComplexId}
              onChange={(e) => setSelectedComplexId(e.target.value)}
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

          <div className="lg:col-span-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">동 이름</label>
            <div className="mt-2 flex gap-2">
              <input
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                placeholder="예) 101동"
                disabled={!isSuper || !selectedComplexId}
              />
              <button
                type="button"
                onClick={() => void createBuilding()}
                disabled={!isSuper || !selectedComplexId || loading}
                className="shrink-0 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                생성
              </button>
            </div>
          </div>
        </div>

        {selectedComplex ? (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            선택된 단지: <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedComplex.name}</span>
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">동 관리자 생성</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            단지는 이미 선택된 상태이며, 동 선택 후 관리자(서브/경비)를 생성(초대)합니다.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">단지</label>
              <input
                value={selectedComplex?.name ?? ''}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                placeholder="단지를 먼저 선택하세요"
                disabled
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">동 선택</label>
              <select
                value={newAdminBuildingId}
                onChange={(e) => setNewAdminBuildingId(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                disabled={!isSuper || !selectedComplexId}
              >
                <option value="">선택하세요</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
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
                disabled={!isSuper || !selectedComplexId}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">이름</label>
              <input
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                placeholder="홍길동"
                disabled={!isSuper || !selectedComplexId}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">전화번호</label>
              <input
                value={newAdminPhone}
                onChange={(e) => setNewAdminPhone(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                placeholder="010-0000-0000"
                disabled={!isSuper || !selectedComplexId}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">레벨 선택</label>
              <select
                value={newAdminRole}
                onChange={(e) => setNewAdminRole(e.target.value as AdminRole)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                disabled={!isSuper || !selectedComplexId}
              >
                <option value="SUB">{roleLabel('SUB')}</option>
                <option value="GUARD">{roleLabel('GUARD')}</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void inviteBuildingAdmin()}
              disabled={!isSuper || loading}
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              관리자 생성(초대)
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">동 관리자 임명</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            단지/동 선택 후 등록된 동 관리자(서브) 또는 경비를 찾아 임명합니다.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">단지</label>
              <input
                value={selectedComplex?.name ?? ''}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                placeholder="단지를 먼저 선택하세요"
                disabled
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">동 선택</label>
              <select
                value={assignBuildingId}
                onChange={(e) => setAssignBuildingId(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                disabled={!isSuper || !selectedComplexId}
              >
                <option value="">선택하세요</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
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
                disabled={!isSuper || !selectedComplexId}
              >
                <option value="SUB">{roleLabel('SUB')}</option>
                <option value="GUARD">{roleLabel('GUARD')}</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">등록된 관리자 찾기</label>
              <input
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                placeholder="이메일/이름/전화번호로 검색"
                disabled={!isSuper || !selectedComplexId}
              />
              <div className="mt-2">
                <select
                  value={assignAdminEmail}
                  onChange={(e) => setAssignAdminEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                  disabled={!isSuper || !selectedComplexId}
                >
                  <option value="">선택하세요</option>
                  {assignCandidates.map((a) => (
                    <option key={a.id} value={a.email}>
                      {a.email || '(email 없음)'} · {a.displayName || '-'} · {a.phone || '-'}
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
              onClick={() => void assignBuildingAdmin()}
              disabled={!isSuper || loading}
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              임명
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">동 목록</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{filteredBuildings.length}개</p>
          </div>
          <input
            value={buildingSearch}
            onChange={(e) => setBuildingSearch(e.target.value)}
            className="w-[240px] rounded-full border border-slate-200/80 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            placeholder="동 검색"
            disabled={!selectedComplexId}
          />
        </div>

        {loading && buildings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">불러오는 중…</p>
        ) : !selectedComplexId ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">단지를 선택하면 동 목록이 표시됩니다.</p>
        ) : filteredBuildings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">동이 없습니다.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredBuildings.map((b) => (
              <div key={b.id} className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="font-semibold text-slate-950 dark:text-white">{b.name}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{new Date(b.created_at).toLocaleString('ko-KR')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
