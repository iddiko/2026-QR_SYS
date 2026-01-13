import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminClient, getSupabaseAnonClient } from '../../../lib/serverSupabase'
import { applyResidentScopeFilter, assertScopeInput, getActorScope, requireAdminRole as requireAdminRoleShared } from '../../../lib/accessControl'

type CreateResidentPayload = {
  email: string
  displayName?: string
  phone?: string
  unitLabel?: string
  hasCar?: boolean
  carType?: 'ICE' | 'EV'
  carNumber?: string
  complexId?: string
  buildingId?: string
}

type ResidentListItem = {
  id: string
  email: string
  displayName: string
  phone: string
  unitLabel: string
  hasCar: boolean
  carType?: 'ICE' | 'EV'
  carNumber: string
  complexId: string
  buildingId: string
  registeredAt: string
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

export async function GET(request: Request) {
  const gate = await requireAdminRoleShared(request, getSupabaseAnonClient)
  if (!gate.ok) return json(401, { error: gate.error })

  const url = new URL(request.url)
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50) || 50, 200)

  const admin = getSupabaseAdminClient()
  let actorScope = { complexId: null as string | null, buildingId: null as string | null }
  if (gate.role !== 'SUPER') {
    if (!gate.userId) return json(401, { error: '세션 확인 실패' })
    try {
      actorScope = await getActorScope(admin, gate.userId, gate.role)
    } catch (e) {
      return json(400, { error: e instanceof Error ? e.message : '관리자 소속 조회 실패' })
    }
  }

  const query = applyResidentScopeFilter(
    admin
      .from('users')
      .select('id, role_id, complex_id, building_id, display_name, phone, metadata, created_at')
      .eq('role_id', 'RESIDENT')
      .order('created_at', { ascending: false })
      .limit(limit),
    gate.role,
    actorScope
  )

  const { data: users, error: usersError } = await query
  if (usersError) return json(500, { error: usersError.message })

  const list: ResidentListItem[] = (users ?? []).map((u: any) => {
    const metadata = (u.metadata ?? {}) as Record<string, unknown>
    return {
      id: u.id as string,
      email: (metadata.email as string | undefined) ?? '',
      displayName: (u.display_name as string | null) ?? '',
      phone: (u.phone as string | null) ?? '',
      unitLabel: (metadata.unitLabel as string | undefined) ?? '',
      hasCar: Boolean(metadata.hasCar),
      carType: normalizeCarType(metadata.carType),
      carNumber: (metadata.carNumber as string | undefined) ?? '',
      complexId: (u.complex_id as string | null) ?? (metadata.complexId as string | undefined) ?? '',
      buildingId: (u.building_id as string | null) ?? (metadata.buildingId as string | undefined) ?? '',
      registeredAt: u.created_at as string,
    }
  })

  const filtered = q
    ? list.filter((r: ResidentListItem) => {
        const hay = `${r.email} ${r.displayName} ${r.phone} ${r.unitLabel} ${r.carNumber}`.toLowerCase()
        return hay.includes(q)
      })
    : list

  const ids = filtered.map((r) => r.id)
  let qrByOwner = new Map<string, { issuedAt: string; expiresAt: string; token: string }>()

  if (ids.length) {
    const { data: qrs, error: qrError } = await admin
      .from('qr_codes')
      .select('id, owner_id, created_at, expires_at, payload, is_active')
      .in('owner_id', ids)
      .order('created_at', { ascending: false })
      .limit(ids.length * 5)

    if (qrError) return json(500, { error: qrError.message })

    for (const row of qrs ?? []) {
      const owner = row.owner_id as string
      if (qrByOwner.has(owner)) continue
      const payload = (row.payload ?? {}) as Record<string, unknown>
      const token = (payload.token as string | undefined) ?? (row.id as string)
      qrByOwner.set(owner, {
        issuedAt: (row.created_at as string) ?? '',
        expiresAt: (row.expires_at as string) ?? '',
        token,
      })
    }
  }

  return json(200, {
    residents: filtered.map((r) => ({
      ...r,
      qr: qrByOwner.get(r.id) ?? null,
    })),
  })
}

export async function POST(request: Request) {
  const gate = await requireAdminRoleShared(request, getSupabaseAnonClient)
  if (!gate.ok) return json(401, { error: gate.error })

  const body = (await request.json()) as CreateResidentPayload
  const email = (body.email ?? '').trim().toLowerCase()
  if (!email) return json(400, { error: '이메일이 필요합니다.' })

  const hasCar = Boolean(body.hasCar) && Boolean((body.carNumber ?? '').trim())
  const carType = normalizeCarType(body.carType)
  const carNumber = (body.carNumber ?? '').trim()
  const complexId = (body.complexId ?? '').trim()
  const buildingId = (body.buildingId ?? '').trim()

  if (!complexId) return json(400, { error: '소속 단지가 필요합니다.' })
  if (!buildingId) return json(400, { error: '소속 동이 필요합니다.' })

  const admin = getSupabaseAdminClient()
  if (gate.role !== 'SUPER') {
    if (!gate.userId) return json(401, { error: '세션 확인 실패' })
    const actor = await getActorScope(admin, gate.userId, gate.role)
    const scopeError = assertScopeInput(gate.role, actor, { complexId, buildingId })
    if (scopeError) return json(403, { error: scopeError })
  }

  let userId: string | null = null
  try {
    userId = await getOrInviteResidentAuthUserId(admin, email)
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : 'Auth 사용자 생성 실패' })
  }
  if (!userId) return json(500, { error: 'Auth 사용자 생성 실패' })

  const metadata: Record<string, unknown> = {
    email,
    unitLabel: (body.unitLabel ?? '').trim(),
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
        display_name: (body.displayName ?? '').trim(),
        phone: (body.phone ?? '').trim(),
        metadata,
      },
      { onConflict: 'id' }
    )

  if (upsertError) return json(500, { error: upsertError.message })

  let qr: { issuedAt: string; expiresAt: string; token: string } | null = null

  if (hasCar) {
    const { data: existingQr, error: existingQrError } = await admin
      .from('qr_codes')
      .select('id')
      .eq('owner_id', userId)
      .eq('type', 'resident_car')
      .eq('is_active', true)
      .limit(1)

    if (existingQrError) return json(500, { error: existingQrError.message })

    if (existingQr && existingQr.length > 0) {
      return json(200, { id: userId, qr: null })
    }

    const qrPayload = issueQrPayload({ carType, carNumber })
    const { error: qrError } = await admin.from('qr_codes').insert({
      owner_id: userId,
      type: 'resident_car',
      payload: qrPayload,
      expires_at: qrPayload.expiresAt,
      is_active: true,
    })
    if (qrError) return json(500, { error: qrError.message })
    qr = { token: qrPayload.token, issuedAt: qrPayload.issuedAt, expiresAt: qrPayload.expiresAt }
  }

  return json(200, { id: userId, qr })
}
