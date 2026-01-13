import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminClient, getSupabaseAnonClient } from '../../../../lib/serverSupabase'
import { assertScopeInput, getActorScope, requireAdminRole as requireAdminRoleShared } from '../../../../lib/accessControl'

type InviteResidentPayload = {
  email: string
  displayName?: string
  phone?: string
  unitLabel?: string
  hasCar?: boolean
  carType?: 'ICE' | 'EV'
  carNumber?: string
  complexId: string
  complexName?: string
  buildingId: string
  buildingName?: string
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
    return { ok: false as const, error: '인증 정보가 없습니다.' }
  }

  const anon = getSupabaseAnonClient()
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data.user) return { ok: false as const, error: '세션 확인 실패' }

  const role = (data.user.user_metadata as { role?: string } | null)?.role
  const allowed = role === 'SUPER' || role === 'MAIN' || role === 'SUB'
  if (!allowed) return { ok: false as const, error: '권한이 없습니다.' }

  return { ok: true as const, role: role as 'SUPER' | 'MAIN' | 'SUB', userId: data.user.id }
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

export async function POST(request: Request) {
  const gate = await requireAdminRoleShared(request, getSupabaseAnonClient)
  if (!gate.ok) return json(401, { error: gate.error })

  const body = (await request.json()) as InviteResidentPayload
  const email = (body.email ?? '').trim().toLowerCase()
  const complexId = (body.complexId ?? '').trim()
  const buildingId = (body.buildingId ?? '').trim()

  if (!email) return json(400, { error: '이메일이 필요합니다.' })
  if (!complexId) return json(400, { error: '소속 단지가 필요합니다.' })
  if (!buildingId) return json(400, { error: '소속 동이 필요합니다.' })

  const admin = getSupabaseAdminClient()
  if (gate.role !== 'SUPER') {
    if (!gate.userId) return json(401, { error: '세션 확인 실패' })
    const actor = await getActorScope(admin, gate.userId, gate.role)
    const scopeError = assertScopeInput(gate.role, actor, { complexId, buildingId })
    if (scopeError) return json(403, { error: scopeError })
  }

  const existingId = await findAuthUserIdByEmail(admin, email)
  if (existingId) {
    return json(409, { error: '이미 초대되었거나 계정이 존재합니다. (이메일 중복)' })
  }

  const origin = request.headers.get('origin') ?? ''
  const redirectTo = origin ? `${origin}/auth/callback?next=/onboarding` : undefined

  const inviteForm = {
    role: 'RESIDENT',
    lockScope: true,
    complexId,
    complexName: (body.complexName ?? '').trim(),
    buildingId,
    buildingName: (body.buildingName ?? '').trim(),
    displayName: (body.displayName ?? '').trim(),
    phone: (body.phone ?? '').trim(),
    unitLabel: (body.unitLabel ?? '').trim(),
    hasCar: Boolean(body.hasCar) && Boolean((body.carNumber ?? '').trim()),
    carType: body.carType === 'EV' || body.carType === 'ICE' ? body.carType : undefined,
    carNumber: (body.carNumber ?? '').trim(),
  }

  const invite = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: inviteForm,
  })

  if (invite.error) return json(500, { error: invite.error.message })

  return json(200, {
    ok: true,
    message: '입주민에게 등록 링크(초대 메일)를 보냈습니다.',
  })
}
