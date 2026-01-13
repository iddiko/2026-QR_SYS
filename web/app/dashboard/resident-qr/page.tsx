"use client"

import React from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import * as XLSX from 'xlsx'
import EditablePageNote from '../../../components/admin/EditablePageNote'
import PageEditButton from '../../../components/admin/PageEditButton'
import supabase from '../../../lib/supabaseClient'

type CarType = 'ICE' | 'EV'

type QrInfo = {
  token: string
  issuedAt: string
  expiresAt: string
}

type Resident = {
  id: string
  email: string
  displayName: string
  phone: string
  unitLabel: string
  hasCar: boolean
  carType?: CarType
  carNumber?: string
  complexId?: string
  buildingId?: string
  registeredAt: string
  qr?: QrInfo
}

type ApiResident = {
  id: string
  email: string
  displayName: string
  phone: string
  unitLabel: string
  hasCar: boolean
  carType?: CarType
  carNumber?: string
  complexId?: string
  buildingId?: string
  registeredAt: string
  qr: { token: string; issuedAt: string; expiresAt: string } | null
}

type ImportRow = {
  email: string
  displayName?: string
  phone?: string
  unitLabel?: string
  hasCar?: boolean
  carType?: CarType
  carNumber?: string
}

function nowIso() {
  return new Date().toISOString()
}

function addDaysIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function formatKoreanDate(iso: string | undefined) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('ko-KR')
}

function newId(prefix = 'r') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function generateToken() {
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    return `qr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `qr_${hex}`
}

function issueQr(): QrInfo {
  return {
    token: generateToken(),
    issuedAt: nowIso(),
    expiresAt: addDaysIso(30),
  }
}

export default function ResidentQrPage() {
  const routeKey = '/dashboard/resident-qr'

  const [filter, setFilter] = React.useState('')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [qrDialog, setQrDialog] = React.useState<{ residentId: string; dataUrl: string } | null>(null)
  const [importOpen, setImportOpen] = React.useState(false)
  const [importRows, setImportRows] = React.useState<ImportRow[]>([])
  const [importStatus, setImportStatus] = React.useState<'idle' | 'parsing' | 'ready' | 'uploading' | 'done' | 'error'>('idle')
  const [importMessage, setImportMessage] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [loadError, setLoadError] = React.useState('')
  const [continuous, setContinuous] = React.useState(true)
  const [sending, setSending] = React.useState(false)

  const [complexOptions, setComplexOptions] = React.useState<Array<{ id: string; name: string }>>([])
  const [buildingOptions, setBuildingOptions] = React.useState<Array<{ id: string; name: string }>>([])
  const [selectedComplexId, setSelectedComplexId] = React.useState('')
  const [selectedBuildingId, setSelectedBuildingId] = React.useState('')

  const [form, setForm] = React.useState({
    email: '',
    displayName: '',
    phone: '',
    unitLabel: '',
    hasCar: false,
    carType: 'ICE' as CarType,
    carNumber: '',
  })

  const [residents, setResidents] = React.useState<Resident[]>(() => [
    {
      id: newId('resident'),
      email: 'sample.resident@example.com',
      displayName: '샘플 입주민',
      phone: '010-0000-0000',
      unitLabel: '101동 1203호',
      hasCar: true,
      carType: 'ICE',
      carNumber: '12가 3456',
      registeredAt: nowIso(),
      qr: issueQr(),
    },
  ])

  const filteredResidents = residents.filter((r) => {
    if (!filter.trim()) return true
    const q = filter.trim().toLowerCase()
    return (
      r.email.toLowerCase().includes(q) ||
      r.displayName.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      r.unitLabel.toLowerCase().includes(q) ||
      (r.carNumber ?? '').toLowerCase().includes(q)
    )
  })

  const openCreate = () => {
    setForm({
      email: '',
      displayName: '',
      phone: '',
      unitLabel: '',
      hasCar: false,
      carType: 'ICE',
      carNumber: '',
    })
    setDialogOpen(true)
    void ensureComplexesLoaded()
  }

  const closeCreate = () => setDialogOpen(false)

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    else if (process.env.NODE_ENV !== 'production') headers['x-demo-role'] = 'SUPER'
    return headers
  }

  const ensureComplexesLoaded = async () => {
    if (complexOptions.length > 0) return
    const headers = await getAuthHeaders()
    const res = await fetch('/api/complexes', { headers })
    const json = (await res.json()) as { complexes?: Array<{ id: string; name: string }>; error?: string }
    if (!res.ok) throw new Error(json.error ?? '단지 목록 불러오기 실패')
    const next = (json.complexes ?? []).map((c) => ({ id: c.id, name: c.name }))
    setComplexOptions(next)
    if (next.length === 1 && !selectedComplexId) {
      setSelectedComplexId(next[0].id)
      void loadBuildings(next[0].id)
    }
  }

  const loadBuildings = async (complexId: string) => {
    setBuildingOptions([])
    setSelectedBuildingId('')
    if (!complexId) return
    const headers = await getAuthHeaders()
    const qs = new URLSearchParams({ complexId })
    const res = await fetch(`/api/buildings?${qs.toString()}`, { headers })
    const json = (await res.json()) as { buildings?: Array<{ id: string; name: string }>; error?: string }
    if (!res.ok) throw new Error(json.error ?? '동 목록 불러오기 실패')
    setBuildingOptions((json.buildings ?? []).map((b) => ({ id: b.id, name: b.name })))
  }

  const loadResidents = React.useCallback(async () => {
    setLoadError('')
    try {
      const headers = await getAuthHeaders()
      const qs = new URLSearchParams()
      if (filter.trim()) qs.set('q', filter.trim())
      qs.set('limit', '200')
      const res = await fetch(`/api/residents?${qs.toString()}`, { headers })
      const json = (await res.json()) as { residents?: ApiResident[]; error?: string }
      if (!res.ok) throw new Error(json.error ?? '불러오기 실패')

      const next: Resident[] = (json.residents ?? []).map((r) => ({
        id: r.id,
        email: r.email,
        displayName: r.displayName,
        phone: r.phone,
        unitLabel: r.unitLabel,
        hasCar: r.hasCar,
        carType: r.carType,
        carNumber: r.carNumber,
        registeredAt: r.registeredAt,
        complexId: r.complexId,
        buildingId: r.buildingId,
        qr: r.qr
          ? { token: r.qr.token, issuedAt: r.qr.issuedAt, expiresAt: r.qr.expiresAt }
          : undefined,
      }))
      setResidents(next)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '불러오기 실패')
    }
  }, [filter])

  React.useEffect(() => {
    loadResidents()
  }, [loadResidents])

  const submitCreate = async () => {
    if (!form.email.trim()) return
    setSaving(true)
    try {
      if (!selectedComplexId) throw new Error('소속 단지를 선택해 주세요.')
      if (!selectedBuildingId) throw new Error('소속 동을 선택해 주세요.')
      const headers = await getAuthHeaders()
      const hasCar = form.hasCar && form.carNumber.trim() !== ''
      const payload = {
        email: form.email.trim(),
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        unitLabel: form.unitLabel.trim(),
        complexId: selectedComplexId,
        buildingId: selectedBuildingId,
        hasCar,
        carType: hasCar ? form.carType : undefined,
        carNumber: hasCar ? form.carNumber.trim() : undefined,
      }
      const res = await fetch('/api/residents', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error ?? '등록 실패')

      await loadResidents()

      if (continuous) {
        setForm((p) => ({ ...p, email: '', displayName: '', phone: '', carNumber: '' }))
      } else {
        setDialogOpen(false)
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '등록 실패')
  } finally {
      setSaving(false)
    }
  }

  const submitInvite = async () => {
    if (!form.email.trim()) return
    setSending(true)
    try {
      if (!selectedComplexId) throw new Error('소속 단지를 선택해 주세요.')
      if (!selectedBuildingId) throw new Error('소속 동을 선택해 주세요.')
      const headers = await getAuthHeaders()
      const hasCar = form.hasCar && form.carNumber.trim() !== ''
      const complexName = complexOptions.find((c) => c.id === selectedComplexId)?.name ?? ''
      const buildingName = buildingOptions.find((b) => b.id === selectedBuildingId)?.name ?? ''

      const payload = {
        email: form.email.trim(),
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        unitLabel: form.unitLabel.trim(),
        complexId: selectedComplexId,
        complexName,
        buildingId: selectedBuildingId,
        buildingName,
        hasCar,
        carType: hasCar ? form.carType : undefined,
        carNumber: hasCar ? form.carNumber.trim() : undefined,
      }

      const res = await fetch('/api/residents/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as { error?: string; message?: string }
      if (!res.ok) throw new Error(json.error ?? '?? ??')

      alert(json.message ?? '입주민에게 등록 링크(초대 메일)를 보냈습니다.')

      if (continuous) {
        setForm((p) => ({ ...p, email: '', displayName: '', phone: '', carNumber: '' }))
      } else {
        setDialogOpen(false)
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '?? ??')
    } finally {
      setSending(false)
    }
  }

  const reissueQr = async (residentId: string) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/residents/reissue', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify({ residentId }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error ?? '재발행 실패')
      await loadResidents()
    } catch (e) {
      alert(e instanceof Error ? e.message : '재발행 실패')
    }
  }

  const showQr = async (resident: Resident) => {
    if (!resident.qr) return
    const payload = JSON.stringify({
      type: 'resident_car',
      residentId: resident.id,
      token: resident.qr.token,
      expiresAt: resident.qr.expiresAt,
    })
    const url = await QRCode.toDataURL(payload, { margin: 1, width: 220 })
    setQrDialog({ residentId: resident.id, dataUrl: url })
  }

  const closeQr = () => setQrDialog(null)

  const openImport = () => {
    setImportOpen(true)
    setImportRows([])
    setImportStatus('idle')
    setImportMessage('')
    void ensureComplexesLoaded()
  }

  const closeImport = () => {
    setImportOpen(false)
    setImportRows([])
    setImportStatus('idle')
    setImportMessage('')
  }

  const toBool = (value: unknown) => {
    const v = String(value ?? '').trim().toLowerCase()
    return v === 'y' || v === 'yes' || v === '1' || v === 'true' || v === 'o' || v === '있음'
  }

  const normalizeCarTypeFromText = (value: unknown): CarType | undefined => {
    const v = String(value ?? '').trim().toLowerCase()
    if (!v) return undefined
    if (v === 'ev' || v.includes('전기')) return 'EV'
    if (v === 'ice' || v.includes('내연')) return 'ICE'
    return undefined
  }

  const parseImportFile = async (file: File) => {
    setImportStatus('parsing')
    setImportMessage('')

    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
      if (!rows.length) throw new Error('엑셀/CSV에 데이터가 없습니다.')

      const mapped: ImportRow[] = rows
        .map((r) => {
          const email = String(r['이메일'] ?? r['email'] ?? '').trim()
          if (!email) return null

          const displayName = String(r['이름'] ?? r['name'] ?? r['display_name'] ?? '').trim()
          const phone = String(r['연락처'] ?? r['phone'] ?? '').trim()
          const unitLabel = String(r['동/호'] ?? r['동호'] ?? r['unit'] ?? r['unitLabel'] ?? '').trim()

          const hasCar = toBool(r['차량유무'] ?? r['hasCar'] ?? r['차량'] ?? '')
          const carType = normalizeCarTypeFromText(r['차량종류'] ?? r['carType'] ?? '')
          const carNumber = String(r['차량번호'] ?? r['carNumber'] ?? '').trim()

          return {
            email,
            displayName,
            phone,
            unitLabel,
            hasCar: hasCar && !!carNumber,
            carType: hasCar && carNumber ? (carType ?? 'ICE') : undefined,
            carNumber: hasCar && carNumber ? carNumber : undefined,
          } satisfies ImportRow
        })
        .filter(Boolean) as ImportRow[]

      if (!mapped.length) throw new Error('유효한 행(이메일 포함)이 없습니다.')
      if (mapped.length > 50) throw new Error('한 번에 최대 50명까지 업로드할 수 있습니다.')

      setImportRows(mapped)
      setImportStatus('ready')
      setImportMessage(`총 ${mapped.length}명 인식됨`)
    } catch (e) {
      setImportStatus('error')
      setImportMessage(e instanceof Error ? e.message : '파일 파싱 실패')
    }
  }

  const uploadImportRows = async () => {
    if (!importRows.length) return
    setImportStatus('uploading')
    setImportMessage('')
    try {
      if (!selectedComplexId) throw new Error('소속 단지를 선택해 주세요.')
      if (!selectedBuildingId) throw new Error('소속 동을 선택해 주세요.')
      const headers = await getAuthHeaders()
      const res = await fetch('/api/residents/batch', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify({ complexId: selectedComplexId, buildingId: selectedBuildingId, residents: importRows }),
      })
      const json = (await res.json()) as { results?: Array<{ email: string; ok: boolean; error?: string }>; error?: string }
      if (!res.ok) throw new Error(json.error ?? '업로드 실패')

      const results = json.results ?? []
      const okCount = results.filter((r) => r.ok).length
      const failCount = results.length - okCount
      setImportStatus('done')
      setImportMessage(`완료: 성공 ${okCount} / 실패 ${failCount}`)
      await loadResidents()
    } catch (e) {
      setImportStatus('error')
      setImportMessage(e instanceof Error ? e.message : '업로드 실패')
    }
  }

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">관리</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">입주민/QR 관리</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            회원 등록 정보(필드)와 차량 정보, QR 발행/만료 정보를 한 화면에서 관리합니다. 차량이 등록된 입주민은 등록 시 QR이 자동 1차 발행됩니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:bg-blue-500"
          >
            입주민 등록
          </button>
          <button
            type="button"
            onClick={openImport}
            className="rounded-full border border-slate-200/80 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/10"
          >
            엑셀 업로드
          </button>
          <PageEditButton routeKey={routeKey} />
        </div>
      </div>

      <EditablePageNote routeKey={routeKey} />

      {loadError && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
          불러오기 실패: {loadError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
          총 {filteredResidents.length}명
        </p>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="이름/이메일/동호/차량번호 검색"
          className="w-full max-w-md rounded-full border border-slate-200/80 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-slate-950/30">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 text-left text-xs uppercase tracking-[0.3em] text-slate-500 dark:border-white/10 dark:text-slate-400">
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">이메일</th>
              <th className="px-4 py-3">연락처</th>
              <th className="px-4 py-3">동/호</th>
              <th className="px-4 py-3">차량</th>
              <th className="px-4 py-3">회원등록일</th>
              <th className="px-4 py-3">QR 발행일</th>
              <th className="px-4 py-3">QR 만료일</th>
              <th className="px-4 py-3">동작</th>
            </tr>
          </thead>
          <tbody>
            {filteredResidents.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-b-0 dark:border-white/5">
                <td className="px-4 py-3 font-semibold text-slate-950 dark:text-white">{r.displayName}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.email}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.phone || '-'}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.unitLabel || '-'}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                  {r.hasCar && r.carType && r.carNumber ? `${r.carType === 'EV' ? '전기차' : '내연기관'} · ${r.carNumber}` : '없음'}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatKoreanDate(r.registeredAt)}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatKoreanDate(r.qr?.issuedAt)}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatKoreanDate(r.qr?.expiresAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!r.hasCar}
                      onClick={() => reissueQr(r.id)}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                        r.hasCar
                          ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 hover:bg-blue-500/15 dark:text-sky-300'
                          : 'cursor-not-allowed border-slate-200/80 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5'
                      }`}
                    >
                      QR 재발행
                    </button>
                    <button
                      type="button"
                      disabled={!r.qr}
                      onClick={() => showQr(r)}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                        r.qr
                          ? 'border-slate-200/80 bg-white/70 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200'
                          : 'cursor-not-allowed border-slate-200/80 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5'
                      }`}
                    >
                      QR 보기
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredResidents.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/20" onClick={closeCreate} />
          <div className="absolute left-1/2 top-24 w-[min(720px,calc(100vw-24px))] -translate-x-1/2 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_20px_50px_rgba(2,6,23,0.18)] backdrop-blur dark:border-white/10 dark:bg-slate-950/85">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">등록</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">입주민 등록</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  차량이 있고 차량번호가 입력되면 QR이 자동 1차 발행됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreate}
                className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/10"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={submitInvite}
                disabled={!form.email.trim() || saving || sending}
                className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-blue-700 hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:border-slate-200/80 disabled:bg-slate-100 disabled:text-slate-400 dark:text-sky-300"
              >
                {sending ? '?? ?...' : '???'}
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
                  소속 단지(필수)
                </label>
                <select
                  value={selectedComplexId}
                  onChange={(e) => {
                    const next = e.target.value
                    setSelectedComplexId(next)
                    void loadBuildings(next)
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                >
                  <option value="">단지 선택</option>
                  {complexOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
                  소속 동(필수)
                </label>
                <select
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                  disabled={!selectedComplexId}
                  className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:disabled:bg-white/5"
                >
                  <option value="">{selectedComplexId ? '동 선택' : '단지를 먼저 선택'}</option>
                  {buildingOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
                  이메일(필수)
                </label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                  placeholder="resident@example.com"
                />
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
                  placeholder="010-1234-5678"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
                  동/호
                </label>
                <input
                  value={form.unitLabel}
                  onChange={(e) => setForm((p) => ({ ...p, unitLabel: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                  placeholder="101동 1203호"
                />
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.hasCar}
                    onChange={(e) => setForm((p) => ({ ...p, hasCar: e.target.checked }))}
                  />
                  차량 있음
                </label>
                <div className="text-xs text-slate-500 dark:text-slate-400">차량번호가 있어야 QR이 발행됩니다.</div>
              </div>

              {form.hasCar && (
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
                      placeholder="12가 3456"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200/80 bg-white/70 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={continuous} onChange={(e) => setContinuous(e.target.checked)} />
                연속 등록(등록 후 창 유지)
              </label>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                팁: 연속 등록이면 이메일/이름/연락처/차량번호만 비우고 계속 입력할 수 있습니다.
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCreate}
                className="rounded-full border border-slate-200/80 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/10"
              >
                취소
              </button>
              <button
                type="button"
                onClick={submitCreate}
                disabled={!form.email.trim() || saving || sending}
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white/70"
              >
                {saving ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {importOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/20" onClick={closeImport} />
          <div className="absolute left-1/2 top-24 w-[min(880px,calc(100vw-24px))] -translate-x-1/2 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_20px_50px_rgba(2,6,23,0.18)] backdrop-blur dark:border-white/10 dark:bg-slate-950/85">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">업로드</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">엑셀/CSV 업로드</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  컬럼명 예시: 이메일, 이름, 연락처, 동/호, 차량유무, 차량종류, 차량번호
                </p>
              </div>
              <button
                type="button"
                onClick={closeImport}
                className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/10"
              >
                닫기
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
                  소속 단지(필수)
                </label>
                <select
                  value={selectedComplexId}
                  onChange={(e) => {
                    const next = e.target.value
                    setSelectedComplexId(next)
                    void loadBuildings(next)
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                >
                  <option value="">단지 선택</option>
                  {complexOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
                  소속 동(필수)
                </label>
                <select
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                  disabled={!selectedComplexId}
                  className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:disabled:bg-white/5"
                >
                  <option value="">{selectedComplexId ? '동 선택' : '단지를 먼저 선택'}</option>
                  {buildingOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  void parseImportFile(f)
                }}
                className="block w-full max-w-md text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.3em] file:text-white hover:file:bg-blue-500 dark:text-slate-200"
              />

              <button
                type="button"
                onClick={uploadImportRows}
                disabled={importStatus !== 'ready' || importRows.length === 0}
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white/70"
              >
                {importStatus === 'uploading' ? '업로드 중...' : '등록 시작'}
              </button>

              {importMessage && (
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {importMessage}
                </span>
              )}
            </div>

            {importRows.length > 0 && (
              <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-left text-xs uppercase tracking-[0.3em] text-slate-500 dark:border-white/10 dark:text-slate-400">
                      <th className="px-4 py-3">이메일</th>
                      <th className="px-4 py-3">이름</th>
                      <th className="px-4 py-3">연락처</th>
                      <th className="px-4 py-3">동/호</th>
                      <th className="px-4 py-3">차량</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 10).map((r) => (
                      <tr key={r.email} className="border-b border-slate-100 last:border-b-0 dark:border-white/5">
                        <td className="px-4 py-3 font-semibold text-slate-950 dark:text-white">{r.email}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.displayName ?? '-'}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.phone ?? '-'}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.unitLabel ?? '-'}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                          {r.hasCar && r.carNumber
                            ? `${r.carType === 'EV' ? '전기차' : '내연기관'} · ${r.carNumber}`
                            : '없음'}
                        </td>
                      </tr>
                    ))}
                    {importRows.length > 10 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                          미리보기는 10명까지만 표시됩니다. (총 {importRows.length}명)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {qrDialog && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/20" onClick={closeQr} />
          <div className="absolute left-1/2 top-24 w-[min(520px,calc(100vw-24px))] -translate-x-1/2 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_20px_50px_rgba(2,6,23,0.18)] backdrop-blur dark:border-white/10 dark:bg-slate-950/85">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">QR</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">입주민 QR</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">스캔용 QR 이미지입니다.</p>
              </div>
              <button
                type="button"
                onClick={closeQr}
                className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/10"
              >
                닫기
              </button>
            </div>

            <div className="mt-6 flex items-center justify-center">
              <Image
                src={qrDialog.dataUrl}
                alt="QR code"
                width={220}
                height={220}
                className="rounded-3xl border border-slate-200/80 bg-white p-3 dark:border-white/10"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
