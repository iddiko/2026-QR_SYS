import { NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseAnonClient } from '../../../../lib/serverSupabase'

type CompletePayload = {
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
  if (!token) return json(401, { error: '인증 정보가 없습니다.' })

  const anon = getSupabaseAnonClient()
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data.user) return json(401, { error: '세션 확인 실패' })

  const user = data.user
  const role = (user.user_metadata as { role?: string } | null)?.role
  if (role !== 'RESIDENT') return json(403, { error: '입주민 계정만 완료할 수 있습니다.' })

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const complexId = typeof meta.complexId === 'string' ? meta.complexId : ''
  const buildingId = typeof meta.buildingId === 'string' ? meta.buildingId : ''
  if (!complexId) return json(400, { error: '소속 단지가 누락되었습니다. 관리자에게 다시 요청하세요.' })
  if (!buildingId) return json(400, { error: '소속 동이 누락되었습니다. 관리자에게 다시 요청하세요.' })

  const body = (await request.json()) as CompletePayload

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

  const admin = getSupabaseAdminClient()

  const { error: upsertError } = await admin
    .from('users')
    .upsert(
      {
        id: user.id,
        role_id: 'RESIDENT',
        complex_id: complexId,
        building_id: buildingId,
        display_name: (body.displayName ?? (meta.displayName as string) ?? '').trim(),
        phone: (body.phone ?? (meta.phone as string) ?? '').trim(),
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

