import { NextResponse, type NextRequest } from "next/server";

import { apiError, requireUser } from "@/lib/api";
import { getReactionSummary } from "@/lib/reactions";
import { dongCodeSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const parsed = dongCodeSchema.safeParse(
    request.nextUrl.searchParams.get("dong") ?? "",
  );
  if (!parsed.success) {
    return apiError(400, "INVALID_INPUT", "동네 코드를 확인해주세요");
  }

  return NextResponse.json(
    await getReactionSummary(auth.supabase, parsed.data, auth.userId),
  );
}
