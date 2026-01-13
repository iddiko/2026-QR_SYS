import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminClient, getSupabaseAnonClient } from '../../../../lib/serverSupabase'
import { assertScopeInput, getActorScope, requireAdminRole as requireAdminRoleShared } from '../../../../lib/accessControl'

type CreateResidentPayload = {
  email: string
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

async function requireAdminRole(request: Request) {
  const auth = request.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null

  if (!token) {
    if (process.env.NODE_ENV !== 'production' && request.headers.get('x-demo-role') === 'SUPER') {
      return { ok: true as const, role: 'SUPER' as const, userId: null as string | null }
    }
    return { ok: false as const, error: '인증 토큰이 없습니다.' }
  }

  const anon = getSupabaseAnonClient()
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data.user) return { ok: false as const, error: '세션 확인 실패' }

  const role = (data.user.user_metadata as { role?: string } | null)?.role
  const allowed = role === 'SUPER' || role === 'MAIN' || role === 'SUB'
  if (!allowed) return { ok: false as const, error: '권한이 없습니다.' }

  return { ok: true as const, role: role as 'SUPER' | 'MAIN' | 'SUB', userId: data.user.id }
}

function normalizeCarType(value: unknown): 'ICE' | 'EV' | undefined {
  if (value === 'ICE' || value === 'EV') return value
  return undefined
}

async function findAuthUserIdByEmail(admin: SupabaseClient, email: string) {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null

  const perPage = 200
  for (let page = 1; page <= 30; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(error.message)
    const users = data?.users ?? []
    const match = users.find((u) => (u.email ?? '').toLowerCase() === normalized)
    if (match?.id) return match.id
    if (users.length < perPage) break
  }

  return null
}

async function getOrInviteResidentAuthUserId(admin: SupabaseClient, email: string) {
  const normalized = email.trim().toLowerCase()
  const invite = await admin.auth.admin.inviteUserByEmail(normalized, { data: { role: 'RESIDENT' } })
  if (!invite.error && invite.data.user?.id) return invite.data.user.id

  const message = invite.error?.message ?? ''
  const maybeExists =
    message.toLowerCase().includes('already') ||
    message.toLowerCase().includes('exists') ||
    message.toLowerCase().includes('registered')

  if (!maybeExists) throw new Error(message || 'Auth 초대 생성 실패')

  const existingId = await findAuthUserIdByEmail(admin, normalized)
  if (!existingId) throw new Error('이미 존재하는 이메일인데 Auth 사용자 조회에 실패했습니다.')

  await admin.auth.admin.updateUserById(existingId, {
    user_metadata: { role: 'RESIDENT' },
  })

  return existingId
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
  const gate = await requireAdminRoleShared(request, getSupabaseAnonClient)
  if (!gate.ok) return json(401, { error: gate.error })

  const body = (await request.json()) as { complexId?: string; buildingId?: string; residents?: CreateResidentPayload[] }
  const items = body.residents ?? []
  if (!Array.isArray(items) || items.length === 0) return json(400, { error: 'residents 배열이 필요합니다.' })
  if (items.length > 50) return json(400, { error: '한 번에 최대 50명까지 업로드할 수 있습니다.' })

  const admin = getSupabaseAdminClient()
  let complexId = (body.complexId ?? '').trim()
  let buildingId = (body.buildingId ?? '').trim()

  if (gate.role === 'SUPER') {
    if (!complexId) return json(400, { error: '소속 단지가 필요합니다.' })
    if (!buildingId) return json(400, { error: '소속 동이 필요합니다.' })
  } else {
    const userId = (gate as { userId?: string | null }).userId
    if (!userId) return json(401, { error: '세션 확인 실패' })

    const actor = await getActorScope(admin, userId, gate.role)
    const scopeError = assertScopeInput(gate.role, actor, { complexId: actor.complexId ?? '', buildingId: actor.buildingId ?? '' })
    if (scopeError) return json(403, { error: scopeError })

    complexId = actor.complexId ?? ''
    if (gate.role === 'SUB') {
      buildingId = actor.buildingId ?? ''
    } else {
      if (!buildingId) return json(400, { error: '소속 동이 필요합니다.' })
      const { data: building, error: buildingError } = await admin
        .from('buildings')
        .select('id, complex_id')
        .eq('id', buildingId)
        .maybeSingle()
      if (buildingError) return json(500, { error: buildingError.message })
      if (!building || (building.complex_id as string) !== complexId) return json(400, { error: '동이 단지에 속하지 않습니다.' })
    }
  }

  const results: Array<{ email: string; ok: boolean; id?: string; error?: string }> = []

  for (const item of items) {
    const email = (item.email ?? '').trim().toLowerCase()
    if (!email) {
      results.push({ email: '', ok: false, error: '이메일이 비어있음' })
      continue
    }

    try {
      const hasCar = Boolean(item.hasCar) && Boolean((item.carNumber ?? '').trim())
      const carType = normalizeCarType(item.carType)
      const carNumber = (item.carNumber ?? '').trim()

      const userId = await getOrInviteResidentAuthUserId(admin, email)
      if (!userId) throw new Error('Auth 사용자 생성 실패')

      const metadata: Record<string, unknown> = {
        email,
        unitLabel: (item.unitLabel ?? '').trim(),
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
            id: userId,
            role_id: 'RESIDENT',
            complex_id: complexId,
            building_id: buildingId,
            display_name: (item.displayName ?? '').trim(),
            phone: (item.phone ?? '').trim(),
            metadata,
          },
          { onConflict: 'id' }
        )

      if (upsertError) throw new Error(upsertError.message)

      if (hasCar) {
        const { data: existingQr, error: existingQrError } = await admin
          .from('qr_codes')
          .select('id')
          .eq('owner_id', userId)
          .eq('type', 'resident_car')
          .eq('is_active', true)
          .limit(1)

        if (existingQrError) throw new Error(existingQrError.message)

        if (!existingQr || existingQr.length === 0) {
          const qrPayload = issueQrPayload({ carType, carNumber })
          const { error: qrError } = await admin.from('qr_codes').insert({
            owner_id: userId,
            type: 'resident_car',
            payload: qrPayload,
            expires_at: qrPayload.expiresAt,
            is_active: true,
          })
          if (qrError) throw new Error(qrError.message)
        }
      }

      results.push({ email, ok: true, id: userId })
    } catch (e) {
      results.push({ email, ok: false, error: e instanceof Error ? e.message : '오류' })
    }
  }

  return json(200, { results })
}
