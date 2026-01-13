"use client"

export default function Header() {
  return (
    <header className="border-b border-slate-200/80 bg-slate-100/85 px-6 py-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">
            QR Parking
          </p>
          <h1 className="text-lg font-semibold text-slate-950 dark:text-white">단지별 경비/입주민 로그인</h1>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">Supabase Auth · Vercel 배포 · QR 토큰</div>
      </div>
    </header>
  )
}

