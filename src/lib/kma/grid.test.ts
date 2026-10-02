import { describe, expect, it } from "vitest";

import { toGrid } from "./grid";

describe("toGrid", () => {
  it("기준점(38N, 126E)은 (43, 136)", () => {
    expect(toGrid(38, 126)).toEqual({ nx: 43, ny: 136 });
  });

  it("서울시청 → (60, 127)", () => {
    expect(toGrid(37.5665, 126.978)).toEqual({ nx: 60, ny: 127 });
  });

  it("부산시청 → (98, 76)", () => {
    expect(toGrid(35.1798, 129.075)).toEqual({ nx: 98, ny: 76 });
  });

  it("제주시청 → (53, 38)", () => {
    expect(toGrid(33.4996, 126.5312)).toEqual({ nx: 53, ny: 38 });
  });
});
