import { describe, expect, it } from "vitest";

import { feelsLike } from "./feelsLike";

describe("feelsLike", () => {
  it("겨울 + 추위 + 바람이면 풍랭 공식 (0℃, 5m/s → 약 -4.9℃)", () => {
    expect(feelsLike(0, 5, 1)).toBe(-4.9);
  });

  it("바람이 약하면(1.3m/s 미만) 기온 그대로", () => {
    expect(feelsLike(0, 1.2, 1)).toBe(0);
  });

  it("10℃ 초과면 기온 그대로", () => {
    expect(feelsLike(12, 8, 12)).toBe(12);
  });

  it("겨울이 아니면(4~10월) 기온 그대로", () => {
    expect(feelsLike(5, 8, 10)).toBe(5);
  });

  it("11월, 3월은 겨울", () => {
    expect(feelsLike(5, 5, 11)).toBeLessThan(5);
    expect(feelsLike(5, 5, 3)).toBeLessThan(5);
  });
});
