# 이웃 동네 지도 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/map`에서 카카오맵 위에 이웃 동네별 최근 6시간 이야기 수를 보여주고, 동네를 누르면 그 동네 한마디를 바텀시트로 읽게 한다.

**Architecture:** `/map` 서버 컴포넌트가 최근 6시간 글의 `dong_code`를 모아 동네별로 세고(`lib/map.ts` → 순수 함수 `lib/dongPins.ts`), 결과 `DongPin[]`을 클라이언트 `DongMap`에 넘긴다. `DongMap`은 카카오맵 SDK를 `next/script`로 불러 `CustomOverlay` 말풍선을 찍고, 누르면 `DongPostsSheet`가 기존 `GET /api/posts`로 글을 불러온다. 새 API·마이그레이션 없음.

**Tech Stack:** Next.js 16.3 (App Router), React 19, Tailwind v4, Supabase, Vitest, 카카오맵 JavaScript SDK, Phosphor 아이콘

**Spec:** `docs/superpowers/specs/2026-10-05-neighborhood-map-design.md`

## Global Constraints

- 개수 기준: 최근 6시간(`RECENT_HOURS` from `src/lib/posts.ts`), `is_hidden = false`
- 표시 동네: count ≥ 1 인 동네 + 내 동네(0개여도 항상, `mine: true`로 강조)
- 다른 동네 글쓰기·체감 투표 없음(R5). 시트의 공감·신고·내 글 삭제는 기존 `PostCard` 규칙 그대로
- 카카오 키 환경변수 이름: `NEXT_PUBLIC_KAKAO_JS_KEY`
- 화면 문구(그대로 사용): 제목 "이웃 동네 이야기", 부제 "최근 6시간", 버튼 "내 동네로", 빈 상태 "아직 이야기가 있는 동네가 없어요", SDK 실패 "지도를 불러오지 못했어요", 시트 실패 "글을 불러오지 못했어요", 시트 0개 "아직 한마디가 없어요", 시트 부제 "최근 6시간 · N개", 지도 버튼 `aria-label="이웃 동네 지도"`
- 스펙과 다른 점 1가지: 순수 함수(`countByDong`, `toDongPins`, `DongPin` 타입)는 `src/lib/dongPins.ts`에 둔다. `src/lib/posts.ts`가 `import "server-only"`라 같은 파일에 두면 Vitest(node 환경)에서 import 할 수 없기 때문. `src/lib/map.ts`는 서버 전용 조회만 담당
- 저장소 규칙: 소스 파일 줄바꿈은 CRLF(작업 전 상태와 같게), `pnpm prettier --write <바꾼 파일>`만 실행(`src` 전체에 돌리지 않는다), 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 사용자 직접 작업(코드 아님): 카카오 개발자 콘솔에서 JavaScript 키 확인, 플랫폼 → Web 에 `http://localhost:3000`, `https://woori-weather.vercel.app` 등록, `.env.local`과 Vercel 환경변수에 `NEXT_PUBLIC_KAKAO_JS_KEY` 추가

## Review Focus

- 동네 이름을 `innerHTML`로 넣으면 HTML이 해석된다 → 말풍선 DOM은 `textContent`로만 채운다 (Task 2 Step 4에서 `<b>` 이름으로 확인)
- 시트가 열린 상태에서 다른 동네를 빠르게 누르면 이전 동네 응답이 늦게 도착해 섞일 수 있다 → 동네 코드가 바뀌면 이전 요청을 abort (Task 3 Step 3에서 확인)
- `/map` → 뒤로 → 다시 `/map`: 스크립트는 이미 로드돼 있다 → `onReady`로 다시 그리고 말풍선이 중복되지 않아야 한다 (Task 2 Step 4에서 확인)
- 키가 없거나 도메인이 등록 안 되면 무한 로딩이 아니라 "지도를 불러오지 못했어요"가 보여야 한다 (Task 2 Step 4에서 키를 비우고 확인)
- 시트에서 신고로 글이 숨겨지거나 내 글을 삭제하면 시트 목록에서 빠져야 한다. 지도 숫자는 새로 열 때 갱신(의도된 동작) (Task 4 Step 5에서 확인)

---

## File Structure

| 파일                                                  | 책임                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `src/lib/dongPins.ts` (새로)                          | `DongPin` 타입, `countByDong`, `toDongPins` 순수 함수              |
| `src/lib/dongPins.test.ts` (새로)                     | 위 순수 함수 단위 테스트                                           |
| `src/lib/map.ts` (새로)                               | 서버 전용 `getDongPins` (Supabase 조회 2번 + 순수 함수)            |
| `src/types/kakao.d.ts` (새로)                         | 쓰는 카카오맵 API 최소 타입                                        |
| `src/components/DongMap.tsx` (새로)                   | SDK 로드, 지도·말풍선, 상단 바, 내 동네로, 빈/실패 상태, 시트 열기 |
| `src/components/DongPostsSheet.tsx` (새로)            | 선택한 동네 글 목록 시트 (+ 신고 시트)                             |
| `src/app/map/page.tsx` (새로)                         | 인증·프로필 확인 후 `getDongPins` → `DongMap`                      |
| `src/app/map/loading.tsx` (새로)                      | 로딩 자리 표시                                                     |
| `src/components/icons.ts` (수정)                      | `MapTrifold`, `Crosshair` 추가                                     |
| `src/app/page.tsx` (수정)                             | 헤더에 지도 버튼                                                   |
| `.env.example`, `README.md`, `docs/WORKLOG.md` (수정) | 키·도메인 등록 안내, 진행 기록                                     |

---

### Task 1: 동네별 집계 순수 함수

**Files:**

- Create: `src/lib/dongPins.ts`
- Test: `src/lib/dongPins.test.ts`

**Interfaces:**

- Consumes: 없음
- Produces:
  - `export type DongPin = { code: string; name: string; lat: number; lng: number; count: number; mine: boolean }`
  - `export type DongRow = { code: string; name: string; lat: number; lng: number }`
  - `export function countByDong(dongCodes: string[]): Map<string, number>`
  - `export function toDongPins(counts: Map<string, number>, dongs: DongRow[], myDongCode: string): DongPin[]`

- [ ] **Step 1: Write the failing test**

`src/lib/dongPins.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { countByDong, toDongPins } from "./dongPins";

const row = (code: string, name: string) => ({
  code,
  name,
  lat: 37.5,
  lng: 127,
});

describe("countByDong", () => {
  it("동네 코드별 개수를 센다", () => {
    const counts = countByDong(["A", "B", "A", "A"]);
    expect(counts.get("A")).toBe(3);
    expect(counts.get("B")).toBe(1);
    expect(counts.size).toBe(2);
  });

  it("빈 목록이면 빈 Map", () => {
    expect(countByDong([]).size).toBe(0);
  });
});

describe("toDongPins", () => {
  const dongs = [
    row("A", "역삼1동"),
    row("B", "역삼2동"),
    row("ME", "삼성1동"),
  ];

  it("개수가 있는 동네와 내 동네만 남긴다", () => {
    const pins = toDongPins(new Map([["A", 2]]), dongs, "ME");
    expect(pins.map((p) => p.code).sort()).toEqual(["A", "ME"]);
  });

  it("내 동네는 개수가 없어도 count 0, mine true", () => {
    const pins = toDongPins(new Map([["A", 2]]), dongs, "ME");
    expect(pins.find((p) => p.code === "ME")).toEqual({
      ...row("ME", "삼성1동"),
      count: 0,
      mine: true,
    });
  });

  it("내 동네에 글이 있으면 그 개수, 다른 동네는 mine false", () => {
    const pins = toDongPins(
      new Map([
        ["ME", 4],
        ["B", 1],
      ]),
      dongs,
      "ME",
    );
    expect(pins.find((p) => p.code === "ME")?.count).toBe(4);
    expect(pins.find((p) => p.code === "B")).toEqual({
      ...row("B", "역삼2동"),
      count: 1,
      mine: false,
    });
  });

  it("아무 글이 없으면 내 동네 하나만", () => {
    const pins = toDongPins(new Map(), dongs, "ME");
    expect(pins).toHaveLength(1);
    expect(pins[0].mine).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/dongPins.test.ts`
Expected: FAIL — `Failed to resolve import "./dongPins"`

- [ ] **Step 3: Write minimal implementation**

`src/lib/dongPins.ts`

```ts
/** 지도에 찍을 동네 하나 */
export type DongPin = {
  code: string;
  name: string;
  lat: number;
  lng: number;
  count: number; // 최근 6시간 이야기 수
  mine: boolean;
};

export type DongRow = { code: string; name: string; lat: number; lng: number };

/** 글의 동네 코드 목록 → 동네별 개수 */
export function countByDong(dongCodes: string[]) {
  const counts = new Map<string, number>();
  for (const code of dongCodes) counts.set(code, (counts.get(code) ?? 0) + 1);
  return counts;
}

/** 개수가 있는 동네 + 내 동네(0개여도 항상) */
export function toDongPins(
  counts: Map<string, number>,
  dongs: DongRow[],
  myDongCode: string,
): DongPin[] {
  return dongs
    .filter((d) => d.code === myDongCode || (counts.get(d.code) ?? 0) > 0)
    .map((d) => ({
      code: d.code,
      name: d.name,
      lat: d.lat,
      lng: d.lng,
      count: counts.get(d.code) ?? 0,
      mine: d.code === myDongCode,
    }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/dongPins.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
pnpm prettier --write src/lib/dongPins.ts src/lib/dongPins.test.ts
git add src/lib/dongPins.ts src/lib/dongPins.test.ts
git commit -m "feat(map): 동네별 이야기 수 집계 함수"
```

---

### Task 2: 카카오맵 지도 컴포넌트

**Files:**

- Create: `src/types/kakao.d.ts`, `src/components/DongMap.tsx`
- Modify: `src/components/icons.ts`, `.env.example`, `README.md`
- Temporary (Step 4 확인 후 삭제): `src/app/login/map-preview-tmp/page.tsx`

**Interfaces:**

- Consumes: `DongPin` from `@/lib/dongPins`
- Produces: `export function DongMap({ pins }: { pins: DongPin[] })` — Task 4의 페이지가 렌더한다. Task 3 전까지는 시트 없이 `selected` 상태만 둔다

- [ ] **Step 1: 카카오맵 타입과 아이콘 추가**

`src/types/kakao.d.ts`

```ts
// 카카오맵 JavaScript SDK 중 이 앱이 쓰는 부분만 (https://apis.map.kakao.com/web/documentation/)
declare namespace kakao.maps {
  function load(callback: () => void): void;

  class LatLng {
    constructor(lat: number, lng: number);
  }

  class Map {
    constructor(
      container: HTMLElement,
      options: { center: LatLng; level: number },
    );
    panTo(latlng: LatLng): void;
  }

  class CustomOverlay {
    constructor(options: {
      position: LatLng;
      content: HTMLElement;
      map?: Map;
      xAnchor?: number;
      yAnchor?: number;
      zIndex?: number;
      clickable?: boolean;
    });
    setMap(map: Map | null): void;
  }
}

interface Window {
  kakao?: { maps: typeof kakao.maps };
}
```

`src/components/icons.ts`에 알파벳 순서 자리에 두 줄 추가:

```ts
export { Crosshair } from "@phosphor-icons/react/dist/ssr/Crosshair";
export { MapTrifold } from "@phosphor-icons/react/dist/ssr/MapTrifold";
```

- [ ] **Step 2: DongMap 작성**

`src/components/DongMap.tsx`

```tsx
"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import type { DongPin } from "@/lib/dongPins";

import { Crosshair } from "./icons";

const KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
const SDK_URL = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false`;
const LEVEL = 6; // 동네 이름이 겹치지 않고 주변 동네가 보이는 정도
const FALLBACK = { lat: 37.5665, lng: 126.978 }; // 내 동네 좌표가 없을 때(서울시청)

type Props = { pins: DongPin[] };

/** 이웃 동네 지도: 동네마다 최근 6시간 이야기 수 말풍선 */
export function DongMap({ pins }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [failed, setFailed] = useState(!KEY);
  const [selected, setSelected] = useState<DongPin | null>(null);

  const home = pins.find((p) => p.mine) ?? FALLBACK;
  const empty = pins.every((p) => p.count === 0);

  useEffect(() => {
    const container = containerRef.current;
    const maps = window.kakao?.maps;
    if (!sdkReady || !container || !maps) return;

    const map = new maps.Map(container, {
      center: new maps.LatLng(home.lat, home.lng),
      level: LEVEL,
    });
    mapRef.current = map;
    const overlays = pins.map(
      (pin) =>
        new maps.CustomOverlay({
          position: new maps.LatLng(pin.lat, pin.lng),
          content: pinElement(pin, () => setSelected(pin)),
          yAnchor: 0.5,
          zIndex: pin.mine ? 2 : 1,
          clickable: true,
          map,
        }),
    );
    return () => {
      overlays.forEach((o) => o.setMap(null));
      mapRef.current = null;
      container.replaceChildren(); // 다시 그릴 때 지도 DOM 이 쌓이지 않게
    };
  }, [sdkReady, pins, home.lat, home.lng]);

  function goHome() {
    const maps = window.kakao?.maps;
    if (maps) mapRef.current?.panTo(new maps.LatLng(home.lat, home.lng));
  }

  return (
    <main className="relative h-dvh overflow-hidden bg-[#E3EEF6]">
      {KEY && (
        <Script
          src={SDK_URL}
          strategy="afterInteractive"
          onReady={() => {
            // 도메인이 등록되지 않으면 스크립트는 받아져도 kakao 객체가 없다
            if (!window.kakao?.maps) setFailed(true);
            else window.kakao.maps.load(() => setSdkReady(true));
          }}
          onError={() => setFailed(true)}
        />
      )}

      <div ref={containerRef} className="absolute inset-0" />

      <header className="absolute inset-x-3 top-3 z-10 flex items-center gap-1 rounded-2xl bg-white/95 py-1.5 pr-4 pl-1 shadow-[0_6px_16px_rgba(23,50,74,.12)]">
        <Link
          href="/"
          aria-label="뒤로"
          className="flex size-10 items-center justify-center text-[26px]"
        >
          ‹
        </Link>
        <div className="flex flex-col">
          <h1 className="text-[17px] font-bold">이웃 동네 이야기</h1>
          <span className="text-xs text-[#6B8299]">최근 6시간</span>
        </div>
      </header>

      {failed ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-canvas px-8 text-center">
          <p className="text-[15px] font-semibold text-[#3B5A75]">
            지도를 불러오지 못했어요
          </p>
          <Link
            href="/"
            className="flex h-12 w-full max-w-60 items-center justify-center rounded-[14px] bg-primary text-base font-bold text-white"
          >
            뒤로 가기
          </Link>
        </div>
      ) : (
        <>
          {empty && (
            <p className="absolute inset-x-3 top-20 z-10 rounded-xl bg-ink/85 px-4 py-2.5 text-center text-sm font-semibold text-white">
              아직 이야기가 있는 동네가 없어요
            </p>
          )}
          <button
            type="button"
            onClick={goHome}
            className="absolute right-4 bottom-[calc(24px+env(safe-area-inset-bottom))] z-10 flex h-11 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-ink shadow-[0_6px_16px_rgba(23,50,74,.18)]"
          >
            <Crosshair
              size={18}
              weight="bold"
              className="text-primary"
              aria-hidden
            />
            내 동네로
          </button>
        </>
      )}
    </main>
  );
}

/** 말풍선 DOM. 동네 이름은 textContent 로만 넣는다 (HTML 해석 금지) */
function pinElement(pin: DongPin, onClick: () => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", `${pin.name} 이야기 ${pin.count}개`);
  button.className = `flex items-center gap-1.5 rounded-full py-1.5 pr-1.5 pl-3 text-sm font-bold whitespace-nowrap shadow-[0_4px_12px_rgba(23,50,74,.18)] ${pin.mine ? "bg-primary text-white" : "bg-white text-ink"}`;

  const name = document.createElement("span");
  name.textContent = pin.name;
  const badge = document.createElement("span");
  badge.className = `min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-extrabold ${pin.mine ? "bg-white text-primary-strong" : "bg-primary text-white"}`;
  badge.textContent = String(pin.count);

  button.append(name, badge);
  button.addEventListener("click", onClick);
  return button;
}
```

`selected`는 Task 3에서 시트에 연결한다. 이 Task에서는 lint의 미사용 경고를 피하려고 `const [, setSelected]` 대신 그대로 두고, Task 3에서 사용한다. lint가 `selected` 미사용으로 실패하면 이 Task에서만 `void selected;`를 `goHome` 아래에 두고 Task 3에서 지운다.

- [ ] **Step 3: 환경변수·README 안내**

`.env.example` 끝에 추가:

```
NEXT_PUBLIC_KAKAO_JS_KEY=         # 카카오맵 JavaScript 키 (브라우저 노출, 카카오 콘솔에 Web 도메인 등록 필요)
```

`README.md` "환경 변수" 표에 행 추가:

```
| `NEXT_PUBLIC_KAKAO_JS_KEY`                                  | 카카오맵 JavaScript 키. 브라우저 노출 |
```

`README.md` "배포 (Vercel)" 2번 문장의 "5개"를 "6개"로 바꾸고, 5번 항목을 아래로 바꾼다:

```
5. 카카오 디벨로퍼스: 로그인 Redirect URI 가 Supabase 주소라 바꿀 필요 없음. 지도용으로 앱 설정 → 플랫폼 → Web 사이트 도메인에 `http://localhost:3000`, `https://<배포 주소>` 등록 (`NEXT_PUBLIC_KAKAO_JS_KEY` 는 빌드 때 들어가므로 Vercel 에 추가한 뒤 재배포)
```

- [ ] **Step 4: 임시 미리보기로 직접 확인**

`/map`(Task 4)이 아직 없으므로, 로그인 없이 열리는 `/login` 아래에 임시 페이지를 만든다(`proxy.ts`가 `/login/*`를 공개 경로로 둔다). 좌표는 서울 강남 실제 동네 근처 값.

`src/app/login/map-preview-tmp/page.tsx`

```tsx
// 임시 미리보기 (확인 후 삭제)
import { DongMap } from "@/components/DongMap";

export default function Preview() {
  return (
    <DongMap
      pins={[
        {
          code: "ME",
          name: "역삼1동",
          lat: 37.4955,
          lng: 127.0331,
          count: 0,
          mine: true,
        },
        {
          code: "A",
          name: "역삼2동",
          lat: 37.4957,
          lng: 127.0463,
          count: 3,
          mine: false,
        },
        {
          code: "B",
          name: "<b>논현1동</b>",
          lat: 37.5113,
          lng: 127.0285,
          count: 12,
          mine: false,
        },
      ]}
    />
  );
}
```

Run: `pnpm dev` 후 브라우저(390×844)로 `http://localhost:3000/login/map-preview-tmp`

Expected:

- 역삼1동이 가운데, 하늘색 말풍선 `역삼1동 0`. 나머지는 흰 말풍선 + 하늘색 배지
- 세 번째 말풍선 이름이 굵은 글씨가 아니라 문자 그대로 `<b>논현1동</b>`로 보인다 (textContent 확인)
- 지도를 끌어 옮긴 뒤 "내 동네로"를 누르면 역삼1동으로 돌아온다
- 다른 주소(`/login`)로 갔다가 브라우저 뒤로가기로 돌아와도 말풍선이 3개만 있다(중복 없음)
- `.env.local`의 `NEXT_PUBLIC_KAKAO_JS_KEY`를 잠시 빈 값으로 두고 dev 서버를 재시작 → "지도를 불러오지 못했어요" + "뒤로 가기". 확인 후 원래 값으로 되돌린다
- 이 시점의 빈 상태 안내는 count가 모두 0일 때만 나온다(위 데이터에서는 안 나옴)

확인이 끝나면 임시 페이지를 지운다:

```bash
rm -rf src/app/login/map-preview-tmp
```

- [ ] **Step 5: 검사 후 커밋**

```bash
pnpm prettier --write src/types/kakao.d.ts src/components/DongMap.tsx src/components/icons.ts README.md
pnpm tsc --noEmit && pnpm eslint src
git add src/types/kakao.d.ts src/components/DongMap.tsx src/components/icons.ts .env.example README.md
git commit -m "feat(map): 카카오맵 동네 지도 컴포넌트"
```

Expected: tsc·eslint 에러 없음

---

### Task 3: 동네 글 시트

**Files:**

- Create: `src/components/DongPostsSheet.tsx`
- Modify: `src/components/DongMap.tsx`

**Interfaces:**

- Consumes: `DongPin` from `@/lib/dongPins`, 기존 `BottomSheet`(`open, onClose, label, children`), `PostCard`(`post, onDeleted?, onReport?`), `ReportSheet`(`post, onClose, onReported`), `PostsSkeleton({ count })`, `Emoji`(`name="memo"`), `api<T>(url, init)`
- Produces: `export function DongPostsSheet({ dong, onClose }: { dong: DongPin | null; onClose: () => void })` — `dong`이 null이면 닫힘

- [ ] **Step 1: DongPostsSheet 작성**

`src/components/DongPostsSheet.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";

import type { DongPin } from "@/lib/dongPins";
import { api } from "@/lib/fetcher";
import type { Post } from "@/types";

import { BottomSheet } from "./BottomSheet";
import { Emoji } from "./Emoji";
import { PostCard } from "./PostCard";
import { ReportSheet } from "./ReportSheet";
import { PostsSkeleton } from "./Skeletons";

type Props = {
  dong: DongPin | null; // null 이면 닫힘
  onClose: () => void;
};

/** 지도에서 고른 동네의 최근 6시간 한마디 (읽기 + 공감·신고) */
export function DongPostsSheet({ dong, onClose }: Props) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0); // 신고 후 다시 불러오기
  const [reporting, setReporting] = useState<Post | null>(null);
  const code = dong?.code;

  useEffect(() => {
    if (!code) return;
    // 다른 동네를 누르면 이전 요청은 버린다
    const controller = new AbortController();
    setPosts(null);
    setFailed(false);
    api<Post[]>(
      `/api/posts?${new URLSearchParams({ dong: code, scope: "recent", sort: "new" })}`,
      { signal: controller.signal },
    )
      .then(setPosts)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [code, version]);

  const count = posts?.length ?? dong?.count ?? 0;

  return (
    <>
      <BottomSheet
        open={dong !== null}
        onClose={onClose}
        label={`${dong?.name ?? ""} 한마디`}
      >
        <div className="flex flex-col gap-1">
          <b className="text-xl">{dong?.name}</b>
          <span className="text-sm text-[#6B8299]">최근 6시간 · {count}개</span>
        </div>

        {failed ? (
          <p className="rounded-[18px] bg-canvas px-4 py-6 text-center text-sm text-danger">
            글을 불러오지 못했어요
          </p>
        ) : posts === null ? (
          <PostsSkeleton count={2} />
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[18px] bg-canvas px-4 py-7 text-center">
            <Emoji name="memo" size={48} />
            <p className="text-[15px] text-[#3B5A75]">아직 한마디가 없어요</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDeleted={(id) =>
                  setPosts((list) => list?.filter((p) => p.id !== id) ?? null)
                }
                onReport={setReporting}
              />
            ))}
          </div>
        )}
      </BottomSheet>

      {/* 시트 위에 겹쳐 열리도록 뒤에 둔다 */}
      <ReportSheet
        post={reporting}
        onClose={() => setReporting(null)}
        onReported={() => {
          setReporting(null);
          setVersion((v) => v + 1); // 3건 누적으로 숨겨졌으면 목록에서 빠진다
        }}
      />
    </>
  );
}
```

시트 배경은 흰색이라 `PostCard`(흰 카드)가 묻히지 않도록, 목록 래퍼에 배경을 주지 않고 카드 테두리가 필요하면 Step 3에서 눈으로 보고 `PostCard`를 감싸는 `div`에 `[&>article]:border [&>article]:border-[#E6EEF5]`를 추가한다.

- [ ] **Step 2: DongMap에 시트 연결**

`src/components/DongMap.tsx`

import 추가:

```tsx
import { DongPostsSheet } from "./DongPostsSheet";
```

`</main>` 바로 위에 추가(Task 2에서 `void selected;`를 넣었다면 지운다):

```tsx
<DongPostsSheet dong={selected} onClose={() => setSelected(null)} />
```

- [ ] **Step 3: 직접 확인**

Task 2 Step 4의 임시 페이지를 다시 만들되, 핀 코드를 실제 DB의 동네 코드로 바꾼다(`/api/posts`가 10자리 코드를 검사한다). 실제 코드는 로그인한 상태에서 내 정보(`/me`) 또는 Supabase `dongs` 테이블에서 확인한다. 로그인한 브라우저로 연다(`/api/posts`는 로그인 필요).

Expected:

- 말풍선을 누르면 시트가 열리고 제목·"최근 6시간 · N개"·글 목록이 보인다
- 글이 없는 동네는 "아직 한마디가 없어요"
- 시트를 닫고 다른 동네를 바로 누르면 그 동네 글만 보인다(이전 동네 글이 잠깐이라도 섞이지 않음. 개발자도구 Network를 Slow 3G로 두고 두 동네를 연달아 눌러 확인)
- 공감 토글, 남의 글 신고 시트 열림·제출, 내 글 삭제 후 목록에서 빠짐
- 확인 후 임시 페이지 삭제: `rm -rf src/app/login/map-preview-tmp`

- [ ] **Step 4: 검사 후 커밋**

```bash
pnpm prettier --write src/components/DongPostsSheet.tsx src/components/DongMap.tsx
pnpm tsc --noEmit && pnpm eslint src
git add src/components/DongPostsSheet.tsx src/components/DongMap.tsx
git commit -m "feat(map): 동네를 누르면 한마디 시트"
```

---

### Task 4: `/map` 페이지와 메인 지도 버튼

**Files:**

- Create: `src/lib/map.ts`, `src/app/map/page.tsx`, `src/app/map/loading.tsx`
- Modify: `src/app/page.tsx:42-48` (헤더 오른쪽), `docs/WORKLOG.md`

**Interfaces:**

- Consumes: `countByDong`, `toDongPins`, `DongPin` from `@/lib/dongPins`; `RECENT_HOURS` from `@/lib/posts`; `getMyProfile(supabase, userId)`; `createClient()` from `@/lib/supabase/server`; `DongMap({ pins })`; `MapTrifold` from `@/components/icons`
- Produces: `export async function getDongPins(supabase: SupabaseClient<Database>, myDongCode: string): Promise<DongPin[]>`, 라우트 `/map`

- [ ] **Step 1: 서버 조회 함수**

`src/lib/map.ts`

```ts
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { countByDong, type DongPin, toDongPins } from "./dongPins";
import { RECENT_HOURS } from "./posts";

/**
 * 지도에 찍을 동네 (최근 6시간 이야기 수).
 * 한 번에 기본 1000행까지만 오므로, 최근 글이 그보다 많아지면 DB 함수(group by)로 바꾼다.
 */
export async function getDongPins(
  supabase: SupabaseClient<Database>,
  myDongCode: string,
): Promise<DongPin[]> {
  const recentFrom = new Date(
    Date.now() - RECENT_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("dong_code")
    .eq("is_hidden", false)
    .gt("created_at", recentFrom);
  if (error) throw error;

  const counts = countByDong(posts.map((p) => p.dong_code));
  const codes = [...new Set([...counts.keys(), myDongCode])];

  const { data: dongs, error: dongsError } = await supabase
    .from("dongs")
    .select("code, name, lat, lng")
    .in("code", codes);
  if (dongsError) throw dongsError;

  return toDongPins(counts, dongs, myDongCode);
}
```

- [ ] **Step 2: 페이지와 로딩**

`src/app/map/page.tsx`

```tsx
import { redirect } from "next/navigation";

import { DongMap } from "@/components/DongMap";
import { getDongPins } from "@/lib/map";
import { getMyProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function MapPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login");

  const profile = await getMyProfile(supabase, userId);
  if (!profile) redirect("/onboarding");

  const pins = await getDongPins(supabase, profile.dong.code);
  return <DongMap pins={pins} />;
}
```

`src/app/map/loading.tsx`

```tsx
export default function Loading() {
  return <main className="h-dvh animate-pulse bg-[#E3EEF6]" aria-busy />;
}
```

- [ ] **Step 3: 메인 헤더에 지도 버튼**

`src/app/page.tsx` import 줄을 바꾼다:

```tsx
import { MapPin, MapTrifold, User } from "@/components/icons";
```

헤더의 '내 정보' `Link` 하나를 아래 `div`로 감싼다:

```tsx
<div className="flex gap-2">
  <Link
    href="/map"
    aria-label="이웃 동네 지도"
    className="flex size-10 items-center justify-center rounded-full bg-white text-ink"
  >
    <MapTrifold size={22} aria-hidden />
  </Link>
  <Link
    href="/me"
    aria-label="내 정보"
    className="flex size-10 items-center justify-center rounded-full bg-white text-ink"
  >
    <User size={22} aria-hidden />
  </Link>
</div>
```

- [ ] **Step 4: 전체 검사**

```bash
pnpm prettier --write src/lib/map.ts src/app/map/page.tsx src/app/map/loading.tsx src/app/page.tsx
pnpm tsc --noEmit && pnpm eslint src && pnpm vitest run && pnpm build
```

Expected: 에러 없음, 테스트 전부 통과(기존 60 + 새 6), 빌드 출력에 `ƒ /map`

- [ ] **Step 5: 실제 데이터로 직접 확인 (로컬)**

`pnpm dev` → 로그인 → 메인.

Expected:

- 헤더 오른쪽에 지도·내 정보 버튼 2개, 지도 버튼 → `/map`
- 내 동네가 가운데 하늘색 말풍선, 개수가 메인 "동네 한마디 · N개"와 같다
- 동네가 다른 두 번째 계정(시크릿 창)으로 한마디 작성 → 첫 계정에서 `/map` 새로 열면 그 동네 말풍선이 나타나고 개수 1
- 그 말풍선 → 시트에 방금 쓴 글, 공감 가능, 글쓰기 버튼 없음
- 시트에서 내 글 삭제 → 시트에서 빠짐. `/map`을 다시 열면 개수도 줄어 있음
- 최근 6시간 글이 전혀 없는 상태라면 "아직 이야기가 있는 동네가 없어요"와 내 동네 `0`

- [ ] **Step 6: WORKLOG 기록 후 커밋**

`docs/WORKLOG.md` 진행 현황 표 아래 "다음 세션에서 이어서 할 일" 앞에 섹션 추가하지 말고, 맨 아래 "운영 메모" 앞에 다음 섹션을 추가한다:

```markdown
## 추가: 이웃 동네 지도 (2026-10-05)

- `/map`: 카카오맵 위에 동네별 최근 6시간 이야기 수 말풍선, 내 동네 강조, 누르면 그 동네 한마디 시트(공감·신고 가능, 글쓰기 없음)
- 집계는 서버에서 `posts.dong_code` 를 모아 셈(`lib/map.ts` → `lib/dongPins.ts`). 새 API·마이그레이션 없음. 최근 글이 1000개를 넘으면 DB 함수로 전환
- 환경 변수 `NEXT_PUBLIC_KAKAO_JS_KEY` 추가, 카카오 콘솔 Web 도메인 등록 필요
- 검증: 단위 테스트(집계), 로컬 2계정으로 개수·시트 확인
```

```bash
pnpm prettier --write docs/WORKLOG.md
git add src/lib/map.ts src/app/map src/app/page.tsx docs/WORKLOG.md
git commit -m "feat(map): /map 페이지와 메인 지도 버튼"
```

- [ ] **Step 7: 배포 (사용자 확인 후)**

push 전에 사용자에게 확인한다: Vercel 환경변수에 `NEXT_PUBLIC_KAKAO_JS_KEY`가 들어갔는지, 카카오 콘솔에 `https://woori-weather.vercel.app`이 등록됐는지. 둘 다 됐으면:

```bash
git push
```

Expected: Vercel 자동 배포 후 폰에서 `https://woori-weather.vercel.app/map` 지도와 말풍선이 보인다
