import { describe, expect, it } from "vitest";

import { containsBadword } from "./badwords";

describe("containsBadword", () => {
  it("욕설을 잡는다", () => {
    expect(containsBadword("아 씨발 비 오네")).toBe(true);
    expect(containsBadword("FUCK this rain")).toBe(true);
  });

  it("공백·숫자·특수문자를 끼워도 잡는다", () => {
    expect(containsBadword("시 1 발")).toBe(true);
    expect(containsBadword("병.신")).toBe(true);
    expect(containsBadword("ㅅ ㅂ")).toBe(true);
  });

  it("일반 날씨 글은 통과", () => {
    expect(
      containsBadword("시장 앞 지금 비 오기 시작했어요. 우산 챙기세요"),
    ).toBe(false);
    expect(containsBadword("고양이 새끼들이 비 피하고 있어요")).toBe(false);
    expect(containsBadword("시바견 산책 중인데 바람 세요")).toBe(false);
  });
});
