import "server-only";

import {
  coordToHDong,
  type HDong,
  type Point,
  searchAddressPoints,
  searchKeywordPoints,
} from "@/lib/kakao/local";
import { toGrid } from "@/lib/kma/grid";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Dong } from "@/types";

function toDong(h: HDong): Dong {
  return { code: h.code, name: h.name, fullName: h.fullName };
}

/** 처음 조회된 행정동을 dongs 에 저장 (service role) */
async function upsertDongs(list: HDong[]) {
  if (list.length === 0) return;
  const { error } = await createAdminClient()
    .from("dongs")
    .upsert(
      list.map((h) => ({
        code: h.code,
        name: h.name,
        full_name: h.fullName,
        lat: h.lat,
        lng: h.lng,
        ...toGrid(h.lat, h.lng),
      })),
      { onConflict: "code" },
    );
  if (error) throw error;
}

export async function dongByCoord(point: Point): Promise<Dong | null> {
  const h = await coordToHDong(point);
  if (!h) return null;
  await upsertDongs([h]);
  return toDong(h);
}

/**
 * 동 이름·장소 검색 → 결과 좌표를 모두 행정동으로 바꿔 중복 제거.
 * 법정동/행정동이 섞이지 않도록 저장 단위는 항상 행정동이다.
 */
export async function searchDongs(query: string, limit = 10): Promise<Dong[]> {
  const [byAddress, byKeyword] = await Promise.all([
    searchAddressPoints(query),
    searchKeywordPoints(query),
  ]);
  const resolved = await Promise.all(
    [...byAddress, ...byKeyword].map(coordToHDong),
  );

  const unique = new Map<string, HDong>();
  for (const h of resolved) {
    if (h && !unique.has(h.code)) unique.set(h.code, h);
  }
  const list = [...unique.values()].slice(0, limit);
  await upsertDongs(list);
  return list.map(toDong);
}
