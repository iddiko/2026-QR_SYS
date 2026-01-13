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
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'))
    reader.readAsDataURL(file)
  })
}

export default function AdsBoardPage() {
  const routeKey = '/dashboard/ads/ads'
  const { scope } = useComplexScope()

  const [items, setItems] = React.useState<AdItem[]>([])
  const [selectedId, setSelectedId] = React.useState<string>('')
  const selected = items.find((i) => i.id === selectedId) ?? null

  const [title, setTitle] = React.useState('')
  const [imageUrl, setImageUrl] = React.useState('')
  const [linkUrl, setLinkUrl] = React.useState('')
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [fileDataUrl, setFileDataUrl] = React.useState<string | null>(null)
  const fileRef = React.useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadItems = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    const headers = await getClientAuthHeaders()
    if (!headers.Authorization && !headers['x-demo-role']) {
      setError('로그인이 필요합니다.')
      setLoading(false)
      return
    }

    const params = new URLSearchParams()
    params.set('limit', '200')
    if (scope.type === 'complex') params.set('complexId', scope.id)

    const res = await fetch(`/api/ads-items?${params.toString()}`, { headers })
    const json = (await res.json()) as { error?: string; items?: AdItem[] }
    if (!res.ok) {
      setError(json.error ?? '불러오기에 실패했습니다.')
      setLoading(false)
      return
    }

    setItems(json.items ?? [])
    setSelectedId((prev) => {
      if (!prev) return prev
      return (json.items ?? []).some((i) => i.id === prev) ? prev : ''
    })
    setLoading(false)
  }, [scope.id, scope.type])

  React.useEffect(() => {
    void loadItems()
  }, [loadItems])

  const handleFile = async (file: File | null) => {
    if (!file) return
    setFileName(file.name)
    const dataUrl = await readFileAsDataUrl(file)
    setFileDataUrl(dataUrl)
  }

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

    setItems((prev) => [json.item!, ...prev])
    setSelectedId(json.item.id)
    setTitle('')
    setImageUrl('')
    setLinkUrl('')
    setFileName(null)
    setFileDataUrl(null)
    if (fileRef.current) fileRef.current.value = ''
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

    setItems((prev) => prev.filter((i) => i.id !== id))
    setSelectedId((prev) => (prev === id ? '' : prev))
    setLoading(false)
  }

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[240px]">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">이미지</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">광고 관리</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            카드형 이미지 게시판 형태로 광고를 등록합니다. (현재는 데모이므로 실제 운영 시 Supabase DB/Storage에 저장됩니다.)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PageEditButton routeKey={routeKey} />
        </div>
      </div>

      <EditablePageNote routeKey={routeKey} />

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <aside className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">광고 목록</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{items.length}건</p>
          </div>

          {loading && items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">아직 등록된 광고가 없습니다.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {items.map((item) => {
                const active = item.id === selectedId
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`rounded-2xl border p-2 text-left transition ${
                      active
                        ? 'border-blue-500/40 bg-blue-500/10'
                        : 'border-slate-200/70 bg-white/60 hover:border-blue-500/25 hover:bg-white dark:border-white/10 dark:bg-white/0 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="aspect-square w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image_url} alt={item.title} className="h-full w-full object-contain" />
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-900 dark:text-white">{item.title}</p>
                  </button>
                )
              })}
            </div>
          )}
        </aside>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">광고 입력</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  오른쪽에서 광고를 입력하고, 왼쪽 목록에서 카드로 확인합니다. 이미지는 규격 안에 맞춰 축소되어 표시됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void addItem()}
                disabled={loading || !title.trim() || (!imageUrl.trim() && !fileDataUrl)}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                광고 등록
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">제목</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                    placeholder="예) 상가 이벤트 / 공지"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">이미지 URL</label>
                  <input
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value)
                      setFileName(null)
                      setFileDataUrl(null)
                      if (fileRef.current) fileRef.current.value = ''
                    }}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">이미지 업로드</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:file:bg-white/10 dark:hover:file:bg-white/15"
                  />
                  {fileName ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">선택됨: {fileName}</p> : null}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">링크 URL(선택)</label>
                  <input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">미리보기</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">등록 미리보기</p>
                    <div className="mt-2 aspect-square w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl || fileDataUrl || ''} alt="preview" className="h-full w-full object-contain" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">선택 광고</p>
                    {selected ? (
                      <>
                        <div className="mt-2 aspect-square w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={selected.image_url} alt={selected.title} className="h-full w-full object-contain" />
                        </div>
                        <p className="mt-2 text-xs font-semibold text-slate-900 dark:text-white">{selected.title}</p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {new Date(selected.created_at).toLocaleString('ko-KR')}
                        </p>
                        <div className="mt-2 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => void removeItem(selected.id)}
                            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                          >
                            삭제
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">왼쪽에서 광고를 선택하세요.</p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  이미지(파일 업로드)는 Supabase Storage에 저장되고, 광고 데이터는 Postgres 테이블에 저장되어 다른 사용자도 동일하게 볼 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void loadItems()}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              disabled={loading}
            >
              새로고침
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

