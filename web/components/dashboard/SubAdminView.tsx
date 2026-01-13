"use client"

export default function SubAdminView() {
  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/70 p-6 backdrop-blur dark:bg-slate-950/40">
      <p className="text-xs uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">서브 관리자</p>
      <h3 className="text-xl font-semibold text-slate-950 dark:text-white">동 운영 요약</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        서브 관리자는 소속 동 기준으로 경비·입주민 메뉴 ON/OFF, 공지/광고, QR 발급을 담당합니다.
      </p>

      <div className="grid gap-3">
        <article className="rounded-2xl border border-white/10 bg-white/70 p-4 text-sm dark:bg-white/5">
          <p className="text-[13px] font-semibold text-slate-950 dark:text-white">QR 발급/관리</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">소속 동 범위 내에서 방문자/입주민 QR을 발급합니다.</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/70 p-4 text-sm dark:bg-white/5">
          <p className="text-[13px] font-semibold text-slate-950 dark:text-white">권한별 메뉴 관리</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">경비/입주민 메뉴를 ON/OFF로 조정합니다.</p>
        </article>
      </div>
    </section>
  )
}

