# 우리동네 날씨

공식 날씨 예보와 함께 같은 행정동 사람들의 체감 투표, 동네 한마디를 보여주는 모바일 웹 (Demo v0.1).

- 명세: [`SPEC.md`](./SPEC.md)
- 화면 디자인: `design.html` (Claude Design 번들, 브라우저로 열기)

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
supabase/migrations/
```
