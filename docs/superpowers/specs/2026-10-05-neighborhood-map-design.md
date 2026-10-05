# 이웃 동네 지도 설계

- 작성일: 2026-10-05
- 상태: 승인 대기
- 관련: `SPEC.md`(R10 최근 글 기준), `docs/WORKLOG.md`(결정 사항)

## 목적

지금은 내 동네 이야기만 볼 수 있다. 지도를 열어 이웃 동네마다 지금 이야기가 몇 개 있는지 한눈에 보고, 궁금한 동네를 눌러 그 동네 한마디를 읽을 수 있게 한다. "옆 동네는 지금 비 오나?" 같은 호기심을 채우는 기능이다.

**성공 기준**: 폰에서 지도를 열면 이웃 동네들의 이야기 수가 보이고, 동네를 누르면 그 동네의 최근 한마디를 바로 읽을 수 있다.

## 정한 것

| 항목        | 결정                                                                            |
| ----------- | ------------------------------------------------------------------------------- |
| 진입        | 메인 헤더 '내 정보' 버튼 옆 동그란 지도 버튼 → `/map`                           |
| 지도        | 카카오맵 JavaScript SDK                                                         |
| 개수 기준   | 최근 6시간(R10의 "최근 글"과 같음), 숨김 글 제외                                |
| 표시 동네   | 개수가 1 이상인 동네 + 내 동네(0개여도 항상 표시, 강조)                         |
| 동네 누르면 | 그 동네 최근 한마디 목록. 공감·신고는 기존 규칙대로 가능                        |
| 하지 않음   | 다른 동네 글쓰기·체감 투표(R5 유지), 다른 동네 체감·날씨, 클러스터링, 영역 조회 |

## 화면

### 메인 헤더

`src/app/page.tsx` 헤더 오른쪽을 버튼 2개로 바꾼다. 지도 버튼은 '내 정보' 버튼과 같은 모양(흰 원, `size-10`)이고 아이콘은 Phosphor `MapTrifold`, `aria-label="이웃 동네 지도"`.

### `/map`

- 지도가 화면 전체(`h-dvh`)를 채운다. 처음 중심은 내 동네 좌표, 동네 단위가 보이는 확대 수준(카카오 level 6 전후, 구현 시 조정)
- 상단 떠 있는 바: 뒤로가기 `‹`(→ `/`) · 제목 "이웃 동네 이야기" · 부제 "최근 6시간"
- 오른쪽 아래 "내 동네로" 버튼: 내 동네 좌표로 이동
- 동네 말풍선(카카오 `CustomOverlay`): 알약 모양 `역삼1동 3`. 흰 바탕 + 하늘색 개수 배지, 내 동네는 하늘색 바탕 + 흰 글씨. 개수가 0인 내 동네는 배지에 `0`
- 이야기가 있는 동네가 하나도 없으면 상단 바 아래에 안내 "아직 이야기가 있는 동네가 없어요"

### 동네 시트

말풍선을 누르면 기존 `BottomSheet`가 열린다.

- 제목: 동네 이름, 부제: "최근 6시간 · N개"
- 목록: 기존 `PostCard`(공감·신고, 내 글이면 삭제). 신고는 기존 `ReportSheet` 사용
- 불러오는 중: 기존 스켈레톤 스타일, 실패: "글을 불러오지 못했어요"
- 0개(내 동네): "아직 한마디가 없어요"

## 데이터

### 처음 열 때 (서버)

`src/app/map/page.tsx`(서버 컴포넌트)가 로그인·프로필을 확인하고(R1, R2) 집계를 직접 불러와 클라이언트 지도 컴포넌트에 props로 넘긴다. 별도 API는 만들지 않는다.

`src/lib/map.ts`

```ts
export type DongPin = {
  code: string;
  name: string;
  lat: number;
  lng: number;
  count: number;
  mine: boolean;
};

/** 최근 6시간 동네별 이야기 수 (순수 함수, 테스트 대상) */
export function countByDong(dongCodes: string[]): Map<string, number>;

/** 집계 + 동네 정보 → 핀 목록 (순수 함수, 테스트 대상) */
export function toDongPins(
  counts: Map<string, number>,
  dongs: { code: string; name: string; lat: number; lng: number }[],
  myDongCode: string,
): DongPin[];

/** 지도에 찍을 동네: count ≥ 1 인 동네 + 내 동네 */
export async function getDongPins(
  supabase: SupabaseClient<Database>,
  myDongCode: string,
): Promise<DongPin[]>;
```

`getDongPins` 순서:

1. `posts`에서 `dong_code`만 조회: `created_at > now - RECENT_HOURS`, `is_hidden = false` (`RECENT_HOURS`는 `lib/posts.ts`의 상수 재사용)
2. `countByDong`으로 집계
3. `dongs`에서 (집계된 동네 ∪ 내 동네)의 `code, name, lat, lng` 조회
4. `toDongPins`로 합친다. 내 동네는 `mine: true`, 집계에 없으면 `count: 0`

### 동네를 누르면 (클라이언트)

기존 `GET /api/posts?dong={code}&scope=recent&sort=new`를 그대로 쓴다. 새 API 없음.

### 카카오맵 SDK

- 키: `NEXT_PUBLIC_KAKAO_JS_KEY` (`.env.example`, `.env.local`, Vercel 환경변수에 추가)
- 로드: `next/script`로 `https://dapi.kakao.com/v2/maps/sdk.js?appkey=…&autoload=false` → `kakao.maps.load(callback)`
- 타입: 쓰는 API만 최소 타입 선언(`src/types/kakao.d.ts`)
- 카카오 개발자 콘솔(사용자가 직접): 같은 앱의 JavaScript 키 확인, 플랫폼 → Web에 `http://localhost:3000`, `https://woori-weather.vercel.app` 등록

### 규모 한계

Supabase는 한 번에 기본 1000행까지만 돌려준다. 최근 6시간 글이 1000개를 넘으면 개수가 덜 세진다. 그때는 SQL 함수(RPC)로 DB에서 `group by` 집계하도록 바꾼다(마이그레이션 필요). 데모 규모에서는 해당 없음.

## 에러 처리

| 상황                                      | 처리                                                   |
| ----------------------------------------- | ------------------------------------------------------ |
| JS 키 없음 / SDK 로드 실패(도메인 미등록) | 지도 자리에 "지도를 불러오지 못했어요" + 뒤로가기 버튼 |
| 집계 조회 실패(서버)                      | 기존 `error.tsx`                                       |
| 시트의 글 목록 실패                       | 시트 안에 "글을 불러오지 못했어요"                     |

## 테스트

- 단위(`src/lib/map.test.ts`): `countByDong` 집계, `toDongPins`의 내 동네 포함·`mine`·0개 처리
- 직접 확인: 로컬에서 동네가 다른 두 계정으로 글 작성 → 지도 개수, 말풍선 강조, 시트 목록·공감 확인. 배포 후 폰에서 확인
- lint / typecheck / build 통과

## 바뀌는 파일

- 새로: `src/app/map/page.tsx`, `src/app/map/loading.tsx`, `src/components/DongMap.tsx`(클라이언트, SDK·말풍선), `src/components/DongPostsSheet.tsx`, `src/lib/map.ts`, `src/lib/map.test.ts`, `src/types/kakao.d.ts`
- 수정: `src/app/page.tsx`(지도 버튼), `src/components/icons.ts`(`MapTrifold`), `.env.example`, `README.md`(카카오 JS 키·도메인 등록 안내), `docs/WORKLOG.md`(결정 사항)
