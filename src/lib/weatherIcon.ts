import type { Pty, Sky } from "@/types";

/** 18~06시는 밤 (기상청 API 에 일출·일몰이 없어 고정) */
export function isNight(hour: number) {
  return hour >= 18 || hour < 6;
}

export function weatherIcon(sky: Sky, pty: Pty, night: boolean) {
  switch (pty) {
    case "rain":
      return sky === "cloudy" ? "🌧️" : "🌦️";
    case "shower":
      return "🌦️";
    case "rainsnow":
    case "snow":
      return "🌨️";
  }
  if (sky === "cloudy") return "☁️";
  if (sky === "partly") return night ? "☁️" : "⛅";
  return night ? "🌙" : "☀️";
}

/** KST ISO 문자열("...T15:00:00+09:00")에서 시(hour) */
export function hourOf(iso: string) {
  return Number(iso.slice(11, 13));
}

export function kstHourNow(now = new Date()) {
  return (now.getUTCHours() + 9) % 24;
}
