"use client";

import { useState } from "react";

import { toast } from "@/lib/toast";
import type { Post } from "@/types";

import { WriteSheet } from "./WriteSheet";

type Props = {
  label: string;
  dongName: string;
  onPosted: (post: Post) => void;
};

/** 하단 고정 글쓰기 버튼 + 글쓰기 시트 */
export function WriteButton({ label, dongName, onPosted }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[420px] bg-linear-to-b from-canvas/0 to-canvas to-35% px-4 pt-4 pb-[calc(30px+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-14.5 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[17px] font-extrabold text-white shadow-[0_8px_20px_rgba(43,149,233,.35)]"
        >
          {label}
        </button>
      </div>
      <WriteSheet
        open={open}
        dongName={dongName}
        onClose={() => setOpen(false)}
        onPosted={(post) => {
          setOpen(false);
          toast("✅ 동네에 공유했어요");
          onPosted(post);
        }}
      />
    </>
  );
}
