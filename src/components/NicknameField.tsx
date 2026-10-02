"use client";

import type { NicknameCheck } from "@/lib/useNicknameCheck";

type Props = {
  value: string;
  onChange: (value: string) => void;
  check: NicknameCheck;
  autoFocus?: boolean;
};

/** 닉네임 입력 + 확인 결과 (온보딩, 닉네임 변경) */
export function NicknameField({ value, onChange, check, autoFocus }: Props) {
  const border =
    check.status === "error"
      ? "border-2 border-danger"
      : check.status === "ok"
        ? "border-2 border-primary"
        : "border-[1.5px] border-[#D6E4EF] focus-within:border-primary";

  return (
    <section className="flex flex-col gap-2">
      <label htmlFor="nickname" className="text-sm font-bold text-[#3B5A75]">
        닉네임
      </label>
      <div
        className={`flex h-13 items-center justify-between rounded-xl bg-white px-3.5 ${border}`}
      >
        <input
          id="nickname"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={10}
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="2~10자, 한글·영문·숫자"
          className="h-full flex-1 bg-transparent text-base outline-none placeholder:text-muted"
        />
        <span className="text-[13px] text-muted">{value.trim().length}/10</span>
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
  );
}
