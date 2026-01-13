import { NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseAnonClient } from '../../../lib/serverSupabase'
import { requireAdminRole } from '../../../lib/accessControl'

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status })
}

type UploadBody = {
  dataUrl?: string
  fileName?: string
  folder?: string
}

function parseDataUrl(dataUrl: string) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
  if (!match) return null
  return { contentType: match[1], base64: match[2] }
}

export async function POST(request: Request) {
  const gate = await requireAdminRole(request, getSupabaseAnonClient)
  if (!gate.ok) return json(401, { error: gate.error })

  const body = (await request.json()) as UploadBody
  const dataUrl = (body.dataUrl ?? '').trim()
  const fileName = (body.fileName ?? '').trim()
  const folder = (body.folder ?? 'uploads').trim() || 'uploads'

  if (!dataUrl) return json(400, { error: 'dataUrl이 필요합니다.' })
  if (!fileName) return json(400, { error: 'fileName이 필요합니다.' })

  const parsed = parseDataUrl(dataUrl)
  if (!parsed) return json(400, { error: 'dataUrl 형식이 올바르지 않습니다.' })

  const buffer = Buffer.from(parsed.base64, 'base64')
  if (!buffer.length) return json(400, { error: '업로드할 파일이 비어있습니다.' })

  const safeName = fileName.replace(/[^\w.\-() ]+/g, '_')
  const objectPath = `${folder}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}_${safeName}`

  const admin = getSupabaseAdminClient()
  const bucket = 'public-assets'

  const { error: uploadError } = await admin.storage.from(bucket).upload(objectPath, buffer, {
    contentType: parsed.contentType,
    upsert: true,
  })

  if (uploadError) return json(500, { error: uploadError.message })

  const { data: publicUrlData } = admin.storage.from(bucket).getPublicUrl(objectPath)
  const publicUrl = publicUrlData.publicUrl

  return json(200, { url: publicUrl, path: objectPath })
}

