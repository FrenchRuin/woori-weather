"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DongPicker } from "@/components/DongPicker";
import { api, ApiError } from "@/lib/fetcher";
import { nicknameSchema } from "@/lib/validation";
import type { Dong, Profile } from "@/types";

type NicknameCheck =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok" }
  | { status: "error"; message: string };

/** 형식 검사는 즉시, 중복 확인은 서버 응답으로 */
function localCheck(value: string): NicknameCheck {
  if (!value) return { status: "idle" };
  const parsed = nicknameSchema.safeParse(value);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }
  return { status: "checking" };
}

export function OnboardingForm() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [check, setCheck] = useState<NicknameCheck>({ status: "idle" });
  const [dong, setDong] = useState<Dong | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function changeNickname(next: string) {
    setNickname(next);
    setCheck(localCheck(next.trim()));
  }

  // 중복 확인 (디바운스)
  useEffect(() => {
    const value = nickname.trim();
    if (localCheck(value).status !== "checking") return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await api<{ available: boolean; reason?: string }>(
          `/api/nickname/check?name=${encodeURIComponent(value)}`,
          { signal: controller.signal },
        );
        setCheck(
          res.available
            ? { status: "ok" }
            : {
                status: "error",
                message: res.reason ?? "쓸 수 없는 닉네임이에요",
              },
        );
      } catch {
        if (!controller.signal.aborted) {
          setCheck({ status: "error", message: "중복 확인에 실패했어요" });
        }
      }
    }, 400);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [nickname]);

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

  const border =
    check.status === "error"
      ? "border-2 border-danger"
      : check.status === "ok"
        ? "border-2 border-primary"
        : "border-[1.5px] border-[#D6E4EF] focus-within:border-primary";

  return (
    <main className="flex min-h-dvh flex-col bg-[#F6FBFF]">
      <div className="flex flex-1 flex-col gap-7 px-6 pt-14 pb-4">
        <h1 className="text-2xl leading-[1.4] font-extrabold tracking-[-0.02em]">
          반가워요 👋
          <br />
          이웃에게 보일 정보를 알려주세요
        </h1>

        <section className="flex flex-col gap-2">
          <label
            htmlFor="nickname"
            className="text-sm font-bold text-[#3B5A75]"
          >
            닉네임
          </label>
          <div
            className={`flex h-13 items-center justify-between rounded-xl bg-white px-3.5 ${border}`}
          >
            <input
              id="nickname"
              value={nickname}
              onChange={(e) => changeNickname(e.target.value)}
              maxLength={10}
              autoComplete="off"
              placeholder="2~10자, 한글·영문·숫자"
              className="h-full flex-1 bg-transparent text-base outline-none placeholder:text-muted"
            />
            <span className="text-[13px] text-muted">
              {nickname.trim().length}/10
            </span>
          </div>
          {check.status === "error" && (
            <p className="text-[13px] font-semibold text-[#E0403D]">
              ⚠️ {check.message}
            </p>
          )}
          {check.status === "ok" && (
            <p className="text-[13px] font-semibold text-[#1F9E62]">
              ✅ 사용할 수 있는 닉네임이에요
            </p>
          )}
          {check.status === "checking" && (
            <p className="text-[13px] text-muted">확인 중…</p>
          )}
        </section>

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
