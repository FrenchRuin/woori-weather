import { z } from "zod";

import { apiError, invalid, requireUser } from "@/lib/api";
import { getPost } from "@/lib/posts";
import { REPORT_REASONS } from "@/lib/reportReasons";

const reportSchema = z.object({
  reason: z.enum(
    REPORT_REASONS.map((r) => r.key),
    {
      error: "신고 사유를 골라주세요",
    },
  ),
});

/** R12: 1인 1회, 본인 글 신고 불가, 3건 누적 시 자동 숨김(트리거) */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/posts/[id]/report">,
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, userId } = auth;

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return apiError(404, "NOT_FOUND", "글을 찾지 못했어요");
  }

  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error);

  // RLS 거절(42501)만으로는 이유를 알 수 없어 먼저 확인
  const post = await getPost(supabase, id);
  if (!post) return apiError(404, "NOT_FOUND", "글을 찾지 못했어요");
  if (post.isMine) {
    return apiError(403, "OWN_POST", "내 글은 신고할 수 없어요");
  }

  const { error } = await supabase
    .from("reports")
    .insert({ post_id: id, user_id: userId, reason: parsed.data.reason });
  if (error) {
    if (error.code === "23505") {
      return apiError(409, "ALREADY_REPORTED", "이미 신고한 글이에요");
    }
    if (error.code === "42501") {
      return apiError(404, "NOT_FOUND", "글을 찾지 못했어요");
    }
    throw error;
  }
  return new Response(null, { status: 204 });
}
