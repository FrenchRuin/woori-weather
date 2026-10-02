"use client";

import { useState } from "react";

import { api, ApiError } from "@/lib/fetcher";
import { postTagMeta } from "@/lib/postTags";
import { relativeTime } from "@/lib/time";
import { toast } from "@/lib/toast";
import type { Post } from "@/types";

import { ConfirmSheet } from "./ConfirmSheet";

type Props = {
  post: Post;
  dimmed?: boolean; // 6시간 지난 글
  onDeleted?: (id: string) => void;
  onReport?: (post: Post) => void;
};

export function PostCard({ post, dimmed, onDeleted, onReport }: Props) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [liking, setLiking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function toggleLike() {
    if (liking) return;
    setLiking(true);
    // 낙관적 반영
    setLiked(!liked);
    setLikeCount(likeCount + (liked ? -1 : 1));
    try {
      const res = await api<{ liked: boolean; likeCount: number }>(
        `/api/posts/${post.id}/like`,
        { method: "POST" },
      );
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch (e) {
      setLiked(liked);
      setLikeCount(likeCount);
      toast(e instanceof ApiError ? e.message : "공감하지 못했어요");
    } finally {
      setLiking(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await api(`/api/posts/${post.id}`, { method: "DELETE" });
      setConfirming(false);
      toast("삭제했어요");
      onDeleted?.(post.id);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "삭제하지 못했어요");
    } finally {
      setDeleting(false);
    }
  }

  const tag = post.tag ? postTagMeta(post.tag) : null;

  return (
    <article
      className={`flex flex-col gap-2.5 rounded-[18px] bg-white p-4 ${dimmed ? "opacity-45" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <b className="truncate text-sm">{post.nickname}</b>
          {post.isMine && (
            <span className="rounded-[5px] bg-primary px-1.5 py-0.5 text-[11px] font-extrabold text-white">
              나
            </span>
          )}
          <time
            dateTime={post.createdAt}
            suppressHydrationWarning
            className="shrink-0 text-xs text-muted"
          >
            {relativeTime(post.createdAt)}
          </time>
        </div>
        {tag && (
          <span
            className={`shrink-0 rounded-md px-2 py-0.75 text-xs font-semibold ${tag.badge}`}
          >
            {tag.label}
          </span>
        )}
      </div>

      <p className="text-[15px] leading-[1.55] break-words whitespace-pre-wrap">
        {post.content}
      </p>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          className={`flex items-center gap-1.25 rounded-full px-2.75 py-1.25 text-[13px] font-bold ${liked ? "border-[1.5px] border-[#9FD0F5] bg-[#E3F1FD] text-primary-strong" : "bg-field text-sub"}`}
        >
          {liked ? "💙" : "🤍"} 공감 {likeCount}
        </button>
        {post.isMine ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-xs font-semibold text-[#E0403D]"
          >
            삭제
          </button>
        ) : (
          onReport && (
            <button
              type="button"
              onClick={() => onReport(post)}
              className="text-xs text-[#9AACBB]"
            >
              🚨 신고
            </button>
          )
        )}
      </div>

      <ConfirmSheet
        open={confirming}
        title="이 한마디를 삭제할까요?"
        description="삭제하면 되돌릴 수 없어요"
        confirmLabel="삭제하기"
        pending={deleting}
        onConfirm={remove}
        onClose={() => setConfirming(false)}
      />
    </article>
  );
}
