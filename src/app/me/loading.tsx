import { PostsSkeleton, SubHeaderSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <main className="min-h-dvh">
      <SubHeaderSkeleton title="내 정보" />
      <div className="flex animate-pulse flex-col gap-3 p-4" aria-busy>
        <div className="h-36 rounded-[20px] bg-white/80" />
        <div className="h-18 rounded-[20px] bg-white/80" />
      </div>
      <div className="px-4 pt-10">
        <PostsSkeleton count={2} />
      </div>
    </main>
  );
}
