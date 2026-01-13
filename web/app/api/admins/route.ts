import { NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseAnonClient } from '../../../lib/serverSupabase'
import { requireAdminRole } from '../../../lib/accessControl'

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status })
}

type AdminRole = 'MAIN' | 'SUB' | 'GUARD'

function normalizeRole(value: string | null): AdminRole | null {
  if (value === 'MAIN' || value === 'SUB' || value === 'GUARD') return value
  return null
}

export async function GET(request: Request) {
  const gate = await requireAdminRole(request, getSupabaseAnonClient)
  if (!gate.ok) return json(401, { error: gate.error })
  if (gate.role !== 'SUPER') return json(403, { error: '최고 관리자만 조회할 수 있습니다.' })

  const url = new URL(request.url)
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const roleId = normalizeRole(url.searchParams.get('roleId'))
  const complexId = (url.searchParams.get('complexId') ?? '').trim()
  const buildingId = (url.searchParams.get('buildingId') ?? '').trim()
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50) || 50, 200)

  const admin = getSupabaseAdminClient()

  let query = admin
    .from('users')
    .select('id, role_id, complex_id, building_id, display_name, phone, metadata, created_at')
    .in('role_id', ['MAIN', 'SUB', 'GUARD'])
    .order('created_at', { ascending: false })
    .limit(limit)

  if (roleId) query = query.eq('role_id', roleId)
  if (complexId) query = query.eq('complex_id', complexId)
  if (buildingId) query = query.eq('building_id', buildingId)

  const { data, error } = await query
  if (error) return json(500, { error: error.message })

  const admins = (data ?? []).map((row: any) => {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>
    return {
      id: row.id as string,
      roleId: row.role_id as AdminRole,
      complexId: (row.complex_id as string | null) ?? null,
      buildingId: (row.building_id as string | null) ?? null,
      displayName: (row.display_name as string | null) ?? '',
      phone: (row.phone as string | null) ?? '',
      email: (metadata.email as string | undefined) ?? '',
      createdAt: row.created_at as string,
    }
  })

  const filtered = q
    ? admins.filter((a) => {
        const hay = `${a.email} ${a.displayName} ${a.phone}`.toLowerCase()
        return hay.includes(q)
      })
    : admins

  return json(200, { admins: filtered })
}

