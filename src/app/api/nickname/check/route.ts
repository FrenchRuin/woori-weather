import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/api";
import { isNicknameTaken } from "@/lib/profile";
import { nicknameSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const parsed = nicknameSchema.safeParse(
    request.nextUrl.searchParams.get("name") ?? "",
  );
  if (!parsed.success) {
    return NextResponse.json({
      available: false,
      reason: parsed.error.issues[0]?.message,
    });
  }

  const taken = await isNicknameTaken(auth.supabase, parsed.data, auth.userId);
  return NextResponse.json(
    taken
      ? { available: false, reason: "이미 사용 중인 닉네임이에요" }
      : { available: true },
  );
}
