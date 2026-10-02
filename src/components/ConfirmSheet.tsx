"use client";

import { BottomSheet } from "./BottomSheet";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel,
  pending,
  onConfirm,
  onClose,
}: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} label={title}>
      <div className="flex flex-col gap-1">
        <b className="text-xl">{title}</b>
        {description && (
          <span className="text-sm text-[#6B8299]">{description}</span>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-14 flex-1 rounded-[14px] bg-field text-[17px] font-bold text-sub"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="h-14 flex-1 rounded-[14px] bg-danger text-[17px] font-extrabold text-white disabled:opacity-60"
        >
          {pending ? "처리 중…" : confirmLabel}
        </button>
      </div>
    </BottomSheet>
  );
}
