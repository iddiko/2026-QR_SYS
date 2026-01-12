"use client"

import useComplexes from '../../hooks/useComplexes'

export default function MainAdminView() {
  const { complexes, loading } = useComplexes(5)

  return (
    <section className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-6">
      <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">메인 관리자</p>
      <h3 className="text-xl font-semibold text-white">자신의 단지 선택</h3>
      <p className="text-sm text-slate-400">
        본인이 관리하는 단지를 빠르게 확인하고, 서브 관리자 또는 경비/입주민 메뉴를 조정할 수 있습니다.
      </p>

      <div className="grid gap-3">
        {loading ? (
          <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 text-sm text-slate-500">단지 로딩 중...</div>
        ) : (
          complexes.slice(0, 4).map((complex) => (
            <article key={complex.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
              <div>
                <p className="font-semibold text-white">{complex.name}</p>
                <p className="text-xs text-slate-400">{complex.region ?? '지역 정보 없음'}</p>
              </div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-emerald-300">설정</span>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
