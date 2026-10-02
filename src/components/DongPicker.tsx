"use client";

import { useEffect, useRef, useState } from "react";

import { api, ApiError } from "@/lib/fetcher";
import { regionLabel } from "@/lib/region";
import type { Dong } from "@/types";

type LocateState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "error"; message: string };

type Props = {
  value: Dong | null;
  onChange: (dong: Dong) => void;
};

export function DongPicker({ value, onChange }: Props) {
  const [locate, setLocate] = useState<LocateState>({ status: "idle" });
  const [nearby, setNearby] = useState<Dong | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Dong[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  function findByLocation() {
    if (!("geolocation" in navigator)) {
      setLocate({
        status: "error",
        message: "이 브라우저는 위치 찾기를 지원하지 않아요",
      });
      return;
    }
    setLocate({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const dong = await api<Dong>(
            `/api/dong/by-coord?lat=${coords.latitude}&lng=${coords.longitude}`,
          );
          setNearby(dong);
          onChangeRef.current(dong);
          setLocate({ status: "idle" });
        } catch (e) {
          setLocate({
            status: "error",
            message:
              e instanceof ApiError ? e.message : "위치로 동네를 찾지 못했어요",
          });
        }
      },
      (err) =>
        setLocate({
          status: "error",
          message:
            err.code === err.PERMISSION_DENIED
              ? "위치 권한이 꺼져 있어요. 동네 이름으로 검색해주세요"
              : "위치를 찾지 못했어요. 동네 이름으로 검색해주세요",
        }),
      { timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }

  // 위치 권한이 이미 허용돼 있으면 바로 추천
  useEffect(() => {
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((p) => {
        if (p.state === "granted") findByLocation();
      })
      .catch(() => {});
  }, []);

  // 검색 (디바운스)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const list = await api<Dong[]>(
          `/api/dong/search?q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        );
        setResults(list);
        setSearchError(null);
      } catch (e) {
        if (controller.signal.aborted) return;
        setSearchError(e instanceof ApiError ? e.message : "검색하지 못했어요");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  function changeQuery(next: string) {
    setQuery(next);
    if (next.trim().length < 2) {
      setResults(null);
      setSearchError(null);
      setSearching(false);
    }
  }

  const items: { dong: Dong; nearby: boolean }[] = [];
  if (nearby && !results) items.push({ dong: nearby, nearby: true });
  for (const dong of results ?? []) {
    items.push({ dong, nearby: dong.code === nearby?.code });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={findByLocation}
        disabled={locate.status === "locating"}
        className="flex h-12 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-primary bg-white text-[15px] font-bold text-primary disabled:opacity-60"
      >
        📍 {locate.status === "locating" ? "위치 찾는 중…" : "현재 위치로 찾기"}
      </button>
      {locate.status === "error" && (
        <p className="text-[13px] font-semibold text-danger">
          {locate.message}
        </p>
      )}

      <label className="flex h-13 items-center gap-2 rounded-xl border-[1.5px] border-[#D6E4EF] bg-white px-3.5 focus-within:border-primary">
        <span aria-hidden>🔍</span>
        <input
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
          placeholder="동 이름이나 역, 장소로 검색"
          className="h-full flex-1 bg-transparent text-base outline-none placeholder:text-muted"
          enterKeyHint="search"
        />
        {searching && <span className="text-[13px] text-muted">검색 중…</span>}
      </label>
      {searchError && (
        <p className="text-[13px] font-semibold text-danger">{searchError}</p>
      )}

      {items.length > 0 && (
        <ul className="overflow-hidden rounded-xl border-[1.5px] border-[#E3EEF7] bg-white">
          {items.map(({ dong, nearby }) => {
            const selected = value?.code === dong.code;
            return (
              <li
                key={dong.code}
                className="border-b border-[#EEF4F9] last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => onChange(dong)}
                  aria-pressed={selected}
                  className={`flex w-full items-center justify-between px-4 py-3.5 text-left text-[15px] ${selected ? "bg-primary-soft" : ""}`}
                >
                  <span>
                    <b className={selected ? "text-primary-strong" : ""}>
                      {dong.name}
                    </b>
                    <span className="text-[#6B8299]">
                      {" · "}
                      {regionLabel(dong)}
                    </span>
                    {nearby && (
                      <span className="ml-1.5 rounded-md bg-field px-1.5 py-0.5 text-[11px] font-bold text-sub">
                        현재 위치
                      </span>
                    )}
                  </span>
                  {selected && (
                    <span className="font-extrabold text-primary">✓</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {results && results.length === 0 && !searching && (
        <p className="py-3 text-center text-sm text-sub">
          검색 결과가 없어요. 다른 이름으로 찾아보세요
        </p>
      )}
    </div>
  );
}
