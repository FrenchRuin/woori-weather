import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { countByDong, type DongPin, toDongPins } from "./dongPins";
import { RECENT_HOURS } from "./posts";

/**
 * 지도에 찍을 동네 (최근 6시간 이야기 수).
 * 한 번에 기본 1000행까지만 오므로, 최근 글이 그보다 많아지면 DB 함수(group by)로 바꾼다.
 */
export async function getDongPins(
  supabase: SupabaseClient<Database>,
  myDongCode: string,
): Promise<DongPin[]> {
  const recentFrom = new Date(
    Date.now() - RECENT_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("dong_code")
    .eq("is_hidden", false)
    .gt("created_at", recentFrom);
  if (error) throw error;

  const counts = countByDong(posts.map((p) => p.dong_code));
  const codes = [...new Set([...counts.keys(), myDongCode])];

  const { data: dongs, error: dongsError } = await supabase
    .from("dongs")
    .select("code, name, lat, lng")
    .in("code", codes);
  if (dongsError) throw dongsError;

  return toDongPins(counts, dongs, myDongCode);
}
