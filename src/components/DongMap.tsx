"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import type { DongPin } from "@/lib/dongPins";

import { Crosshair } from "./icons";

const KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
const SDK_URL = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false`;
const LEVEL = 6; // 동네 이름이 겹치지 않고 주변 동네가 보이는 정도
const FALLBACK = { lat: 37.5665, lng: 126.978 }; // 내 동네 좌표가 없을 때(서울시청)

type Props = { pins: DongPin[] };

/** 이웃 동네 지도: 동네마다 최근 6시간 이야기 수 말풍선 */
export function DongMap({ pins }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [failed, setFailed] = useState(!KEY);
  const [selected, setSelected] = useState<DongPin | null>(null);

  const home = pins.find((p) => p.mine) ?? FALLBACK;
  const empty = pins.every((p) => p.count === 0);

  useEffect(() => {
    const container = containerRef.current;
    const maps = window.kakao?.maps;
    if (!sdkReady || !container || !maps) return;

    const map = new maps.Map(container, {
      center: new maps.LatLng(home.lat, home.lng),
      level: LEVEL,
    });
    mapRef.current = map;
    const overlays = pins.map(
      (pin) =>
        new maps.CustomOverlay({
          position: new maps.LatLng(pin.lat, pin.lng),
          content: pinElement(pin, () => setSelected(pin)),
          yAnchor: 0.5,
          zIndex: pin.mine ? 2 : 1,
          clickable: true,
          map,
        }),
    );
    return () => {
      overlays.forEach((o) => o.setMap(null));
      mapRef.current = null;
      container.replaceChildren(); // 다시 그릴 때 지도 DOM 이 쌓이지 않게
    };
  }, [sdkReady, pins, home.lat, home.lng]);

  function goHome() {
    const maps = window.kakao?.maps;
    if (maps) mapRef.current?.panTo(new maps.LatLng(home.lat, home.lng));
  }

  return (
    <main className="relative h-dvh overflow-hidden bg-[#E3EEF6]">
      {KEY && (
        <Script
          src={SDK_URL}
          strategy="afterInteractive"
          onReady={() => {
            // 도메인이 등록되지 않으면 스크립트는 받아져도 kakao 객체가 없다
            if (!window.kakao?.maps) setFailed(true);
            else window.kakao.maps.load(() => setSdkReady(true));
          }}
          onError={() => setFailed(true)}
        />
      )}

      <div ref={containerRef} className="absolute inset-0" />

      <header className="absolute inset-x-3 top-3 z-10 flex items-center gap-1 rounded-2xl bg-white/95 py-1.5 pr-4 pl-1 shadow-[0_6px_16px_rgba(23,50,74,.12)]">
        <Link
          href="/"
          aria-label="뒤로"
          className="flex size-10 items-center justify-center text-[26px]"
        >
          ‹
        </Link>
        <div className="flex flex-col">
          <h1 className="text-[17px] font-bold">이웃 동네 이야기</h1>
          <span className="text-xs text-[#6B8299]">최근 6시간</span>
        </div>
      </header>

      {failed ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-canvas px-8 text-center">
          <p className="text-[15px] font-semibold text-[#3B5A75]">
            지도를 불러오지 못했어요
          </p>
          <Link
            href="/"
            className="flex h-12 w-full max-w-60 items-center justify-center rounded-[14px] bg-primary text-base font-bold text-white"
          >
            뒤로 가기
          </Link>
        </div>
      ) : (
        <>
          {empty && (
            <p className="absolute inset-x-3 top-20 z-10 rounded-xl bg-ink/85 px-4 py-2.5 text-center text-sm font-semibold text-white">
              아직 이야기가 있는 동네가 없어요
            </p>
          )}
          <button
            type="button"
            onClick={goHome}
            className="absolute right-4 bottom-[calc(24px+env(safe-area-inset-bottom))] z-10 flex h-11 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-ink shadow-[0_6px_16px_rgba(23,50,74,.18)]"
          >
            <Crosshair
              size={18}
              weight="bold"
              className="text-primary"
              aria-hidden
            />
            내 동네로
          </button>
        </>
      )}
    </main>
  );
}

/** 말풍선 DOM. 동네 이름은 textContent 로만 넣는다 (HTML 해석 금지) */
function pinElement(pin: DongPin, onClick: () => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", `${pin.name} 이야기 ${pin.count}개`);
  button.className = `flex items-center gap-1.5 rounded-full py-1.5 pr-1.5 pl-3 text-sm font-bold whitespace-nowrap shadow-[0_4px_12px_rgba(23,50,74,.18)] ${pin.mine ? "bg-primary text-white" : "bg-white text-ink"}`;

  const name = document.createElement("span");
  name.textContent = pin.name;
  const badge = document.createElement("span");
  badge.className = `min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-extrabold ${pin.mine ? "bg-white text-primary-strong" : "bg-primary text-white"}`;
  badge.textContent = String(pin.count);

  button.append(name, badge);
  button.addEventListener("click", onClick);
  return button;
}
