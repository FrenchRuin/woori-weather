import { describe, expect, it } from "vitest";

import { createScrollLock } from "./scrollLock";

describe("createScrollLock", () => {
  it("하나 열고 닫으면 원래 값으로 돌아간다", () => {
    const style = { overflow: "auto" };
    const lock = createScrollLock(style);
    const unlock = lock();
    expect(style.overflow).toBe("hidden");
    unlock();
    expect(style.overflow).toBe("auto");
  });

  it("겹쳐 연 시트가 바깥부터 닫혀도 마지막에 원래 값으로 돌아간다", () => {
    const style = { overflow: "" };
    const lock = createScrollLock(style);
    const outer = lock();
    const inner = lock();
    outer(); // 바깥 시트가 먼저 정리됨 (부모 우선 unmount)
    expect(style.overflow).toBe("hidden");
    inner();
    expect(style.overflow).toBe("");
  });

  it("같은 unlock 을 두 번 불러도 다른 잠금을 풀지 않는다", () => {
    const style = { overflow: "" };
    const lock = createScrollLock(style);
    const a = lock();
    lock();
    a();
    a();
    expect(style.overflow).toBe("hidden");
  });
});
