"use client"

import useComplexes from '../../hooks/useComplexes'

export default function SuperAdminView() {
  const { complexes, loading, error, loadMore, hasMore, filter, setFilter } = useComplexes(8)

  return (
    <section className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">슈퍼 관리자 뷰</p>
          <h3 className="text-xl font-semibold text-white">전체 단지 모니터링</h3>
        </div>
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          placeholder="단지 검색 (이름)"
        />
      </div>

      {error && <p className="text-xs text-rose-400">오류: {error}</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {complexes.map((complex) => (
          <article key={complex.id} className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 text-sm text-slate-200">
            <p className="font-semibold text-white">{complex.name}</p>
            <p className="text-xs text-slate-400">{complex.region ?? '지역 정보 없음'}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-slate-500">생성: {new Date(complex.created_at).toLocaleDateString()}</p>
          </article>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!hasMore || loading}
          onClick={loadMore}
          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
            loading ? 'cursor-wait border border-white/10 text-slate-500' : 'border border-emerald-300/60 text-emerald-300 hover:bg-white/5'
          }`}
        >
          {hasMore ? '더 많은 단지 로드' : '모든 단지 확인 중'}
        </button>
      </div>
    </section>
  )
}
