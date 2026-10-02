import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { Profile } from "@/types";

const NICKNAME_COOLDOWN_DAYS = 30;

export async function getMyProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, nickname, nickname_changed_at, dong:dongs(code, name, full_name)",
    )
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.dong) return null;

  return {
    id: data.id,
    nickname: data.nickname,
    dong: {
      code: data.dong.code,
      name: data.dong.name,
      fullName: data.dong.full_name,
    },
    nicknameChangeableAt: data.nickname_changed_at
      ? new Date(
          new Date(data.nickname_changed_at).getTime() +
            NICKNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString()
      : null,
  };
}

/** R4: 아직 닉네임을 바꿀 수 없으면 가능해지는 시각, 바꿀 수 있으면 null */
export function nicknameCooldownUntil(profile: Profile, now = new Date()) {
  const at = profile.nicknameChangeableAt;
  return at && new Date(at) > now ? at : null;
}

/** 닉네임 사용 가능 여부 (대소문자 무시). excludeUserId 는 본인 제외용 */
export async function isNicknameTaken(
  supabase: SupabaseClient<Database>,
  nickname: string,
  excludeUserId?: string,
) {
  let query = supabase
    .from("public_profiles")
    .select("id", { count: "exact", head: true })
    .ilike("nickname", nickname);
  if (excludeUserId) query = query.neq("id", excludeUserId);
  const { count, error } = await query;
  if (error) throw error;
  return (count ?? 0) > 0;
}
