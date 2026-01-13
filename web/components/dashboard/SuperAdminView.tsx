"use client"

import useComplexes from '../../hooks/useComplexes'

export default function SuperAdminView() {
  const { complexes, loading, error, loadMore, hasMore, filter, setFilter } = useComplexes(8)

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">최고관리자</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">전체 단지 목록</h3>
        </div>
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:placeholder:text-slate-500"
          placeholder="단지 검색"
        />
      </div>

      {error && <p className="text-sm text-rose-600">오류: {error}</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {complexes.map((complex) => (
          <article key={complex.id} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="font-semibold text-slate-950 dark:text-white">{complex.name}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{complex.region ?? '지역 미지정'}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-slate-500">
              생성일: {new Date(complex.created_at).toLocaleDateString()}
            </p>
          </article>
        ))}
        {loading && (
          <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            불러오는 중...
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!hasMore || loading}
          onClick={loadMore}
          className="rounded-full border border-slate-200/80 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          {hasMore ? '더 보기' : '마지막입니다'}
        </button>
      </div>
    </section>
  )
}
