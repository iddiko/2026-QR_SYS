# QR 아파트 관리 시스템 아키텍처

## 요구 사항 요약
- 카메라 QR 스캔 기반 단지/동 관리 및 입주민 소통을 위한 웹 앱
- 역할마다 화면·메뉴·관리 대상이 다르고, 동적 메뉴 ON/OFF 및 계층별 활동 추적이 필요
- Supabase Auth/DB, Vercel 배포, GitHub 소스 관리, QR 생성/공유를 포함하는 SaaS 스타일 흐름

## 역할/계층 & 메뉴 형상
1. **슈퍼 관리자 (Super Admin)**: 전체 단지를 생성·관리하고 모든 하위 계층(메인, 서브, 경비, 입주민)의 활동과 메뉴 상태를 열람.
2. **메인 관리자 (Complex Admin)**: 본인 단지(Complex)와 하위 동(동) 전체를 관리하며, 서브 관리자·경비·입주민 메뉴 구성·활동을 제어.
3. **서브 관리자 (Building Admin)**: 특정 동(Building)의 서브 계층(경비, 입주민) 관리. 상위 계층 활동은 볼 수 없음.
4. **경비 & 입주민**: 동일한 계층이지만 메뉴 구성은 다름. QR 생성/조회, 공지, 이웃 알림 등의 기능 제공.

상위 계층은 하위 계층별 메뉴를 on/off할 수 있으며, 메뉴 구성은 Supabase `menu_configurations`에서 정의되어 로그인 시 클라이언트에게 전달.

## Supabase 테이블 설계
```sql
CREATE TABLE complexes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complex_id uuid REFERENCES complexes(id) ON DELETE CASCADE,
  name text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE roles (
  id text PRIMARY KEY, -- ex: SUPER, MAIN, SUB, GUARD, RESIDENT
  label text NOT NULL,
  hierarchy_level int NOT NULL -- lower = higher privilege
);

CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  role_id text REFERENCES roles(id),
  complex_id uuid REFERENCES complexes(id),
  building_id uuid REFERENCES buildings(id),
  display_name text,
  phone text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE menu_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_role text REFERENCES roles(id),
  target_role text REFERENCES roles(id),
  menu_key text NOT NULL,
  is_enabled boolean DEFAULT true,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES users(id),
  type text, -- ex: visitor, guest, resident
  payload jsonb,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  role_id text REFERENCES roles(id),
  action text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

### 관계 및 RLS 전략
- `complexes`/`buildings`는 계층 구조를 강화하여 `users` 테이블의 `complex_id`/`building_id`로 소유권 확인.
- `roles.hierarchy_level`을 사용해 일반 접속 시 하위 노드를 `policy`에서 필터.
- 예: 메인 관리자는 `building.complex_id = users.complex_id`인 동만 조회. `supabase` 정책을 통해 `SELECT`, `UPDATE` 등 허용.
- `menu_configurations`는 로그인 시 Supabase Function 또는 Edge Function을 통해 현재 역할의 메뉴 리스트를 반환.
- QR 관련 테이블은 `is_active`와 `expires_at`으로 유효성, `payload`에는 인증 정보/메시지 포함.

## 인증·UI 흐름
1. Supabase Auth로 로그인 후 클라이언트에서 `GET /api/me` 호출하여 `role`, `complex_id`, `building_id`를 확인.
2. 역할별로 다음 페이지/레이아웃을 라우팅.
   - 슈퍼/메인: 단지 생성, 관리자 생성, 메뉴 토글, 활동 로그, QR 관리
   - 서브: 동 관리자 지정, 입주민·경비 메뉴 설정, 활동 모니터링
   - 경비/입주민: QR 스캔/생성, 공지, 이웃 소식, 1:1 문의 등 메뉴 (menu_configurations 기반)
3. 메뉴 구성은 Supabase의 `menu_configurations`를 `select * from ... where owner_role = current_role and is_enabled` 방식으로 조회.
4. QR 생성은 관리자와 경비/입주민 모두 접근 가능하지만, `is_enabled` flag로 보여짐 여부 조정.

## 프론트엔드 기술 스택
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + Radix UI 또는 Material UI 조합으로 반응형, Vercel 스타일의 UI
- Supabase JS + Edge Functions 연동 (QR 생성/관리의 서명된 URL)
- 환경 변수: Supabase URL/Anon Key, Service Role Key(비공개), QR Secret Key, Vercel/CI 토큰 등.

## 배포 파이프라인
1. GitHub 리포지토리 → Vercel 연동
2. `main` 브랜치 자동 배포, `preview` 브랜치/PR마다 Preview 배포
3. Vercel 환경 변수에 Supabase URL/Service Key 설정, 롤백/릴리즈 노트는 GitHub 릴리즈
4. 테이블/SQL 마이그레이션은 Supabase CLI로 `supabase migration` → `supabase db push`

## 다음 단계
1. 이 구조를 기반으로 Next.js 앱(`web/` 또는 `app/`)을 생성하고 기본 라우팅·레이아웃 구성.
2. Supabase 스키마는 `migrations/`와 `seed`로 관리하며 레벨별 RLS Policy를 작성.
3. 디자인 시스템(로그인, 대시보드, 메뉴 토글, QR 페이지) + 권한 별 프레임워크 정리.
4. GitHub/Vercel 설정 및 자동 배포 문서 추가.
