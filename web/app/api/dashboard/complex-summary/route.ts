import { NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseAnonClient } from '../../../../lib/serverSupabase'
import { getActorScope, requireAdminRole } from '../../../../lib/accessControl'

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status })
}

export async function GET(request: Request) {
  const gate = await requireAdminRole(request, getSupabaseAnonClient)
  if (!gate.ok) return json(401, { error: gate.error })

  const url = new URL(request.url)
  const complexId = (url.searchParams.get('complexId') ?? '').trim()
  if (!complexId) return json(400, { error: 'complexId가 필요합니다.' })

  const admin = getSupabaseAdminClient()

  if (gate.role !== 'SUPER') {
    if (!gate.userId) return json(401, { error: '로그인이 필요합니다.' })
    const actor = await getActorScope(admin, gate.userId, gate.role)
    if (!actor.complexId) return json(403, { error: '소속 단지가 지정되지 않았습니다.' })
    if (actor.complexId !== complexId) return json(403, { error: '접근 권한이 없습니다.' })
  }

  const { data: complex, error: complexError } = await admin
    .from('complexes')
    .select('id, name, region, created_at')
    .eq('id', complexId)
    .maybeSingle()

  if (complexError) return json(500, { error: complexError.message })
  if (!complex) return json(404, { error: '단지를 찾을 수 없습니다.' })

  const now = new Date().toISOString()

  const [
    buildingsCountRes,
    mainCountRes,
    subCountRes,
    guardCountRes,
    residentCountRes,
    residentHasCarCountRes,
    residentEvCountRes,
    residentIceCountRes,
    qrTotalCountRes,
    qrActiveCountRes,
  ] = await Promise.all([
    admin.from('buildings').select('id', { count: 'exact', head: true }).eq('complex_id', complexId),

    admin.from('users').select('id', { count: 'exact', head: true }).eq('complex_id', complexId).eq('role_id', 'MAIN'),
    admin.from('users').select('id', { count: 'exact', head: true }).eq('complex_id', complexId).eq('role_id', 'SUB'),
    admin.from('users').select('id', { count: 'exact', head: true }).eq('complex_id', complexId).eq('role_id', 'GUARD'),
    admin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('complex_id', complexId)
      .eq('role_id', 'RESIDENT'),

    admin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('complex_id', complexId)
      .eq('role_id', 'RESIDENT')
      .eq('metadata->>hasCar', 'true'),
    admin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('complex_id', complexId)
      .eq('role_id', 'RESIDENT')
      .eq('metadata->>hasCar', 'true')
      .eq('metadata->>carType', 'EV'),
    admin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('complex_id', complexId)
      .eq('role_id', 'RESIDENT')
      .eq('metadata->>hasCar', 'true')
      .eq('metadata->>carType', 'ICE'),

    admin
      .from('qr_codes')
      .select('id, users!inner(complex_id)', { count: 'exact', head: true })
      .eq('users.complex_id', complexId),
    admin
      .from('qr_codes')
      .select('id, users!inner(complex_id)', { count: 'exact', head: true })
      .eq('users.complex_id', complexId)
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`),
  ])

  const anyError =
    buildingsCountRes.error ||
    mainCountRes.error ||
    subCountRes.error ||
    guardCountRes.error ||
    residentCountRes.error ||
    residentHasCarCountRes.error ||
    residentEvCountRes.error ||
    residentIceCountRes.error ||
    qrTotalCountRes.error ||
    qrActiveCountRes.error

  if (anyError) {
    const message =
      buildingsCountRes.error?.message ||
      mainCountRes.error?.message ||
      subCountRes.error?.message ||
      guardCountRes.error?.message ||
      residentCountRes.error?.message ||
      residentHasCarCountRes.error?.message ||
      residentEvCountRes.error?.message ||
      residentIceCountRes.error?.message ||
      qrTotalCountRes.error?.message ||
      qrActiveCountRes.error?.message ||
      '집계에 실패했습니다.'
    return json(500, { error: message })
  }

  const buildingsCount = buildingsCountRes.count ?? 0
  const mainAdmins = mainCountRes.count ?? 0
  const subAdmins = subCountRes.count ?? 0
  const guards = guardCountRes.count ?? 0
  const residents = residentCountRes.count ?? 0

  const residentsWithCar = residentHasCarCountRes.count ?? 0
  const evCount = residentEvCountRes.count ?? 0
  const iceCount = residentIceCountRes.count ?? 0

  const qrTotal = qrTotalCountRes.count ?? 0
  const qrActive = qrActiveCountRes.count ?? 0

  const carRatioPercent = residents > 0 ? Math.round((residentsWithCar / residents) * 1000) / 10 : 0

  return json(200, {
    complex,
    buildingsCount,
    people: {
      mainAdmins,
      subAdmins,
      guards,
      residents,
    },
    qr: {
      active: qrActive,
      total: qrTotal,
    },
    vehicles: {
      residentsWithCar,
      evCount,
      iceCount,
      ratioPercent: carRatioPercent,
    },
    gas: {
      status: '준비중',
    },
  })
}

