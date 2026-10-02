import { PostsSkeleton, SubHeaderSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <main className="min-h-dvh">
      <SubHeaderSkeleton title="동네 한마디" />
      <div className="px-4 pt-17">
        <PostsSkeleton count={4} />
      </div>
    </main>
  );
}
