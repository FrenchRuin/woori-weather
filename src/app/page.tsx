import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { Emoji } from "@/components/Emoji";
import { FeelCard } from "@/components/FeelCard";
import { HomePosts } from "@/components/HomePosts";
import { MapPin, User } from "@/components/icons";
import {
  FeelSkeleton,
  PostsSkeleton,
  WeatherSkeleton,
} from "@/components/Skeletons";
import { HourlyForecast } from "@/components/HourlyForecast";
import { WeatherHero } from "@/components/WeatherHero";
import { WeatherIcon } from "@/components/WeatherIcon";
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
          <h1 className="text-xl font-extrabold">
            {/* 동네는 1개라 변경은 내 정보에서 */}
            <Link href="/me" className="flex items-center gap-1">
              <MapPin
                size={22}
                weight="fill"
                className="text-primary"
                aria-hidden
              />
              {profile.dong.name}
              <span className="text-sm text-sub" aria-hidden>
                ▾
              </span>
            </Link>
          </h1>
          <Link
            href="/me"
            aria-label="내 정보"
            className="flex size-10 items-center justify-center rounded-full bg-white text-ink"
          >
            <User size={22} aria-hidden />
          </Link>
        </header>
        <Suspense fallback={<WeatherSkeleton />}>
          <WeatherSection dongCode={profile.dong.code} />
        </Suspense>
      </div>
      <div className="mt-3.5 flex flex-col gap-3.5 px-4">
        <Suspense fallback={<FeelSkeleton />}>
          <FeelSection dongCode={profile.dong.code} userId={userId} />
        </Suspense>
        <Suspense fallback={<PostsSkeleton />}>
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
  const result = await orNull(
    listPosts(supabase, { dongCode, sort: "new", scope: "recent", limit: 3 }),
  );
  // 실패해도 글쓰기 버튼은 남긴다
  return (
    <HomePosts
      posts={result?.posts ?? []}
      total={result?.total ?? 0}
      failed={!result}
      dongName={dongName}
    />
  );
}

async function FeelSection({
  dongCode,
  userId,
}: {
  dongCode: string;
  userId: string;
}) {
  const supabase = await createClient();
  const summary = await orNull(getReactionSummary(supabase, dongCode, userId));
  if (!summary) {
    return (
      <SectionError
        icon={<Emoji name="raising-hand" size={48} />}
        message="투표 현황을 불러오지 못했어요"
      />
    );
  }
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

  const weather = dong ? await orNull(getWeather(dong)) : null;

  if (!weather) {
    return (
      <div className="mx-4 mt-6">
        <SectionError
          icon={<WeatherIcon name="fog" size={72} className="-my-2" />}
          message="날씨를 불러오지 못했어요"
        />
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

/** 섹션 하나가 실패해도 화면 전체가 에러가 되지 않게 */
function orNull<T>(promise: Promise<T>) {
  return promise.catch((e: unknown) => {
    console.error(e);
    return null;
  });
}

function SectionError({ icon, message }: { icon: ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center rounded-[20px] bg-white px-4 py-8 text-center">
      {icon}
      <p className="mt-2 text-[15px] text-[#3B5A75]">
        {message}
        <br />
        잠시 후 다시 확인해주세요
      </p>
    </div>
  );
}
