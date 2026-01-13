import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: 'web/.env.local' })
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  throw new Error(
    'Supabase 환경 변수가 없습니다. `web/.env.local` 또는 `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 설정하세요.'
  )
}

const admin = createClient(supabaseUrl, serviceKey)

async function main() {
  const email = (process.env.SUPERADMIN_EMAIL ?? 'superadmin@example.com').trim().toLowerCase()
  const password = (process.env.SUPERADMIN_PASSWORD ?? '').trim()

  if (!password) {
    throw new Error('SUPERADMIN_PASSWORD가 필요합니다. 예) SUPERADMIN_PASSWORD="a1234"')
  }

  console.log('[OK] Supabase URL:', supabaseUrl)
  console.log('[RUN] 슈퍼 관리자 생성/갱신:', email)

  const { data: listData, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (listError) {
    console.error('[FAIL] 사용자 목록 조회 실패:', listError.message)
    process.exit(1)
  }

  const existing = listData?.users?.find((u) => (u.email ?? '').toLowerCase() === email)
  if (existing) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(existing.user_metadata ?? {}), role: 'SUPER' },
    })
    if (updateError) {
      console.error('[FAIL] 기존 사용자 갱신 실패:', updateError.message)
      process.exit(1)
    }
    console.log('[OK] 기존 사용자 갱신 완료:', existing.id)
    process.exit(0)
  }

  const { data: createData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'SUPER' },
  })

  if (createError) {
    console.error('[FAIL] 생성 실패:', createError.message)
    process.exit(1)
  }

  console.log('[OK] 생성 완료:', createData.user?.id ?? '(user id 없음)')
  process.exit(0)
}

main()

