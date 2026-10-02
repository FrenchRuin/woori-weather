# 우리동네 날씨

공식 날씨 예보와 함께 같은 행정동 사람들의 체감 투표, 동네 한마디를 보여주는 모바일 웹 (Demo v0.1).

- 명세: [`SPEC.md`](./SPEC.md)
- 화면 디자인: `design.html` (Claude Design 번들, 브라우저로 열기)
- 작업 기록 · 결정 사항: [`docs/WORKLOG.md`](./docs/WORKLOG.md)

## 기술 스택

Next.js 16 (App Router, TypeScript strict) · Tailwind CSS v4 · Supabase (Auth/Postgres/RLS) · zod · Vitest · pnpm

## 준비물

- Node.js 20 이상, pnpm 10
- Supabase 프로젝트 (카카오 OAuth provider 활성화)
- 공공데이터포털 기상청 단기예보 API 키 (Decoding 키)
- 카카오 디벨로퍼스 REST API 키

## 실행

```bash
pnpm install
cp .env.example .env.local   # 값 채우기
pnpm dev                     # http://localhost:3000
```

## DB (Supabase)

1. Supabase 대시보드 → SQL Editor 에서 `supabase/migrations/*.sql` 을 파일명 순서대로 실행
   (Supabase CLI 를 쓴다면 `supabase db push`)
2. 동작 확인: `supabase/tests/check_init.sql` 을 SQL Editor 에서 실행 → 마지막 결과가 `ALL PASSED` 면 정상
   (한 트랜잭션 안에서 실행 후 rollback 하므로 데이터가 남지 않음)

DB 가 직접 보장하는 규칙: 닉네임 형식·중복(대소문자 무시)·30일 1회 변경, 한마디 1분 1개, 공감/신고 카운터, 신고 3건 자동 숨김, 내 동네에만 투표/글쓰기, 탈퇴 시 cascade 삭제.

## 카카오 로그인 (Supabase)

- Supabase → Authentication → Providers → Kakao: REST API 키 + Client Secret
- **비즈 앱이 아니면 카카오가 이메일을 주지 않으므로** Kakao provider 의 `Allow users without an email`(`external_kakao_email_optional`)을 켠다
- 카카오 콘솔 Redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
- Supabase Redirect URLs: `http://localhost:3000/auth/callback` (배포 시 운영 주소 추가)

## 배포 (Vercel)

1. [vercel.com/new](https://vercel.com/new) → GitHub 저장소 `woori-weather` Import
   (Framework: Next.js, 패키지 매니저는 `pnpm-lock.yaml` 로 자동 인식 — 설정 변경 없음)
2. **Environment Variables** 에 아래 [환경 변수](#환경-변수) 5개를 `.env.local` 과 같은 값으로 입력 → Deploy
   - `SUPABASE_ACCESS_TOKEN`, `KAKAO_CLIENT_SECRET` 은 로컬 설정용이라 넣지 않는다
3. 서버 리전: `vercel.json` 에서 `icn1`(서울)로 고정. Supabase(ap-northeast-2, 서울)·기상청·카카오 API 와 가까워야 응답이 빠르다
4. 배포 주소(예: `https://woori-weather.vercel.app`)가 나오면 Supabase → Authentication → URL Configuration
   - Site URL: `https://<배포 주소>`
   - Redirect URLs 에 `https://<배포 주소>/auth/callback` 추가 (로컬용 `http://localhost:3000/auth/callback` 은 그대로 둠)
5. 카카오 디벨로퍼스: 로그인 Redirect URI 가 Supabase 주소라 바꿀 필요 없음
6. 폰에서 배포 주소로 접속해 확인. 현재 위치 찾기는 HTTPS 에서만 동작하므로 폰 확인은 배포 주소로 한다

## 스크립트

| 명령                        | 설명                 |
| --------------------------- | -------------------- |
| `pnpm dev`                  | 개발 서버            |
| `pnpm build` / `pnpm start` | 프로덕션 빌드 / 실행 |
| `pnpm lint`                 | ESLint               |
| `pnpm typecheck`            | 타입 검사            |
| `pnpm format`               | Prettier             |
| `pnpm test`                 | Vitest 단위 테스트   |

## 환경 변수

| 키                                                          | 용도                              |
| ----------------------------------------------------------- | --------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 브라우저/서버 클라이언트 |
| `SUPABASE_SERVICE_ROLE_KEY`                                 | 서버 전용. 날씨 캐시, dongs 쓰기  |
| `KMA_SERVICE_KEY`                                           | 서버 전용. 기상청 단기예보        |
| `KAKAO_REST_API_KEY`                                        | 서버 전용. 카카오 로컬 API        |

`NEXT_PUBLIC_` 이 아닌 키는 클라이언트 코드에서 import 하지 않는다.

## 폴더 구조

```
src/
  app/            # 페이지, Route Handlers (app/api/**)
  components/
  lib/supabase/   # client.ts(브라우저) · server.ts(서버, RLS) · admin.ts(service role)
  types/
supabase/migrations/   # 스키마 · 트리거 · RLS
supabase/tests/        # SQL 동작 확인 스크립트
```
