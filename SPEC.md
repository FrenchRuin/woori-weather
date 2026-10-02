# 우리동네 날씨 — 개발 스펙 (Demo v0.1)

> 이 문서는 Claude Code에게 주는 구현 명세다.
> 마일스톤(§10) 단위로 하나씩 구현하고, 각 마일스톤이 끝나면 멈춰서 결과를 보고한다.
> 명세에 없는 기능은 추가하지 않는다. 애매하면 구현 전에 질문한다.

---

## 0. 제품 요약

- 공식 날씨 예보 + 같은 **행정동** 사람들의 **체감 투표**와 **짧은 글(동네 한마디)** 을 보여주는 모바일 웹
- 로그인 필수 (카카오만), 화면에는 닉네임만 노출
- 데모 범위 제외: 댓글, 사진, 동네 인증, 동네 2개, 미세먼지, 푸시, 관리자 페이지

---

## 1. 기술 스택

| 영역          | 사용 기술                                   |
| ------------- | ------------------------------------------- |
| Framework     | Next.js (App Router), TypeScript (strict)   |
| Style         | Tailwind CSS                                |
| Auth / DB     | Supabase (Auth: Kakao OAuth, Postgres, RLS) |
| Supabase SDK  | `@supabase/ssr`, `@supabase/supabase-js`    |
| 검증          | zod                                         |
| 배포          | Vercel                                      |
| 패키지 매니저 | pnpm                                        |

- 모바일 우선 (기준 폭 390px), 데스크톱에서는 가운데 최대 420px 컨테이너
- 날짜/시간은 모두 **Asia/Seoul** 기준으로 표시

---

## 2. 환경 변수 (`.env.local`, `.env.example` 도 생성)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # 서버 전용 (캐시/dongs 쓰기용)
KMA_SERVICE_KEY=                  # 공공데이터포털 기상청 단기예보 (Decoding 키)
KAKAO_REST_API_KEY=               # 카카오 로컬 API (서버 전용)
```

- `NEXT_PUBLIC_` 이 아닌 키는 절대 클라이언트 코드에서 import 하지 않는다.

---

## 3. 외부 API

### 3-1. 기상청 단기예보 (공공데이터포털 `VilageFcstInfoService_2.0`)

| 용도                                     | 오퍼레이션                                         |
| ---------------------------------------- | -------------------------------------------------- |
| 현재 기온·습도·풍속·강수형태             | `getUltraSrtNcst` (초단기실황)                     |
| 현재 하늘상태(SKY)                       | `getUltraSrtFcst` (초단기예보) 의 가장 가까운 시각 |
| 시간별 예보(12시간), 강수확률, 최고/최저 | `getVilageFcst` (단기예보)                         |

- 위경도 → 격자(nx, ny) 변환: 기상청 LCC 변환 공식 사용 → `lib/kma/grid.ts`
- base_date / base_time 계산 로직 필요 → `lib/kma/baseTime.ts`
  - 초단기실황: 매시 정각 발표, 약 40분 이후 조회 가능 → 그 전이면 1시간 전 사용
  - 초단기예보: 매시 30분 발표, 약 45분 이후 조회 가능
  - 단기예보: 02, 05, 08, 11, 14, 17, 20, 23시 발표, 약 10분 이후 조회 가능
- 체감온도: 기온 + 풍속으로 계산 (겨울: 체감온도 공식, 그 외: 기온 그대로) → `lib/kma/feelsLike.ts`
- API 응답은 아래 형태로 정규화해서 사용

```ts
type Weather = {
  now: {
    temp: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    sky: "clear" | "partly" | "cloudy";
    pty: "none" | "rain" | "rainsnow" | "snow" | "shower";
    summary: string; /* 예: "흐리고 가끔 비" */
  };
  today: {
    max: number | null;
    min: number | null;
    pop: number; /* 강수확률 % */
  };
  hourly: Array<{
    time: string /* ISO */;
    temp: number;
    sky: Weather["now"]["sky"];
    pty: Weather["now"]["pty"];
    pop: number;
  }>; // 12개
  fetchedAt: string;
};
```

### 3-2. 카카오 로컬 API

| 용도          | 엔드포인트                                                         |
| ------------- | ------------------------------------------------------------------ |
| 좌표 → 행정동 | `GET /v2/local/geo/coord2regioncode.json` (region_type `H` 사용)   |
| 동 이름 검색  | `GET /v2/local/search/address.json` (결과의 행정동 코드/이름 사용) |

- 헤더: `Authorization: KakaoAK {KAKAO_REST_API_KEY}` (서버에서만 호출)

---

## 4. 데이터베이스 (Supabase Postgres)

`supabase/migrations/` 에 SQL 로 작성. 모든 id 는 uuid, 시간은 timestamptz.

### profiles

| column              | type                      | 비고                   |
| ------------------- | ------------------------- | ---------------------- |
| id                  | uuid PK                   | = auth.users.id        |
| nickname            | text unique not null      | 2~10자, 한글/영문/숫자 |
| dong_code           | text FK → dongs.code      |                        |
| nickname_changed_at | timestamptz               | 30일 내 재변경 불가    |
| created_at          | timestamptz default now() |                        |

### dongs

| column    | type             | 비고                      |
| --------- | ---------------- | ------------------------- |
| code      | text PK          | 행정동 코드 (10자리)      |
| name      | text             | 망원1동                   |
| full_name | text             | 서울특별시 마포구 망원1동 |
| lat, lng  | double precision |                           |
| nx, ny    | int              | 기상청 격자               |

- 카카오 API 로 처음 조회된 동을 서버(service role)가 upsert

### weather_cache

| column     | type            | 비고               |
| ---------- | --------------- | ------------------ |
| nx, ny     | int, PK(nx, ny) |                    |
| data       | jsonb           | 정규화된 `Weather` |
| fetched_at | timestamptz     | 30분 지나면 갱신   |

### reactions

| column     | type                                | 비고                          |
| ---------- | ----------------------------------- | ----------------------------- |
| id         | uuid PK                             |                               |
| user_id    | uuid FK → profiles                  |                               |
| dong_code  | text FK → dongs                     |                               |
| feel       | text check in ('cold','good','hot') |                               |
| tags       | text[] default '{}'                 | 허용값: 'rain','wind','clear' |
| created_at | timestamptz default now()           |                               |
| updated_at | timestamptz default now()           |                               |

- index: (dong_code, created_at desc), (user_id, created_at desc)

### posts

| column       | type                                            | 비고                       |
| ------------ | ----------------------------------------------- | -------------------------- |
| id           | uuid PK                                         |                            |
| user_id      | uuid FK → profiles                              |                            |
| dong_code    | text FK → dongs                                 |                            |
| content      | text not null                                   | 1~200자 (check)            |
| tag          | text null check in ('rain','wind','temp','sun') |                            |
| like_count   | int default 0                                   | 트리거로 관리              |
| report_count | int default 0                                   | 트리거로 관리              |
| is_hidden    | boolean default false                           | report_count ≥ 3 이면 true |
| created_at   | timestamptz default now()                       |                            |

- index: (dong_code, created_at desc), (dong_code, like_count desc)

### post_likes

| column               | type                              |
| -------------------- | --------------------------------- |
| post_id              | uuid FK → posts on delete cascade |
| user_id              | uuid FK → profiles                |
| created_at           | timestamptz                       |
| PK(post_id, user_id) |                                   |

### reports

| column               | type                                           | 비고    |
| -------------------- | ---------------------------------------------- | ------- |
| post_id              | uuid FK → posts on delete cascade              |         |
| user_id              | uuid FK → profiles                             |         |
| reason               | text check in ('abuse','ad','off_topic','etc') |         |
| created_at           | timestamptz                                    |         |
| PK(post_id, user_id) |                                                | 1인 1회 |

### 트리거

- `post_likes` insert/delete → `posts.like_count` ±1
- `reports` insert → `posts.report_count` +1, 3 이상이면 `is_hidden = true`

### RLS

| 테이블        | select                                                                      | insert/update/delete               |
| ------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| profiles      | 로그인 사용자 전체 (nickname, dong_code만 노출되도록 view 또는 컬럼 제한)   | 본인 행만                          |
| dongs         | 전체                                                                        | service role 만                    |
| weather_cache | 서버(service role) 만                                                       | service role 만                    |
| reactions     | 로그인 사용자 (집계용)                                                      | 본인만 insert/update               |
| posts         | 로그인 사용자, `is_hidden = false` 만 (본인 글은 숨김 여부와 무관하게 보임) | insert 본인, delete 본인           |
| post_likes    | 로그인 사용자                                                               | 본인만 insert/delete               |
| reports       | 본인 것만                                                                   | 본인만 insert, 본인 글은 신고 불가 |

---

## 5. 비즈니스 규칙

| ID  | 규칙                                                                                                |
| --- | --------------------------------------------------------------------------------------------------- |
| R1  | 로그인 안 한 사용자는 `/login` 외 모든 페이지 접근 시 `/login` 으로 리다이렉트                      |
| R2  | 로그인했지만 profile(닉네임·동네) 없으면 `/onboarding` 으로 리다이렉트                              |
| R3  | 닉네임 2~10자, 한글/영문/숫자만, 중복 불가                                                          |
| R4  | 닉네임 변경은 마지막 변경 후 30일이 지나야 가능                                                     |
| R5  | 동네는 1개. 변경 시 이후 투표/글은 새 동네 기준                                                     |
| R6  | 체감 투표: 최근 1시간 내 내 투표가 있으면 **update**(feel, tags, updated_at), 없으면 **insert**     |
| R7  | 체감 집계: 해당 동네의 `created_at > now() - 1 hour` 인 reactions 의 feel 별 개수·비율, tag 별 개수 |
| R8  | 한마디 1~200자, 앞뒤 공백 제거 후 검사                                                              |
| R9  | 한마디 작성 제한: 같은 사용자 1분에 1개 (서버에서 검사, 429 반환)                                   |
| R10 | "최근 글" = 작성 6시간 이내, 그 이전은 "지난 글" (24시간 이내까지만 조회)                           |
| R11 | 공감: 1인 1회, 다시 누르면 취소 (토글)                                                              |
| R12 | 신고: 1인 1회, 본인 글 신고 불가, 3건 누적 시 자동 숨김                                             |
| R13 | 글 삭제: 작성자 본인만, 하드 삭제                                                                   |
| R14 | 금칙어(기본 욕설 목록, `lib/moderation/badwords.ts`) 포함 시 작성 거부 (400)                        |

---

## 6. 페이지 / 라우트

| 경로             | 설명                                                                                                    | 접근                |
| ---------------- | ------------------------------------------------------------------------------------------------------- | ------------------- |
| `/login`         | 서비스 소개 + "카카오로 시작하기"                                                                       | 비로그인            |
| `/auth/callback` | Supabase OAuth 콜백 처리                                                                                | -                   |
| `/onboarding`    | 닉네임 입력 + 동네 선택(현재 위치 / 검색)                                                               | 로그인, 프로필 없음 |
| `/`              | 메인: 헤더(동네명), 현재 날씨, 시간별 예보, 체감 카드, 한마디 미리보기(최근 3개), 하단 고정 글쓰기 버튼 | 로그인+프로필       |
| `/posts`         | 한마디 목록: 정렬(최신/공감), 태그 필터, 최근/지난 글 구분                                              | 로그인+프로필       |
| `/me`            | 닉네임 변경, 동네 변경, 내가 쓴 글, 로그아웃, 탈퇴                                                      | 로그인+프로필       |

- 글쓰기, 신고는 **바텀 시트 컴포넌트** (별도 페이지 아님)
- 라우트 보호는 `middleware.ts` 에서 처리

---

## 7. API (Route Handlers, `app/api/**`)

공통: 요청 body 는 zod 로 검증, 에러 응답 형식 `{ error: { code: string, message: string } }`

| Method | Path                     | 입력                                                    | 출력                                              |
| ------ | ------------------------ | ------------------------------------------------------- | ------------------------------------------------- |
| GET    | `/api/dong/by-coord`     | `lat, lng`                                              | `Dong`                                            |
| GET    | `/api/dong/search`       | `q` (2자 이상)                                          | `Dong[]` (최대 10)                                |
| GET    | `/api/nickname/check`    | `name`                                                  | `{ available: boolean, reason?: string }`         |
| POST   | `/api/profile`           | `{ nickname, dongCode }`                                | `Profile`                                         |
| PATCH  | `/api/profile`           | `{ nickname? , dongCode? }`                             | `Profile` (R4 위반 시 409)                        |
| GET    | `/api/weather`           | `dong`                                                  | `Weather` (캐시 30분)                             |
| GET    | `/api/reactions/summary` | `dong`                                                  | `ReactionSummary`                                 |
| POST   | `/api/reactions`         | `{ feel, tags[] }`                                      | `ReactionSummary`                                 |
| GET    | `/api/posts`             | `dong, sort=new\|like, tag?, scope=recent\|old, limit?` | `Post[]`                                          |
| POST   | `/api/posts`             | `{ content, tag? }`                                     | `Post` (R9 → 429, R14 → 400)                      |
| DELETE | `/api/posts/[id]`        | -                                                       | `204`                                             |
| POST   | `/api/posts/[id]/like`   | -                                                       | `{ liked: boolean, likeCount: number }`           |
| POST   | `/api/posts/[id]/report` | `{ reason }`                                            | `204` (중복 → 409)                                |
| DELETE | `/api/account`           | -                                                       | `204` (탈퇴: 글/투표/공감 삭제 후 auth 유저 삭제) |

```ts
type Dong = { code: string; name: string; fullName: string };
type Profile = {
  id: string;
  nickname: string;
  dong: Dong;
  nicknameChangeableAt: string | null;
};
type ReactionSummary = {
  total: number;
  feel: { cold: number; good: number; hot: number }; // 개수
  percent: { cold: number; good: number; hot: number }; // 정수 %
  tags: { rain: number; wind: number; clear: number };
  mine: {
    feel: "cold" | "good" | "hot";
    tags: string[];
    editableUntil: string;
  } | null;
};
type Post = {
  id: string;
  nickname: string;
  content: string;
  tag: "rain" | "wind" | "temp" | "sun" | null;
  likeCount: number;
  likedByMe: boolean;
  isMine: boolean;
  createdAt: string;
};
```

---

## 8. 컴포넌트 (`components/`)

- `WeatherHero` — 현재 날씨 + 요약 수치 4개
- `HourlyForecast` — 12시간 가로 스크롤
- `FeelCard` — 집계 문구, 3색 비율 막대, 투표 버튼 3개, 태그 3개, 상태 문구
- `PostCard` — 닉네임/시간/태그 배지/본문/공감/삭제 or 신고
- `PostList` — 정렬·필터, 최근/지난 글 구분선, 빈 상태
- `BottomSheet` — 공통 시트 (바깥 탭/ESC 로 닫힘)
- `WriteSheet`, `ReportSheet`
- `Toast`
- `DongPicker` — 현재 위치 버튼 + 검색 + 결과 리스트

빈 상태 문구:

- 투표 0명: "아직 아무도 반응하지 않았어요. 첫 번째로 알려주세요"
- 글 0개: "아직 한마디가 없어요. 첫 글을 남겨보세요"
- 필터 결과 없음: "최근 6시간 동안 올라온 글이 없어요"

> 디자인은 별도로 전달 예정. 우선 Tailwind 로 깔끔한 기본 스타일로 구현하고, 색상은 `tailwind.config` 토큰(primary, cold, good, hot)으로 분리해 나중에 교체 가능하게 한다.

---

## 9. 폴더 구조

```
src/
  app/
    login/  auth/callback/  onboarding/  posts/  me/
    page.tsx              # 메인
    api/ dong/ nickname/ profile/ weather/ reactions/ posts/ account/
  components/
  lib/
    supabase/ (client.ts, server.ts, admin.ts)
    kma/ (grid.ts, baseTime.ts, client.ts, normalize.ts, feelsLike.ts)
    kakao/ (local.ts)
    moderation/ (badwords.ts)
    time.ts               # "방금 / N분 전 / N시간 전"
  types/
middleware.ts
supabase/migrations/
.env.example
```

---

## 10. 마일스톤 (순서대로, 각 단계 후 멈추고 보고)

### M1. 프로젝트 세팅

- Next.js + TS + Tailwind + pnpm, ESLint/Prettier
- Supabase 클라이언트 3종 (browser / server / admin)
- `.env.example`, README 에 실행 방법
- ✅ 완료 기준: `pnpm dev` 로 빈 메인 페이지가 뜬다

### M2. DB

- §4 의 테이블, 트리거, RLS 마이그레이션 SQL
- ✅ 완료 기준: Supabase 에 적용 가능한 SQL 파일, 트리거 동작 확인용 SQL 예시 포함

### M3. 로그인 + 온보딩

- 카카오 로그인, `/auth/callback`, middleware 라우트 보호 (R1, R2)
- 닉네임 중복 확인, 동네 선택(현재 위치 / 검색), 프로필 저장
- ✅ 완료 기준: 로그인 → 온보딩 → 메인 진입까지 동작

### M4. 날씨

- 격자 변환, base_time 계산, 3개 API 호출, 정규화, 30분 캐시
- `WeatherHero`, `HourlyForecast`
- ✅ 완료 기준: 메인에서 실제 날씨가 보인다. `grid.ts`, `baseTime.ts` 단위 테스트 포함

### M5. 체감 투표

- R6, R7 구현, `FeelCard`
- ✅ 완료 기준: 투표·수정·집계가 동작하고 새로고침 후에도 유지

### M6. 동네 한마디

- 글쓰기(R8, R9, R14), 목록(R10, 정렬·필터), 공감(R11), 삭제(R13)
- 메인 미리보기 3개 + `/posts`
- ✅ 완료 기준: 두 계정으로 테스트 시 서로의 글/공감이 보인다

### M7. 신고 + 내 정보

- 신고(R12), `/me` (닉네임 변경 R4, 동네 변경 R5, 내 글, 로그아웃, 탈퇴)
- ✅ 완료 기준: 신고 3건 시 글이 목록에서 사라진다

### M8. 마무리

- 로딩/에러 상태, 토스트, 빈 상태 문구
- Vercel 배포 설정 안내
- ✅ 완료 기준: 실제 폰 브라우저에서 전체 흐름 동작

---

## 11. 코딩 규칙

- 서버 전용 코드는 `import 'server-only'` 로 표시
- 외부 API 키는 서버에서만 사용
- DB 접근은 가능하면 RLS 를 타는 사용자 세션 클라이언트로, 캐시/dongs 쓰기만 admin 클라이언트 사용
- 시간 계산은 서버에서 UTC 로 저장, 표시는 Asia/Seoul
- 커밋은 마일스톤 단위

## 12. 확인 필요 (구현 중 막히면 질문)

- Supabase 카카오 로그인이 요청하는 이메일 동의 항목이 카카오 앱 설정(비즈 앱 여부)에 따라 막힐 수 있음 → M3 에서 확인
- 기상청 API 활용 승인 전이면 M4 는 목업 데이터로 먼저 진행
