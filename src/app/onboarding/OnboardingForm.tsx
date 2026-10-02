"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DongPicker } from "@/components/DongPicker";
import { NicknameField } from "@/components/NicknameField";
import { api, ApiError } from "@/lib/fetcher";
import { useNicknameCheck } from "@/lib/useNicknameCheck";
import type { Dong, Profile } from "@/types";

export function OnboardingForm() {
  const router = useRouter();
  const {
    nickname,
    change: changeNickname,
    check,
    setCheck,
  } = useNicknameCheck();
  const [dong, setDong] = useState<Dong | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canSubmit = check.status === "ok" && dong !== null && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api<Profile>("/api/profile", {
        method: "POST",
        body: JSON.stringify({
          nickname: nickname.trim(),
          dongCode: dong.code,
        }),
      });
      router.replace("/");
      router.refresh();
    } catch (e) {
      setSubmitting(false);
      if (e instanceof ApiError && e.code === "NICKNAME_TAKEN") {
        setCheck({ status: "error", message: e.message });
      } else if (e instanceof ApiError && e.code === "PROFILE_EXISTS") {
        router.replace("/");
      } else {
        setSubmitError(
          e instanceof ApiError ? e.message : "잠시 후 다시 시도해주세요",
        );
      }
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-[#F6FBFF]">
      <div className="flex flex-1 flex-col gap-7 px-6 pt-14 pb-4">
        <h1 className="text-2xl leading-[1.4] font-extrabold tracking-[-0.02em]">
          반가워요 👋
          <br />
          이웃에게 보일 정보를 알려주세요
        </h1>

        <NicknameField
          value={nickname}
          onChange={changeNickname}
          check={check}
        />

        <section className="flex flex-col gap-2.5">
          <h2 className="text-sm font-bold text-[#3B5A75]">내 동네</h2>
          <DongPicker value={dong} onChange={setDong} />
        </section>
      </div>

      <div className="sticky bottom-0 bg-[#F6FBFF] px-6 pt-3 pb-8.5">
        {submitError && (
          <p
            role="alert"
            className="mb-2 text-center text-sm font-semibold text-danger"
          >
            {submitError}
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="h-14 w-full rounded-[14px] bg-primary text-[17px] font-bold text-white disabled:bg-[#D9E4EC] disabled:text-[#9AACBB]"
        >
          {submitting ? "저장 중…" : "시작하기"}
        </button>
      </div>
    </main>
  );
}
