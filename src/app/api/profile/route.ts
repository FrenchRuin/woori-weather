import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, invalid, requireUser } from "@/lib/api";
import { getMyProfile } from "@/lib/profile";
import { dongCodeSchema, nicknameSchema } from "@/lib/validation";

const createSchema = z.object({
  nickname: nicknameSchema,
  dongCode: dongCodeSchema,
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, userId } = auth;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error);

  const { error } = await supabase.from("profiles").insert({
    id: userId,
    nickname: parsed.data.nickname,
    dong_code: parsed.data.dongCode,
  });

  if (error) {
    if (error.code === "23505") {
      // 닉네임 중복 또는 이미 프로필이 있음
      const existing = await getMyProfile(supabase, userId);
      if (existing) {
        return apiError(409, "PROFILE_EXISTS", "이미 가입을 마쳤어요");
      }
      return apiError(409, "NICKNAME_TAKEN", "이미 사용 중인 닉네임이에요");
    }
    if (error.code === "23503") {
      return apiError(400, "INVALID_DONG", "동네를 다시 선택해주세요");
    }
    if (error.code === "23514") {
      return apiError(400, "INVALID_NICKNAME", "닉네임 형식을 확인해주세요");
    }
    throw error;
  }

  return NextResponse.json(await getMyProfile(supabase, userId), {
    status: 201,
  });
}
