import { z } from "zod";

import { apiError, requireUser } from "@/lib/api";

/** R13: 작성자 본인만 하드 삭제 (RLS) */
export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/posts/[id]">,
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return apiError(404, "NOT_FOUND", "글을 찾지 못했어요");
  }

  const { data, error } = await auth.supabase
    .from("posts")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data.length) {
    return apiError(404, "NOT_FOUND", "삭제할 수 있는 글이 없어요");
  }
  return new Response(null, { status: 204 });
}
