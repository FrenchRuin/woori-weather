import type { Pty, Sky, Weather } from "@/types";

import type { KmaItem } from "./client";
import { feelsLike } from "./feelsLike";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

export function toSky(code: string | undefined): Sky {
  if (code === "4") return "cloudy";
  if (code === "3") return "partly";
  return "clear";
}

/** 초단기(0,1,2,3,5,6,7)와 단기(0,1,2,3,4) 강수형태 코드를 함께 처리 */
export function toPty(code: string | undefined): Pty {
  switch (code) {
    case "1":
    case "5": // 빗방울
      return "rain";
    case "2":
    case "6": // 빗방울눈날림
      return "rainsnow";
    case "3":
    case "7": // 눈날림
      return "snow";
    case "4":
      return "shower";
    default:
      return "none";
  }
}

const SKY_TEXT: Record<Sky, string> = {
  clear: "맑음",
  partly: "구름많음",
  cloudy: "흐림",
};
const PTY_TEXT: Record<Exclude<Pty, "none">, string> = {
  rain: "비",
  rainsnow: "비 또는 눈",
  snow: "눈",
  shower: "소나기",
};

export function summarize(sky: Sky, pty: Pty) {
  if (pty === "none") return SKY_TEXT[sky];
  if (pty === "shower") return PTY_TEXT.shower;
  if (sky === "cloudy") return `흐리고 ${PTY_TEXT[pty]}`;
  if (sky === "partly") return `구름많고 ${PTY_TEXT[pty]}`;
  return PTY_TEXT[pty];
}

type Slot = Record<string, string>;

/** 예보 항목을 시각(YYYYMMDDHHmm)별로 묶는다 */
function groupBySlot(items: KmaItem[]) {
  const slots = new Map<string, Slot>();
  for (const item of items) {
    if (!item.fcstDate || !item.fcstTime || item.fcstValue === undefined)
      continue;
    const key = item.fcstDate + item.fcstTime;
    const slot = slots.get(key) ?? {};
    slot[item.category] = item.fcstValue;
    slots.set(key, slot);
  }
  return [...slots.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function toIso(key: string) {
  return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}T${key.slice(8, 10)}:${key.slice(10, 12)}:00+09:00`;
}

const num = (v: string | undefined) => (v === undefined ? NaN : Number(v));

export type RawWeather = {
  ncst: KmaItem[]; // 초단기실황
  ultraFcst: KmaItem[]; // 초단기예보 (하늘상태)
  vilage: KmaItem[]; // 최신 단기예보 (시간별)
  minMax: KmaItem[]; // 오늘 TMX/TMN 이 들어 있는 단기예보
};

export function normalize(raw: RawWeather, now: Date): Weather {
  const wall = new Date(now.getTime() + KST_OFFSET_MS);
  const today = `${wall.getUTCFullYear()}${pad(wall.getUTCMonth() + 1)}${pad(wall.getUTCDate())}`;
  const currentHourKey = `${today}${pad(wall.getUTCHours())}00`;

  const obs = Object.fromEntries(
    raw.ncst.map((i) => [i.category, i.obsrValue]),
  ) as Record<string, string | undefined>;

  const vilageSlots = groupBySlot(raw.vilage).filter(
    ([key]) => key >= currentHourKey,
  );

  // 하늘상태: 초단기예보의 가장 가까운 시각, 없으면 단기예보 첫 시각
  const nearestSky =
    groupBySlot(raw.ultraFcst).find(([, s]) => s.SKY)?.[1].SKY ??
    vilageSlots.find(([, s]) => s.SKY)?.[1].SKY;

  const temp = num(obs.T1H);
  const windSpeed = num(obs.WSD);
  const humidity = num(obs.REH);
  if ([temp, windSpeed, humidity].some(Number.isNaN)) {
    throw new Error("초단기실황에 기온/풍속/습도가 없어요");
  }
  const sky = toSky(nearestSky);
  const pty = toPty(obs.PTY);

  const forecasts = vilageSlots
    .filter(([, s]) => s.TMP !== undefined)
    .map(([key, s]) => ({
      time: toIso(key),
      temp: num(s.TMP),
      sky: toSky(s.SKY),
      pty: toPty(s.PTY),
      pop: num(s.POP) || 0,
    }));
  // 최신 발표분은 다음 시각부터라 현재 시각이 빠질 수 있다 → 실황으로 채운다
  const currentIso = toIso(currentHourKey);
  if (forecasts[0]?.time !== currentIso) {
    forecasts.unshift({
      time: currentIso,
      temp,
      sky,
      pty,
      pop: forecasts[0]?.pop ?? 0,
    });
  }
  const hourly = forecasts.slice(0, 12);

  // 오늘 최고/최저: 02시 발표분 우선, 없으면 최신 발표분
  const findDaily = (category: "TMX" | "TMN") => {
    const item = [...raw.minMax, ...raw.vilage].find(
      (i) => i.category === category && i.fcstDate === today,
    );
    const value = num(item?.fcstValue);
    return Number.isNaN(value) ? null : value;
  };

  // 오늘 강수확률: 남은 오늘 시간대 중 최댓값
  const todayPops = vilageSlots
    .filter(([key]) => key.startsWith(today))
    .map(([, s]) => num(s.POP))
    .filter((v) => !Number.isNaN(v));
  const pop = todayPops.length ? Math.max(...todayPops) : (hourly[0]?.pop ?? 0);

  return {
    now: {
      temp,
      feelsLike: feelsLike(temp, windSpeed, wall.getUTCMonth() + 1),
      humidity,
      windSpeed,
      sky,
      pty,
      summary: summarize(sky, pty),
    },
    today: { max: findDaily("TMX"), min: findDaily("TMN"), pop },
    hourly,
    fetchedAt: now.toISOString(),
  };
}
