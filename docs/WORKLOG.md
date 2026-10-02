# 작업 기록

`SPEC.md`(명세)를 기준으로 마일스톤 단위로 진행한다. 스펙을 검토하면서 정한 보완 결정은 아래 **결정 사항**에 모으고, 스펙과 다를 때는 이 문서가 우선한다.

## 진행 현황

| 마일스톤                  | 상태                                   | 커밋      |
| ------------------------- | -------------------------------------- | --------- |
| M1 프로젝트 세팅          | ✅ 완료                                | `8b193f2` |
| M2 DB (테이블·트리거·RLS) | ✅ 완료                                | `100d4f0` |
| M3 로그인 + 온보딩        | ✅ 완료 (실제 카카오 로그인 확인)      | `4595e4a` |
| M4 날씨                   | ✅ 완료 (실제 기상청 데이터 확인)      | `b9aa190` |
| M5 체감 투표              | ✅ 완료 (2계정으로 집계 확인)          | `cb5e8d6` |
| M6 동네 한마디            | ✅ 완료 (2계정으로 글·공감 확인)       | `a8e5459` |
| M7 신고 + 내 정보         | ✅ 완료 (4계정으로 신고 3건 숨김 확인) | `fec7c88` |
| M8 마무리                 | 🟡 코드 완료, 배포·실제 폰 확인 남음   | 아래 참고 |

---

## M1. 프로젝트 세팅 (2026-10-02)

- Next.js 16.3 (App Router, TS strict, `src/`) + Tailwind v4 + pnpm
- ESLint(+ eslint-config-prettier), Prettier(+ tailwind 플러그인), Vitest
- Supabase 클라이언트 3종: `lib/supabase/client.ts`(브라우저) · `server.ts`(서버, RLS 적용) · `admin.ts`(service role, `server-only`)
- `globals.css` `@theme`에 디자인 토큰 정의 (primary, ink, cold/good/hot, danger, kakao 등), Pretendard 폰트
- `.env.example`, README
- 검증: `pnpm dev`로 빈 메인 페이지 표시, lint/typecheck/build 통과

## M2. DB (2026-10-02)

- `supabase/migrations/20261002000000_init.sql`: 테이블 7개, 트리거, RLS, view, RPC
- **DB에서 직접 보장하는 규칙** (API를 거치지 않아도 우회 불가)
  - 닉네임 형식·대소문자 무시 중복·30일 1회 변경 (R3, R4)
  - 한마디 1분 1개 (R9), 1~200자·앞뒤 공백 없음 (R8)
  - 공감/신고 카운터는 트리거만 변경, 신고 3건이면 자동 숨김, 숨긴 글은 작성자만 조회 (R11, R12)
  - 투표/글은 현재 내 동네에만, 본인 글 신고 불가 (R5, R12)
  - 탈퇴 시 모든 사용자 데이터 cascade 삭제
- 스펙 외 추가 (API 편의): `public_profiles`·`post_feed` view, `submit_reaction()`(R6)·`reaction_summary()`(R7) 함수
- DB 오류 코드 → HTTP: `WW429`→429, `WW409`→409, `WW403`→403, `23505`→409
- 검증: `supabase/tests/check_init.sql` (트랜잭션 + rollback) → 로컬 PGlite와 실제 Supabase 모두 `ALL PASSED`. 규칙 4개를 일부러 망가뜨려 테스트가 실패를 잡는 것도 확인

## M3. 로그인 + 온보딩 (2026-10-02)

- `/login`: 디자인 01 화면, 카카오 OAuth 시작
- `/auth/callback`: PKCE 코드 → 세션. 실패하면 `/login?error=...`로 사유 표시
- `src/proxy.ts`: 세션 쿠키 갱신, R1(비로그인 → `/login`, API는 401 JSON), R2(프로필 없음 → `/onboarding`, 있으면 `/login`·`/onboarding` 접근 시 `/`)
- `/onboarding`: 닉네임 실시간 확인(형식 → 중복), `DongPicker`(위치 권한이 있으면 바로 추천 + 동 이름/역/장소 검색)
- 동네 검색: 카카오 주소 검색 + 키워드 검색 → 결과 좌표를 모두 `coord2regioncode`(H)로 바꿔 **행정동으로 통일**하고 중복 제거, 조회된 동은 `dongs`에 upsert(격자 nx/ny 포함)
- API: `GET /api/dong/by-coord`, `GET /api/dong/search`, `GET /api/nickname/check`, `POST /api/profile`
- `lib/kma/grid.ts` 격자 변환 + 단위 테스트(서울/부산/제주/기준점)
- `src/types/database.ts`: Supabase에서 생성한 DB 타입
- 검증: 테스트 계정 세션으로 API/라우팅 전체, Playwright(390px)로 화면 흐름 확인, 실제 카카오 계정 로그인 → 온보딩 → 메인 확인

### 이슈와 해결

- **카카오 로그인 "이메일 제공 동의 필요" 오류**: 비즈 앱이 아니어서 카카오가 이메일을 주지 않고, Supabase는 기본적으로 이메일을 요구한다 → Supabase `external_kakao_email_optional = true`로 해결. 앱은 이메일을 쓰지 않는다.
- **기상청 키 403 (등록되지 않은 서비스키)**: Encoding 키를 한 번 더 인코딩해서 생긴 문제 → 코드에서 `decodeURIComponent` 후 사용(Encoding/Decoding 키 모두 동작)
- **카카오 로컬 API**: 카카오맵(로컬) 사용 설정을 켜야 동작한다

## M4. 날씨 (2026-10-02)

- `lib/kma/baseTime.ts`: API별 발표 시각 계산 (초단기실황 정각+40분, 초단기예보 30분+45분, 단기예보 3시간 간격+10분, 오늘 최고/최저는 02시 발표분/02:10 전이면 전날 23시)
- `lib/kma/client.ts`: 기상청 호출(8초 타임아웃, 결과코드 검사, Encoding/Decoding 키 모두 허용)
- `lib/kma/normalize.ts`: 응답 → 스펙 `Weather` 형태. 하늘상태는 초단기예보의 가장 가까운 시각, 시간별 12개, 오늘 강수확률은 남은 시간대 최댓값, 요약 문구("흐리고 비" 등)
- `lib/kma/feelsLike.ts`: 겨울 체감온도 (11~3월, 10℃ 이하, 1.3m/s 이상)
- `lib/weather.ts`: `weather_cache` 30분 캐시. 갱신에 실패하면 오래된 캐시라도 반환. 초단기예보/최고·최저 호출이 실패해도 나머지로 진행
- `GET /api/weather?dong=`: 응답 `Weather`, 실패 시 502
- `WeatherHero`, `HourlyForecast`: 디자인 03 상단. 밤(18~06시) 아이콘, 메인은 Suspense 스켈레톤 + 오류 카드
- 단위 테스트 33개 (grid, baseTime, feelsLike, normalize)
- 검증: 실제 API로 망원2동 20.2℃ 맑음, 최고/최저 22°/10° 표시, 첫 호출 1.6초, 캐시 0.1초

### 이슈와 해결

- **"지금" 칸 누락**: 최신 단기예보는 다음 시각부터라(예: 17:20엔 18시부터) 현재 시각이 빠진다 → 현재 시각 칸을 실황으로 채움

## M5. 체감 투표 (2026-10-02)

- `GET /api/reactions/summary?dong=`, `POST /api/reactions {feel, tags[]}` → `ReactionSummary`
  - R6: DB 함수 `submit_reaction`이 같은 동네의 최근 1시간 내 내 투표를 수정, 없으면 새로 만든다(동시 요청은 advisory lock으로 직렬화)
  - R7: `reaction_summary`로 최근 1시간 집계, 비율은 합이 100이 되도록 최대 잔여 방식(`lib/percent.ts`)
  - `mine.editableUntil = created_at + 1시간`
- `FeelCard`: 디자인 03-A/B/빈 상태. 3색 비율 막대, 투표 버튼 3개, 상황 태그(비 와요 / 바람 세요 / 그쳤어요, 개수 표시), "반영됐어요" 문구
  - 투표 전에 고른 태그는 첫 투표 때 함께 보내고, 투표 후에는 태그를 누를 때마다 바로 수정
- 메인: 날씨와 체감 카드를 각각 Suspense로 따로 불러온다
- 검증: 프로필 없으면 403 → 투표 → 수정(1건 유지) → 다른 계정 투표(2건 집계) → 새로고침 후 유지. 빈 상태 → 첫 투표 → 태그 → 새로고침을 브라우저로 확인. 잘못된 입력은 400

## M6. 동네 한마디 (2026-10-02)

- API
  - `GET /api/posts?dong&sort=new|like&scope=recent|old&tag&limit`: 본문은 `Post[]`, 조건에 맞는 전체 개수는 `X-Total-Count` 헤더(결정 사항 "한마디 개수"). 숨김 글 제외
  - `POST /api/posts {content, tag?}`: 앞뒤 공백 제거 후 1~200자(R8), 금칙어 400 `BADWORD`(R14), 1분 1개 429 `TOO_MANY_POSTS`(R9, DB 트리거), 글은 현재 내 동네로 저장
  - `DELETE /api/posts/[id]`: 본인 글만(RLS), 아니면 404 (R13)
  - `POST /api/posts/[id]/like`: 토글, `{ liked, likeCount }` (R11)
- R10: 최근 글은 6시간 이내, 지난 글은 6~24시간
- `lib/moderation/badwords.ts`: 기본 욕설 목록. 공백·숫자·특수문자를 끼워 넣어도 잡고, "새끼·시바견"처럼 일상어와 겹치는 단어는 통과
- `lib/time.ts`: 방금 / N분 전 / N시간 전 / 어제 / M월 D일 (KST)
- 컴포넌트
  - `BottomSheet`: 바깥 탭·ESC로 닫힘, 배경 스크롤 잠금
  - `WriteSheet`: 글자 수 카운터, 빠른 문구 3개, 태그 1개(선택), 오류 문구
  - `PostCard`: 공감은 낙관적 반영, 삭제는 확인 시트
  - `PostList`(`/posts`): 최신/공감순, 태그 필터, 지난 글 구분선(흐리게만, 공감은 동작)
  - `HomePosts`(메인 미리보기 3개 + 개수), `WriteButton`(하단 고정), `ConfirmSheet`, `Toast`
- 검증: 두 계정으로 글쓰기 → 1분 제한 429 → 금칙어 400 → 빈 글·201자 400 → 공감·취소 → 공감순 → 태그 필터 → 남의 글 삭제 404 → 내 글 삭제 204, 7시간 전 글은 지난 글로 나오고 30시간 전 글은 안 나옴. 브라우저로 글쓰기 시트 → 토스트 → 목록 → 공감 → 필터 빈 상태 → 삭제 확인을 확인
- 단위 테스트 47개

---

## M7. 신고 + 내 정보 (2026-10-02)

- API
  - `POST /api/posts/[id]/report {reason}`: 사유는 abuse/ad/off_topic/etc(욕설·혐오/광고/날씨와 무관/기타). 204, 중복 409 `ALREADY_REPORTED`, 내 글 403 `OWN_POST`, 없거나 숨겨진 글 404 (R12). 3건이면 트리거가 숨김
  - `PATCH /api/profile {nickname?, dongCode?}`: 30일 안에 다시 바꾸면 409 `NICKNAME_COOLDOWN`(R4, DB 트리거), 중복 409 `NICKNAME_TAKEN`, 없는 동네 400. 동네를 바꾸면 이후 글·투표는 새 동네로(R5)
  - `DELETE /api/account`: admin으로 auth 유저 삭제 → 프로필·글·투표·공감·신고가 cascade로 삭제, 세션 쿠키 제거. 이미 쌓인 `report_count`/숨김은 그대로
- `ReportSheet`: 디자인 06 그대로(라디오 4개, 빨간 신고하기). 신고 후 "🚨 신고가 접수됐어요" 토스트 + 목록 새로고침(3건째면 사라짐). 메인과 `/posts` 모두 연결
- `/me` (디자인 07)
  - 닉네임 카드: "30일에 1회 변경 가능해요 · 다음 변경 M월 D일부터", 기간 중에는 변경 버튼 비활성. 변경은 바텀 시트(형식·중복 확인, 지금 닉네임은 막음)
  - 동네 카드: 바텀 시트에서 `DongPicker` 재사용
  - 내가 쓴 한마디: 기간 제한 없이 최근 100개, 숨겨진 글은 "숨김" 배지와 안내, 삭제 확인 시트
  - 로그아웃 / 회원 탈퇴(확인 시트)
- 메인 헤더의 "📍 동네 ▾"와 👤 → `/me`
- 정리: 닉네임 입력·확인을 `useNicknameCheck` + `NicknameField`로 분리해 온보딩과 같이 씀
- 검증: 4계정으로 잘못된 사유 400 → 신고 204 → 중복 409 → 내 글 403 → 2건까지는 보임 → 3건째 DB `is_hidden=true`, 남에게도 작성자 목록에도 안 보이고 `/me`에만 "숨김"으로 보임 → 숨김 글 공감 404. 닉네임 변경 → 재변경 409 → 동네 변경 후 글·투표가 새 동네로 → 탈퇴 204 후 auth/profile/신고 행 삭제, report_count 유지. 브라우저로 신고 시트·토스트, 닉네임/동네 변경 시트, 로그아웃 후 `/me` 접근 시 로그인으로 이동을 확인

### 이슈와 해결

- 30분 넘게 켜 둔 개발 서버가 백그라운드 시간 제한으로 끊긴 뒤, 프로세스는 남고 출력만 끊겨(EPIPE) 새 라우트가 반영되지 않았음 → 프로세스를 종료하고 다시 실행
- `/me`에서 `Date.now()`를 렌더 중에 부르면 react-hooks/purity 린트 오류 → `nicknameCooldownUntil()` 헬퍼로 이동

---

## M8. 마무리 (2026-10-02)

- 로딩: `loading.tsx`(메인, `/posts`, `/me`)로 화면 전환 중 스켈레톤 표시. 스켈레톤은 `components/Skeletons.tsx`에 모음(메인의 Suspense fallback도 같이 씀)
- 에러
  - `error.tsx`: "잠깐 문제가 생겼어요" + 다시 시도(Next 16의 `retry`) / 처음으로
  - `global-error.tsx`: 루트 레이아웃까지 실패했을 때(인라인 스타일)
  - `not-found.tsx`: "페이지를 찾을 수 없어요" + 홈으로
  - 메인은 날씨·체감·한마디 섹션이 각각 실패해도 그 칸에만 안내 카드가 나오고 나머지는 그대로(한마디가 실패해도 글쓰기 버튼은 남음)
  - `lib/fetcher.ts`: 네트워크 끊김은 "인터넷 연결을 확인해주세요"로 토스트
- 빈 상태 문구는 스펙 §8 그대로(투표 0명, 글 0개, 필터 결과 없음) + 내가 쓴 글 0개
- 배포: `vercel.json`에서 함수 리전을 `icn1`(서울)로 고정. Supabase가 ap-northeast-2(서울)라 기본 리전(미국)이면 DB 왕복마다 태평양을 건넌다. 배포 절차는 README "배포 (Vercel)"
- 검증: 새 테스트 계정으로 온보딩 → 메인 → 투표 → 글쓰기 → 목록 → 내 정보 → 없는 주소 404 를 390px 브라우저로 확인
- 남은 것(완료 기준): Vercel 배포 후 실제 폰 브라우저에서 전체 흐름 확인. 배포 주소가 나오면 Supabase Site URL / Redirect URLs 에 추가해야 카카오 로그인이 배포 주소로 돌아온다

### 실제 폰 확인 목록

- [ ] 카카오 로그인 → 온보딩(현재 위치로 찾기, 검색) → 메인
- [ ] 날씨·시간별 예보 가로 스크롤
- [ ] 체감 투표 / 1시간 안에 바꾸기 / 태그
- [ ] 한마디 쓰기(키보드 올라올 때 시트), 공감, 삭제, 신고
- [ ] `/posts` 정렬·필터, 지난 글
- [ ] `/me` 닉네임·동네 변경, 로그아웃, 다시 로그인

---

## 결정 사항 (스펙 보완, 2026-10-02)

### 기술

| 항목        | 결정                                                   |
| ----------- | ------------------------------------------------------ |
| 라우트 보호 | Next 16 `src/proxy.ts` (스펙의 `middleware.ts`를 대체) |
| 스타일 토큰 | Tailwind v4 `@theme` (`tailwind.config` 없음)          |
| 테스트      | Vitest                                                 |

### 규칙

| 항목          | 결정                                                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| R9/R14        | 1분 제한은 API(429)와 DB 트리거 둘 다에서, 금칙어는 API에서만                                                              |
| R6/R7         | 기준은 `created_at`. 같은 동네에서 투표 후 1시간 안이면 update, `editableUntil = created_at + 1h`. 동네를 바꾸면 새로 투표 |
| profiles 공개 | `public_profiles` view(id, nickname, dong_code)만 공개                                                                     |
| 탈퇴          | 모든 user FK `on delete cascade`, 신고로 숨겨진 상태는 유지                                                                |
| 체감온도      | 11~3월이고 기온 ≤10℃, 풍속 ≥1.3m/s일 때만 겨울 체감온도 공식                                                               |
| 최고/최저     | 당일 02시 발표분에서 TMX/TMN을 가져온다(02:10 전이면 전날 23시 발표분). 없으면 null                                        |

### 디자인(`design.html`) 반영

| 항목           | 결정                                                                  |
| -------------- | --------------------------------------------------------------------- |
| 동네 선택      | 현재 위치 추천 + 자유 검색, 저장 단위는 행정동                        |
| 로그인         | 필수 유지(R1), 로그인 화면 문구는 "카카오 계정으로 간편하게 시작해요" |
| 글쓰기         | "빠른 문구" 칩 3개 추가 (클라이언트에서만 처리)                       |
| 지난 글        | 흐리게만 처리, 공감/신고는 동작                                       |
| 한마디 개수    | 목록 API 응답에 total 추가 (최근 6시간 기준)                          |
| 밤 아이콘      | 18~06시를 밤으로 고정                                                 |
| 시간 표기      | 방금/N분 전/N시간 전 → 어제 → M월 D일                                 |
| 닉네임 안내    | "월 1회" 대신 "30일에 1회"                                            |
| 체감 태그 문구 | rain=비 와요, wind=바람 세요, clear=그쳤어요                          |

## 운영 메모

- Supabase 관리 작업(마이그레이션 적용, Auth 설정)은 `.env.local`의 `SUPABASE_ACCESS_TOKEN`으로 Management API를 호출한다. 작업이 끝나면 토큰을 Revoke한다.
- 카카오 로그인 설정은 README의 "카카오 로그인 (Supabase)" 참고
