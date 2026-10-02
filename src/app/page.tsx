import { redirect } from "next/navigation";

import { getMyProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login");

  const profile = await getMyProfile(supabase, userId);
  if (!profile) redirect("/onboarding");

  return (
    <main className="min-h-dvh bg-linear-to-b from-[#C6E6FB] to-canvas to-40%">
      <header className="flex items-center justify-between px-5 pt-6 pb-2">
        <h1 className="flex items-center gap-1 text-xl font-extrabold">
          📍 {profile.dong.name}
        </h1>
        <span className="flex size-10 items-center justify-center rounded-full bg-white text-xl">
          👤
        </span>
      </header>
      <p className="px-5 pt-16 text-center text-sub">
        {profile.nickname}님, 반가워요!
        <br />
        날씨와 동네 소식은 곧 보여드릴게요
      </p>
    </main>
  );
}
