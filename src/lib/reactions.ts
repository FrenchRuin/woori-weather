import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { toPercents } from "@/lib/percent";
import type { Database } from "@/types/database";
import type { Feel, ReactionSummary, ReactionTag } from "@/types";

const EDIT_WINDOW_MS = 60 * 60 * 1000;

/** R7: 최근 1시간 동네 체감 집계 + 내 투표 */
export async function getReactionSummary(
  supabase: SupabaseClient<Database>,
  dongCode: string,
  userId: string,
): Promise<ReactionSummary> {
  const since = new Date(Date.now() - EDIT_WINDOW_MS).toISOString();

  const [summary, mine] = await Promise.all([
    supabase.rpc("reaction_summary", { p_dong_code: dongCode }).single(),
    supabase
      .from("reactions")
      .select("feel, tags, created_at")
      .eq("user_id", userId)
      .eq("dong_code", dongCode)
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (summary.error) throw summary.error;
  if (mine.error) throw mine.error;

  const s = summary.data;
  const feel = { cold: s.cold, good: s.good, hot: s.hot };

  return {
    total: s.total,
    feel,
    percent: toPercents(feel),
    tags: { rain: s.rain, wind: s.wind, clear: s.clear },
    mine: mine.data
      ? {
          feel: mine.data.feel as Feel,
          tags: mine.data.tags as ReactionTag[],
          editableUntil: new Date(
            new Date(mine.data.created_at).getTime() + EDIT_WINDOW_MS,
          ).toISOString(),
        }
      : null,
  };
}
