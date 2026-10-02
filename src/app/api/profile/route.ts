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

const updateSchema = z
  .object({
    nickname: nicknameSchema.optional(),
    dongCode: dongCodeSchema.optional(),
  })
  .refine((v) => v.nickname !== undefined || v.dongCode !== undefined, {
    error: "바꿀 내용을 입력해주세요",
  });

/** 닉네임(R4: 30일에 1회, 트리거) / 동네(R5) 변경 */
export async function PATCH(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, userId } = auth;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error);
  const { nickname, dongCode } = parsed.data;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...(nickname !== undefined && { nickname }),
      ...(dongCode !== undefined && { dong_code: dongCode }),
    })
    .eq("id", userId)
    .select("id");

  if (error) {
    if (error.code === "WW409") {
      return apiError(
        409,
        "NICKNAME_COOLDOWN",
        "닉네임은 30일에 한 번만 바꿀 수 있어요",
      );
    }
    if (error.code === "23505") {
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
  if (!data.length) {
    return apiError(403, "PROFILE_REQUIRED", "프로필을 먼저 만들어주세요");
  }

  return NextResponse.json(await getMyProfile(supabase, userId));
}
