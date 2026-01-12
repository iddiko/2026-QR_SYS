import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient(supabaseUrl, serviceKey)

async function main() {
  const { error } = await admin.auth.admin.createUser({
    email: 'superadmin@example.com',
    password: 'a1234',
    user_metadata: { role: 'SUPER' },
  })

  if (error) {
    console.error('생성 실패', error.message)
    process.exit(1)
  }

  console.log('슈퍼 관리자 생성 완료')
}

main()
