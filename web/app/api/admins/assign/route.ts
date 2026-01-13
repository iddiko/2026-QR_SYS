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
  const gate = await requireAdminRole(request, getSupabaseAnonClient)
  if (!gate.ok) return json(401, { error: gate.error })
  if (gate.role !== 'SUPER') return json(403, { error: '최고 관리자만 관리자 임명이 가능합니다.' })

  const body = (await request.json()) as AssignBody
  const email = (body.email ?? '').trim().toLowerCase()
  const roleId = (body.roleId ?? '').trim() as AdminRole
  const complexIdInput = (body.complexId ?? '').trim()
  const buildingIdInput = (body.buildingId ?? '').trim()

  if (!email) return json(400, { error: '이메일을 입력하세요.' })
  if (roleId !== 'MAIN' && roleId !== 'SUB' && roleId !== 'GUARD') return json(400, { error: '레벨(roleId)이 올바르지 않습니다.' })

  const admin = getSupabaseAdminClient()
  const userId = await findAuthUserIdByEmail(admin, email)
  if (!userId) return json(404, { error: '해당 이메일의 사용자를 찾을 수 없습니다.' })

  let complexId: string | null = complexIdInput || null
  let buildingId: string | null = buildingIdInput || null

  if (roleId === 'MAIN') {
    if (!complexId) return json(400, { error: '단지(메인) 임명에는 단지 선택이 필요합니다.' })
    buildingId = null
  } else if (roleId === 'SUB' || roleId === 'GUARD') {
    if (!buildingId) return json(400, { error: '동(서브)/경비 임명에는 동 선택이 필요합니다.' })
    const { data: building, error: buildingError } = await admin
      .from('buildings')
      .select('id, complex_id')
      .eq('id', buildingId)
      .maybeSingle()
    if (buildingError) return json(500, { error: buildingError.message })
    if (!building) return json(400, { error: '선택한 동을 찾을 수 없습니다.' })

    const derivedComplexId = building.complex_id as string
    if (complexId && complexId !== derivedComplexId) return json(400, { error: '동이 속한 단지와 선택한 단지가 다릅니다.' })
    complexId = derivedComplexId
  }

  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { role: roleId },
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

  return json(200, { ok: true, userId, roleId, complexId, buildingId })
}

