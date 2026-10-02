import { redirect } from "next/navigation";
import { Suspense } from "react";

import { FeelCard } from "@/components/FeelCard";
import { HomePosts } from "@/components/HomePosts";
import { HourlyForecast } from "@/components/HourlyForecast";
import { WeatherHero } from "@/components/WeatherHero";
import { listPosts } from "@/lib/posts";
import { getMyProfile } from "@/lib/profile";
import { getReactionSummary } from "@/lib/reactions";
import { createClient } from "@/lib/supabase/server";
import { getWeather } from "@/lib/weather";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login");

  const profile = await getMyProfile(supabase, userId);
  if (!profile) redirect("/onboarding");

  return (
    <main className="min-h-dvh pb-28">
      <div className="bg-linear-to-b from-[#C6E6FB] to-canvas pb-2">
        <header className="flex items-center justify-between px-5 pt-6 pb-1.5">
          <h1 className="flex items-center gap-1 text-xl font-extrabold">
            📍 {profile.dong.name}
          </h1>
          <span className="flex size-10 items-center justify-center rounded-full bg-white text-xl">
            👤
          </span>
        </header>
        <Suspense fallback={<WeatherSkeleton />}>
          <WeatherSection dongCode={profile.dong.code} />
        </Suspense>
      </div>
      <div className="mt-3.5 flex flex-col gap-3.5 px-4">
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-[22px] bg-white/70" />
          }
        >
          <FeelSection dongCode={profile.dong.code} userId={userId} />
        </Suspense>
        <Suspense
          fallback={
            <div className="h-48 animate-pulse rounded-[18px] bg-white/70" />
          }
        >
          <PostsSection
            dongCode={profile.dong.code}
            dongName={profile.dong.name}
          />
        </Suspense>
      </div>
    </main>
  );
}

async function PostsSection({
  dongCode,
  dongName,
}: {
  dongCode: string;
  dongName: string;
}) {
  const supabase = await createClient();
  const { posts, total } = await listPosts(supabase, {
    dongCode,
    sort: "new",
    scope: "recent",
    limit: 3,
  });
  return <HomePosts posts={posts} total={total} dongName={dongName} />;
}

async function FeelSection({
  dongCode,
  userId,
}: {
  dongCode: string;
  userId: string;
}) {
  const supabase = await createClient();
  const summary = await getReactionSummary(supabase, dongCode, userId);
  // 동네를 바꾸면 카드 상태를 새로 시작
  return <FeelCard key={dongCode} initial={summary} />;
}

async function WeatherSection({ dongCode }: { dongCode: string }) {
  const supabase = await createClient();
  const { data: dong } = await supabase
    .from("dongs")
    .select("nx, ny")
    .eq("code", dongCode)
    .single();

  const weather = dong
    ? await getWeather(dong).catch((e) => {
        console.error(e);
        return null;
      })
    : null;

  if (!weather) {
    return (
      <div className="mx-4 mt-6 rounded-[20px] bg-white px-4 py-8 text-center">
        <p className="text-4xl" aria-hidden>
          🌫️
        </p>
        <p className="mt-2 text-[15px] text-[#3B5A75]">
          날씨를 불러오지 못했어요
          <br />
          잠시 후 다시 확인해주세요
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <WeatherHero weather={weather} />
      <div className="px-4">
        <HourlyForecast hourly={weather.hourly} />
      </div>
    </div>
  );
}

function WeatherSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3.5" aria-busy>
      <div className="mx-auto mt-5 h-21 w-56 rounded-3xl bg-white/60" />
      <div className="mx-auto h-11 w-40 rounded-xl bg-white/60" />
      <div className="mx-4 h-24 rounded-[20px] bg-white/70" />
      <div className="mx-4 h-32 rounded-[20px] bg-white/70" />
    </div>
  );
}
