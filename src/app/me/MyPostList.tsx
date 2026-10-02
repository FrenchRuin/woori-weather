"use client";

import { useState } from "react";

import { ConfirmSheet } from "@/components/ConfirmSheet";
import { api, ApiError } from "@/lib/fetcher";
import { postTagMeta } from "@/lib/postTags";
import { relativeTime } from "@/lib/time";
import { toast } from "@/lib/toast";
import type { MyPost } from "@/types";

/** 내가 쓴 한마디: 기간 제한 없이 전부, 신고로 숨겨진 글은 배지 표시 */
export function MyPostList({ initial }: { initial: MyPost[] }) {
  const [posts, setPosts] = useState(initial);
  const [deleting, setDeleting] = useState<MyPost | null>(null);
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!deleting) return;
    setPending(true);
    try {
      await api(`/api/posts/${deleting.id}`, { method: "DELETE" });
      setPosts((list) => list.filter((p) => p.id !== deleting.id));
      setDeleting(null);
      toast("삭제했어요");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "삭제하지 못했어요");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-1 pt-3 text-base font-extrabold">
        ✏️ 내가 쓴 한마디 · {posts.length}
      </h2>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[18px] bg-white px-4 py-7 text-center">
          <span className="text-4xl" aria-hidden>
            📝
          </span>
          <p className="text-[15px] text-[#3B5A75]">아직 쓴 한마디가 없어요</p>
        </div>
      ) : (
        posts.map((post) => {
          const tag = post.tag ? postTagMeta(post.tag) : null;
          return (
            <article
              key={post.id}
              className="flex flex-col gap-2.5 rounded-[18px] bg-white p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <time
                    dateTime={post.createdAt}
                    suppressHydrationWarning
                    className="text-xs text-muted"
                  >
                    {relativeTime(post.createdAt)}
                  </time>
                  {post.isHidden && (
                    <span className="rounded-[5px] bg-[#FDECEC] px-1.5 py-0.5 text-[11px] font-bold text-[#E0403D]">
                      숨김
                    </span>
                  )}
                </div>
                {tag && (
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.75 text-xs font-semibold ${tag.badge}`}
                  >
                    {tag.label}
                  </span>
                )}
              </div>
              <p
                className={`text-[15px] leading-[1.55] break-words whitespace-pre-wrap ${post.isHidden ? "text-muted" : ""}`}
              >
                {post.content}
              </p>
              {post.isHidden && (
                <p className="rounded-[10px] bg-canvas px-3 py-2 text-xs text-[#6B8299]">
                  신고가 쌓여 이웃에게는 보이지 않아요
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#6B8299]">
                  💙 공감 {post.likeCount}
                </span>
                <button
                  type="button"
                  onClick={() => setDeleting(post)}
                  className="text-xs font-semibold text-[#E0403D]"
                >
                  삭제
                </button>
              </div>
            </article>
          );
        })
      )}

      <ConfirmSheet
        open={deleting !== null}
        title="이 한마디를 삭제할까요?"
        description="삭제하면 되돌릴 수 없어요"
        confirmLabel="삭제하기"
        pending={pending}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
}
