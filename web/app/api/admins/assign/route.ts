import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminClient, getSupabaseAnonClient } from '../../../../lib/serverSupabase'
import { requireAdminRole } from '../../../../lib/accessControl'

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status })
}

type AdminRole = 'MAIN' | 'SUB' | 'GUARD'

type AssignBody = {
  email?: string
  roleId?: AdminRole
  complexId?: string
  buildingId?: string
  sendEmail?: boolean
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

function isAdminRole(value: unknown): value is AdminRole {
  return value === 'MAIN' || value === 'SUB' || value === 'GUARD'
}

function isMaybeAlreadyRegistered(message: string) {
  const m = message.toLowerCase()
  return m.includes('already') || m.includes('exists') || m.includes('registered')
}

export async function POST(request: Request) {
  const gate = await requireAdminRole(request, getSupabaseAnonClient)
  if (!gate.ok) return json(401, { error: gate.error })
  if (gate.role !== 'SUPER') return json(403, { error: '최고관리자만 관리자 임명이 가능합니다.' })

  const body = (await request.json().catch(() => ({}))) as AssignBody
  const email = (body.email ?? '').trim().toLowerCase()
  const roleId = (body.roleId ?? '').trim()
  const complexIdInput = (body.complexId ?? '').trim()
  const buildingIdInput = (body.buildingId ?? '').trim()
  const sendEmail = body.sendEmail !== false

  if (!email) return json(400, { error: '임명할 관리자 이메일을 입력하세요.' })
  if (!isAdminRole(roleId)) return json(400, { error: 'roleId는 MAIN / SUB / GUARD 중 하나여야 합니다.' })

  const admin = getSupabaseAdminClient()
  const anon = getSupabaseAnonClient()

  const origin = request.headers.get('origin') ?? ''
  const redirectTo = origin ? `${origin}/auth/callback?next=/onboarding` : undefined

  let userId = await findAuthUserIdByEmail(admin, email)
  let emailSent = false
  let emailType: 'invite' | 'recovery' | null = null

  let complexId: string | null = complexIdInput || null
  let buildingId: string | null = buildingIdInput || null
  let complexName = ''
  let buildingName = ''

  if (roleId === 'MAIN') {
    if (!complexId) return json(400, { error: '메인 관리자는 단지를 반드시 선택해야 합니다.' })
    buildingId = null
  } else {
    if (!buildingId) return json(400, { error: '서브 관리자/경비는 동(건물)을 반드시 선택해야 합니다.' })

    const { data: building, error: buildingError } = await admin
      .from('buildings')
      .select('id, name, complex_id, complexes(name)')
      .eq('id', buildingId)
      .maybeSingle()
    if (buildingError) return json(500, { error: buildingError.message })
    if (!building) return json(400, { error: '선택한 동(건물)을 찾을 수 없습니다.' })

    const derivedComplexId = building.complex_id as string
    if (complexId && complexId !== derivedComplexId) return json(400, { error: '동(건물)의 단지 정보가 일치하지 않습니다.' })
    complexId = derivedComplexId

    buildingName = String((building as any).name ?? '')
    complexName = String((building as any).complexes?.name ?? '')
  }

  if (roleId === 'MAIN' && complexId) {
    const { data: complexRow, error: complexError } = await admin.from('complexes').select('name').eq('id', complexId).maybeSingle()
    if (complexError) return json(500, { error: complexError.message })
    complexName = String((complexRow as any)?.name ?? '')
  }

  // 1) 이메일 발송
  // - 신규 사용자: Supabase 초대 메일(invite)
  // - 기존 사용자: 초대 메일이 실패(이미 가입됨)할 수 있으므로, 비밀번호 설정(recovery) 메일을 보내 onboarding으로 유도
  if (sendEmail) {
    const invite = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        role: roleId,
        lockScope: true,
        complexId: complexId ?? '',
        complexName,
        buildingId: buildingId ?? '',
        buildingName,
      },
    })

    if (!invite.error && invite.data.user?.id) {
      userId = invite.data.user.id
      emailSent = true
      emailType = 'invite'
    } else if (invite.error && isMaybeAlreadyRegistered(invite.error.message)) {
      if (!userId) userId = await findAuthUserIdByEmail(admin, email)
      if (userId) {
        const recovery = await anon.auth.resetPasswordForEmail(email, { redirectTo })
        if (!recovery.error) {
          emailSent = true
          emailType = 'recovery'
        }
      }
    } else if (invite.error) {
      return json(500, { error: invite.error.message })
    }
  }

  if (!userId) return json(500, { error: '사용자 계정을 확인할 수 없습니다.' })

  // 2) 역할/소속 고정 메타데이터 및 public.users 프로필 upsert
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      role: roleId,
      lockScope: true,
      complexId: complexId ?? '',
      complexName,
      buildingId: buildingId ?? '',
      buildingName,
    },
  })

  const { error: upsertError } = await admin
    .from('users')
    .upsert(
      {
        id: userId,
        role_id: roleId,
        complex_id: complexId,
        building_id: buildingId,
        metadata: { email },
      },
      { onConflict: 'id' }
    )

  if (upsertError) return json(500, { error: upsertError.message })

  return json(200, { ok: true, userId, roleId, complexId, buildingId, emailSent, emailType })
}

