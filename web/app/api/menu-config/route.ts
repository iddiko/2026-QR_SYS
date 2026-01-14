import { NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseAnonClient } from '../../../lib/serverSupabase'

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status })
}

type RoleKey = 'SUPER' | 'MAIN' | 'SUB' | 'GUARD' | 'RESIDENT'
type TargetRole = Exclude<RoleKey, 'SUPER'>
type OwnerRole = Exclude<RoleKey, 'GUARD' | 'RESIDENT'>

function isRole(value: unknown): value is RoleKey {
  return value === 'SUPER' || value === 'MAIN' || value === 'SUB' || value === 'GUARD' || value === 'RESIDENT'
}

function isTargetRole(value: unknown): value is TargetRole {
  return value === 'MAIN' || value === 'SUB' || value === 'GUARD' || value === 'RESIDENT'
}

function canManage(owner: RoleKey, target: TargetRole) {
  if (owner === 'SUPER') return true
  if (owner === 'MAIN') return target === 'SUB' || target === 'GUARD' || target === 'RESIDENT'
  if (owner === 'SUB') return target === 'GUARD' || target === 'RESIDENT'
  return false
}

function ownerPrecedence(role: string) {
  // lower is higher precedence
  if (role === 'SUPER') return 0
  if (role === 'MAIN') return 1
  if (role === 'SUB') return 2
  return 99
}

async function getRequesterRole(request: Request): Promise<{ role: RoleKey; userId: string | null } | null> {
  const auth = request.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null

  if (!token) {
    // local/dev demo support
    const demoRole = request.headers.get('x-demo-role')
    if (process.env.NODE_ENV !== 'production' && isRole(demoRole)) return { role: demoRole, userId: null }
    return null
  }

  const anon = getSupabaseAnonClient()
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data.user) return null

  const email = (data.user.email ?? '').toLowerCase()
  const configured = (process.env.SUPER_ADMIN_EMAILS ?? 'superadmin@example.com')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)

  if (configured.includes(email)) return { role: 'SUPER', userId: data.user.id }

  const metaRole = (data.user.user_metadata as any)?.role
  if (isRole(metaRole)) return { role: metaRole, userId: data.user.id }

  // fallback: read public.users.role_id (server-side)
  const admin = getSupabaseAdminClient()
  const { data: profile } = await admin.from('users').select('role_id').eq('id', data.user.id).maybeSingle()
  const roleId = (profile?.role_id as string | null) ?? null
  if (isRole(roleId)) return { role: roleId, userId: data.user.id }

  return { role: 'RESIDENT', userId: data.user.id }
}

function mergeEffectiveConfig(rows: { owner_role: string; menu_key: string; is_enabled: boolean }[]) {
  const byKey = new Map<string, { owner: string; is_enabled: boolean }>()
  for (const row of rows) {
    const prev = byKey.get(row.menu_key)
    if (!prev) {
      byKey.set(row.menu_key, { owner: row.owner_role, is_enabled: row.is_enabled })
      continue
    }
    if (ownerPrecedence(row.owner_role) < ownerPrecedence(prev.owner)) {
      byKey.set(row.menu_key, { owner: row.owner_role, is_enabled: row.is_enabled })
    }
  }
  const result: Record<string, boolean> = {}
  for (const [key, v] of byKey.entries()) result[key] = v.is_enabled
  return result
}

export async function GET(request: Request) {
  let requester: Awaited<ReturnType<typeof getRequesterRole>>
  try {
    requester = await getRequesterRole(request)
  } catch {
    return json(503, { error: 'Supabase 인증 확인에 실패했습니다. 잠시 후 다시 시도해주세요.' })
  }
  if (!requester) return json(401, { error: '인증 정보가 없습니다. 다시 로그인해주세요.' })

  const url = new URL(request.url)
  const targetRoleParam = url.searchParams.get('targetRole')

  const targetRole: TargetRole =
    (isTargetRole(targetRoleParam) ? targetRoleParam : null) ?? (isTargetRole(requester.role) ? requester.role : 'RESIDENT')

  if (targetRoleParam && targetRole !== (requester.role as any)) {
    if (!canManage(requester.role, targetRole)) return json(403, { error: '권한이 부족합니다.' })
  }

  try {
    const admin = getSupabaseAdminClient()
    const { data, error } = await admin
      .from('menu_configurations')
      .select('owner_role, target_role, menu_key, is_enabled')
      .eq('target_role', targetRole)

    if (error) return json(500, { error: error.message })

    const effective = mergeEffectiveConfig((data as any[]) ?? [])
    return json(200, { targetRole, config: effective })
  } catch {
    return json(503, { error: 'Supabase 연결에 실패했습니다. 잠시 후 다시 시도해주세요.' })
  }
}

type PutBody = {
  targetRole?: TargetRole
  menuKey?: string
  enabled?: boolean
}

export async function PUT(request: Request) {
  let requester: Awaited<ReturnType<typeof getRequesterRole>>
  try {
    requester = await getRequesterRole(request)
  } catch {
    return json(503, { error: 'Supabase 인증 확인에 실패했습니다. 잠시 후 다시 시도해주세요.' })
  }
  if (!requester) return json(401, { error: '인증 정보가 없습니다. 다시 로그인해주세요.' })

  const ownerRole = requester.role
  if (ownerRole !== 'SUPER' && ownerRole !== 'MAIN' && ownerRole !== 'SUB') return json(403, { error: '권한이 부족합니다.' })

  const body = (await request.json().catch(() => ({}))) as PutBody
  const targetRole = body.targetRole
  const menuKey = (body.menuKey ?? '').trim()
  const enabled = body.enabled

  if (!isTargetRole(targetRole)) return json(400, { error: 'targetRole이 올바르지 않습니다.' })
  if (!menuKey) return json(400, { error: 'menuKey가 필요합니다.' })
  if (typeof enabled !== 'boolean') return json(400, { error: 'enabled(boolean)이 필요합니다.' })

  if (!canManage(ownerRole, targetRole)) return json(403, { error: '권한이 부족합니다.' })

  try {
    const admin = getSupabaseAdminClient()
    const { error } = await admin
      .from('menu_configurations')
      .upsert(
        {
          owner_role: ownerRole as OwnerRole,
          target_role: targetRole,
          menu_key: menuKey,
          is_enabled: enabled,
          updated_by: requester.userId,
        },
        { onConflict: 'owner_role,target_role,menu_key' }
      )

    if (error) return json(500, { error: error.message })

    return json(200, { ok: true })
  } catch {
    return json(503, { error: 'Supabase 연결에 실패했습니다. 잠시 후 다시 시도해주세요.' })
  }
}
