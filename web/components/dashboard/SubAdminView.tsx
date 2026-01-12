"use client"

export default function SubAdminView() {
  return (
    <section className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-6">
      <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">서브 관리자</p>
      <h3 className="text-xl font-semibold text-white">동 단위 QR·메뉴 확인</h3>
      <p className="text-sm text-slate-400">경비/입주민 메뉴를 메뉴 토글로 관리하고 QR 발행 내역을 즉시 확인합니다.</p>

      <div className="grid gap-3">
        <article className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 text-sm text-slate-200">
          <p className="text-[13px] font-semibold text-white">QR 발행/로그</p>
          <p className="text-[11px] text-slate-400">최근 24시간: 28건 · 유효 QR 6개</p>
        </article>
        <article className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 text-sm text-slate-200">
          <p className="text-[13px] font-semibold text-white">메뉴 토글</p>
          <p className="text-[11px] text-slate-400">입주민 공지 · 방문객 등록 등 메뉴를 on/off</p>
        </article>
      </div>
    </section>
  )
}
