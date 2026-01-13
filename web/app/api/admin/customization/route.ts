import { NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseAnonClient } from '../../../../lib/serverSupabase'
import { requireAdminRole } from '../../../../lib/accessControl'

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status })
}

type Payload = {
  menus?: unknown
  pages?: unknown
}

export async function GET(request: Request) {
  const gate = await requireAdminRole(request, getSupabaseAnonClient)
  if (!gate.ok) return json(401, { error: gate.error })
  if (gate.role !== 'SUPER') return json(403, { error: '최고관리자만 접근할 수 있습니다.' })

  const admin = getSupabaseAdminClient()
  const { data, error } = await admin
    .from('admin_customizations')
    .select('id, menus, pages, updated_at')
    .eq('id', 'global')
    .maybeSingle()

  if (error) return json(500, { error: error.message })

  return json(200, {
    id: data?.id ?? 'global',
    menus: (data as any)?.menus ?? [],
    pages: (data as any)?.pages ?? {},
    updatedAt: (data as any)?.updated_at ?? null,
  })
}

export async function PUT(request: Request) {
  const gate = await requireAdminRole(request, getSupabaseAnonClient)
  if (!gate.ok) return json(401, { error: gate.error })
  if (gate.role !== 'SUPER') return json(403, { error: '최고관리자만 수정할 수 있습니다.' })

  const body = (await request.json()) as Payload

  const menus = Array.isArray(body.menus) ? body.menus : undefined
  const pages = body.pages && typeof body.pages === 'object' ? body.pages : undefined

  if (!menus && !pages) return json(400, { error: 'menus 또는 pages가 필요합니다.' })

  const admin = getSupabaseAdminClient()
  const { data, error } = await admin
    .from('admin_customizations')
    .upsert(
      {
        id: 'global',
        ...(menus ? { menus } : {}),
        ...(pages ? { pages } : {}),
      },
      { onConflict: 'id' }
    )
    .select('id, menus, pages, updated_at')
    .maybeSingle()

  if (error) return json(500, { error: error.message })

  return json(200, {
    ok: true,
    id: data?.id ?? 'global',
    menus: (data as any)?.menus ?? [],
    pages: (data as any)?.pages ?? {},
    updatedAt: (data as any)?.updated_at ?? null,
  })
}

