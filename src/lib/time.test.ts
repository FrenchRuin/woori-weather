import { describe, expect, it } from "vitest";

import { relativeTime } from "./time";

const now = new Date("2026-10-02T18:00:00+09:00");
const at = (s: string) => new Date(`${s}+09:00`).toISOString();

describe("relativeTime", () => {
  it.each([
    ["2026-10-02T17:59:30", "방금"],
    ["2026-10-02T17:48:00", "12분 전"],
    ["2026-10-02T17:00:01", "59분 전"],
    ["2026-10-02T16:00:00", "2시간 전"],
    ["2026-10-01T18:00:01", "23시간 전"],
    ["2026-10-01T09:00:00", "어제"],
    ["2026-09-30T23:00:00", "9월 30일"],
  ])("%s → %s", (iso, expected) => {
    expect(relativeTime(at(iso), now)).toBe(expected);
  });
});
