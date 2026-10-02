"use client";

import { useState } from "react";

import { api, ApiError } from "@/lib/fetcher";
import { REPORT_REASONS, type ReportReason } from "@/lib/reportReasons";
import { toast } from "@/lib/toast";
import type { Post } from "@/types";

import { BottomSheet } from "./BottomSheet";

type Props = {
  post: Post | null; // null 이면 닫힘
  onClose: () => void;
  onReported: (id: string) => void;
};

export function ReportSheet({ post, onClose, onReported }: Props) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [pending, setPending] = useState(false);

  function close() {
    setReason(null);
    onClose();
  }

  async function submit() {
    if (!post || !reason || pending) return;
    setPending(true);
    try {
      await api(`/api/posts/${post.id}/report`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      toast("🚨 신고가 접수됐어요");
      setReason(null);
      onReported(post.id);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "신고하지 못했어요");
      // 이미 신고했거나 사라진 글이면 시트를 닫는다
      if (e instanceof ApiError && e.status !== 400) close();
    } finally {
      setPending(false);
    }
  }

  return (
    <BottomSheet open={post !== null} onClose={close} label="신고하기">
      <div className="flex flex-col gap-1">
        <b className="text-xl">🚨 이 한마디를 신고할까요?</b>
        <span className="text-sm text-[#6B8299]">사유를 하나 골라주세요</span>
      </div>

      <div role="radiogroup" aria-label="신고 사유" className="flex flex-col">
        {REPORT_REASONS.map((r) => {
          const selected = reason === r.key;
          return (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setReason(r.key)}
              className={`flex items-center gap-3 border-b border-[#EEF4F9] px-1 py-3.75 text-left text-base ${selected ? "font-bold" : "font-medium"}`}
            >
              <span
                aria-hidden
                className={`size-5.5 shrink-0 rounded-full ${selected ? "border-7 border-danger" : "border-2 border-[#CCD9E4]"}`}
              />
              {r.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!reason || pending}
        className="h-14 rounded-[14px] bg-danger text-[17px] font-extrabold text-white disabled:bg-[#D9E4EC] disabled:text-[#9AACBB]"
      >
        {pending ? "신고하는 중…" : "신고하기"}
      </button>
    </BottomSheet>
  );
}
