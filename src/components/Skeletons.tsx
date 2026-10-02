/** 로딩 중 자리 표시 (loading.tsx, Suspense fallback) */

export function WeatherSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3.5" aria-busy>
      <div className="mx-auto mt-5 h-21 w-56 rounded-3xl bg-white/60" />
      <div className="mx-auto h-11 w-40 rounded-xl bg-white/60" />
      <div className="mx-4 h-24 rounded-[20px] bg-white/70" />
      <div className="mx-4 h-32 rounded-[20px] bg-white/70" />
    </div>
  );
}

export function FeelSkeleton() {
  return <div className="h-64 animate-pulse rounded-[22px] bg-white/70" />;
}

export function PostsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex animate-pulse flex-col gap-2.5" aria-busy>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-32 rounded-[18px] bg-white/80" />
      ))}
    </div>
  );
}

/** 뒤로 가기 + 제목만 있는 하위 화면 헤더 */
export function SubHeaderSkeleton({ title }: { title: string }) {
  return (
    <header className="bg-white">
      <div className="flex items-center gap-2 px-3 pt-4 pb-3">
        <span className="flex size-10 items-center justify-center text-[26px] text-muted">
          ‹
        </span>
        <h1 className="text-lg font-bold">{title}</h1>
      </div>
    </header>
  );
}
