import { afterEach, describe, expect, it, vi } from "vitest";

import { createKakaoLoader } from "./kakaoMaps";

type FakeScript = { onload: () => void; onerror: () => void };

/** script 를 붙이면 기록만 하고, 테스트가 load/error 를 직접 일으킨다 */
function setup(timeoutMs = 1000) {
  const scripts: FakeScript[] = [];
  let kakao: { maps: { load: (cb: () => void) => void } } | undefined;
  const load = createKakaoLoader({
    appendScript: (onload, onerror) => {
      scripts.push({ onload, onerror });
    },
    getKakao: () => kakao,
    timeoutMs,
  });
  const sdkArrives = () => {
    kakao = { maps: { load: (cb) => cb() } };
  };
  return { load, scripts, sdkArrives };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createKakaoLoader", () => {
  it("스크립트가 로드되면 maps 를 돌려준다", async () => {
    const { load, scripts, sdkArrives } = setup();
    const p = load();
    sdkArrives();
    scripts[0].onload();
    await expect(p).resolves.toHaveProperty("load");
  });

  it("로딩 중이거나 끝난 뒤 다시 부르면 스크립트를 또 붙이지 않는다", async () => {
    const { load, scripts, sdkArrives } = setup();
    const first = load();
    const second = load(); // 로딩 중 재진입
    sdkArrives();
    scripts[0].onload();
    await first;
    await expect(second).resolves.toHaveProperty("load");
    await expect(load()).resolves.toHaveProperty("load"); // 로드 후 재진입
    expect(scripts).toHaveLength(1);
  });

  it("스크립트 에러면 실패하고, 다음 호출은 다시 시도한다", async () => {
    const { load, scripts, sdkArrives } = setup();
    const failed = load();
    scripts[0].onerror();
    await expect(failed).rejects.toThrow();

    const retry = load();
    expect(scripts).toHaveLength(2);
    sdkArrives();
    scripts[1].onload();
    await expect(retry).resolves.toHaveProperty("load");
  });

  it("스크립트는 받았는데 kakao 객체가 없으면(도메인 미등록) 실패", async () => {
    const { load, scripts } = setup();
    const p = load();
    scripts[0].onload();
    await expect(p).rejects.toThrow();
  });

  it("시간 안에 준비되지 않으면 실패", async () => {
    vi.useFakeTimers();
    const { load } = setup(1000);
    const p = load();
    vi.advanceTimersByTime(1000);
    await expect(p).rejects.toThrow();
  });
});
