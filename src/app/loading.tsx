import {
  FeelSkeleton,
  PostsSkeleton,
  WeatherSkeleton,
} from "@/components/Skeletons";

export default function Loading() {
  return (
    <main className="min-h-dvh pb-28">
      <div className="bg-linear-to-b from-[#C6E6FB] to-canvas pb-2">
        <div className="flex items-center justify-between px-5 pt-6 pb-1.5">
          <div className="h-7 w-28 animate-pulse rounded-lg bg-white/60" />
          <div className="size-10 rounded-full bg-white" />
        </div>
        <WeatherSkeleton />
      </div>
      <div className="mt-3.5 flex flex-col gap-3.5 px-4">
        <FeelSkeleton />
        <PostsSkeleton count={2} />
      </div>
    </main>
  );
}
