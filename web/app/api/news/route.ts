import { NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseAnonClient } from '../../../lib/serverSupabase'
import { assertScopeInput, getActorScope, requireAdminRole } from '../../../lib/accessControl'

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status })
}

type CreateNewsBody = {
  complexId?: string
  title?: string
  content?: string
}

export async function GET(request: Request) {
  const gate = await requireAdminRole(request, getSupabaseAnonClient)
  if (!gate.ok) return json(401, { error: gate.error })

  const url = new URL(request.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  const requestedComplexId = (url.searchParams.get('complexId') ?? '').trim()
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50) || 50, 200)

  const admin = getSupabaseAdminClient()
  let complexId: string | null = requestedComplexId || null

  if (gate.role !== 'SUPER') {
    if (!gate.userId) return json(401, { error: '인증 정보가 없습니다.' })
    const scope = await getActorScope(admin, gate.userId, gate.role)
    if (!scope.complexId) return json(400, { error: '관리자 소속 단지가 설정되지 않았습니다.' })
    complexId = scope.complexId
  }

  let query = admin
    .from('news_posts')
    .select('id, complex_id, title, content, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (complexId) query = query.eq('complex_id', complexId)
  if (q) query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return json(500, { error: error.message })

  return json(200, { posts: data ?? [] })
}

export async function POST(request: Request) {
  const gate = await requireAdminRole(request, getSupabaseAnonClient)
  if (!gate.ok) return json(401, { error: gate.error })

  const body = (await request.json()) as CreateNewsBody
  const title = (body.title ?? '').trim()
  const content = (body.content ?? '').trim()
  const requestedComplexId = (body.complexId ?? '').trim()

  if (!title) return json(400, { error: '제목이 필요합니다.' })
  if (!content) return json(400, { error: '내용이 필요합니다.' })

  const admin = getSupabaseAdminClient()
  let complexId: string | null = requestedComplexId || null

  if (gate.role !== 'SUPER') {
    if (!gate.userId) return json(401, { error: '인증 정보가 없습니다.' })
    const actor = await getActorScope(admin, gate.userId, gate.role)
    if (!actor.complexId) return json(400, { error: '관리자 소속 단지가 설정되지 않았습니다.' })
    const scopeError = assertScopeInput(gate.role, actor, { complexId: actor.complexId })
    if (scopeError) return json(403, { error: scopeError })
    complexId = actor.complexId
  }

  const { data, error } = await admin
    .from('news_posts')
    .insert({
      complex_id: complexId,
      title,
      content,
      created_by: gate.userId ?? null,
    })
    .select('id, complex_id, title, content, created_at, updated_at')
    .maybeSingle()

  if (error) return json(500, { error: error.message })
  return json(200, { post: data })
}

export async function DELETE(request: Request) {
  const gate = await requireAdminRole(request, getSupabaseAnonClient)
  if (!gate.ok) return json(401, { error: gate.error })

  const url = new URL(request.url)
  const id = (url.searchParams.get('id') ?? '').trim()
  if (!id) return json(400, { error: 'id가 필요합니다.' })

  const admin = getSupabaseAdminClient()

  // Scope enforcement: load target first
  const { data: target, error: targetError } = await admin.from('news_posts').select('id, complex_id').eq('id', id).maybeSingle()
  if (targetError) return json(500, { error: targetError.message })
  if (!target) return json(404, { error: '삭제할 글이 없습니다.' })

  if (gate.role !== 'SUPER') {
    if (!gate.userId) return json(401, { error: '인증 정보가 없습니다.' })
    const actor = await getActorScope(admin, gate.userId, gate.role)
    if (!actor.complexId) return json(400, { error: '관리자 소속 단지가 설정되지 않았습니다.' })
    const targetComplexId = target.complex_id as string | null
    if (!targetComplexId || targetComplexId !== actor.complexId) {
      return json(403, { error: '본인 소속 단지의 글만 삭제할 수 있습니다.' })
    }
  }

  const { error } = await admin.from('news_posts').delete().eq('id', id)
  if (error) return json(500, { error: error.message })
  return json(200, { ok: true })
}
