import { redirect } from "next/navigation";

import { PostList } from "@/components/PostList";
import { listPosts } from "@/lib/posts";
import { getMyProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function PostsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login");

  const profile = await getMyProfile(supabase, userId);
  if (!profile) redirect("/onboarding");

  const base = { dongCode: profile.dong.code, sort: "new", limit: 30 } as const;
  const [recent, old] = await Promise.all([
    listPosts(supabase, { ...base, scope: "recent" }),
    listPosts(supabase, { ...base, scope: "old" }),
  ]);

  return (
    <PostList
      dongCode={profile.dong.code}
      dongName={profile.dong.name}
      initialRecent={recent.posts}
      initialOld={old.posts}
    />
  );
}
