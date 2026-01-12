"use client"

export default function Header() {
  return (
    <header className="border-b border-white/5 bg-slate-950/80 px-6 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">QR Parking</p>
          <h1 className="text-lg font-semibold">단지별 경비/입주민 로그인</h1>
        </div>
        <div className="text-xs text-slate-400">Supabase Auth · Vercel 배포 · QR 토큰</div>
      </div>
    </header>
  )
}
