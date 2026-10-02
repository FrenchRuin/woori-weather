import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, requireUser } from "@/lib/api";
import { getPost } from "@/lib/posts";

/** R11: 공감 토글 (1인 1회) */
export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/posts/[id]/like">,
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, userId } = auth;

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return apiError(404, "NOT_FOUND", "글을 찾지 못했어요");
  }

  const { data: removed, error: deleteError } = await supabase
    .from("post_likes")
    .delete()
    .eq("post_id", id)
    .eq("user_id", userId)
    .select("post_id");
  if (deleteError) throw deleteError;

  let liked = false;
  if (!removed.length) {
    const { error } = await supabase
      .from("post_likes")
      .insert({ post_id: id, user_id: userId });
    // 23505: 동시에 두 번 눌림 → 이미 공감한 상태
    if (error && error.code !== "23505") {
      // RLS: 없는 글이나 숨겨진 글
      if (error.code === "42501") {
        return apiError(404, "NOT_FOUND", "글을 찾지 못했어요");
      }
      throw error;
    }
    liked = true;
  }

  const post = await getPost(supabase, id);
  return NextResponse.json({ liked, likeCount: post?.likeCount ?? 0 });
}
