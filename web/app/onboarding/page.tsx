"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import Header from '../../components/layout/Header'
import Footer from '../../components/layout/Footer'
import supabase from '../../lib/supabaseClient'

type CarType = 'ICE' | 'EV'
type Role = 'RESIDENT' | 'MAIN' | 'SUB' | 'GUARD'

function roleLabel(role: Role | '') {
  if (role === 'MAIN') return '단지(메인) 관리자'
  if (role === 'SUB') return '동(서브) 관리자'
  if (role === 'GUARD') return '경비'
  if (role === 'RESIDENT') return '입주민'
  return '-'
}

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [message, setMessage] = React.useState('')

  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<Role | ''>('')
  const [complexName, setComplexName] = React.useState('')
  const [buildingName, setBuildingName] = React.useState('')

  const [form, setForm] = React.useState({
    displayName: '',
    phone: '',
    unitLabel: '',
    hasCar: false,
    carType: 'ICE' as CarType,
    carNumber: '',
    password: '',
    password2: '',
  })

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user
      if (!user) {
        if (!cancelled) setLoading(false)
        return
      }

      const meta = (user.user_metadata ?? {}) as Record<string, unknown>
      const metaRole = String(meta.role ?? '') as Role

      if (!cancelled) {
        setEmail(user.email ?? '')
        setRole(metaRole)
        setComplexName(String(meta.complexName ?? ''))
        setBuildingName(String(meta.buildingName ?? ''))
        setForm((p) => ({
          ...p,
          displayName: String(meta.displayName ?? ''),
          phone: String(meta.phone ?? ''),
          unitLabel: String(meta.unitLabel ?? ''),
          hasCar: Boolean(meta.hasCar),
          carType: meta.carType === 'EV' ? 'EV' : 'ICE',
          carNumber: String(meta.carNumber ?? ''),
        }))
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const submit = async () => {
    setMessage('')
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) {
      setMessage('세션이 없습니다. 초대 메일의 링크로 다시 접속해 주세요.')
      return
    }

    if (form.password || form.password2) {
      if (form.password.length < 6) {
        setMessage('비밀번호는 최소 6자 이상이어야 합니다.')
        return
      }
      if (form.password !== form.password2) {
        setMessage('비밀번호 확인이 일치하지 않습니다.')
        return
      }

      const { error: pwError } = await supabase.auth.updateUser({ password: form.password })
      if (pwError) {
        setMessage(pwError.message)
        return
      }
    }

    const res = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        role,
        displayName: form.displayName,
        phone: form.phone,
        unitLabel: form.unitLabel,
        hasCar: form.hasCar,
        carType: form.hasCar ? form.carType : undefined,
        carNumber: form.hasCar ? form.carNumber : undefined,
      }),
    })

    const json = (await res.json()) as { error?: string }
    if (!res.ok) {
      setMessage(json.error ?? '등록을 완료하지 못했습니다.')
      return
    }

    router.replace('/dashboard')
  }

  const showResidentFields = role === 'RESIDENT'

  return (
    <div className="min-h-screen pb-[100px]">
      <Header />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
        <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-8 shadow-[0_15px_35px_rgba(2,6,23,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">회원 등록</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">초대된 계정 정보 입력</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            초대 메일의 링크로 접속한 뒤, 이름/연락처 등 기본 정보를 입력하고 등록을 완료하세요. 소속 단지/동은 초대 시 고정됩니다.
          </p>
        </section>

        {loading ? (
          <section className="rounded-3xl border border-slate-200/80 bg-white/70 p-6 text-sm text-slate-600 backdrop-blur dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-300">
            로딩 중…
          </section>
        ) : email ? (
          <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-8 backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">이메일</p>
                <p className="mt-2 rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
                  {email}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">권한</p>
                <p className="mt-2 rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
                  {roleLabel(role)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">단지</p>
                <p className="mt-2 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  {complexName || '(단지 미지정)'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">동</p>
                <p className="mt-2 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  {buildingName || '(동 미지정)'}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
                  이름
                </label>
                <input
                  value={form.displayName}
                  onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
                  연락처
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                  placeholder="010-0000-0000"
                />
              </div>

              {showResidentFields ? (
                <>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
                      동/호(선택)
                    </label>
                    <input
                      value={form.unitLabel}
                      onChange={(e) => setForm((p) => ({ ...p, unitLabel: e.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                      placeholder="예: 101동 1203호"
                    />
                  </div>

                  <div className="md:col-span-2 rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">차량 정보</p>
                      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={form.hasCar}
                          onChange={(e) => setForm((p) => ({ ...p, hasCar: e.target.checked }))}
                        />
                        차량 있음
                      </label>
                    </div>
                    {form.hasCar ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
                            차량 종류
                          </label>
                          <select
                            value={form.carType}
                            onChange={(e) => setForm((p) => ({ ...p, carType: e.target.value as CarType }))}
                            className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                          >
                            <option value="ICE">내연기관</option>
                            <option value="EV">전기차</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
                            차량 번호
                          </label>
                          <input
                            value={form.carNumber}
                            onChange={(e) => setForm((p) => ({ ...p, carNumber: e.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                            placeholder="예: 12가 3456"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
                  비밀번호(선택)
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                  placeholder="최소 6자"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={form.password2}
                  onChange={(e) => setForm((p) => ({ ...p, password2: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                />
              </div>
            </div>

            {message ? <p className="mt-4 text-sm text-rose-700">{message}</p> : null}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={submit}
                className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white hover:bg-blue-500"
              >
                등록 완료
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-200/80 bg-white/70 p-6 text-sm text-slate-700 backdrop-blur dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-300">
            세션이 없습니다. 초대 메일의 링크로 다시 접속해 주세요.
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}

