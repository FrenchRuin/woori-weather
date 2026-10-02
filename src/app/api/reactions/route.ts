import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, invalid, requireUser } from "@/lib/api";
import { getReactionSummary } from "@/lib/reactions";

const schema = z.object({
  feel: z.enum(["cold", "good", "hot"], { error: "체감을 골라주세요" }),
  tags: z
    .array(
      z.enum(["rain", "wind", "clear"], { error: "상황을 다시 골라주세요" }),
    )
    .max(3)
    .default([]),
});

/** R6: 최근 1시간 내 내 투표가 있으면 수정, 없으면 새로 (DB 함수 submit_reaction) */
export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, userId } = auth;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error);

  const { data, error } = await supabase.rpc("submit_reaction", {
    p_feel: parsed.data.feel,
    p_tags: parsed.data.tags,
  });
  if (error) {
    if (error.code === "WW403") {
      return apiError(403, "PROFILE_REQUIRED", "동네를 먼저 설정해주세요");
    }
    throw error;
  }

  return NextResponse.json(
    await getReactionSummary(supabase, data.dong_code, userId),
  );
}
