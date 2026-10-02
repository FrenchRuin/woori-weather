import { describe, expect, it } from "vitest";

import {
  kstDate,
  todayMinMaxBase,
  ultraSrtFcstBase,
  ultraSrtNcstBase,
  vilageFcstBase,
} from "./baseTime";

/** KST 시각으로 Date 만들기 */
const kst = (s: string) => new Date(`${s}+09:00`);

describe("ultraSrtNcstBase (초단기실황, 정각 발표 + 40분)", () => {
  it("40분 이후면 이번 정각", () => {
    expect(ultraSrtNcstBase(kst("2026-10-02T15:40:00"))).toEqual({
      baseDate: "20261002",
      baseTime: "1500",
    });
  });
  it("40분 전이면 1시간 전", () => {
    expect(ultraSrtNcstBase(kst("2026-10-02T15:39:59"))).toEqual({
      baseDate: "20261002",
      baseTime: "1400",
    });
  });
  it("자정 직후면 전날 23시", () => {
    expect(ultraSrtNcstBase(kst("2026-10-03T00:10:00"))).toEqual({
      baseDate: "20261002",
      baseTime: "2300",
    });
  });
  it("월 경계도 넘어간다", () => {
    expect(ultraSrtNcstBase(kst("2026-11-01T00:05:00"))).toEqual({
      baseDate: "20261031",
      baseTime: "2300",
    });
  });
});

describe("ultraSrtFcstBase (초단기예보, 30분 발표 + 45분)", () => {
  it("45분 이후면 이번 시각 30분", () => {
    expect(ultraSrtFcstBase(kst("2026-10-02T16:45:00"))).toEqual({
      baseDate: "20261002",
      baseTime: "1630",
    });
  });
  it("45분 전이면 1시간 전 30분", () => {
    expect(ultraSrtFcstBase(kst("2026-10-02T16:44:00"))).toEqual({
      baseDate: "20261002",
      baseTime: "1530",
    });
  });
  it("00:20이면 전날 23:30", () => {
    expect(ultraSrtFcstBase(kst("2026-01-01T00:20:00"))).toEqual({
      baseDate: "20251231",
      baseTime: "2330",
    });
  });
});

describe("vilageFcstBase (단기예보, 3시간 간격 + 10분)", () => {
  it.each([
    ["2026-10-02T02:10:00", "20261002", "0200"],
    ["2026-10-02T05:09:00", "20261002", "0200"],
    ["2026-10-02T05:10:00", "20261002", "0500"],
    ["2026-10-02T14:30:00", "20261002", "1400"],
    ["2026-10-02T23:59:00", "20261002", "2300"],
    ["2026-10-03T00:30:00", "20261002", "2300"],
    ["2026-10-03T02:09:00", "20261002", "2300"],
  ])("%s → %s %s", (now, baseDate, baseTime) => {
    expect(vilageFcstBase(kst(now))).toEqual({ baseDate, baseTime });
  });
});

describe("todayMinMaxBase (오늘 최고/최저)", () => {
  it("02:10 이후면 오늘 02시", () => {
    expect(todayMinMaxBase(kst("2026-10-02T18:00:00"))).toEqual({
      baseDate: "20261002",
      baseTime: "0200",
    });
  });
  it("02:10 전이면 전날 23시", () => {
    expect(todayMinMaxBase(kst("2026-10-02T01:00:00"))).toEqual({
      baseDate: "20261001",
      baseTime: "2300",
    });
  });
});

describe("kstDate", () => {
  it("UTC 15시는 KST 다음날 0시", () => {
    expect(kstDate(new Date("2026-10-02T15:00:00Z"))).toBe("20261003");
  });
});
