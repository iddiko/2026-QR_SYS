"use client"

import useComplexes from '../../hooks/useComplexes'

export default function MainAdminView() {
  const { complexes, loading } = useComplexes(5)

  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/70 p-6 backdrop-blur dark:bg-slate-950/40">
      <p className="text-xs uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">메인 관리자</p>
      <h3 className="text-xl font-semibold text-slate-950 dark:text-white">단지 운영 요약</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        메인 관리자는 소속 단지의 동 생성/서브관리자 지정, 경비·입주민 메뉴 ON/OFF를 관리합니다.
      </p>

      <div className="grid gap-3">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/70 p-4 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-400">
            불러오는 중...
          </div>
        ) : (
          complexes.slice(0, 4).map((complex) => (
            <article
              key={complex.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/70 px-4 py-3 text-sm dark:bg-white/5"
            >
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">{complex.name}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{complex.region ?? '지역 미지정'}</p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-blue-600 dark:text-sky-300">
                관리
              </span>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

