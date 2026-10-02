"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/fetcher";
import { POST_TAGS } from "@/lib/postTags";
import type { Post, PostSort, PostTag } from "@/types";

import { PostCard } from "./PostCard";
import { WriteButton } from "./WriteButton";

type Props = {
  dongCode: string;
  dongName: string;
  initialRecent: Post[];
  initialOld: Post[];
};

const SORTS: { key: PostSort; label: string }[] = [
  { key: "new", label: "최신순" },
  { key: "like", label: "공감순" },
];

/** /posts: 정렬·태그 필터, 최근(6시간)/지난 글(24시간까지) 구분 */
export function PostList({
  dongCode,
  dongName,
  initialRecent,
  initialOld,
}: Props) {
  const [sort, setSort] = useState<PostSort>("new");
  const [tag, setTag] = useState<PostTag | null>(null);
  const [recent, setRecent] = useState(initialRecent);
  const [old, setOld] = useState(initialOld);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0); // 글쓰기 후 다시 불러오기
  const first = useRef(true);

  useEffect(() => {
    // 첫 화면은 서버에서 받은 데이터 사용
    if (first.current) {
      first.current = false;
      return;
    }
    const controller = new AbortController();
    const query = (scope: "recent" | "old") =>
      `/api/posts?${new URLSearchParams({
        dong: dongCode,
        sort,
        scope,
        ...(tag ? { tag } : {}),
      })}`;

    setLoading(true);
    Promise.all([
      api<Post[]>(query("recent"), { signal: controller.signal }),
      api<Post[]>(query("old"), { signal: controller.signal }),
    ])
      .then(([r, o]) => {
        setRecent(r);
        setOld(o);
        setError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [dongCode, sort, tag, version]);

  const removePost = (id: string) => {
    setRecent((list) => list.filter((p) => p.id !== id));
    setOld((list) => list.filter((p) => p.id !== id));
  };

  return (
    <main className="min-h-dvh pb-30">
      <header className="sticky top-0 z-30 border-b border-[#E6EEF5] bg-white">
        <div className="flex items-center gap-2 px-3 pt-4 pb-3">
          <Link
            href="/"
            aria-label="뒤로"
            className="flex size-10 items-center justify-center text-[26px]"
          >
            ‹
          </Link>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold">동네 한마디</h1>
            <span className="text-[13px] text-[#6B8299]">
              📍 {dongName} · 최근 6시간
            </span>
          </div>
        </div>
        <div className="flex gap-5 px-5" role="tablist">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={sort === s.key}
              onClick={() => setSort(s.key)}
              className={`py-2.5 text-[15px] ${sort === s.key ? "border-b-3 border-ink font-extrabold" : "font-semibold text-muted"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-4 py-3.5">
        {[{ key: null, label: "전체" }, ...POST_TAGS].map((t) => {
          const selected = tag === t.key;
          return (
            <button
              key={t.key ?? "all"}
              type="button"
              aria-pressed={selected}
              onClick={() => setTag(t.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.75 text-sm ${selected ? "bg-ink font-bold text-white" : "border-[1.5px] border-line bg-white font-semibold"}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        className={`flex flex-col gap-2.5 px-4 transition-opacity ${loading ? "opacity-60" : ""}`}
        aria-busy={loading}
      >
        {error && (
          <p className="rounded-[18px] bg-white px-4 py-5 text-center text-sm text-danger">
            글을 불러오지 못했어요. 잠시 후 다시 시도해주세요
          </p>
        )}

        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[18px] bg-white px-4 py-7 text-center">
            <span className="text-4xl" aria-hidden>
              {tag ? "🔍" : "📝"}
            </span>
            {tag ? (
              <p className="text-[15px] text-[#3B5A75]">
                최근 6시간 동안 올라온 글이 없어요
              </p>
            ) : (
              <p className="text-[15px] leading-normal text-[#3B5A75]">
                아직 한마디가 없어요.
                <br />
                <b className="text-ink">첫 글을 남겨보세요</b>
              </p>
            )}
          </div>
        ) : (
          recent.map((post) => (
            <PostCard key={post.id} post={post} onDeleted={removePost} />
          ))
        )}

        {old.length > 0 && (
          <>
            <div className="flex items-center gap-2.5 px-1 py-2.5 text-xs font-bold text-muted">
              <div className="h-px flex-1 bg-[#D6E2EC]" />
              🕕 6시간 지난 글
              <div className="h-px flex-1 bg-[#D6E2EC]" />
            </div>
            {old.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                dimmed
                onDeleted={removePost}
              />
            ))}
          </>
        )}
      </div>

      <WriteButton
        label="✏️ 한마디 남기기"
        dongName={dongName}
        onPosted={() => {
          setSort("new");
          setTag(null);
          setVersion((v) => v + 1);
        }}
      />
    </main>
  );
}
