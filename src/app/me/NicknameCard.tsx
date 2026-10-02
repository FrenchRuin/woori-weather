"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { BottomSheet } from "@/components/BottomSheet";
import { NicknameField } from "@/components/NicknameField";
import { api, ApiError } from "@/lib/fetcher";
import { monthDay } from "@/lib/time";
import { toast } from "@/lib/toast";
import { useNicknameCheck } from "@/lib/useNicknameCheck";
import type { Profile } from "@/types";

type Props = {
  nickname: string;
  cooldownUntil: string | null; // 이 시각 전에는 변경 불가 (R4)
};

export function NicknameCard({ nickname, cooldownUntil }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section className="flex flex-col gap-3.5 rounded-[20px] bg-white p-4.5">
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className="flex size-14 items-center justify-center rounded-full bg-[#E3F2FD] text-[30px]"
        >
          🚶
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs font-semibold text-muted">닉네임</span>
          <b className="truncate text-[19px]">{nickname}</b>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={cooldownUntil !== null}
          className="rounded-[10px] border-[1.5px] border-line px-3 py-2 text-sm font-bold disabled:text-[#9AACBB]"
        >
          변경
        </button>
      </div>
      <p className="rounded-[10px] bg-canvas px-3 py-2.25 text-xs break-keep text-[#6B8299]">
        ℹ️ 닉네임은 30일에 1회 변경 가능해요
        {cooldownUntil && ` · 다음 변경 ${monthDay(cooldownUntil)}부터`}
      </p>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        label="닉네임 변경"
      >
        <NicknameForm current={nickname} onDone={() => setOpen(false)} />
      </BottomSheet>
    </section>
  );
}

/** 시트가 열릴 때마다 새로 마운트되어 입력이 초기화된다 */
function NicknameForm({
  current,
  onDone,
}: {
  current: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const { nickname, change, check, setCheck } = useNicknameCheck(current);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (check.status !== "ok" || pending) return;
    setPending(true);
    try {
      await api<Profile>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ nickname: nickname.trim() }),
      });
      toast("닉네임을 바꿨어요");
      onDone();
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.code === "NICKNAME_TAKEN") {
        setCheck({ status: "error", message: e.message });
      } else {
        toast(e instanceof ApiError ? e.message : "바꾸지 못했어요");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <b className="text-xl">닉네임 바꾸기</b>
        <span className="text-sm text-[#6B8299]">
          바꾸면 30일 동안 다시 바꿀 수 없어요
        </span>
      </div>
      <NicknameField
        value={nickname}
        onChange={change}
        check={check}
        autoFocus
      />
      <button
        type="button"
        onClick={submit}
        disabled={check.status !== "ok" || pending}
        className="h-14 rounded-[14px] bg-primary text-[17px] font-extrabold text-white disabled:bg-[#D9E4EC] disabled:text-[#9AACBB]"
      >
        {pending ? "바꾸는 중…" : "바꾸기"}
      </button>
    </>
  );
}
