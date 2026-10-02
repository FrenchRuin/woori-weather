"use client";

import { useState } from "react";

import { api, ApiError } from "@/lib/fetcher";
import { POST_TAGS } from "@/lib/postTags";
import type { Post, PostTag } from "@/types";

import { BottomSheet } from "./BottomSheet";

const MAX = 200;
const QUICK_PHRASES = ["비 그쳤어요", "우산 챙기세요", "바람 때문에 추워요"];

type Props = {
  open: boolean;
  dongName: string;
  onClose: () => void;
  onPosted: (post: Post) => void;
};

export function WriteSheet({ open, dongName, onClose, onPosted }: Props) {
  const [content, setContent] = useState("");
  const [tag, setTag] = useState<PostTag | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const length = content.trim().length;
  const canSubmit = length > 0 && length <= MAX && !pending;

  function close() {
    setError(null);
    onClose();
  }

  function addPhrase(phrase: string) {
    const base = content.trimEnd();
    setContent((base ? `${base} ${phrase}` : phrase).slice(0, MAX));
  }

  async function submit() {
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      const post = await api<Post>("/api/posts", {
        method: "POST",
        body: JSON.stringify({ content: content.trim(), tag }),
      });
      setContent("");
      setTag(null);
      onPosted(post);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "올리지 못했어요");
    } finally {
      setPending(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={close} label="한마디 쓰기">
      <div className="flex items-center justify-between">
        <b className="text-xl">지금 {dongName} 날씨 어때요?</b>
        <button
          type="button"
          onClick={close}
          aria-label="닫기"
          className="text-[22px] text-muted"
        >
          ✕
        </button>
      </div>

      <label
        className={`flex h-33 flex-col justify-between rounded-[14px] p-3.5 ${content ? "border-2 border-primary" : "border-[1.5px] border-line focus-within:border-primary"}`}
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX))}
          autoFocus
          aria-label="한마디 내용"
          placeholder="창밖 날씨, 옷차림, 우산 필요 여부 등 지금 느끼는 걸 알려주세요"
          className="flex-1 resize-none bg-transparent text-base leading-[1.55] outline-none placeholder:text-[#9AACBB]"
        />
        <span className="text-right text-xs text-muted">
          <b className={length ? "text-primary" : "font-normal"}>{length}</b>/
          {MAX}
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-bold text-[#6B8299]">빠른 문구</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PHRASES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => addPhrase(p)}
              className="rounded-full bg-field px-3 py-1.75 text-sm font-semibold"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-bold text-[#6B8299]">
          태그 <span className="font-normal">(1개 · 선택)</span>
        </p>
        <div className="flex gap-1.5">
          {POST_TAGS.map((t) => {
            const selected = tag === t.key;
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={selected}
                onClick={() => setTag(selected ? null : t.key)}
                className={`rounded-full border-[1.5px] px-3 py-1.75 text-sm ${selected ? "border-primary bg-primary-soft font-bold text-primary-strong" : "border-line font-semibold"}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="text-center text-sm font-semibold text-danger"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="h-14 rounded-[14px] bg-primary text-[17px] font-extrabold text-white disabled:bg-[#D9E4EC] disabled:text-[#9AACBB]"
      >
        {pending ? "올리는 중…" : "올리기"}
      </button>
    </BottomSheet>
  );
}
