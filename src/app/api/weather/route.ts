import { NextResponse, type NextRequest } from "next/server";

import { apiError, requireUser } from "@/lib/api";
import { dongCodeSchema } from "@/lib/validation";
import { getWeather } from "@/lib/weather";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const parsed = dongCodeSchema.safeParse(
    request.nextUrl.searchParams.get("dong") ?? "",
  );
  if (!parsed.success) {
    return apiError(400, "INVALID_INPUT", "동네 코드를 확인해주세요");
  }

  const { data: dong } = await auth.supabase
    .from("dongs")
    .select("nx, ny")
    .eq("code", parsed.data)
    .maybeSingle();
  if (!dong) return apiError(404, "DONG_NOT_FOUND", "동네를 찾지 못했어요");

  try {
    return NextResponse.json(await getWeather(dong));
  } catch (e) {
    console.error(e);
    return apiError(502, "WEATHER_UNAVAILABLE", "날씨를 불러오지 못했어요");
  }
}
