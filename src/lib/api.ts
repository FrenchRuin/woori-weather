import "server-only";

import { NextResponse } from "next/server";
import type { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { ApiErrorBody } from "@/types";

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json<ApiErrorBody>(
    { error: { code, message } },
    { status },
  );
}

export function invalid(error: z.ZodError) {
  return apiError(
    400,
    "INVALID_INPUT",
    error.issues[0]?.message ?? "입력값을 확인해주세요",
  );
}

/** 로그인한 사용자의 세션 클라이언트. 비로그인이면 401 응답을 돌려준다. */
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) {
    return {
      error: apiError(401, "UNAUTHORIZED", "로그인이 필요해요"),
    } as const;
  }
  return { supabase, userId } as const;
}
