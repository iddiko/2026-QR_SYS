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
  const q = (url.searchParams.get('q') ?? '').trim()
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50) || 50, 200)

  const admin = getSupabaseAdminClient()

  if (gate.role === 'SUPER') {
    let query = admin
      .from('complexes')
      .select('id, name, region, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (q) query = query.ilike('name', `%${q}%`)

    const { data, error } = await query
    if (error) return json(500, { error: error.message })
    return json(200, { complexes: data ?? [] })
  }

  if (!gate.userId) return json(401, { error: '인증 정보가 없습니다.' })
  const scope = await getActorScope(admin, gate.userId, gate.role)
  if (!scope.complexId) return json(400, { error: '관리자 소속 단지가 설정되지 않았습니다.' })

  const { data, error } = await admin
    .from('complexes')
    .select('id, name, region, created_at')
    .eq('id', scope.complexId)
    .limit(1)

  if (error) return json(500, { error: error.message })
  return json(200, { complexes: data ?? [] })
}

export async function POST(request: Request) {
  const gate = await requireAdminRole(request, getSupabaseAnonClient)
  if (!gate.ok) return json(401, { error: gate.error })
  if (gate.role !== 'SUPER') return json(403, { error: '최고관리자만 단지를 생성할 수 있습니다.' })

  const body = (await request.json()) as { name?: string; region?: string }
  const name = (body.name ?? '').trim()
  const region = (body.region ?? '').trim()
  if (!name) return json(400, { error: '단지명을 입력하세요.' })

  const admin = getSupabaseAdminClient()
  const { data, error } = await admin
    .from('complexes')
    .insert({ name, region: region || null })
    .select('id, name, region, created_at')
    .maybeSingle()

  if (error) return json(500, { error: error.message })
  return json(200, { complex: data })
}

