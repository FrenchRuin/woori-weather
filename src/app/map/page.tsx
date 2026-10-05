import { redirect } from "next/navigation";

import { DongMap } from "@/components/DongMap";
import { getDongPins } from "@/lib/map";
import { getMyProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function MapPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login");

  const profile = await getMyProfile(supabase, userId);
  if (!profile) redirect("/onboarding");

  const pins = await getDongPins(supabase, profile.dong.code);
  return <DongMap pins={pins} />;
}
