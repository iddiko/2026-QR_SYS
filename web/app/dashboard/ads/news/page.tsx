"use client"

import React from 'react'
import { getClientAuthHeaders } from '../../../../lib/clientAuth'
import EditablePageNote from '../../../../components/admin/EditablePageNote'
import PageEditButton from '../../../../components/admin/PageEditButton'
import { useComplexScope } from '../../../../lib/complexScope'

type NewsPost = {
  id: string
  complex_id: string | null
  title: string
  content: string
  created_at: string
  updated_at: string
}

export default function NewsManagementPage() {
  const routeKey = '/dashboard/ads/news'
  const { scope } = useComplexScope()
  const [posts, setPosts] = React.useState<NewsPost[]>([])
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [selected, setSelected] = React.useState<NewsPost | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

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

      const res = await fetch(`/api/news?${params.toString()}`, { headers })
      const json = (await res.json()) as { error?: string; posts?: NewsPost[] }
      if (!res.ok) {
        if (!cancelled) {
          setError(json.error ?? '불러오기에 실패했습니다.')
          setLoading(false)
        }
        return
      }

      if (!cancelled) {
        setPosts(json.posts ?? [])
        setSelected((prev) => (prev ? (json.posts ?? []).find((p) => p.id === prev.id) ?? null : null))
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [scope.id, scope.type])

  const createPost = async () => {
    const t = title.trim()
    const c = content.trim()
    if (!t || !c) return
    const headers = await getClientAuthHeaders()
    if (!headers.Authorization && !headers['x-demo-role']) return

    setLoading(true)
    setError(null)

    const res = await fetch('/api/news', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        title: t,
        content: c,
        complexId: scope.type === 'complex' ? scope.id : undefined,
      }),
    })

    const json = (await res.json()) as { error?: string; post?: NewsPost }
    if (!res.ok || !json.post) {
      setError(json.error ?? '등록에 실패했습니다.')
      setLoading(false)
      return
    }

    const updated = [json.post, ...posts]
    setPosts(updated)
    setTitle('')
    setContent('')
    setOpen(false)
    setSelected(json.post)
    setLoading(false)
  }

  const removePost = async (id: string) => {
    const headers = await getClientAuthHeaders()
    if (!headers.Authorization && !headers['x-demo-role']) return
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/news?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    })
    const json = (await res.json()) as { error?: string }
    if (!res.ok) {
      setError(json.error ?? '삭제에 실패했습니다.')
      setLoading(false)
      return
    }

    const updated = posts.filter((p) => p.id !== id)
    setPosts(updated)
    if (selected?.id === id) setSelected(null)
    setLoading(false)
  }

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[240px]">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-sky-300">게시판</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">소식 관리</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">일반 게시판처럼 소식/공지 글을 등록합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            글 작성
          </button>
          <PageEditButton routeKey={routeKey} />
        </div>
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">글 목록</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{posts.length}건</p>
          </div>

          <div className="mt-4 space-y-2">
            {loading && posts.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">불러오는 중...</p>
            ) : posts.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">아직 등록된 글이 없습니다.</p>
            ) : (
              posts.map((p) => {
                const active = selected?.id === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelected(p)}
                    className={`flex w-full items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-blue-500/30 bg-blue-500/10'
                        : 'border-slate-200/70 bg-transparent hover:border-blue-500/20 hover:bg-white/60 dark:border-white/10 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{p.title}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(p.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">보기</span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">내용</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">선택한 글을 확인합니다.</p>
            </div>
            {selected ? (
              <button
                type="button"
                onClick={() => removePost(selected.id)}
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
              >
                삭제
              </button>
            ) : null}
          </div>

          {selected ? (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{selected.title}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {new Date(selected.created_at).toLocaleString()}
              </p>
              <div className="prose prose-slate mt-4 max-w-none whitespace-pre-wrap text-sm text-slate-700 dark:prose-invert dark:text-slate-200">
                {selected.content}
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">왼쪽에서 글을 선택하세요.</p>
          )}
        </div>
      </div>

      <EditablePageNote routeKey={routeKey} />

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600">작성</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-950">소식 글 작성</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                닫기
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">제목</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                  placeholder="예) 주차장 공사 안내"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">내용</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-2 h-40 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                  placeholder="공지 내용을 입력하세요."
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={createPost}
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
