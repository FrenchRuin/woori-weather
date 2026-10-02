import { describe, expect, it } from "vitest";

import { toPercents } from "./percent";

describe("toPercents", () => {
  it("합이 항상 100", () => {
    expect(toPercents({ cold: 1, good: 1, hot: 1 })).toEqual({
      cold: 34,
      good: 33,
      hot: 33,
    });
  });

  it("디자인 예시: 14/7/2 → 61/30/9", () => {
    expect(toPercents({ cold: 14, good: 7, hot: 2 })).toEqual({
      cold: 61,
      good: 30,
      hot: 9,
    });
  });

  it("전체 0이면 모두 0", () => {
    expect(toPercents({ cold: 0, good: 0, hot: 0 })).toEqual({
      cold: 0,
      good: 0,
      hot: 0,
    });
  });

  it("한쪽만 있으면 100", () => {
    expect(toPercents({ cold: 0, good: 5, hot: 0 })).toEqual({
      cold: 0,
      good: 100,
      hot: 0,
    });
  });
});
