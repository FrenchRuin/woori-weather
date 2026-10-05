"use client";

import { useEffect, type ReactNode } from "react";

import { lockBodyScroll } from "@/lib/scrollLock";

type Props = {
  open: boolean;
  onClose: () => void;
  label: string; // 스크린리더용 시트 이름
  children: ReactNode;
};

/** 공통 바텀 시트: 바깥 탭 / ESC 로 닫힘 */
export function BottomSheet({ open, onClose, label, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // 시트가 겹쳐 열려도 마지막 시트가 닫힐 때 풀린다
    const unlock = lockBodyScroll();
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 animate-[fade-in_.15s_ease-out] bg-[rgba(15,32,48,.45)]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative flex max-h-[90dvh] w-full max-w-[420px] animate-[sheet-up_.2s_ease-out] flex-col gap-4.5 overflow-y-auto rounded-t-[26px] bg-white px-5 pt-2.5 pb-[calc(34px+env(safe-area-inset-bottom))]"
      >
        <div className="h-1.25 w-10 self-center rounded-full bg-[#D6E2EC]" />
        {children}
      </div>
    </div>
  );
}
