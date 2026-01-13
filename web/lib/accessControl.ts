import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminClient } from './serverSupabase'

export type AdminRole = 'SUPER' | 'MAIN' | 'SUB'

export type GateResult =
  | { ok: true; role: AdminRole; userId: string | null }
  | { ok: false; error: string }

export type ActorScope = {
  complexId: string | null
  buildingId: string | null
}

function isAdminRole(role: unknown): role is AdminRole {
  return role === 'SUPER' || role === 'MAIN' || role === 'SUB'
}

function isConfiguredSuperEmail(email: string) {
  const raw = (process.env.SUPER_ADMIN_EMAILS ?? 'superadmin@example.com').trim()
  const list = raw
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.toLowerCase())
}

export async function requireAdminRole(request: Request, getAnonClient: () => SupabaseClient): Promise<GateResult> {
  const auth = request.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null

  if (!token) {
    if (process.env.NODE_ENV !== 'production' && request.headers.get('x-demo-role') === 'SUPER') {
      return { ok: true, role: 'SUPER', userId: null }
    }
    return { ok: false, error: '로그인이 필요합니다.' }
  }

  const anon = getAnonClient()
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data.user) return { ok: false, error: '세션 정보를 확인할 수 없습니다.' }

  const userId = data.user.id
  const email = (data.user.email ?? '').toLowerCase()

  let role = (data.user.user_metadata as { role?: string } | null)?.role
  let allowed = isAdminRole(role)

  // Fallbacks (server-side only):
  // 1) If this is the configured super admin email, enforce SUPER (and sync metadata/profile).
  // 2) Otherwise, try reading role from public.users.role_id and sync metadata.
  if (!allowed) {
    const admin = getSupabaseAdminClient()

    if (isConfiguredSuperEmail(email)) {
      role = 'SUPER'
      allowed = true
      await admin.auth.admin.updateUserById(userId, { user_metadata: { role: 'SUPER' } })
      await admin.from('users').upsert({ id: userId, role_id: 'SUPER', metadata: { email } }, { onConflict: 'id' })
    } else {
      const { data: profile, error: profileError } = await admin.from('users').select('role_id').eq('id', userId).maybeSingle()
      if (profileError) return { ok: false, error: '사용자 권한을 확인할 수 없습니다.' }
      const roleId = (profile?.role_id as string | null) ?? null
      if (isAdminRole(roleId)) {
        role = roleId
        allowed = true
        await admin.auth.admin.updateUserById(userId, { user_metadata: { role: roleId } })
      }
    }
  }

  if (!allowed) return { ok: false, error: '관리자 권한이 필요합니다.' }

  return { ok: true, role: role as AdminRole, userId }
}

export async function getActorScope(admin: SupabaseClient, userId: string, role: AdminRole): Promise<ActorScope> {
  if (role === 'SUPER') return { complexId: null, buildingId: null }

  const { data, error } = await admin.from('users').select('id, complex_id, building_id').eq('id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('사용자 프로필이 없습니다. (public.users)')

  return {
    complexId: (data.complex_id as string | null) ?? null,
    buildingId: (data.building_id as string | null) ?? null,
  }
}

export function assertScopeInput(role: AdminRole, actor: ActorScope, input: { complexId: string; buildingId?: string }): string | null {
  if (role === 'SUPER') return null

  if (!actor.complexId) return '소속 단지가 지정되지 않았습니다.'

  if (role === 'MAIN') {
    if (input.complexId !== actor.complexId) return '다른 단지에 대해 작업할 수 없습니다.'
    return null
  }

  if (!actor.buildingId) return '소속 동이 지정되지 않았습니다.'
  if (input.complexId !== actor.complexId) return '다른 단지에 대해 작업할 수 없습니다.'
  if (input.buildingId && input.buildingId !== actor.buildingId) return '다른 동에 대해 작업할 수 없습니다.'
  return null
}

export function applyResidentScopeFilter(query: any, role: AdminRole, actor: ActorScope) {
  if (role === 'SUPER') return query
  if (role === 'MAIN') {
    if (!actor.complexId) throw new Error('소속 단지가 지정되지 않았습니다.')
    return query.eq('complex_id', actor.complexId)
  }
  if (!actor.buildingId) throw new Error('소속 동이 지정되지 않았습니다.')
  return query.eq('building_id', actor.buildingId)
}

