import { NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseAnonClient } from '../../../../lib/serverSupabase'

type Role = 'RESIDENT' | 'MAIN' | 'SUB' | 'GUARD'

type CompletePayload = {
  role?: Role
  displayName?: string
  phone?: string
  unitLabel?: string
  hasCar?: boolean
  carType?: 'ICE' | 'EV'
  carNumber?: string
}

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status })
}

function isRole(value: unknown): value is Role {
  return value === 'RESIDENT' || value === 'MAIN' || value === 'SUB' || value === 'GUARD'
}

function normalizeCarType(value: unknown): 'ICE' | 'EV' | undefined {
  if (value === 'ICE' || value === 'EV') return value
  return undefined
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
  const auth = request.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null
  if (!token) return json(401, { error: '로그인이 필요합니다.' })

  const anon = getSupabaseAnonClient()
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data.user) return json(401, { error: '세션 정보를 확인할 수 없습니다.' })

  const body = (await request.json().catch(() => ({}))) as CompletePayload

  const user = data.user
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const metaRole = meta.role
  const effectiveRole: Role | null = isRole(metaRole) ? (metaRole as Role) : isRole(body.role) ? body.role : null

  if (!effectiveRole) return json(403, { error: '초대된 역할(role)이 없습니다.' })

  const complexId = typeof meta.complexId === 'string' ? meta.complexId : ''
  const buildingId = typeof meta.buildingId === 'string' ? meta.buildingId : ''

  if (effectiveRole === 'RESIDENT') {
    if (!complexId) return json(400, { error: '소속 단지가 지정되지 않았습니다. 관리자가 보낸 초대 링크로 다시 접속해 주세요.' })
    if (!buildingId) return json(400, { error: '소속 동이 지정되지 않았습니다. 관리자가 보낸 초대 링크로 다시 접속해 주세요.' })
  }

  if (effectiveRole === 'MAIN') {
    if (!complexId) return json(400, { error: '단지(메인) 관리자는 단지 소속이 필요합니다.' })
  }

  if (effectiveRole === 'SUB' || effectiveRole === 'GUARD') {
    if (!buildingId) return json(400, { error: '동(서브)/경비는 동 소속이 필요합니다.' })
    if (!complexId) return json(400, { error: '동(서브)/경비는 단지 소속이 필요합니다.' })
  }

  const displayName = (body.displayName ?? (meta.displayName as string) ?? '').trim()
  const phone = (body.phone ?? (meta.phone as string) ?? '').trim()

  const admin = getSupabaseAdminClient()

  if (effectiveRole === 'RESIDENT') {
    const hasCar = Boolean(body.hasCar) && Boolean((body.carNumber ?? '').trim())
    const carType = normalizeCarType(body.carType)
    const carNumber = (body.carNumber ?? '').trim()

    const metadata: Record<string, unknown> = {
      email: user.email ?? '',
      unitLabel: (body.unitLabel ?? (meta.unitLabel as string) ?? '').trim(),
      hasCar,
      carType: hasCar ? carType : undefined,
      carNumber: hasCar ? carNumber : undefined,
      complexId,
      buildingId,
    }

    const { error: upsertError } = await admin
      .from('users')
      .upsert(
        {
          id: user.id,
          role_id: 'RESIDENT',
          complex_id: complexId,
          building_id: buildingId,
          display_name: displayName || null,
          phone: phone || null,
          metadata,
        },
        { onConflict: 'id' }
      )
    if (upsertError) return json(500, { error: upsertError.message })

    if (hasCar) {
      const { data: existingQr, error: existingQrError } = await admin
        .from('qr_codes')
        .select('id')
        .eq('owner_id', user.id)
        .eq('type', 'resident_car')
        .eq('is_active', true)
        .limit(1)

      if (existingQrError) return json(500, { error: existingQrError.message })

      if (!existingQr || existingQr.length === 0) {
        const qrPayload = issueQrPayload({ carType, carNumber })
        const { error: qrError } = await admin.from('qr_codes').insert({
          owner_id: user.id,
          type: 'resident_car',
          payload: qrPayload,
          expires_at: qrPayload.expiresAt,
          is_active: true,
        })
        if (qrError) return json(500, { error: qrError.message })
      }
    }

    return json(200, { ok: true })
  }

  // 관리자/경비 온보딩: 소속 범위는 초대 메타데이터를 그대로 사용(잠금)
  const roleId = effectiveRole

  const { error: upsertError } = await admin
    .from('users')
    .upsert(
      {
        id: user.id,
        role_id: roleId,
        complex_id: roleId === 'MAIN' ? complexId : complexId || null,
        building_id: roleId === 'MAIN' ? null : buildingId || null,
        display_name: displayName || null,
        phone: phone || null,
        metadata: { email: user.email ?? '' },
      },
      { onConflict: 'id' }
    )

  if (upsertError) return json(500, { error: upsertError.message })

  return json(200, { ok: true })
}
