"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Post } from "@/types";

import { PostCard } from "./PostCard";
import { ReportSheet } from "./ReportSheet";
import { WriteButton } from "./WriteButton";

type Props = {
  posts: Post[]; // 최근 글 최신순 3개
  total: number; // 최근 6시간 글 수
  failed?: boolean; // 목록을 불러오지 못함
  dongName: string;
};

/** 메인: 한마디 미리보기 + 하단 고정 글쓰기 버튼 */
export function HomePosts({ posts, total, failed, dongName }: Props) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const [reporting, setReporting] = useState<Post | null>(null);

  return (
    <section className="flex flex-col gap-2.5 pt-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-extrabold">
          💬 동네 한마디{failed ? "" : ` · ${total}개`}
        </h2>
        <Link href="/posts" className="text-sm font-semibold text-primary">
          전체 보기 ›
        </Link>
      </div>

      {failed ? (
        <p className="rounded-[18px] bg-white px-4 py-7 text-center text-[15px] text-[#3B5A75]">
          글을 불러오지 못했어요. 잠시 후 다시 확인해주세요
        </p>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[18px] bg-white px-4 py-7 text-center">
          <span className="text-4xl" aria-hidden>
            📝
          </span>
          <p className="text-[15px] leading-normal text-[#3B5A75]">
            아직 한마디가 없어요.
            <br />
            <b className="text-ink">첫 글을 남겨보세요</b>
          </p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onDeleted={refresh}
            onReport={setReporting}
          />
        ))
      )}

      <ReportSheet
        post={reporting}
        onClose={() => setReporting(null)}
        onReported={() => {
          setReporting(null);
          refresh();
        }}
      />

      <WriteButton
        label="📣 지금 우리 동네 날씨 알려주기"
        dongName={dongName}
        onPosted={refresh}
      />
    </section>
  );
}
