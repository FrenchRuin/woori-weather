import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { invalid, requireUser } from "@/lib/api";
import { searchDongs } from "@/lib/dongs";

const schema = z.object({
  q: z.string().trim().min(2, "2글자 이상 입력해주세요").max(30),
});

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const parsed = schema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
  });
  if (!parsed.success) return invalid(parsed.error);

  return NextResponse.json(await searchDongs(parsed.data.q));
}
