import { requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

/** 탈퇴: auth 유저를 지우면 프로필·글·투표·공감·신고가 cascade 로 함께 삭제된다 */
export async function DELETE() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { error } = await createAdminClient().auth.admin.deleteUser(
    auth.userId,
  );
  if (error) throw error;

  // 서버에 남은 세션이 없으니 쿠키만 지운다
  await auth.supabase.auth.signOut({ scope: "local" });
  return new Response(null, { status: 204 });
}
