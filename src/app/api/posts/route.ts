import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { apiError, invalid, requireUser } from "@/lib/api";
import { containsBadword } from "@/lib/moderation/badwords";
import { getPost, listPosts } from "@/lib/posts";
import { getMyProfile } from "@/lib/profile";
import { dongCodeSchema } from "@/lib/validation";

const listSchema = z.object({
  dong: dongCodeSchema,
  sort: z.enum(["new", "like"]).default("new"),
  scope: z.enum(["recent", "old"]).default("recent"),
  tag: z.enum(["rain", "wind", "temp", "sun"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

/** 목록. 본문은 Post[], 조건에 맞는 전체 개수는 X-Total-Count 헤더 */
export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const parsed = listSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) return invalid(parsed.error);
  const { dong, ...options } = parsed.data;

  const { posts, total } = await listPosts(auth.supabase, {
    dongCode: dong,
    ...options,
  });
  return NextResponse.json(posts, {
    headers: { "X-Total-Count": String(total) },
  });
}

const createSchema = z.object({
  // R8: 앞뒤 공백 제거 후 1~200자
  content: z
    .string()
    .trim()
    .min(1, "내용을 입력해주세요")
    .max(200, "200자까지 쓸 수 있어요"),
  tag: z
    .enum(["rain", "wind", "temp", "sun"], { error: "태그를 다시 골라주세요" })
    .nullish(),
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, userId } = auth;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error);
  const { content, tag } = parsed.data;

  // R14
  if (containsBadword(content)) {
    return apiError(400, "BADWORD", "바르고 고운 말로 써주세요");
  }

  const profile = await getMyProfile(supabase, userId);
  if (!profile) {
    return apiError(403, "PROFILE_REQUIRED", "동네를 먼저 설정해주세요");
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      dong_code: profile.dong.code,
      content,
      tag: tag ?? null,
    })
    .select("id")
    .single();

  if (error) {
    // R9: DB 트리거가 1분 1개를 보장
    if (error.code === "WW429") {
      return apiError(
        429,
        "TOO_MANY_POSTS",
        "한마디는 1분에 1개만 남길 수 있어요",
      );
    }
    if (error.code === "23514") {
      return apiError(400, "INVALID_INPUT", "내용을 확인해주세요");
    }
    throw error;
  }

  return NextResponse.json(await getPost(supabase, data.id), { status: 201 });
}
