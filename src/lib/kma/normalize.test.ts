import { describe, expect, it } from "vitest";

import type { KmaItem } from "./client";
import { normalize, summarize, toPty } from "./normalize";

const now = new Date("2026-10-02T16:50:00+09:00");

const ncst: KmaItem[] = [
  { category: "T1H", obsrValue: "17.2" },
  { category: "REH", obsrValue: "78" },
  { category: "WSD", obsrValue: "4.1" },
  { category: "PTY", obsrValue: "1" },
];

const f = (date: string, time: string, category: string, value: string) => ({
  category,
  fcstDate: date,
  fcstTime: time,
  fcstValue: value,
});

const ultraFcst: KmaItem[] = [
  f("20261002", "1800", "SKY", "1"),
  f("20261002", "1700", "SKY", "4"),
];

// 15시~다음날 06시, 1시간 간격
const vilage: KmaItem[] = [];
for (let h = 15; h <= 30; h++) {
  const date = h < 24 ? "20261002" : "20261003";
  const time = `${String(h % 24).padStart(2, "0")}00`;
  vilage.push(
    f(date, time, "TMP", String(20 - (h - 15))),
    f(date, time, "SKY", "3"),
    f(date, time, "PTY", h === 17 ? "1" : "0"),
    f(date, time, "POP", h === 17 ? "60" : "20"),
  );
}
vilage.push(f("20261003", "0600", "TMN", "10.0"));

const minMax: KmaItem[] = [
  f("20261002", "0600", "TMN", "13.0"),
  f("20261002", "1500", "TMX", "19.0"),
];

describe("normalize", () => {
  const w = normalize({ ncst, ultraFcst, vilage, minMax }, now);

  it("현재: 실황 + 가장 가까운 초단기예보 하늘상태", () => {
    expect(w.now).toMatchObject({
      temp: 17.2,
      humidity: 78,
      windSpeed: 4.1,
      sky: "cloudy",
      pty: "rain",
      summary: "흐리고 비",
      feelsLike: 17.2, // 10월이므로 기온 그대로
    });
  });

  it("시간별: 현재 시각(16시)부터 12개", () => {
    expect(w.hourly).toHaveLength(12);
    expect(w.hourly[0]).toEqual({
      time: "2026-10-02T16:00:00+09:00",
      temp: 19,
      sky: "partly",
      pty: "none",
      pop: 20,
    });
    expect(w.hourly[11].time).toBe("2026-10-03T03:00:00+09:00");
  });

  it("발표분에 현재 시각이 없으면 실황으로 첫 칸을 채운다", () => {
    const late = new Date("2026-10-03T07:20:00+09:00"); // 예보는 06시까지만 있음
    const w2 = normalize({ ncst, ultraFcst, vilage, minMax }, late);
    expect(w2.hourly[0]).toEqual({
      time: "2026-10-03T07:00:00+09:00",
      temp: 17.2,
      sky: "cloudy",
      pty: "rain",
      pop: 0,
    });
  });

  it("오늘: 02시 발표분 최고/최저, 남은 시간 최대 강수확률", () => {
    expect(w.today).toEqual({ max: 19, min: 13, pop: 60 });
  });

  it("최고/최저가 없으면 null", () => {
    const w2 = normalize({ ncst, ultraFcst, vilage, minMax: [] }, now);
    expect(w2.today.max).toBeNull();
    expect(w2.today.min).toBeNull();
  });
});

describe("toPty / summarize", () => {
  it("초단기 전용 코드도 매핑", () => {
    expect(toPty("5")).toBe("rain");
    expect(toPty("6")).toBe("rainsnow");
    expect(toPty("7")).toBe("snow");
    expect(toPty("4")).toBe("shower");
    expect(toPty("0")).toBe("none");
  });

  it("요약 문구", () => {
    expect(summarize("clear", "none")).toBe("맑음");
    expect(summarize("partly", "rain")).toBe("구름많고 비");
    expect(summarize("cloudy", "snow")).toBe("흐리고 눈");
    expect(summarize("cloudy", "shower")).toBe("소나기");
  });
});
