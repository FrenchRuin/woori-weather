"use client";

import { useEffect, useState } from "react";

import type { DongPin } from "@/lib/dongPins";
import { api } from "@/lib/fetcher";
import type { Post } from "@/types";

import { BottomSheet } from "./BottomSheet";
import { Emoji } from "./Emoji";
import { PostCard } from "./PostCard";
import { ReportSheet } from "./ReportSheet";
import { PostsSkeleton } from "./Skeletons";

type Props = {
  dong: DongPin | null; // null 이면 닫힘
  onClose: () => void;
};

/** 지도에서 고른 동네의 최근 6시간 한마디 (읽기 + 공감·신고) */
export function DongPostsSheet({ dong, onClose }: Props) {
  const [version, setVersion] = useState(0); // 신고 후 다시 불러오기
  // 어느 요청(동네·버전)의 결과인지 함께 둔다. 지금 요청과 다르면 불러오는 중
  const [result, setResult] = useState<{
    key: string;
    posts: Post[] | null; // null 이면 실패
  } | null>(null);
  const [reporting, setReporting] = useState<Post | null>(null);
  const code = dong?.code;
  const key = `${code}:${version}`;

  useEffect(() => {
    if (!code) return;
    // 다른 동네를 누르면 이전 요청은 버린다
    const controller = new AbortController();
    api<Post[]>(
      `/api/posts?${new URLSearchParams({ dong: code, scope: "recent", sort: "new" })}`,
      { signal: controller.signal },
    )
      .then((list) => setResult({ key, posts: list }))
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key, posts: null });
      });
    return () => controller.abort();
  }, [code, key]);

  const current = result?.key === key ? result : null;
  const posts = current?.posts ?? null;
  const failed = current !== null && current.posts === null;

  const count = posts?.length ?? dong?.count ?? 0;

  return (
    <>
      <BottomSheet
        open={dong !== null}
        onClose={onClose}
        label={`${dong?.name ?? ""} 한마디`}
      >
        <div className="flex flex-col gap-1">
          <b className="text-xl">{dong?.name}</b>
          <span className="text-sm text-[#6B8299]">최근 6시간 · {count}개</span>
        </div>

        {failed ? (
          <p className="rounded-[18px] bg-canvas px-4 py-6 text-center text-sm text-danger">
            글을 불러오지 못했어요
          </p>
        ) : posts === null ? (
          <PostsSkeleton count={2} />
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[18px] bg-canvas px-4 py-7 text-center">
            <Emoji name="memo" size={48} />
            <p className="text-[15px] text-[#3B5A75]">아직 한마디가 없어요</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 [&>article]:border [&>article]:border-[#E6EEF5]">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDeleted={(id) =>
                  setResult((r) =>
                    r?.posts
                      ? { ...r, posts: r.posts.filter((p) => p.id !== id) }
                      : r,
                  )
                }
                onReport={setReporting}
              />
            ))}
          </div>
        )}
      </BottomSheet>

      {/* 시트 위에 겹쳐 열리도록 뒤에 둔다 */}
      <ReportSheet
        post={reporting}
        onClose={() => setReporting(null)}
        onReported={() => {
          setReporting(null);
          setVersion((v) => v + 1); // 3건 누적으로 숨겨졌으면 목록에서 빠진다
        }}
      />
    </>
  );
}
