"use client";

import { useState } from "react";

import { api, ApiError } from "@/lib/fetcher";
import type { Feel, ReactionSummary, ReactionTag } from "@/types";

const FEELS: {
  key: Feel;
  emoji: string;
  label: string;
  bar: string;
  text: string;
  selected: string;
}[] = [
  {
    key: "cold",
    emoji: "🥶",
    label: "추워요",
    bar: "bg-cold",
    text: "text-[#2F7BDB]",
    selected: "border-2 border-cold bg-[#E6F0FD]",
  },
  {
    key: "good",
    emoji: "😊",
    label: "딱 좋아요",
    bar: "bg-good",
    text: "text-[#1F9E62]",
    selected: "border-2 border-good bg-[#E7F7EF]",
  },
  {
    key: "hot",
    emoji: "🥵",
    label: "더워요",
    bar: "bg-hot",
    text: "text-[#E06D1E]",
    selected: "border-2 border-hot bg-[#FFF0E4]",
  },
];

const TAGS: { key: ReactionTag; label: string }[] = [
  { key: "rain", label: "☔ 비 와요" },
  { key: "wind", label: "💨 바람 세요" },
  { key: "clear", label: "🌤️ 그쳤어요" },
];

export function FeelCard({ initial }: { initial: ReactionSummary }) {
  const [summary, setSummary] = useState(initial);
  // 아직 투표 전에 고른 태그 (투표할 때 함께 보낸다)
  const [draftTags, setDraftTags] = useState<ReactionTag[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mine = summary.mine;
  const selectedTags = mine ? mine.tags : draftTags;

  async function submit(feel: Feel, tags: ReactionTag[]) {
    setPending(true);
    setError(null);
    try {
      setSummary(
        await api<ReactionSummary>("/api/reactions", {
          method: "POST",
          body: JSON.stringify({ feel, tags }),
        }),
      );
      setDraftTags([]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "반영하지 못했어요");
    } finally {
      setPending(false);
    }
  }

  function toggleTag(tag: ReactionTag) {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    if (mine) void submit(mine.feel, next);
    else setDraftTags(next);
  }

  const top = FEELS.reduce((a, b) =>
    summary.feel[b.key] > summary.feel[a.key] ? b : a,
  );
  const empty = summary.total === 0;

  return (
    <section className="flex flex-col gap-4 rounded-[22px] border-2 border-[#CFE6F8] bg-white px-4.5 py-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-extrabold">🏘️ 지금 동네 체감</h2>
        {!empty && (
          <p className="text-sm text-sub">
            최근 1시간 · {summary.total}명 참여 ·{" "}
            <b className={top.text}>
              {summary.percent[top.key]}%가 &apos;{top.label}&apos;
            </b>
          </p>
        )}
      </div>

      {empty ? (
        <>
          <div className="h-3.5 rounded-full bg-[repeating-linear-gradient(90deg,#E6EEF5_0_10px,#EEF4F9_10px_20px)]" />
          <p className="text-center text-[15px] leading-normal text-[#3B5A75]">
            🙋 아직 아무도 반응하지 않았어요.
            <br />
            <b className="text-ink">첫 번째로 알려주세요</b>
          </p>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <div
            className="flex h-3.5 gap-0.5 overflow-hidden rounded-full"
            role="img"
            aria-label={FEELS.map(
              (f) => `${f.label} ${summary.percent[f.key]}%`,
            ).join(", ")}
          >
            {FEELS.filter((f) => summary.percent[f.key] > 0).map((f) => (
              <div
                key={f.key}
                className={`${f.bar} transition-[width] duration-500`}
                style={{ width: `${summary.percent[f.key]}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs font-semibold">
            {FEELS.map((f) => (
              <span key={f.key} className={f.text}>
                {f.label} {summary.percent[f.key]}%
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {FEELS.map((f) => {
          const selected = mine?.feel === f.key;
          const dimmed = mine && !selected;
          return (
            <button
              key={f.key}
              type="button"
              disabled={pending}
              aria-pressed={selected}
              onClick={() => submit(f.key, selectedTags)}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl transition ${empty ? "h-19" : "h-21"} ${selected ? f.selected : "bg-field"} ${dimmed ? "opacity-60" : ""}`}
            >
              <span className="text-[30px]" aria-hidden>
                {f.emoji}
              </span>
              <b className={`text-sm ${selected ? f.text : ""}`}>{f.label}</b>
              {selected && (
                <span
                  className={`absolute top-1.5 right-2 flex size-5 items-center justify-center rounded-full ${f.bar} text-xs font-extrabold text-white`}
                  aria-hidden
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!empty && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-[#6B8299]">
            지금 상황은? <span className="font-normal">(여러 개 선택)</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TAGS.map((t) => {
              const selected = selectedTags.includes(t.key);
              return (
                <button
                  key={t.key}
                  type="button"
                  disabled={pending}
                  aria-pressed={selected}
                  onClick={() => toggleTag(t.key)}
                  className={`flex gap-1.5 rounded-full border-[1.5px] px-3 py-1.75 text-sm ${selected ? "border-primary bg-primary-soft font-bold text-primary-strong" : "border-line font-semibold"}`}
                >
                  {t.label}
                  <span className={selected ? "" : "text-muted"}>
                    {summary.tags[t.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-[#FFF1F0] px-3.5 py-2.75 text-[13px] font-semibold text-danger"
        >
          {error}
        </p>
      ) : (
        mine && (
          <p className="flex items-center gap-1.5 rounded-xl bg-canvas px-3.5 py-2.75 text-[13px] text-[#3B5A75]">
            ✅{" "}
            <span>
              <b>반영됐어요.</b> 1시간 안에는 바꿀 수만 있어요
            </span>
          </p>
        )
      )}
    </section>
  );
}
