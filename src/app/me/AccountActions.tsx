"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmSheet } from "@/components/ConfirmSheet";
import { api, ApiError } from "@/lib/fetcher";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

export function AccountActions() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  function leave() {
    router.replace("/login");
    router.refresh();
  }

  async function logout() {
    await createClient().auth.signOut();
    leave();
  }

  async function withdraw() {
    setPending(true);
    try {
      await api("/api/account", { method: "DELETE" });
      toast("탈퇴했어요. 그동안 고마웠어요");
      leave();
    } catch (e) {
      setPending(false);
      toast(e instanceof ApiError ? e.message : "탈퇴하지 못했어요");
    }
  }

  return (
    <div className="mt-auto flex justify-center gap-4 pt-6 pb-7.5 text-[13px] text-muted">
      <button type="button" onClick={logout}>
        로그아웃
      </button>
      <span aria-hidden className="text-[#D6E2EC]">
        |
      </span>
      <button type="button" onClick={() => setConfirming(true)}>
        회원 탈퇴
      </button>

      <ConfirmSheet
        open={confirming}
        title="정말 탈퇴할까요?"
        description="내가 쓴 한마디, 투표, 공감이 모두 지워지고 되돌릴 수 없어요"
        confirmLabel="탈퇴하기"
        pending={pending}
        onConfirm={withdraw}
        onClose={() => setConfirming(false)}
      />
    </div>
  );
}
