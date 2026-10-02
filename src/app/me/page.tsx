import Link from "next/link";
import { redirect } from "next/navigation";

import { listMyPosts } from "@/lib/posts";
import { getMyProfile, nicknameCooldownUntil } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

import { AccountActions } from "./AccountActions";
import { DongCard } from "./DongCard";
import { MyPostList } from "./MyPostList";
import { NicknameCard } from "./NicknameCard";

export default async function MePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login");

  const [profile, posts] = await Promise.all([
    getMyProfile(supabase, userId),
    listMyPosts(supabase, userId),
  ]);
  if (!profile) redirect("/onboarding");

  const cooldownUntil = nicknameCooldownUntil(profile);

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 bg-white">
        <div className="flex items-center gap-2 px-3 pt-4 pb-3">
          <Link
            href="/"
            aria-label="뒤로"
            className="flex size-10 items-center justify-center text-[26px]"
          >
            ‹
          </Link>
          <h1 className="text-lg font-bold">내 정보</h1>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <NicknameCard
          nickname={profile.nickname}
          cooldownUntil={cooldownUntil}
        />
        <DongCard dong={profile.dong} />
        <MyPostList initial={posts} />
        <AccountActions />
      </div>
    </main>
  );
}
