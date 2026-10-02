// 기상청 단기예보 API 의 base_date / base_time 계산. 모든 기준은 KST.

export type Base = { baseDate: string; baseTime: string };

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const VILAGE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];

const pad = (n: number) => String(n).padStart(2, "0");

/** UTC 필드가 곧 KST 벽시계인 Date */
function kstWall(now: Date) {
  return new Date(now.getTime() + KST_OFFSET_MS);
}

function ymd(wall: Date) {
  return `${wall.getUTCFullYear()}${pad(wall.getUTCMonth() + 1)}${pad(wall.getUTCDate())}`;
}

/** KST 기준 오늘 날짜 (YYYYMMDD) */
export function kstDate(now: Date) {
  return ymd(kstWall(now));
}

/** 초단기실황: 매시 정각 발표, 40분 이후 조회 가능 */
export function ultraSrtNcstBase(now: Date): Base {
  const w = kstWall(now);
  if (w.getUTCMinutes() < 40) w.setUTCHours(w.getUTCHours() - 1);
  return { baseDate: ymd(w), baseTime: `${pad(w.getUTCHours())}00` };
}

/** 초단기예보: 매시 30분 발표, 45분 이후 조회 가능 */
export function ultraSrtFcstBase(now: Date): Base {
  const w = kstWall(now);
  if (w.getUTCMinutes() < 45) w.setUTCHours(w.getUTCHours() - 1);
  return { baseDate: ymd(w), baseTime: `${pad(w.getUTCHours())}30` };
}

/** 단기예보: 02·05·08·11·14·17·20·23시 발표, 10분 이후 조회 가능 */
export function vilageFcstBase(now: Date): Base {
  const w = kstWall(now);
  const minutes = w.getUTCHours() * 60 + w.getUTCMinutes();
  const hour = [...VILAGE_HOURS].reverse().find((h) => h * 60 + 10 <= minutes);
  if (hour === undefined) {
    w.setUTCDate(w.getUTCDate() - 1);
    return { baseDate: ymd(w), baseTime: "2300" };
  }
  return { baseDate: ymd(w), baseTime: `${pad(hour)}00` };
}

/**
 * 오늘 최고/최저(TMX/TMN)가 들어 있는 단기예보 발표분.
 * 당일 02시 발표분(02:10 이후), 그 전이면 전날 23시 발표분.
 */
export function todayMinMaxBase(now: Date): Base {
  const w = kstWall(now);
  if (w.getUTCHours() * 60 + w.getUTCMinutes() >= 2 * 60 + 10) {
    return { baseDate: ymd(w), baseTime: "0200" };
  }
  w.setUTCDate(w.getUTCDate() - 1);
  return { baseDate: ymd(w), baseTime: "2300" };
}
