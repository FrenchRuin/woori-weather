import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { apiError, invalid, requireUser } from "@/lib/api";
import { dongByCoord } from "@/lib/dongs";

const schema = z.object({
  lat: z.coerce.number().min(33).max(39),
  lng: z.coerce.number().min(124).max(132),
});

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const parsed = schema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) return invalid(parsed.error);

  const dong = await dongByCoord(parsed.data);
  if (!dong) {
    return apiError(404, "DONG_NOT_FOUND", "이 위치의 동네를 찾지 못했어요");
  }
  return NextResponse.json(dong);
}
