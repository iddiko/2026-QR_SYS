import { NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseAnonClient } from '../../../lib/serverSupabase'
import { getActorScope, requireAdminRole } from '../../../lib/accessControl'

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status })
}

export async function GET(request: Request) {
  const gate = await requireAdminRole(request, getSupabaseAnonClient)
  if (!gate.ok) return json(401, { error: gate.error })

  const url = new URL(request.url)
  const requestedComplexId = (url.searchParams.get('complexId') ?? '').trim()
  const q = (url.searchParams.get('q') ?? '').trim()
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100) || 100, 200)

  const admin = getSupabaseAdminClient()
  let complexId = requestedComplexId

  if (gate.role !== 'SUPER') {
    if (!gate.userId) return json(401, { error: '인증 정보가 없습니다.' })
    const scope = await getActorScope(admin, gate.userId, gate.role)
    if (!scope.complexId) return json(400, { error: '관리자 소속 단지가 설정되지 않았습니다.' })
    complexId = scope.complexId
  } else {
    if (!complexId) return json(400, { error: 'complexId가 필요합니다.' })
  }

  let query = admin
    .from('buildings')
    .select('id, complex_id, name, created_at')
    .eq('complex_id', complexId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (q) query = query.ilike('name', `%${q}%`)

  const { data, error } = await query
  if (error) return json(500, { error: error.message })

  if (gate.role === 'SUB') {
    if (!gate.userId) return json(401, { error: '인증 정보가 없습니다.' })
    const scope = await getActorScope(admin, gate.userId, gate.role)
    if (!scope.buildingId) return json(400, { error: '관리자 소속 동이 설정되지 않았습니다.' })
    return json(200, { buildings: (data ?? []).filter((b) => (b.id as string) === scope.buildingId) })
  }

  return json(200, { buildings: data ?? [] })
}

export async function POST(request: Request) {
  const gate = await requireAdminRole(request, getSupabaseAnonClient)
  if (!gate.ok) return json(401, { error: gate.error })
  if (gate.role === 'SUB') return json(403, { error: '서브관리자는 동을 생성할 수 없습니다.' })

  const body = (await request.json()) as { complexId?: string; name?: string }
  const requestedComplexId = (body.complexId ?? '').trim()
  const name = (body.name ?? '').trim()
  if (!name) return json(400, { error: '동 이름을 입력하세요.' })

  const admin = getSupabaseAdminClient()
  let complexId = requestedComplexId

  if (gate.role !== 'SUPER') {
    if (!gate.userId) return json(401, { error: '인증 정보가 없습니다.' })
    const scope = await getActorScope(admin, gate.userId, gate.role)
    if (!scope.complexId) return json(400, { error: '관리자 소속 단지가 설정되지 않았습니다.' })
    complexId = scope.complexId
  } else {
    if (!complexId) return json(400, { error: 'complexId가 필요합니다.' })
  }

  const { data, error } = await admin
    .from('buildings')
    .insert({ complex_id: complexId, name })
    .select('id, complex_id, name, created_at')
    .maybeSingle()

  if (error) return json(500, { error: error.message })
  return json(200, { building: data })
}

