import { NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseAnonClient } from '../../../../lib/serverSupabase'
import { getActorScope, requireAdminRole } from '../../../../lib/accessControl'

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status })
}

function issueQrPayload(input: { carType?: 'ICE' | 'EV'; carNumber?: string }) {
  const token = `qr_${crypto.randomUUID()}`
  const issuedAt = new Date()
  const expiresAt = new Date(issuedAt)
  expiresAt.setDate(expiresAt.getDate() + 30)
  return {
    token,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    carType: input.carType,
    carNumber: input.carNumber,
  }
}

export async function POST(request: Request) {
  const gate = await requireAdminRole(request, getSupabaseAnonClient)
  if (!gate.ok) return json(401, { error: gate.error })

  const body = (await request.json()) as { residentId?: string }
  const residentId = (body.residentId ?? '').trim()
  if (!residentId) return json(400, { error: 'residentId가 필요합니다.' })

  const admin = getSupabaseAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('id, complex_id, building_id, metadata')
    .eq('id', residentId)
    .maybeSingle()

  if (profileError) return json(500, { error: profileError.message })
  if (!profile) return json(404, { error: '입주민을 찾을 수 없습니다.' })

  if (gate.role !== 'SUPER') {
    if (!gate.userId) return json(401, { error: '인증 정보가 없습니다.' })

    const actor = await getActorScope(admin, gate.userId, gate.role)
    const targetComplexId = profile.complex_id as string | null
    const targetBuildingId = profile.building_id as string | null

    if (gate.role === 'MAIN') {
      if (!actor.complexId) return json(400, { error: '관리자 소속 단지가 설정되지 않았습니다.' })
      if (!targetComplexId || targetComplexId !== actor.complexId)
        return json(403, { error: '본인 소속 단지의 입주민만 QR 재발행이 가능합니다.' })
    } else if (gate.role === 'SUB') {
      if (!actor.buildingId) return json(400, { error: '관리자 소속 동이 설정되지 않았습니다.' })
      if (!targetBuildingId || targetBuildingId !== actor.buildingId)
        return json(403, { error: '본인 소속 동의 입주민만 QR 재발행이 가능합니다.' })
    }
  }

  const metadata = (profile.metadata ?? {}) as Record<string, unknown>
  const carType = metadata.carType === 'EV' ? 'EV' : metadata.carType === 'ICE' ? 'ICE' : undefined
  const carNumber = typeof metadata.carNumber === 'string' ? metadata.carNumber : undefined

  const qrPayload = issueQrPayload({ carType, carNumber })

  await admin.from('qr_codes').update({ is_active: false }).eq('owner_id', residentId).eq('is_active', true)

  const { error: qrError } = await admin.from('qr_codes').insert({
    owner_id: residentId,
    type: 'resident_car',
    payload: qrPayload,
    expires_at: qrPayload.expiresAt,
    is_active: true,
  })

  if (qrError) return json(500, { error: qrError.message })

  return json(200, { qr: { token: qrPayload.token, issuedAt: qrPayload.issuedAt, expiresAt: qrPayload.expiresAt } })
}
