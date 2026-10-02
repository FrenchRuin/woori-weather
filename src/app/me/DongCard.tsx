"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { BottomSheet } from "@/components/BottomSheet";
import { DongPicker } from "@/components/DongPicker";
import { api, ApiError } from "@/lib/fetcher";
import { regionLabel } from "@/lib/region";
import { toast } from "@/lib/toast";
import type { Dong, Profile } from "@/types";

export function DongCard({ dong }: { dong: Dong }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 rounded-[20px] bg-white px-4.5 py-4 text-left"
      >
        <span aria-hidden className="text-2xl">
          📍
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs font-semibold text-muted">내 동네</span>
          <b className="truncate text-base">
            {dong.name}{" "}
            <span className="font-medium text-[#6B8299]">
              · {regionLabel(dong)}
            </span>
          </b>
        </span>
        <span className="shrink-0 text-sm font-bold text-primary">
          변경하기 ›
        </span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} label="동네 변경">
        <DongForm current={dong} onDone={() => setOpen(false)} />
      </BottomSheet>
    </>
  );
}

/** R5: 동네는 1개. 바꾸면 이후 투표/글은 새 동네 기준 */
function DongForm({ current, onDone }: { current: Dong; onDone: () => void }) {
  const router = useRouter();
  const [dong, setDong] = useState<Dong | null>(null);
  const [pending, setPending] = useState(false);
  const changed = dong !== null && dong.code !== current.code;

  async function submit() {
    if (!changed || pending) return;
    setPending(true);
    try {
      await api<Profile>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ dongCode: dong.code }),
      });
      toast(`📍 내 동네를 ${dong.name}(으)로 바꿨어요`);
      onDone();
      router.refresh();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "바꾸지 못했어요");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <b className="text-xl">동네 바꾸기</b>
        <span className="text-sm text-[#6B8299]">
          지금은 {current.name} · 바꾸면 이후 투표와 글은 새 동네 기준이에요
        </span>
      </div>
      <DongPicker value={dong} onChange={setDong} />
      <button
        type="button"
        onClick={submit}
        disabled={!changed || pending}
        className="h-14 shrink-0 rounded-[14px] bg-primary text-[17px] font-extrabold text-white disabled:bg-[#D9E4EC] disabled:text-[#9AACBB]"
      >
        {pending
          ? "바꾸는 중…"
          : changed
            ? `${dong.name}(으)로 바꾸기`
            : "새 동네를 골라주세요"}
      </button>
    </>
  );
}
