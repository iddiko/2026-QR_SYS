"use client"

import React from 'react'
import EditablePageNote from '../../../../components/admin/EditablePageNote'
import PageEditButton from '../../../../components/admin/PageEditButton'
import { getClientAuthHeaders } from '../../../../lib/clientAuth'
import { useComplexScope } from '../../../../lib/complexScope'

type AdItem = {
  id: string
  title: string
  image_url: string
  link_url: string | null
  created_at: string
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'))
    reader.readAsDataURL(file)
  })
}

export default function AdsBoardPage() {
  const routeKey = '/dashboard/ads/ads'
  const { scope } = useComplexScope()
  const [items, setItems] = React.useState<AdItem[]>([])
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [imageUrl, setImageUrl] = React.useState('')
  const [linkUrl, setLinkUrl] = React.useState('')
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [fileDataUrl, setFileDataUrl] = React.useState<string | null>(null)
  const fileRef = React.useRef<HTMLInputElement | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const modalRef = React.useRef<HTMLDivElement | null>(null)
  const rafRef = React.useRef<number | null>(null)
  const dragRef = React.useRef<{
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const [modalPos, setModalPos] = React.useState<{ x: number; y: number } | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const headers = await getClientAuthHeaders()
      if (!headers.Authorization && !headers['x-demo-role']) {
        if (!cancelled) {
          setError('로그인이 필요합니다.')
          setLoading(false)
        }
        return
      }

      const params = new URLSearchParams()
      params.set('limit', '100')
      if (scope.type === 'complex') params.set('complexId', scope.id)

      const res = await fetch(`/api/ads-items?${params.toString()}`, { headers })
      const json = (await res.json()) as { error?: string; items?: AdItem[] }
      if (!res.ok) {
        if (!cancelled) {
          setError(json.error ?? '불러오기에 실패했습니다.')
          setLoading(false)
        }
        return
      }
      if (!cancelled) {
        setItems(json.items ?? [])
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [scope.id, scope.type])

  const clampModalPos = React.useCallback((x: number, y: number) => {
    const el = modalRef.current
    const padding = 16
    if (!el) return { x, y }
    const rect = el.getBoundingClientRect()
    const maxX = Math.max(padding, window.innerWidth - rect.width - padding)
    const maxY = Math.max(padding, window.innerHeight - rect.height - padding)
    return {
      x: Math.min(Math.max(x, padding), maxX),
      y: Math.min(Math.max(y, padding), maxY),
    }
  }, [])

  React.useLayoutEffect(() => {
    if (!open) return
    setModalPos(null)
    const id = window.requestAnimationFrame(() => {
      const el = modalRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const next = clampModalPos((window.innerWidth - rect.width) / 2, (window.innerHeight - rect.height) / 2)
      setModalPos(next)
    })
    return () => window.cancelAnimationFrame(id)
  }, [clampModalPos, open])

  React.useEffect(() => {
    if (!open) return
    const onResize = () => {
      setModalPos((prev) => {
        if (!prev) return prev
        return clampModalPos(prev.x, prev.y)
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [clampModalPos, open])

  const addItem = async () => {
    const t = title.trim()
    const imgUrl = imageUrl.trim()
    const link = linkUrl.trim()
    if (!t) return
    if (!imgUrl && !fileDataUrl) return

    const headers = await getClientAuthHeaders()
    if (!headers.Authorization && !headers['x-demo-role']) return

    setLoading(true)
    setError(null)

    let finalImageUrl = imgUrl
    if (!finalImageUrl && fileDataUrl) {
      const uploadRes = await fetch('/api/uploads', {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({
          dataUrl: fileDataUrl,
          fileName: fileName ?? 'ad.png',
          folder: 'ads',
        }),
      })
      const uploadJson = (await uploadRes.json()) as { error?: string; url?: string }
      if (!uploadRes.ok || !uploadJson.url) {
        setError(uploadJson.error ?? '이미지 업로드에 실패했습니다.')
        setLoading(false)
        return
      }
      finalImageUrl = uploadJson.url
    }

    const res = await fetch('/api/ads-items', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        title: t,
        imageUrl: finalImageUrl,
        linkUrl: link || undefined,
        complexId: scope.type === 'complex' ? scope.id : undefined,
      }),
    })
    const json = (await res.json()) as { error?: string; item?: AdItem }
    if (!res.ok || !json.item) {
      setError(json.error ?? '등록에 실패했습니다.')
      setLoading(false)
      return
    }

    const updated = [json.item, ...items]
    setItems(updated)
    setTitle('')
    setImageUrl('')
    setLinkUrl('')
    setFileName(null)
    setFileDataUrl(null)
    if (fileRef.current) fileRef.current.value = ''
    setOpen(false)
    setLoading(false)
  }

  const removeItem = async (id: string) => {
    const headers = await getClientAuthHeaders()
    if (!headers.Authorization && !headers['x-demo-role']) return
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/ads-items?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    })
    const json = (await res.json()) as { error?: string }
    if (!res.ok) {
      setError(json.error ?? '삭제에 실패했습니다.')
      setLoading(false)
      return
    }

    const updated = items.filter((i) => i.id !== id)
    setItems(updated)
    setLoading(false)
  }

  const handleFile = async (file: File | null) => {
    if (!file) return
    setFileName(file.name)
    const dataUrl = await readFileAsDataUrl(file)
    setFileDataUrl(dataUrl)
  }

  const onModalPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return
    const rect = modalRef.current?.getBoundingClientRect()
    if (!rect) return

    event.preventDefault()
    event.stopPropagation()

    const origin = modalPos ?? { x: rect.left, y: rect.top }
    dragRef.current = { startX: event.clientX, startY: event.clientY, originX: origin.x, originY: origin.y }

    const previousUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      const nextRaw = { x: dragRef.current.originX + dx, y: dragRef.current.originY + dy }
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => setModalPos(clampModalPos(nextRaw.x, nextRaw.y)))
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.userSelect = previousUserSelect
      dragRef.current = null
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const modalStyle: React.CSSProperties = modalPos
    ? { left: modalPos.x, top: modalPos.y }
    : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[240px]">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">이미지</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">광고 관리</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            이미지 게시판 형태로 광고를 등록합니다. (현재는 데모로 로컬 저장)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            광고 등록
          </button>
          <PageEditButton routeKey={routeKey} />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">광고 목록</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{items.length}건</p>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

        {loading && items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">불러오는 중...</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">아직 등록된 광고가 없습니다.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 shadow-sm dark:border-white/10 dark:bg-slate-950/20"
              >
                <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                </div>
                <div className="p-4">
                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EditablePageNote routeKey={routeKey} />

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-4">
          <div
            ref={modalRef}
            style={modalStyle}
            className="fixed w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
          >
            <div
              onPointerDown={onModalPointerDown}
              className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 select-none cursor-move"
              title="여기를 드래그해서 창을 이동할 수 있습니다."
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600">등록</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-950">광고 등록</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                닫기
              </button>
            </div>

              <div className="flex max-h-[85vh] flex-col">
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700">제목</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                      placeholder="예) 단지 상가 할인 이벤트"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-700">이미지 URL</label>
                      <input
                        value={imageUrl}
                        onChange={(e) => {
                          setImageUrl(e.target.value)
                          setFileName(null)
                          setFileDataUrl(null)
                        }}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700">파일 업로드(대체)</label>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                        className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                      />
                      {fileName ? <p className="mt-1 text-xs text-slate-500">선택됨: {fileName}</p> : null}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700">링크 URL(선택)</label>
                    <input
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                      placeholder="https://..."
                    />
                  </div>

                  {imageUrl || fileDataUrl ? (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-700">미리보기</p>
                      <div className="mt-2 aspect-[16/10] w-full overflow-hidden rounded-2xl bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl || fileDataUrl || ''} alt="preview" className="h-full w-full object-cover" />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  등록
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
