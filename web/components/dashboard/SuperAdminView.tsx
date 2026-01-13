"use client"

import React from 'react'
import useComplexes from '../../hooks/useComplexes'
import { getClientAuthHeaders } from '../../lib/clientAuth'
import { useComplexScope } from '../../lib/complexScope'

type ComplexSummary = {
  complex: { id: string; name: string; region: string | null; created_at: string }
  buildingsCount: number
  people: { mainAdmins: number; subAdmins: number; guards: number; residents: number }
  qr: { active: number; total: number }
  vehicles: { residentsWithCar: number; evCount: number; iceCount: number; ratioPercent: number }
  gas: { status: string }
}

export default function SuperAdminView() {
  const { complexes, loading, error, loadMore, hasMore, filter, setFilter } = useComplexes(10)
  const { scope, setScope } = useComplexScope()

  const [summary, setSummary] = React.useState<ComplexSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = React.useState(false)
  const [summaryError, setSummaryError] = React.useState<string | null>(null)

  const loadSummary = React.useCallback(
    async (complexId: string) => {
      setSummaryLoading(true)
      setSummaryError(null)

      const headers = await getClientAuthHeaders()
      if (!headers.Authorization && !headers['x-demo-role']) {
        setSummaryError('로그인이 필요합니다.')
        setSummaryLoading(false)
        return
      }

      const res = await fetch(`/api/dashboard/complex-summary?complexId=${encodeURIComponent(complexId)}`, { headers })
      const json = (await res.json()) as { error?: string } & Partial<ComplexSummary>
      if (!res.ok) {
        setSummaryError(json.error ?? '단지 정보를 불러오지 못했습니다.')
        setSummaryLoading(false)
        return
      }

      setSummary(json as ComplexSummary)
      setSummaryLoading(false)
    },
    []
  )

  React.useEffect(() => {
    if (scope.type !== 'complex') {
      setSummary(null)
      setSummaryError(null)
      setSummaryLoading(false)
      return
    }
    void loadSummary(scope.id)
  }, [loadSummary, scope.id, scope.type])

  const selectComplex = (id: string, name: string) => {
    setScope({ type: 'complex', id, name })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="space-y-4 rounded-3xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/40 lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">
              단지 정보
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">
              {scope.type === 'complex' ? scope.name : '단지를 선택하세요'}
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              오른쪽 “전체 단지 목록”에서 단지를 클릭하면 중앙에 단지 현황이 표시됩니다.
            </p>
          </div>

          {scope.type === 'complex' ? (
            <button
              type="button"
              onClick={() => setScope({ type: 'all', id: null, name: '전체' })}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              전체로 보기
            </button>
          ) : null}
        </div>

        {summaryError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{summaryError}</div>
        ) : null}

        {scope.type !== 'complex' ? (
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            단지를 선택하면 다음 정보가 표시됩니다: 메인/서브/경비/입주민 수, QR 발행 현황, 차량 비율, 가스검침 현황.
          </div>
        ) : summaryLoading || !summary ? (
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            불러오는 중...
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-semibold text-slate-950 dark:text-white">기본 정보</p>
              <dl className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">지역</dt>
                  <dd className="truncate">{summary.complex.region ?? '-'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">동 수</dt>
                  <dd>{summary.buildingsCount}개</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">생성일</dt>
                  <dd>{new Date(summary.complex.created_at).toLocaleString('ko-KR')}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-semibold text-slate-950 dark:text-white">인원 현황</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-200">
                <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/0">
                  <dt className="text-xs text-slate-500 dark:text-slate-400">메인 관리자</dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{summary.people.mainAdmins}</dd>
                </div>
                <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/0">
                  <dt className="text-xs text-slate-500 dark:text-slate-400">서브 관리자</dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{summary.people.subAdmins}</dd>
                </div>
                <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/0">
                  <dt className="text-xs text-slate-500 dark:text-slate-400">경비</dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{summary.people.guards}</dd>
                </div>
                <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/0">
                  <dt className="text-xs text-slate-500 dark:text-slate-400">입주민</dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{summary.people.residents}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-semibold text-slate-950 dark:text-white">QR 발행 현황</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-sm text-slate-600 dark:text-slate-300">활성 / 전체</p>
                <p className="text-2xl font-semibold text-slate-950 dark:text-white">
                  {summary.qr.active} / {summary.qr.total}
                </p>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                활성: is_active=true 이면서 만료되지 않은 QR
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-semibold text-slate-950 dark:text-white">차량 비율</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-sm text-slate-600 dark:text-slate-300">차량 보유 입주민 / 입주민</p>
                <p className="text-2xl font-semibold text-slate-950 dark:text-white">{summary.vehicles.ratioPercent}%</p>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                차량 보유 {summary.vehicles.residentsWithCar}명 · 전기차 {summary.vehicles.evCount} · 내연기관 {summary.vehicles.iceCount}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5 md:col-span-2">
              <p className="text-sm font-semibold text-slate-950 dark:text-white">가스검침 현황</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{summary.gas.status}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">가스검침 테이블/기능 연결 후 집계합니다.</p>
            </div>
          </div>
        )}
      </section>

      <aside className="space-y-4 rounded-3xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">전체</p>
            <h4 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">전체 단지 목록</h4>
          </div>
        </div>

        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:placeholder:text-slate-500"
          placeholder="단지 검색"
        />

        {error ? <p className="text-sm text-rose-600">오류: {error}</p> : null}

        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {complexes.map((c) => {
            const active = scope.type === 'complex' && scope.id === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => selectComplex(c.id, c.name)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  active
                    ? 'border-blue-500/30 bg-blue-500/10'
                    : 'border-slate-200/70 bg-white/60 hover:border-blue-500/25 hover:bg-white dark:border-white/10 dark:bg-white/0 dark:hover:bg-white/5'
                }`}
              >
                <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{c.name}</p>
                <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{c.region ?? '지역 미설정'}</p>
              </button>
            )
          })}

          {loading ? (
            <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              불러오는 중...
            </div>
          ) : null}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={!hasMore || loading}
            onClick={loadMore}
            className="rounded-full border border-slate-200/80 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            {hasMore ? '더 보기' : '끝'}
          </button>
        </div>
      </aside>
    </div>
  )
}

