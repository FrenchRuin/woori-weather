import "server-only";

import {
  todayMinMaxBase,
  ultraSrtFcstBase,
  ultraSrtNcstBase,
  vilageFcstBase,
} from "@/lib/kma/baseTime";
import { kmaFetch } from "@/lib/kma/client";
import { normalize } from "@/lib/kma/normalize";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import type { Weather } from "@/types";

const CACHE_TTL_MS = 30 * 60 * 1000;

type Grid = { nx: number; ny: number };

async function fetchWeather(grid: Grid, now: Date): Promise<Weather> {
  const vilageBase = vilageFcstBase(now);
  const minMaxBase = todayMinMaxBase(now);
  const sameRelease =
    vilageBase.baseDate === minMaxBase.baseDate &&
    vilageBase.baseTime === minMaxBase.baseTime;

  const [ncst, ultraFcst, vilage, minMax] = await Promise.all([
    kmaFetch("getUltraSrtNcst", ultraSrtNcstBase(now), grid, 20),
    // 하늘상태는 단기예보로 대체할 수 있으므로 실패해도 진행
    kmaFetch("getUltraSrtFcst", ultraSrtFcstBase(now), grid, 60).catch(
      () => [],
    ),
    kmaFetch("getVilageFcst", vilageBase, grid, 1000),
    sameRelease
      ? Promise.resolve([])
      : // 최고/최저만 빠지므로 실패해도 진행
        kmaFetch("getVilageFcst", minMaxBase, grid, 1000).catch(() => []),
  ]);

  return normalize({ ncst, ultraFcst, vilage, minMax }, now);
}

/** 격자별 날씨. 30분 캐시, 갱신 실패 시 오래된 캐시라도 돌려준다. */
export async function getWeather(grid: Grid): Promise<Weather> {
  const admin = createAdminClient();
  const { data: cached } = await admin
    .from("weather_cache")
    .select("data, fetched_at")
    .eq("nx", grid.nx)
    .eq("ny", grid.ny)
    .maybeSingle();

  if (
    cached &&
    Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS
  ) {
    return cached.data as unknown as Weather;
  }

  try {
    const weather = await fetchWeather(grid, new Date());
    const { error } = await admin.from("weather_cache").upsert({
      ...grid,
      data: weather as unknown as Json,
      fetched_at: weather.fetchedAt,
    });
    if (error) console.error("weather_cache upsert failed", error);
    return weather;
  } catch (e) {
    if (cached) {
      console.error("weather refresh failed, serving stale cache", e);
      return cached.data as unknown as Weather;
    }
    throw e;
  }
}
