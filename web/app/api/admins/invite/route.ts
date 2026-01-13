import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminClient, getSupabaseAnonClient } from '../../../../lib/serverSupabase'
import { requireAdminRole } from '../../../../lib/accessControl'

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status })
}

type AdminRole = 'MAIN' | 'SUB' | 'GUARD'

type InviteBody = {
  email?: string
  roleId?: AdminRole
  displayName?: string
  phone?: string
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
  if (gate.role !== 'SUPER') return json(403, { error: '최고 관리자만 관리자 계정을 생성할 수 있습니다.' })

  const body = (await request.json()) as InviteBody
  const email = (body.email ?? '').trim().toLowerCase()
  const roleId = (body.roleId ?? '').trim() as AdminRole
  const displayName = (body.displayName ?? '').trim()
  const phone = (body.phone ?? '').trim()

  if (!email) return json(400, { error: '이메일을 입력하세요.' })
  if (roleId !== 'MAIN' && roleId !== 'SUB' && roleId !== 'GUARD') return json(400, { error: '레벨(roleId)이 올바르지 않습니다.' })

  const admin = getSupabaseAdminClient()

  const origin = request.headers.get('origin') ?? ''
  const redirectTo = origin ? `${origin}/auth/callback?next=/dashboard` : undefined

  const invite = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { role: roleId },
  })

  let userId = invite.data.user?.id ?? null
  if (invite.error || !userId) {
    const message = invite.error?.message ?? ''
    const maybeExists =
      message.toLowerCase().includes('already') ||
      message.toLowerCase().includes('exists') ||
      message.toLowerCase().includes('registered')

    if (!maybeExists) return json(500, { error: message || '관리자 초대에 실패했습니다.' })

    const existingId = await findAuthUserIdByEmail(admin, email)
    if (!existingId) return json(500, { error: '기존 계정이 있지만 사용자 ID를 찾지 못했습니다.' })
    userId = existingId

    await admin.auth.admin.updateUserById(existingId, {
      user_metadata: { role: roleId },
    })
  }

  const { error: upsertError } = await admin
    .from('users')
    .upsert(
      {
        id: userId,
        role_id: roleId,
        display_name: displayName || null,
        phone: phone || null,
        metadata: { email },
      },
      { onConflict: 'id' }
    )

  if (upsertError) return json(500, { error: upsertError.message })

  return json(200, { ok: true, userId })
}

