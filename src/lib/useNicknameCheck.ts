"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/fetcher";
import { nicknameSchema } from "@/lib/validation";

export type NicknameCheck =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok" }
  | { status: "error"; message: string };

/** 형식 검사는 즉시, 중복 확인은 서버 응답으로 */
function localCheck(value: string, current?: string): NicknameCheck {
  if (!value) return { status: "idle" };
  const parsed = nicknameSchema.safeParse(value);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }
  if (value === current) {
    return { status: "error", message: "지금 쓰고 있는 닉네임이에요" };
  }
  return { status: "checking" };
}

/** 닉네임 입력 + 형식/중복 확인 (디바운스). current 는 변경 시 지금 닉네임 */
export function useNicknameCheck(current?: string) {
  const [nickname, setNickname] = useState("");
  const [check, setCheck] = useState<NicknameCheck>({ status: "idle" });

  function change(next: string) {
    setNickname(next);
    setCheck(localCheck(next.trim(), current));
  }

  useEffect(() => {
    const value = nickname.trim();
    if (localCheck(value, current).status !== "checking") return;
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
  }, [nickname, current]);

  return { nickname, change, check, setCheck };
}
