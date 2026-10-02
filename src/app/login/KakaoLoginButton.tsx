"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function KakaoLoginButton() {
  const [pending, setPending] = useState(false);

  async function login() {
    setPending(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setPending(false);
  }

  return (
    <button
      type="button"
      onClick={login}
      disabled={pending}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-kakao text-[17px] font-bold text-[#191600] disabled:opacity-60"
    >
      💬 {pending ? "카카오로 이동 중…" : "카카오로 시작하기"}
    </button>
  );
}
