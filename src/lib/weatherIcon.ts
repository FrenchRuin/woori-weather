import type { Pty, Sky } from "@/types";

/** 18~06시는 밤 (기상청 API 에 일출·일몰이 없어 고정) */
export function isNight(hour: number) {
  return hour >= 18 || hour < 6;
}

/** Meteocons 아이콘 이름 (src/assets/weather/*.svg) */
export type WeatherIconName =
  | "clear-day"
  | "clear-night"
  | "partly-cloudy-day"
  | "partly-cloudy-night"
  | "cloudy"
  | "rain"
  | "partly-cloudy-day-rain"
  | "partly-cloudy-night-rain"
  | "snow"
  | "sleet"
  | "fog";

export function weatherIcon(
  sky: Sky,
  pty: Pty,
  night: boolean,
): WeatherIconName {
  const time = night ? "night" : "day";
  switch (pty) {
    case "rain":
      return sky === "cloudy" ? "rain" : `partly-cloudy-${time}-rain`;
    case "shower":
      return `partly-cloudy-${time}-rain`;
    case "rainsnow":
      return "sleet";
    case "snow":
      return "snow";
  }
  if (sky === "cloudy") return "cloudy";
  if (sky === "partly") return `partly-cloudy-${time}`;
  return `clear-${time}`;
}

/** KST ISO 문자열("...T15:00:00+09:00")에서 시(hour) */
export function hourOf(iso: string) {
  return Number(iso.slice(11, 13));
}

export function kstHourNow(now = new Date()) {
  return (now.getUTCHours() + 9) % 24;
}
