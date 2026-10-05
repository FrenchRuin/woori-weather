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
