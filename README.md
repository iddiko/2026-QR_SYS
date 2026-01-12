# QR SYS

이 레포는 **Supabase + Next.js + Vercel** 스택을 사용하여 계층별 QR 기반 아파트 관리 시스템을 만드는 기반입니다.

## 구조
- `ARCHITECTURE.md`: 역할/메뉴/스키마/배포 설계 문서
- `web/`: Tailwind 기반 Next.js TypeScript 앱
- `.env.local`: Supabase/QR 키 (기존 사용자 제공)

## 개발 흐름
1. `cd web`
2. `npm run dev` (환경 변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `QR_SECRET_KEY`)
3. 로그인 상태에 따라 `app/page.tsx`를 확장하여 각 역할의 대시보드를 구현

## 배포
- GitHub → Vercel 자동 배포
- Supabase CLI로 `migrations` 관리 (`supabase db push`)
- Vercel 환경 변수에 Supabase 키와 QR 시크릿 등록

## TODO
- Supabase schema/migration 추가 및 RLS policy 설계
- 역할별 레이아웃, 메뉴 토글 컴포저블, QR 관리 컴포넌트
- Supabase Edge Function 또는 API Route로 QR 발행/로그 기록
- 구조화된 대시보드 확장
  - `hooks/useComplexes.ts`를 사용해 필터링/페이지네이션 가능한 단지 목록을 가져오는 재사용 훅(슈퍼 관리자 전용).
  - `components/dashboard` 아래에 슈퍼/메인/서브 관리자 뷰를 모듈화했고, 각각의 역할에 맞게 컴포넌트를 교체/확장할 수 있게 설계.
  - 이제 RLS 정책을 문서화하고, 각 뷰에서 Supabase Auth 역할에 따라 렌더링/쿼리 범위를 제한하면 대시보드가 수만 개 단지까지 확장 가능.
